// Stream Manager for AI Assistant
// Feature: AI Assistant Tab (022-ai-assistant-tab)
//
// Manages streaming responses from AI providers to the frontend
// via Tauri events. Handles:
// - Token streaming
// - Tool call events
// - Completion events
// - Error handling
// - Stream cancellation

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{mpsc, RwLock};
use tauri::{AppHandle, Emitter};
use uuid::Uuid;
use serde::{Deserialize, Serialize};

use crate::models::ai_assistant::{
    AIAssistantEvent, ToolCall, ResponseStatus, ResponseTiming, StatusUpdatePayload,
};

/// Information about an active stream for reconnection support
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActiveStreamInfo {
    /// Conversation this stream belongs to
    pub conversation_id: String,
    /// Message being generated
    pub message_id: String,
    /// Accumulated content so far
    pub accumulated_content: String,
    /// Current status phase: "thinking", "generating", "tool"
    pub status: String,
    /// Model being used
    pub model: Option<String>,
    /// When the stream started (Unix timestamp ms)
    pub started_at: i64,
    /// Last activity timestamp (Unix timestamp ms)
    pub last_activity: i64,
}

/// Manages active streaming sessions
pub struct StreamManager {
    /// Active stream sessions (stream_id -> cancel_sender)
    sessions: Arc<RwLock<HashMap<String, mpsc::Sender<()>>>>,
    /// Stream info for reconnection (stream_id -> info)
    stream_info: Arc<RwLock<HashMap<String, ActiveStreamInfo>>>,
}

impl StreamManager {
    /// Create a new StreamManager
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(RwLock::new(HashMap::new())),
            stream_info: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Get current time in milliseconds
    fn now_ms() -> i64 {
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as i64
    }

    /// Create a new streaming session with conversation/message info
    /// Returns (session_id, cancel_receiver)
    pub async fn create_session_with_info(
        &self,
        conversation_id: String,
        message_id: String,
    ) -> (String, mpsc::Receiver<()>) {
        let session_id = format!("stream_{}", Uuid::new_v4().to_string().replace("-", ""));
        let (cancel_tx, cancel_rx) = mpsc::channel(1);

        let now = Self::now_ms();
        let info = ActiveStreamInfo {
            conversation_id,
            message_id,
            accumulated_content: String::new(),
            status: "thinking".to_string(),
            model: None,
            started_at: now,
            last_activity: now,
        };

        let mut sessions = self.sessions.write().await;
        sessions.insert(session_id.clone(), cancel_tx);
        drop(sessions);

        let mut stream_info = self.stream_info.write().await;
        stream_info.insert(session_id.clone(), info);

        (session_id, cancel_rx)
    }

    /// Create a new streaming session (legacy, without info tracking)
    /// Returns (session_id, cancel_receiver)
    pub async fn create_session(&self) -> (String, mpsc::Receiver<()>) {
        let session_id = format!("stream_{}", Uuid::new_v4().to_string().replace("-", ""));
        let (cancel_tx, cancel_rx) = mpsc::channel(1);

        let mut sessions = self.sessions.write().await;
        sessions.insert(session_id.clone(), cancel_tx);

        (session_id, cancel_rx)
    }

    /// Update stream info content buffer
    pub async fn update_stream_content(&self, session_id: &str, content: &str) {
        let mut info = self.stream_info.write().await;
        if let Some(stream_info) = info.get_mut(session_id) {
            stream_info.accumulated_content = content.to_string();
            stream_info.last_activity = Self::now_ms();
        }
    }

    /// Update stream info status
    pub async fn update_stream_status(&self, session_id: &str, status: &str, model: Option<String>) {
        let mut info = self.stream_info.write().await;
        if let Some(stream_info) = info.get_mut(session_id) {
            stream_info.status = status.to_string();
            if model.is_some() {
                stream_info.model = model;
            }
            stream_info.last_activity = Self::now_ms();
        }
    }

    /// Get active stream info for a conversation
    pub async fn get_active_stream_for_conversation(
        &self,
        conversation_id: &str,
    ) -> Option<(String, ActiveStreamInfo)> {
        let info = self.stream_info.read().await;
        for (session_id, stream_info) in info.iter() {
            if stream_info.conversation_id == conversation_id {
                // Also verify session is still active
                let sessions = self.sessions.read().await;
                if sessions.contains_key(session_id) {
                    return Some((session_id.clone(), stream_info.clone()));
                }
            }
        }
        None
    }

    /// Get stream info by session ID
    pub async fn get_stream_info(&self, session_id: &str) -> Option<ActiveStreamInfo> {
        let info = self.stream_info.read().await;
        info.get(session_id).cloned()
    }

