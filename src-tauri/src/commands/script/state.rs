//! Script execution state management
//!
//! Contains the shared state for tracking running script executions.

use std::collections::HashMap;
use std::time::Instant;
use tokio::process::{Child, ChildStdin};
use tokio::sync::RwLock;

use super::types::{ExecutionStatus, OutputBuffer};

/// Execution state stored in app state
pub struct ScriptExecutionState {
    /// Map of execution_id -> child process handle
    /// Uses RwLock for better async performance (allows concurrent reads)
    pub executions: RwLock<HashMap<String, RunningExecution>>,
}

impl Default for ScriptExecutionState {
    fn default() -> Self {
        Self {
            executions: RwLock::new(HashMap::new()),
        }
    }
}

/// Running execution info with output buffer for reconnection support (Feature 007)
pub struct RunningExecution {
    // Original fields
    pub execution_id: String,
    pub script_name: String,
    pub started_at: Instant,
    pub child: Option<Child>,
    pub stdin: Option<ChildStdin>,
    pub pid: Option<u32>,
    // Feature 007: New fields for reconnection support
    pub project_path: String,
    pub project_name: Option<String>,
    pub output_buffer: OutputBuffer,
    pub started_at_iso: String,
    pub status: ExecutionStatus,
    pub exit_code: Option<i32>,
    pub completed_at: Option<String>,
}
