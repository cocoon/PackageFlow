/**
 * Incoming Webhook Server
 * HTTP server for receiving external webhook triggers
 * Per-workflow server architecture: each workflow has its own HTTP server
 * @see specs/012-workflow-webhook-support
 */
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Arc;

use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::Json,
    routing::post,
    Router,
};
use tauri::{AppHandle, Manager};
use tokio::sync::{oneshot, RwLock};

use crate::models::{IncomingWebhookServerStatus, RunningServerInfo, WebhookTriggerResponse, Workflow};
use crate::services::notification::{send_webhook_notification, WebhookNotificationType};
use crate::DatabaseState;

/// Server shared state (per-workflow)
/// Each server only serves one workflow
pub struct WorkflowWebhookServerState {
    /// Tauri AppHandle for invoking commands
    pub app: AppHandle,
    /// Workflow ID this server serves
    pub workflow_id: String,
    /// Expected token for authentication
    pub expected_token: String,
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

        // Collect active webhook configs: workflow_id -> (token, port)
        let active_configs: HashMap<String, (String, u16)> = workflows
            .iter()
            .filter_map(|w| {
                w.incoming_webhook.as_ref().and_then(|config| {
                    if config.enabled {
                        Some((w.id.clone(), (config.token.clone(), config.port)))
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
        for (workflow_id, (token, port)) in active_configs {
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
                    token,
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
        token: String,
        port: u16,
    ) -> Option<ServerHandle> {
        let state = Arc::new(WorkflowWebhookServerState {
            app: app.clone(),
            workflow_id: workflow_id.clone(),
            expected_token: token,
        });

        // Build router with simplified path (no workflow_id needed)
        let router = Router::new()
            .route("/webhook", post(handle_webhook_trigger))
            .with_state(state);

        let addr = SocketAddr::from(([127, 0, 0, 1], port));
        let (shutdown_tx, shutdown_rx) = oneshot::channel::<()>();

        let wf_id = workflow_id.clone();

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

            log::info!(
                "[incoming-webhook] Server started on http://{} for workflow {}",
                addr,
                wf_id
            );

            axum::serve(listener, router)
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

/// Handle incoming webhook trigger request
/// POST /webhook?token={token}
/// Each server only serves one workflow, so no workflow_id in path
async fn handle_webhook_trigger(
    State(state): State<Arc<WorkflowWebhookServerState>>,
    Query(params): Query<TriggerQueryParams>,
) -> (StatusCode, Json<WebhookTriggerResponse>) {
    // Validate token
    let token = params.token.unwrap_or_default();
    let workflow_id = &state.workflow_id;

    if token != state.expected_token {
        log::warn!(
            "[incoming-webhook] Invalid token for workflow {}",
            workflow_id
        );
        return (
            StatusCode::UNAUTHORIZED,
            Json(WebhookTriggerResponse {
                success: false,
                execution_id: None,
                message: "Invalid token".to_string(),
            }),
        );
    }

    // Trigger workflow execution
    log::info!(
        "[incoming-webhook] Triggering workflow {} via webhook",
        workflow_id
    );

    // Get database from app state for internal execution
    let db = state.app.state::<DatabaseState>();
    let db_clone = db.0.as_ref().clone();

    match crate::commands::workflow::execute_workflow_internal(
        state.app.clone(),
        db_clone,
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

            // Send desktop notification for incoming webhook
            if let Some(workflow_name) = get_workflow_name(&state.app, workflow_id) {
                let _ = send_webhook_notification(
                    &state.app,
                    WebhookNotificationType::IncomingTriggered { workflow_name },
                );
            }

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