    /// Remove stream info (called on complete/error)
    pub async fn remove_stream_info(&self, session_id: &str) {
        let mut info = self.stream_info.write().await;
        info.remove(session_id);
    }

    /// Cleanup stale streams (inactive for more than max_age_seconds)
    pub async fn cleanup_stale_streams(&self, max_age_seconds: u64) {
        let cutoff = Self::now_ms() - (max_age_seconds as i64 * 1000);
        let mut info = self.stream_info.write().await;
        info.retain(|_, v| v.last_activity > cutoff);
    }

    /// Get a cloned Arc reference to stream_info for StreamContext
    pub fn get_stream_info_ref(&self) -> Arc<RwLock<HashMap<String, ActiveStreamInfo>>> {
        self.stream_info.clone()
    }

    /// Cancel a streaming session
    /// Also cleans up stream_info
    pub async fn cancel_session(&self, session_id: &str) -> Result<(), String> {
        let mut sessions = self.sessions.write().await;

        if let Some(cancel_tx) = sessions.remove(session_id) {
            drop(sessions);

            // Also remove stream_info
            let mut info = self.stream_info.write().await;
            info.remove(session_id);
            drop(info);

            // Send cancel signal
            let _ = cancel_tx.send(()).await;
            Ok(())
        } else {
            Err(format!("Session not found: {}", session_id))
        }
    }

    /// Remove a session (called when streaming completes)
    /// Also removes stream_info for reconnection cleanup
    pub async fn remove_session(&self, session_id: &str) {
        let mut sessions = self.sessions.write().await;
        sessions.remove(session_id);
        drop(sessions);

        // Also remove stream_info
        let mut info = self.stream_info.write().await;
        info.remove(session_id);
    }

    /// Check if a session exists
    pub async fn session_exists(&self, session_id: &str) -> bool {
        let sessions = self.sessions.read().await;
        sessions.contains_key(session_id)
    }

    /// Get number of active sessions
    pub async fn active_session_count(&self) -> usize {
        let sessions = self.sessions.read().await;
        sessions.len()
    }

    /// Emit a token event to the frontend
    pub fn emit_token(
        app: &AppHandle,
        stream_session_id: &str,
        conversation_id: &str,
        message_id: &str,
        token: &str,
        is_final: bool,
    ) -> Result<(), String> {
        let event = AIAssistantEvent::Token {
            stream_session_id: stream_session_id.to_string(),
            conversation_id: conversation_id.to_string(),
            message_id: message_id.to_string(),
            token: token.to_string(),
            is_final,
        };

        app.emit("ai:chat-token", &event)
            .map_err(|e| format!("Failed to emit token event: {}", e))
    }

    /// Emit a tool call event to the frontend
    pub fn emit_tool_call(
        app: &AppHandle,
        stream_session_id: &str,
        conversation_id: &str,
        message_id: &str,
        tool_call: &ToolCall,
    ) -> Result<(), String> {
        let event = AIAssistantEvent::ToolCall {
            stream_session_id: stream_session_id.to_string(),
            conversation_id: conversation_id.to_string(),
            message_id: message_id.to_string(),
            tool_call: tool_call.clone(),
        };

        app.emit("ai:chat-tool-call", &event)
            .map_err(|e| format!("Failed to emit tool call event: {}", e))
    }

    /// Emit a completion event to the frontend
    pub fn emit_complete(
        app: &AppHandle,
        stream_session_id: &str,
        conversation_id: &str,
        message_id: &str,
        full_content: &str,
        tokens_used: i64,
        model: &str,
        finish_reason: &str,
    ) -> Result<(), String> {
        let event = AIAssistantEvent::Complete {
            stream_session_id: stream_session_id.to_string(),
            conversation_id: conversation_id.to_string(),
            message_id: message_id.to_string(),
            full_content: full_content.to_string(),
            tokens_used,
            model: model.to_string(),
            finish_reason: finish_reason.to_string(),
        };

        app.emit("ai:chat-complete", &event)
            .map_err(|e| format!("Failed to emit complete event: {}", e))
    }

    /// Emit an error event to the frontend
    pub fn emit_error(
        app: &AppHandle,
        stream_session_id: &str,
        conversation_id: &str,
        message_id: &str,
        code: &str,
        message: &str,
        retryable: bool,
    ) -> Result<(), String> {
        let event = AIAssistantEvent::Error {
            stream_session_id: stream_session_id.to_string(),
            conversation_id: conversation_id.to_string(),
            message_id: message_id.to_string(),
            code: code.to_string(),
            message: message.to_string(),
            retryable,
        };

        app.emit("ai:chat-error", &event)
            .map_err(|e| format!("Failed to emit error event: {}", e))
    }

