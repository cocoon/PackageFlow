/**
 * Incoming Webhook Server
 * HTTP server for receiving external webhook triggers
 * Per-workflow server architecture: each workflow has its own HTTP server
 * Security features: HMAC signature verification, rate limiting
 * @see specs/012-workflow-webhook-support
 */
use std::collections::HashMap;
use std::net::{IpAddr, SocketAddr};
use std::sync::Arc;

use axum::{
    body::Bytes,
    extract::{ConnectInfo, Query, State},
    http::{HeaderMap, StatusCode},
    response::Json,
    routing::post,
    Router,
};
use tauri::{AppHandle, Manager};
use tokio::sync::{oneshot, RwLock};

use crate::models::{IncomingWebhookServerStatus, RunningServerInfo, WebhookTriggerResponse, Workflow};
use crate::services::audit::{audit_auth_event, audit_rate_limit, audit_webhook_trigger};
use crate::services::notification::{send_webhook_notification, WebhookNotificationType};
use crate::services::webhook_security::{RateLimiter, RateLimitResult, SignatureVerifier};
use crate::DatabaseState;

/// Server shared state (per-workflow)
/// Each server only serves one workflow
pub struct WorkflowWebhookServerState {
    /// Tauri AppHandle for invoking commands
    pub app: AppHandle,
    /// Workflow ID this server serves
    pub workflow_id: String,
    /// Expected token for authentication (legacy)
    pub expected_token: String,
    /// HMAC secret for signature verification (optional)
    pub secret: Option<String>,
    /// Whether signature is required
    pub require_signature: bool,
    /// Rate limiter instance
    pub rate_limiter: RateLimiter,
}

/// Security configuration for a webhook
#[derive(Clone)]
pub struct WebhookSecurityConfig {
    pub token: String,
    pub secret: Option<String>,
    pub require_signature: bool,
    pub rate_limit_per_minute: usize,
}

/// Handle for a running server
struct ServerHandle {
    /// Shutdown signal sender
    shutdown_tx: oneshot::Sender<()>,
    /// Port the server is listening on
    port: u16,
}

/// Incoming Webhook Server Manager
/// Manages multiple HTTP servers (one per workflow)
pub struct IncomingWebhookManager {
    /// Running servers: workflow_id -> ServerHandle
    servers: RwLock<HashMap<String, ServerHandle>>,
}

impl Default for IncomingWebhookManager {
    fn default() -> Self {
        Self::new()
    }
}

impl IncomingWebhookManager {
    pub fn new() -> Self {
        Self {
            servers: RwLock::new(HashMap::new()),
        }
    }

    /// Sync all servers based on workflow configurations
    /// - Starts servers for newly enabled webhooks
    /// - Stops servers for disabled webhooks
    /// - Restarts servers if port changed
    pub async fn sync_all_servers(&self, app: &AppHandle, workflows: &[Workflow]) {
        let mut servers = self.servers.write().await;

        // Collect active webhook configs: workflow_id -> (config, port)
        let active_configs: HashMap<String, (WebhookSecurityConfig, u16)> = workflows
            .iter()
            .filter_map(|w| {
                w.incoming_webhook.as_ref().and_then(|config| {
                    if config.enabled {
                        Some((
                            w.id.clone(),
                            (
                                WebhookSecurityConfig {
                                    token: config.token.clone(),
                                    secret: config.secret.clone(),
                                    require_signature: config.require_signature,
                                    rate_limit_per_minute: config.rate_limit_per_minute,
                                },
                                config.port,
                            ),
                        ))
                    } else {
                        None
                    }
                })
            })
            .collect();

        // Stop servers for workflows that no longer have active webhooks
        let to_stop: Vec<String> = servers
            .keys()
            .filter(|id| !active_configs.contains_key(*id))
            .cloned()
            .collect();

        for workflow_id in to_stop {
            if let Some(handle) = servers.remove(&workflow_id) {
                let _ = handle.shutdown_tx.send(());
                log::info!(
                    "[incoming-webhook] Stopped server for workflow {} (port {})",
                    workflow_id,
                    handle.port
                );
            }
        }

        // Start or restart servers for active webhooks
        for (workflow_id, (security_config, port)) in active_configs {
            let needs_restart = servers.get(&workflow_id).map(|h| h.port != port).unwrap_or(false);

            if needs_restart {
                // Port changed, stop old server
                if let Some(handle) = servers.remove(&workflow_id) {
                    let _ = handle.shutdown_tx.send(());
                    log::info!(
                        "[incoming-webhook] Stopping server for workflow {} (port changed)",
                        workflow_id
                    );
                }
            }

            if !servers.contains_key(&workflow_id) {
                // Start new server
                if let Some(handle) = self.start_server_for_workflow(
                    app.clone(),
                    workflow_id.clone(),
                    security_config,
                    port,
                ).await {
                    servers.insert(workflow_id, handle);
                }
            }
        }
    }

