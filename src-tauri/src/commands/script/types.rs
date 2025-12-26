//! Script execution type definitions
//!
//! Contains all structs, enums, and payload types used across the script module.

use serde::{Deserialize, Serialize};
use std::collections::VecDeque;

// ============================================================================
// Execution Status
// ============================================================================

/// Execution status for tracking script state (Feature 007)
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ExecutionStatus {
    Running,
    Completed,
    Failed,
    Cancelled,
}

impl Default for ExecutionStatus {
    fn default() -> Self {
        Self::Running
    }
}

impl std::fmt::Display for ExecutionStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ExecutionStatus::Running => write!(f, "running"),
            ExecutionStatus::Completed => write!(f, "completed"),
            ExecutionStatus::Failed => write!(f, "failed"),
            ExecutionStatus::Cancelled => write!(f, "cancelled"),
        }
    }
}

// ============================================================================
// Output Types
// ============================================================================

/// Single output line for buffering (Feature 007)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OutputLine {
    pub content: String,
    pub stream: String,    // "stdout" | "stderr"
    pub timestamp: String, // ISO 8601
}

/// Output buffer with size limit for storing script output history (Feature 007)
/// Uses a ring buffer approach - when max size is exceeded, oldest content is removed
pub struct OutputBuffer {
    lines: VecDeque<OutputLine>,
    total_size: usize,
    max_size: usize,
    truncated: bool,
}

impl OutputBuffer {
    /// Default max size: 1MB
    pub const DEFAULT_MAX_SIZE: usize = 1_048_576;

    pub fn new() -> Self {
        Self::with_max_size(Self::DEFAULT_MAX_SIZE)
    }

    pub fn with_max_size(max_size: usize) -> Self {
        Self {
            lines: VecDeque::new(),
            total_size: 0,
            max_size,
            truncated: false,
        }
    }

    /// Push a new line, removing old content if necessary to stay within size limit
    pub fn push(&mut self, line: OutputLine) {
        let line_size = line.content.len();

        // Remove old lines if adding new line would exceed max size
        while self.total_size + line_size > self.max_size && !self.lines.is_empty() {
            if let Some(removed) = self.lines.pop_front() {
                self.total_size = self.total_size.saturating_sub(removed.content.len());
                self.truncated = true;
            }
        }

        // Only add if the single line doesn't exceed max size
        if line_size <= self.max_size {
            self.total_size += line_size;
            self.lines.push_back(line);
        }
    }

    /// Get all lines as a vector
    pub fn get_lines(&self) -> Vec<OutputLine> {
        self.lines.iter().cloned().collect()
    }

    /// Get combined output as a single string
    pub fn get_combined_output(&self) -> String {
        self.lines
            .iter()
            .map(|l| l.content.as_str())
            .collect::<Vec<_>>()
            .join("")
    }

    /// Check if content was truncated due to size limit
    pub fn is_truncated(&self) -> bool {
        self.truncated
    }

    /// Get current buffer size in bytes
    pub fn size(&self) -> usize {
        self.total_size
    }
}

impl Default for OutputBuffer {
    fn default() -> Self {
        Self::new()
    }
}

// ============================================================================
// Event Payloads
// ============================================================================

/// Payload for script output events
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScriptOutputPayload {
    pub execution_id: String,
    pub output: String,
    pub stream: String,
    pub timestamp: String,
}

/// Payload for script completion events
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScriptCompletedPayload {
    pub execution_id: String,
    pub exit_code: i32,
    pub success: bool,
    pub duration_ms: u64,
}

// ============================================================================
// Command Response Types
// ============================================================================

/// Response for execute_script and execute_command
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecuteScriptResponse {
    pub success: bool,
    pub execution_id: Option<String>,
    pub error: Option<String>,
}

/// Response for cancel_script and kill operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CancelScriptResponse {
    pub success: bool,
    pub error: Option<String>,
}

/// Running script info for list_running_scripts
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunningScriptInfo {
    pub execution_id: String,
    pub script_name: String,
    pub started_at_ms: u64,
    // Feature 007: New fields
    pub project_path: String,
    pub project_name: Option<String>,
    pub started_at: String,
    pub status: ExecutionStatus,
    pub exit_code: Option<i32>,
    pub completed_at: Option<String>,
}

/// Response for get_script_output command (Feature 007)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetScriptOutputResponse {
    pub success: bool,
    pub execution_id: String,
    pub output: Option<String>,
    pub lines: Option<Vec<OutputLine>>,
    pub truncated: bool,
    pub buffer_size: usize,
    pub error: Option<String>,
}

/// Response for write_to_script command (Feature 008)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WriteToScriptResponse {
    pub success: bool,
    pub error: Option<String>,
}

/// Volta wrapped command result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VoltaWrappedCommand {
    pub command: String,
    pub args: Vec<String>,
    pub use_volta: bool,
}