    /// Emit a status update event to the frontend (Feature 023)
    pub fn emit_status(
        app: &AppHandle,
        stream_session_id: &str,
        conversation_id: &str,
        status: ResponseStatus,
    ) -> Result<(), String> {
        let payload = StatusUpdatePayload {
            stream_session_id: stream_session_id.to_string(),
            conversation_id: conversation_id.to_string(),
            status,
        };

        app.emit("ai:status-update", &payload)
            .map_err(|e| format!("Failed to emit status update event: {}", e))
    }
}

impl Default for StreamManager {
    fn default() -> Self {
        Self::new()
    }
}

/// Shared reference type for stream info updates
pub type StreamInfoRef = Arc<RwLock<HashMap<String, ActiveStreamInfo>>>;

/// Helper struct for building streaming responses
pub struct StreamContext {
    pub session_id: String,
    pub conversation_id: String,
    pub message_id: String,
    pub app: AppHandle,
    accumulated_content: String,
    /// Timestamp when thinking started (ms) - Feature 023
    thinking_start: Option<u64>,
    /// Timestamp when generating started (ms) - Feature 023
    generating_start: Option<u64>,
    /// Timestamp when tool call started (ms) - Feature 023
    tool_start: Option<u64>,
    /// Current model name - Feature 023
    model_name: Option<String>,
    /// Reference to stream info for reconnection support
    stream_info_ref: Option<StreamInfoRef>,
    /// Current iteration in agentic loop (1, 2, 3...) - Feature 023 enhanced
    current_iteration: u32,
}

impl StreamContext {
    /// Create a new stream context
    pub fn new(
        session_id: String,
        conversation_id: String,
        message_id: String,
        app: AppHandle,
    ) -> Self {
        Self {
            session_id,
            conversation_id,
            message_id,
            app,
            accumulated_content: String::new(),
            thinking_start: None,
            generating_start: None,
            tool_start: None,
            model_name: None,
            stream_info_ref: None,
            current_iteration: 1,
        }
    }

    /// Create a new stream context with stream info reference for reconnection
    pub fn with_stream_info(
        session_id: String,
        conversation_id: String,
        message_id: String,
        app: AppHandle,
        stream_info_ref: StreamInfoRef,
    ) -> Self {
        Self {
            session_id,
            conversation_id,
            message_id,
            app,
            accumulated_content: String::new(),
            thinking_start: None,
            generating_start: None,
            tool_start: None,
            model_name: None,
            stream_info_ref: Some(stream_info_ref),
            current_iteration: 1,
        }
    }

    /// Get current iteration
    pub fn iteration(&self) -> u32 {
        self.current_iteration
    }

    /// Increment iteration counter (call when starting a new agentic loop iteration)
    pub fn next_iteration(&mut self) {
        self.current_iteration += 1;
    }

    /// Set iteration counter (for resuming from a specific iteration)
    pub fn set_iteration(&mut self, iteration: u32) {
        self.current_iteration = iteration;
    }

    /// Get current time in milliseconds
    fn now_ms() -> u64 {
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64
    }

    /// Emit status update and track timing (Feature 023)
    pub fn emit_status(&mut self, status: ResponseStatus) -> Result<(), String> {
        StreamManager::emit_status(
            &self.app,
            &self.session_id,
            &self.conversation_id,
            status,
        )
    }

    /// Emit thinking status (Feature 023)
    /// Uses current iteration automatically
    pub fn emit_thinking(&mut self) -> Result<(), String> {
        self.thinking_start = Some(Self::now_ms());
        self.emit_status(ResponseStatus::thinking_with_iter(self.current_iteration))
    }

    /// Emit generating status (Feature 023)
    /// Uses current iteration automatically
    pub fn emit_generating(&mut self, model: Option<String>) -> Result<(), String> {
        self.generating_start = Some(Self::now_ms());
        self.model_name = model.clone();

        // Sync to stream_info for reconnection support
        self.sync_to_stream_info(None, Some("generating".to_string()), model.clone());

        self.emit_status(ResponseStatus::generating_with_iter(model, self.current_iteration))
    }

    /// Emit tool status (Feature 023)
    /// Uses current iteration automatically
    pub fn emit_tool_status(&mut self, tool_name: &str) -> Result<(), String> {
        self.tool_start = Some(Self::now_ms());

        // Sync to stream_info for reconnection support
        self.sync_to_stream_info(None, Some("tool".to_string()), None);

        self.emit_status(ResponseStatus::tool_with_iter(tool_name.to_string(), self.current_iteration))
    }