    /// Start a server for a specific workflow
    async fn start_server_for_workflow(
        &self,
        app: AppHandle,
        workflow_id: String,
        security_config: WebhookSecurityConfig,
        port: u16,
    ) -> Option<ServerHandle> {
        let state = Arc::new(WorkflowWebhookServerState {
            app: app.clone(),
            workflow_id: workflow_id.clone(),
            expected_token: security_config.token,
            secret: security_config.secret,
            require_signature: security_config.require_signature,
            rate_limiter: RateLimiter::new(security_config.rate_limit_per_minute, 60),
        });

        let addr = SocketAddr::from(([127, 0, 0, 1], port));
        let (shutdown_tx, shutdown_rx) = oneshot::channel::<()>();

        let wf_id = workflow_id.clone();
        let state_clone = state.clone();

        // Spawn server task
        tokio::spawn(async move {
            let listener = match tokio::net::TcpListener::bind(addr).await {
                Ok(l) => l,
                Err(e) => {
                    log::error!(
                        "[incoming-webhook] Failed to bind to {} for workflow {}: {}",
                        addr,
                        wf_id,
                        e
                    );
                    return;
                }
            };

            let security_mode = if state_clone.require_signature {
                "signature required"
            } else {
                "token only"
            };

            log::info!(
                "[incoming-webhook] Server started on http://{} for workflow {} ({})",
                addr,
                wf_id,
                security_mode
            );

            // Build router with state
            let app = Router::new()
                .route("/webhook", post(handle_webhook_trigger))
                .with_state(state_clone);

            axum::serve(
                listener,
                app.into_make_service_with_connect_info::<SocketAddr>(),
            )
            .with_graceful_shutdown(async {
                shutdown_rx.await.ok();
            })
            .await
            .ok();

            log::info!(
                "[incoming-webhook] Server stopped for workflow {}",
                wf_id
            );
        });

        Some(ServerHandle {
            shutdown_tx,
            port,
        })
    }

    /// Stop server for a specific workflow
    pub async fn stop_server_for_workflow(&self, workflow_id: &str) {
        let mut servers = self.servers.write().await;
        if let Some(handle) = servers.remove(workflow_id) {
            let _ = handle.shutdown_tx.send(());
            log::info!(
                "[incoming-webhook] Server shutdown requested for workflow {}",
                workflow_id
            );
        }
    }

    /// Stop all servers
    pub async fn stop_all_servers(&self) {
        let mut servers = self.servers.write().await;
        for (workflow_id, handle) in servers.drain() {
            let _ = handle.shutdown_tx.send(());
            log::info!(
                "[incoming-webhook] Server shutdown requested for workflow {}",
                workflow_id
            );
        }
    }

    /// Check if a specific workflow has a running server
    pub async fn is_workflow_server_running(&self, workflow_id: &str) -> bool {
        self.servers.read().await.contains_key(workflow_id)
    }

