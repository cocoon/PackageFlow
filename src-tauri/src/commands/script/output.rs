//! Output batching and streaming
//!
//! Performance optimization for script output handling.
//! Batches output events to reduce IPC overhead.

use chrono::Utc;
use std::time::Instant;
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, BufReader};

use super::state::ScriptExecutionState;
use super::types::{OutputLine, ScriptCompletedPayload, ScriptOutputPayload};

// ============================================================================
// Output Batcher
// ============================================================================

/// Stream type for output handling
#[derive(Clone, Copy)]
pub enum StreamType {
    Stdout,
    Stderr,
}

impl StreamType {
    pub fn as_str(&self) -> &'static str {
        match self {
            StreamType::Stdout => "stdout",
            StreamType::Stderr => "stderr",
        }
    }
}

/// Performance optimization: Batch output before emitting to frontend
/// Reduces IPC overhead by batching events (8KB or 16ms, whichever comes first)
pub struct OutputBatcher {
    buffer: String,
    last_flush: Instant,
    execution_id: String,
    stream_type: String,
}

impl OutputBatcher {
    /// Batch size threshold (8KB)
    const BATCH_SIZE_THRESHOLD: usize = 8192;
    /// Time threshold (16ms = ~60fps)
    const TIME_THRESHOLD_MS: u64 = 16;

    pub fn new(execution_id: String, stream_type: &str) -> Self {
        Self {
            buffer: String::new(),
            last_flush: Instant::now(),
            execution_id,
            stream_type: stream_type.to_string(),
        }
    }

    /// Add content to buffer and flush if thresholds are met
    pub async fn add(&mut self, content: &str, app: &AppHandle, state: &ScriptExecutionState) {
        self.buffer.push_str(content);

        let should_flush = self.buffer.len() >= Self::BATCH_SIZE_THRESHOLD
            || self.last_flush.elapsed().as_millis() as u64 >= Self::TIME_THRESHOLD_MS;

        if should_flush {
            self.flush(app, state).await;
        }
    }

    /// Flush any remaining content (call at end of stream)
    pub async fn flush(&mut self, app: &AppHandle, state: &ScriptExecutionState) {
        if self.buffer.is_empty() {
            return;
        }

        let timestamp = Utc::now().to_rfc3339();

        // Buffer the output in state (using write lock for mutation)
        {
            let mut executions = state.executions.write().await;
            if let Some(exec) = executions.get_mut(&self.execution_id) {
                exec.output_buffer.push(OutputLine {
                    content: self.buffer.clone(),
                    stream: self.stream_type.clone(),
                    timestamp: timestamp.clone(),
                });
            }
        }

        // Emit to frontend
        let _ = app.emit(
            "script_output",
            ScriptOutputPayload {
                execution_id: self.execution_id.clone(),
                output: self.buffer.clone(),
                stream: self.stream_type.clone(),
                timestamp,
            },
        );

        self.buffer.clear();
        self.last_flush = Instant::now();
    }
}

// ============================================================================
// Stream Handlers
// ============================================================================

/// Shared output stream handler - processes lines from stdout/stderr
/// Uses OutputBatcher for performance optimization
pub async fn stream_output<R: tokio::io::AsyncRead + Unpin>(
    reader: R,
    stream_type: StreamType,
    execution_id: String,
    app: AppHandle,
) {
    use tauri::Manager;
    let state = app.state::<ScriptExecutionState>();
    let mut batcher = OutputBatcher::new(execution_id.clone(), stream_type.as_str());
    let mut line_reader = BufReader::new(reader).lines();

    while let Ok(Some(line)) = line_reader.next_line().await {
        // BufReader::lines() strips newlines, so we add it back for proper display
        let line_with_newline = format!("{}\n", line);
        batcher.add(&line_with_newline, &app, &state).await;
    }

    // Flush any remaining content
    batcher.flush(&app, &state).await;
}

/// Shared process completion handler
/// Eliminates code duplication between execute_script and execute_command
pub async fn handle_process_completion(
    execution_id: String,
    start_time: Instant,
    app: AppHandle,
) {
    use super::types::ExecutionStatus;
    use tauri::Manager;

    // Get the child process (outside lock scope for await)
    let child_opt = {
        let state = app.state::<ScriptExecutionState>();
        let mut executions = state.executions.write().await;
        executions
            .get_mut(&execution_id)
            .and_then(|exec| exec.child.take())
    };

    // Wait for the child process (no lock held)
    let status = if let Some(mut child) = child_opt {
        child.wait().await.ok()
    } else {
        None
    };

    let exit_code = status.and_then(|s| s.code()).unwrap_or(-1);
    let duration = start_time.elapsed();

    let _ = app.emit(
        "script_completed",
        ScriptCompletedPayload {
            execution_id: execution_id.clone(),
            exit_code,
            success: exit_code == 0,
            duration_ms: duration.as_millis() as u64,
        },
    );

    // Update status instead of removing (keep for 5 min retention)
    let state = app.state::<ScriptExecutionState>();
    let mut executions = state.executions.write().await;
    if let Some(exec) = executions.get_mut(&execution_id) {
        exec.status = if exit_code == 0 {
            ExecutionStatus::Completed
        } else {
            ExecutionStatus::Failed
        };
        exec.exit_code = Some(exit_code);
        exec.completed_at = Some(Utc::now().to_rfc3339());
        exec.child = None;
        exec.stdin = None;
    }
}
