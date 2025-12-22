use chrono::Utc;
/**
 * Incoming Webhook Commands
 * Tauri IPC commands for managing incoming webhooks
 * Per-workflow server architecture: each workflow has its own HTTP server
 * @see specs/012-workflow-webhook-support
 */
use tauri::{AppHandle, Manager};
use uuid::Uuid;

use crate::models::{IncomingWebhookConfig, IncomingWebhookServerStatus, DEFAULT_INCOMING_WEBHOOK_PORT};
use crate::repositories::WorkflowRepository;
use crate::services::IncomingWebhookManager;
use crate::DatabaseState;

/// Generate a new API token
#[tauri::command]
pub async fn generate_incoming_webhook_token() -> Result<String, String> {
    Ok(Uuid::new_v4().to_string())
}

/// Get incoming webhook server status (multi-server)
#[tauri::command]
pub async fn get_incoming_webhook_status(
    app: AppHandle,
    db: tauri::State<'_, DatabaseState>,
) -> Result<IncomingWebhookServerStatus, String> {
    let manager = app.state::<IncomingWebhookManager>();
    let workflow_repo = WorkflowRepository::new(db.0.as_ref().clone());
    let workflows = workflow_repo.list()?;

    Ok(manager.get_status(&workflows).await)
}

/// Create default incoming webhook config with new token and default port
#[tauri::command]
pub async fn create_incoming_webhook_config() -> Result<IncomingWebhookConfig, String> {
    Ok(IncomingWebhookConfig {
        enabled: false,
        token: Uuid::new_v4().to_string(),
        token_created_at: Utc::now().to_rfc3339(),
        port: DEFAULT_INCOMING_WEBHOOK_PORT,
        secret: None,
        require_signature: false,
        rate_limit_per_minute: 60,
    })
}

/// Generate a new HMAC secret for webhook signature verification
#[tauri::command]
pub async fn generate_webhook_secret() -> Result<String, String> {
    use rand::Rng;
    let secret: String = rand::thread_rng()
        .sample_iter(&rand::distributions::Alphanumeric)
        .take(32)
        .map(char::from)
        .collect();
    Ok(secret)
}

/// Regenerate token for an incoming webhook config
#[tauri::command]
pub async fn regenerate_incoming_webhook_token(
    mut config: IncomingWebhookConfig,
) -> Result<IncomingWebhookConfig, String> {
    config.token = Uuid::new_v4().to_string();
    config.token_created_at = Utc::now().to_rfc3339();
    Ok(config)
}

/// Port status for availability check
#[derive(Debug, Clone, serde::Serialize)]
pub enum PortStatus {
    /// Port is available for use
    Available,
    /// Port is in use by another workflow's webhook server
    InUseByWorkflow(String), // Contains the workflow name using this port
    /// Port is in use by another service (not our webhook)
    InUseByOther,
}

/// Check if a port is available for use
/// workflow_id: Optional - exclude this workflow from the check (for editing existing webhook)
#[tauri::command]
pub async fn check_port_available(
    app: AppHandle,
    db: tauri::State<'_, DatabaseState>,
    port: u16,
    workflow_id: Option<String>,
) -> Result<PortStatus, String> {
    use std::net::{SocketAddr, TcpListener, TcpStream};
    use std::time::Duration;

    let manager = app.state::<IncomingWebhookManager>();

    // Check if any of our webhook servers is using this port
    let (is_available_in_manager, used_by_workflow_id) = manager
        .check_port_usage(port, workflow_id.as_deref())
        .await;

    if !is_available_in_manager {
        // Port is used by another workflow's webhook server
        if let Some(wf_id) = used_by_workflow_id {
            // Get workflow name for display
            let workflow_repo = WorkflowRepository::new(db.0.as_ref().clone());
            let workflow_name = workflow_repo
                .get(&wf_id)
                .ok()
                .flatten()
                .map(|w| w.name)
                .unwrap_or_else(|| wf_id.clone());
            return Ok(PortStatus::InUseByWorkflow(workflow_name));
        }
    }

    // Try to connect to the port - if something is listening, it's in use
    let addr: SocketAddr = format!("127.0.0.1:{}", port).parse().unwrap();
    if TcpStream::connect_timeout(&addr, Duration::from_millis(100)).is_ok() {
        // Something is listening - check if it's one of our servers
        // (This handles the case where manager check missed it due to timing)
        return Ok(PortStatus::InUseByOther);
    }

    // Try to bind to make sure we can use it
    match TcpListener::bind(addr) {
        Ok(_) => Ok(PortStatus::Available),
        Err(_) => Ok(PortStatus::InUseByOther),
    }
}

/// Sync all incoming webhook servers
/// Called after workflow save to start/stop servers as needed
pub async fn sync_incoming_webhook_server(app: &AppHandle) -> Result<(), String> {
    let db = app.state::<DatabaseState>();
    let workflow_repo = WorkflowRepository::new(db.0.as_ref().clone());
    let workflows = workflow_repo.list()?;

    let manager = app.state::<IncomingWebhookManager>();
    manager.sync_all_servers(app, &workflows).await;

    Ok(())
}
