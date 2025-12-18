// Services module
// Business logic and background services

// Re-export shared services from packageflow-lib
pub use packageflow_lib::services::crypto;
pub use packageflow_lib::services::crypto::*;
pub use packageflow_lib::services::mcp_action;
pub use packageflow_lib::services::security_guardian;
pub use packageflow_lib::services::snapshot;

// Tauri-dependent services (local)
pub mod ai;
pub mod ai_assistant;
pub mod ai_cli;
pub mod deploy;
pub mod file_watcher;
pub mod incoming_webhook;
pub mod notification;

pub use file_watcher::*;
pub use incoming_webhook::*;
pub use notification::*;

// Note: ai types are not glob re-exported to keep namespace clean
// Use crate::services::ai::* explicitly when needed