    /// Emit complete status with timing (Feature 023)
    pub fn emit_complete_status(&mut self) -> Result<(), String> {
        let now = Self::now_ms();

        let timing = ResponseTiming {
            thinking_ms: self.thinking_start.map(|start| {
                self.generating_start.unwrap_or(now).saturating_sub(start)
            }),
            generating_ms: self.generating_start.map(|start| {
                now.saturating_sub(start)
            }),
            tool_ms: self.tool_start.map(|start| {
                now.saturating_sub(start)
            }),
            total_ms: self.thinking_start.map(|start| {
                now.saturating_sub(start)
            }),
        };

        self.emit_status(ResponseStatus::complete_with_model(timing, self.model_name.clone()))
    }

    /// Emit error status (Feature 023)
    pub fn emit_error_status(&mut self) -> Result<(), String> {
        self.emit_status(ResponseStatus::error())
    }

    /// Helper to update stream_info asynchronously
    fn sync_to_stream_info(&self, content: Option<String>, status: Option<String>, model: Option<String>) {
        if let Some(ref info_ref) = self.stream_info_ref {
            let info_ref = info_ref.clone();
            let session_id = self.session_id.clone();
            tokio::spawn(async move {
                let mut info = info_ref.write().await;
                if let Some(stream_info) = info.get_mut(&session_id) {
                    if let Some(c) = content {
                        stream_info.accumulated_content = c;
                    }
                    if let Some(s) = status {
                        stream_info.status = s;
                    }
                    if model.is_some() {
                        stream_info.model = model;
                    }
                    stream_info.last_activity = std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_millis() as i64;
                }
            });
        }
    }

    /// Emit a token and accumulate content
    pub fn emit_token(&mut self, token: &str) -> Result<(), String> {
        self.accumulated_content.push_str(token);

        // Sync to stream_info for reconnection support
        self.sync_to_stream_info(Some(self.accumulated_content.clone()), None, None);

        StreamManager::emit_token(
            &self.app,
            &self.session_id,
            &self.conversation_id,
            &self.message_id,
            token,
            false,
        )
    }

    /// Emit a tool call event
    pub fn emit_tool_call(&self, tool_call: &ToolCall) -> Result<(), String> {
        StreamManager::emit_tool_call(
            &self.app,
            &self.session_id,
            &self.conversation_id,
            &self.message_id,
            tool_call,
        )
    }

    /// Emit completion event with accumulated content
    pub fn emit_complete(
        &self,
        tokens_used: i64,
        model: &str,
        finish_reason: &str,
    ) -> Result<(), String> {
        StreamManager::emit_complete(
            &self.app,
            &self.session_id,
            &self.conversation_id,
            &self.message_id,
            &self.accumulated_content,
            tokens_used,
            model,
            finish_reason,
        )
    }

    /// Emit an error event
    pub fn emit_error(&self, code: &str, message: &str, retryable: bool) -> Result<(), String> {
        StreamManager::emit_error(
            &self.app,
            &self.session_id,
            &self.conversation_id,
            &self.message_id,
            code,
            message,
            retryable,
        )
    }

    /// Get accumulated content
    pub fn get_content(&self) -> &str {
        &self.accumulated_content
    }

    /// Set content directly (for non-streaming responses)
    pub fn set_content(&mut self, content: String) {
        self.accumulated_content = content;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_create_session() {
        let manager = StreamManager::new();

        let (session_id, _cancel_rx) = manager.create_session().await;

        assert!(session_id.starts_with("stream_"));
        assert!(manager.session_exists(&session_id).await);
        assert_eq!(manager.active_session_count().await, 1);
    }

    #[tokio::test]
    async fn test_cancel_session() {
        let manager = StreamManager::new();

        let (session_id, mut cancel_rx) = manager.create_session().await;

        // Cancel should succeed
        let result = manager.cancel_session(&session_id).await;
        assert!(result.is_ok());

        // Cancel receiver should get the signal
        let received = cancel_rx.try_recv();
        assert!(received.is_ok());

        // Session should be removed
        assert!(!manager.session_exists(&session_id).await);
    }

    #[tokio::test]
    async fn test_cancel_nonexistent_session() {
        let manager = StreamManager::new();

        let result = manager.cancel_session("nonexistent").await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_remove_session() {
        let manager = StreamManager::new();

        let (session_id, _cancel_rx) = manager.create_session().await;
        assert!(manager.session_exists(&session_id).await);

        manager.remove_session(&session_id).await;
        assert!(!manager.session_exists(&session_id).await);
    }

    #[tokio::test]
    async fn test_multiple_sessions() {
        let manager = StreamManager::new();

        let (session1, _) = manager.create_session().await;
        let (session2, _) = manager.create_session().await;
        let (session3, _) = manager.create_session().await;

        assert_eq!(manager.active_session_count().await, 3);

        manager.remove_session(&session2).await;
        assert_eq!(manager.active_session_count().await, 2);

        assert!(manager.session_exists(&session1).await);
        assert!(!manager.session_exists(&session2).await);
        assert!(manager.session_exists(&session3).await);
    }
}