    /// Get port for a specific workflow's server
    pub async fn get_workflow_port(&self, workflow_id: &str) -> Option<u16> {
        self.servers.read().await.get(workflow_id).map(|h| h.port)
    }

    /// Get server status for all workflows
    pub async fn get_status(&self, workflows: &[Workflow]) -> IncomingWebhookServerStatus {
        let servers = self.servers.read().await;

        let running_servers: Vec<RunningServerInfo> = workflows
            .iter()
            .filter_map(|w| {
                w.incoming_webhook.as_ref().and_then(|config| {
                    if config.enabled {
                        let is_running = servers.contains_key(&w.id);
                        Some(RunningServerInfo {
                            workflow_id: w.id.clone(),
                            workflow_name: w.name.clone(),
                            port: config.port,
                            running: is_running,
                        })
                    } else {
                        None
                    }
                })
            })
            .collect();

        let running_count = running_servers.iter().filter(|s| s.running).count() as u32;

        IncomingWebhookServerStatus {
            running_servers,
            running_count,
        }
    }

    /// Check if a port is available or in use
    /// Returns: (is_available, used_by_workflow_id)
    pub async fn check_port_usage(&self, port: u16, exclude_workflow_id: Option<&str>) -> (bool, Option<String>) {
        let servers = self.servers.read().await;

        for (wf_id, handle) in servers.iter() {
            if handle.port == port {
                // Check if this is the excluded workflow
                if let Some(exclude_id) = exclude_workflow_id {
                    if wf_id == exclude_id {
                        continue; // Skip self
                    }
                }
                return (false, Some(wf_id.clone()));
            }
        }

        (true, None)
    }
}

/// Query parameters for webhook trigger
#[derive(serde::Deserialize)]
struct TriggerQueryParams {
    token: Option<String>,
}

/// Get workflow name from database by workflow ID
fn get_workflow_name(app: &AppHandle, workflow_id: &str) -> Option<String> {
    use crate::repositories::WorkflowRepository;

    let db = app.state::<DatabaseState>();
    let repo = WorkflowRepository::new(db.0.as_ref().clone());
    repo.get(workflow_id).ok()?.map(|w| w.name)
}

/// Signature header name
const SIGNATURE_HEADER: &str = "x-webhook-signature";

/// Handle incoming webhook trigger request
/// POST /webhook?token={token}
/// Headers: X-Webhook-Signature: sha256=<hex> (optional, required if require_signature is true)
/// Each server only serves one workflow, so no workflow_id in path
async fn handle_webhook_trigger(
    State(state): State<Arc<WorkflowWebhookServerState>>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
    Query(params): Query<TriggerQueryParams>,
    body: Bytes,
) -> (StatusCode, Json<WebhookTriggerResponse>) {
    let workflow_id = &state.workflow_id;
    let client_ip = addr.ip();

    // Get database for audit logging
    let db = state.app.state::<DatabaseState>();
    let db_arc = db.0.clone();
    let client_ip_str = client_ip.to_string();

    // Rate limiting check
    match state.rate_limiter.check(client_ip) {
        RateLimitResult::Limited { retry_after_secs } => {
            log::warn!(
                "[incoming-webhook] Rate limited request from {} for workflow {}",
                client_ip,
                workflow_id
            );
            // Audit: Rate limit exceeded
            audit_rate_limit(db_arc.clone(), &client_ip_str, workflow_id);
            return (
                StatusCode::TOO_MANY_REQUESTS,
                Json(WebhookTriggerResponse {
                    success: false,
                    execution_id: None,
                    message: format!("Rate limit exceeded. Retry after {} seconds.", retry_after_secs),
                }),
            );
        }
        RateLimitResult::Allowed => {}
    }

    // Authentication: HMAC signature or token
    let auth_result = authenticate_request(
        &state,
        &headers,
        &body,
        params.token.as_deref(),
        client_ip,
    );

    if let Err(auth_error) = auth_result {
        log::warn!(
            "[incoming-webhook] Authentication failed for workflow {}: {}",
            workflow_id,
            auth_error
        );
        // Audit: Authentication failed
        let auth_method = if state.require_signature { "hmac_signature" } else { "token" };
        audit_auth_event(
            db_arc.clone(),
            auth_method,
            false,
            Some(&client_ip_str),
            Some(&auth_error),
        );
        return (
            StatusCode::UNAUTHORIZED,
            Json(WebhookTriggerResponse {
                success: false,
                execution_id: None,
                message: "Authentication failed".to_string(),
            }),
        );
    }

    // Trigger workflow execution
    log::info!(
        "[incoming-webhook] Triggering workflow {} via webhook from {}",
        workflow_id,
        client_ip
    );

    // Get workflow name for audit logging
    let workflow_name = get_workflow_name(&state.app, workflow_id)
        .unwrap_or_else(|| workflow_id.clone());

    match crate::commands::workflow::execute_workflow_internal(
        state.app.clone(),
        (*db_arc).clone(),
        workflow_id.clone(),
        None,
        None,
    )
    .await
    {
        Ok(execution_id) => {
            log::info!(
                "[incoming-webhook] Workflow {} triggered, execution_id: {}",
                workflow_id,
                execution_id
            );

            // Audit: Webhook trigger success
            audit_webhook_trigger(
                db_arc.clone(),
                workflow_id,
                &workflow_name,
                &client_ip_str,
                true,
                None,
            );

            // Send desktop notification for incoming webhook
            let _ = send_webhook_notification(
                &state.app,
                WebhookNotificationType::IncomingTriggered {
                    workflow_name: workflow_name.clone(),
                },
            );

            (
                StatusCode::OK,
                Json(WebhookTriggerResponse {
                    success: true,
                    execution_id: Some(execution_id),
                    message: "Workflow triggered successfully".to_string(),
                }),
            )
        }
        Err(e) => {
            log::error!(
                "[incoming-webhook] Failed to trigger workflow {}: {}",
                workflow_id,
                e
            );

            // Audit: Webhook trigger failure
            audit_webhook_trigger(
                db_arc,
                workflow_id,
                &workflow_name,
                &client_ip_str,
                false,
                Some(&e),
            );

            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(WebhookTriggerResponse {
                    success: false,
                    execution_id: None,
                    message: format!("Failed to trigger workflow: {}", e),
                }),
            )
        }
    }
}

/// Authenticate webhook request using signature or token
fn authenticate_request(
    state: &WorkflowWebhookServerState,
    headers: &HeaderMap,
    body: &Bytes,
    token: Option<&str>,
    client_ip: IpAddr,
) -> Result<(), String> {
    // Check for signature header
    let signature = headers
        .get(SIGNATURE_HEADER)
        .and_then(|v| v.to_str().ok());

    // If signature is provided and secret is configured, verify signature
    if let (Some(sig), Some(secret)) = (signature, &state.secret) {
        let verifier = SignatureVerifier::new(secret);
        return verifier
            .verify(body, sig)
            .map_err(|e| format!("Signature verification failed: {}", e));
    }

    // If signature is required but not provided
    if state.require_signature {
        if signature.is_none() {
            return Err("Signature required but not provided".to_string());
        }
        if state.secret.is_none() {
            log::error!(
                "[incoming-webhook] Signature required but no secret configured for workflow {}",
                state.workflow_id
            );
            return Err("Server configuration error".to_string());
        }
    }

    // Fall back to token authentication (legacy)
    match token {
        Some(t) if t == state.expected_token => {
            log::debug!(
                "[incoming-webhook] Token authentication successful from {}",
                client_ip
            );
            Ok(())
        }
        Some(_) => Err("Invalid token".to_string()),
        None => Err("No authentication provided".to_string()),
    }
}
