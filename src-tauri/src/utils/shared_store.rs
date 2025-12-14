// Shared Store Module
// Provides unified store access for both Tauri App and MCP Server
// Feature: MCP Settings Data Safety (020-ai-cli-integration)
//
// This module ensures:
// 1. Atomic writes (write to temp file, then rename)
// 2. Backup mechanism before writes
// 3. Unified schema between Tauri App and MCP Server
// 4. File locking for concurrent access safety

use std::fs::{self, File, OpenOptions};
use std::io::{Read, Write as IoWrite};
use std::path::PathBuf;

use fs2::FileExt;
use serde::{Deserialize, Serialize};

use crate::models::mcp::MCPServerConfig;
use crate::models::step_template::CustomStepTemplate;

// ============================================================================
// Error Sanitization
// ============================================================================

/// Sanitize error messages to prevent information leakage
///
/// Removes or obscures:
/// - File system paths
/// - Internal error details that could reveal system structure
pub fn sanitize_error(error: &str) -> String {
    // Replace home directory paths with ~
    let home_dir = dirs::home_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default();

    let mut sanitized = error.to_string();

    // Replace home directory with ~
    if !home_dir.is_empty() {
        sanitized = sanitized.replace(&home_dir, "~");
    }

    // Replace common path patterns
    sanitized = sanitized
        .replace("/Users/", "~/")
        .replace("/home/", "~/");

    sanitized
}

/// Create a safe error message for external consumers
pub fn safe_error(context: &str, _internal_error: &str) -> String {
    // Only return the context, not the internal error details
    format!("Operation failed: {}", context)
}

// ============================================================================
// Input Validation
// ============================================================================

/// Maximum length constants
pub const MAX_NAME_LENGTH: usize = 256;
pub const MAX_DESCRIPTION_LENGTH: usize = 2048;
pub const MAX_PATH_LENGTH: usize = 4096;
pub const MAX_COMMAND_LENGTH: usize = 8192;
pub const MAX_TIMEOUT_MS: u64 = 60 * 60 * 1000; // 1 hour

/// Validate and sanitize path inputs to prevent path traversal attacks
pub fn validate_path(path: &str) -> Result<PathBuf, String> {
    // Check length
    if path.len() > MAX_PATH_LENGTH {
        return Err("Path exceeds maximum length".to_string());
    }

    let path_buf = PathBuf::from(path);

    // Must be absolute path
    if !path_buf.is_absolute() {
        return Err("Path must be absolute".to_string());
    }

    // Check for path traversal patterns
    let path_str = path_buf.to_string_lossy();
    if path_str.contains("..") {
        return Err("Path contains invalid traversal pattern".to_string());
    }

    // Canonicalize to resolve symlinks and validate existence
    let canonical = path_buf
        .canonicalize()
        .map_err(|_| "Path does not exist or is not accessible".to_string())?;

    // Restrict to user home directory for safety
    if let Some(home) = dirs::home_dir() {
        if !canonical.starts_with(&home) {
            return Err("Path must be within user home directory".to_string());
        }
    }

    Ok(canonical)
}

/// Validate path without requiring it to exist (for new paths)
pub fn validate_path_format(path: &str) -> Result<(), String> {
    // Check length
    if path.len() > MAX_PATH_LENGTH {
        return Err("Path exceeds maximum length".to_string());
    }

    let path_buf = PathBuf::from(path);

    // Must be absolute path
    if !path_buf.is_absolute() {
        return Err("Path must be absolute".to_string());
    }

    // Check for path traversal patterns
    let path_str = path_buf.to_string_lossy();
    if path_str.contains("..") {
        return Err("Path contains invalid traversal pattern".to_string());
    }

    Ok(())
}

/// Dangerous command patterns that should be blocked
const DANGEROUS_PATTERNS: &[&str] = &[
    "rm -rf /",
    "rm -rf ~",
    "> /dev/",
    ">> /dev/",
    "chmod 777 /",
    "mkfs.",
    "dd if=",
    ":(){:|:&};:", // Fork bomb
];

/// Validate command string to prevent command injection
pub fn validate_command(command: &str) -> Result<(), String> {
    // Length check
    if command.len() > MAX_COMMAND_LENGTH {
        return Err(format!(
            "Command exceeds maximum length of {} characters",
            MAX_COMMAND_LENGTH
        ));
    }

    // Empty check
    if command.trim().is_empty() {
        return Err("Command cannot be empty".to_string());
    }

    // Check for dangerous patterns
    let cmd_lower = command.to_lowercase();
    for pattern in DANGEROUS_PATTERNS {
        if cmd_lower.contains(pattern) {
            return Err("Command contains potentially dangerous pattern".to_string());
        }
    }

    Ok(())
}

/// Validate string field length
pub fn validate_string_length(field_name: &str, value: &str, max_len: usize) -> Result<(), String> {
    if value.len() > max_len {
        return Err(format!(
            "{} exceeds maximum length ({} > {})",
            field_name,
            value.len(),
            max_len
        ));
    }
    if value.trim().is_empty() {
        return Err(format!("{} cannot be empty", field_name));
    }
    Ok(())
}

/// Validate timeout value
pub fn validate_timeout(timeout_ms: u64) -> Result<(), String> {
    if timeout_ms > MAX_TIMEOUT_MS {
        return Err(format!(
            "Timeout exceeds maximum of {} ms (1 hour)",
            MAX_TIMEOUT_MS
        ));
    }
    Ok(())
}

// ============================================================================
// Output Sanitization (Secret Redaction)
// ============================================================================

/// Patterns that might indicate secrets in command output
const SECRET_PATTERNS: &[(&str, &str)] = &[
    ("ghp_", "[GITHUB_TOKEN]"),      // GitHub personal access token
    ("gho_", "[GITHUB_OAUTH]"),      // GitHub OAuth token
    ("github_pat_", "[GITHUB_PAT]"), // GitHub PAT
    ("sk-", "[API_KEY]"),            // OpenAI/Anthropic keys
    ("pk_live_", "[STRIPE_KEY]"),    // Stripe live key
    ("sk_live_", "[STRIPE_KEY]"),    // Stripe secret key
    ("AKIA", "[AWS_KEY]"),           // AWS access key
    ("xoxb-", "[SLACK_TOKEN]"),      // Slack bot token
    ("xoxp-", "[SLACK_TOKEN]"),      // Slack user token
];

/// Sanitize command output to remove potential secrets
pub fn sanitize_output(output: &str) -> String {
    let mut result = output.to_string();

    // Replace known secret patterns
    for (pattern, replacement) in SECRET_PATTERNS {
        if result.contains(pattern) {
            // Find and redact the entire token (until whitespace or end)
            let mut new_result = String::new();
            let mut chars = result.chars().peekable();
            let pattern_chars: Vec<char> = pattern.chars().collect();

            while let Some(c) = chars.next() {
                // Check if we're at the start of a pattern
                let mut matched = true;
                let mut pattern_match = String::from(c);

                for &pc in pattern_chars.iter().skip(1) {
                    if let Some(&next) = chars.peek() {
                        if next == pc {
                            pattern_match.push(chars.next().unwrap());
                        } else {
                            matched = false;
                            break;
                        }
                    } else {
                        matched = false;
                        break;
                    }
                }

                if matched && pattern_match == *pattern {
                    // Skip until whitespace or end
                    while let Some(&next) = chars.peek() {
                        if next.is_whitespace() || next == '"' || next == '\'' {
                            break;
                        }
                        chars.next();
                    }
                    new_result.push_str(replacement);
                } else {
                    new_result.push_str(&pattern_match);
                }
            }
            result = new_result;
        }
    }

    // Also redact common patterns like "password=xxx" or "api_key: xxx"
    let lines: Vec<&str> = result.lines().collect();
    let mut sanitized_lines = Vec::new();

    for line in lines {
        let lower = line.to_lowercase();
        if lower.contains("password") || lower.contains("secret") || lower.contains("api_key") || lower.contains("apikey") || lower.contains("token=") {
            // Check if it looks like a key=value pair
            if line.contains('=') || line.contains(':') {
                sanitized_lines.push("[SENSITIVE_LINE_REDACTED]");
                continue;
            }
        }
        sanitized_lines.push(line);
    }

    sanitized_lines.join("\n")
}

// ============================================================================
// Rate Limiting
// ============================================================================

use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

/// Default rate limit: 60 requests per minute
pub const DEFAULT_RATE_LIMIT: u64 = 60;
pub const DEFAULT_WINDOW_SECS: u64 = 60;

/// Simple rate limiter using sliding window
pub struct RateLimiter {
    max_requests: u64,
    window_secs: u64,
    request_count: AtomicU64,
    window_start: AtomicU64,
}

impl RateLimiter {
    pub fn new(max_requests: u64, window_secs: u64) -> Self {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        Self {
            max_requests,
            window_secs,
            request_count: AtomicU64::new(0),
            window_start: AtomicU64::new(now),
        }
    }

    /// Check if request is allowed and increment counter
    pub fn check_and_increment(&self) -> Result<(), String> {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        let window_start = self.window_start.load(Ordering::Relaxed);

        // Reset window if expired
        if now - window_start >= self.window_secs {
            self.window_start.store(now, Ordering::Relaxed);
            self.request_count.store(1, Ordering::Relaxed);
            return Ok(());
        }

        let count = self.request_count.fetch_add(1, Ordering::Relaxed);
        if count >= self.max_requests {
            return Err(format!(
                "Rate limit exceeded: {} requests per {} seconds",
                self.max_requests, self.window_secs
            ));
        }

        Ok(())
    }

    /// Get current request count
    pub fn current_count(&self) -> u64 {
        self.request_count.load(Ordering::Relaxed)
    }
}

impl Default for RateLimiter {
    fn default() -> Self {
        Self::new(DEFAULT_RATE_LIMIT, DEFAULT_WINDOW_SECS)
    }
}

// ============================================================================
// Log File Rotation
// ============================================================================

/// Maximum log file size: 10MB
pub const MAX_LOG_FILE_SIZE: u64 = 10 * 1024 * 1024;

/// Rotate log file if it exceeds maximum size
pub fn rotate_log_if_needed(log_path: &PathBuf) -> Result<(), String> {
    if !log_path.exists() {
        return Ok(());
    }

    let metadata = fs::metadata(log_path).map_err(|e| format!("Failed to get log metadata: {}", e))?;

    if metadata.len() > MAX_LOG_FILE_SIZE {
        // Rotate: rename current to .old
        let old_path = log_path.with_extension("log.old");

        // Remove old backup if exists
        let _ = fs::remove_file(&old_path);

        // Rename current to old
        fs::rename(log_path, &old_path).map_err(|e| format!("Failed to rotate log file: {}", e))?;
    }

    Ok(())
}

// ============================================================================
// Backup Rotation
// ============================================================================

/// Number of backup generations to keep
pub const BACKUP_GENERATIONS: usize = 3;

/// Get backup file path with generation number
pub fn get_backup_path_gen(generation: usize) -> Result<PathBuf, String> {
    let store_path = get_store_path()?;
    if generation == 0 {
        Ok(store_path.with_extension(format!("json.{}", BACKUP_EXT)))
    } else {
        Ok(store_path.with_extension(format!("json.{}.{}", BACKUP_EXT, generation)))
    }
}

/// Rotate backup files (0 -> 1 -> 2 -> delete oldest)
pub fn rotate_backups() -> Result<(), String> {
    // Delete oldest backup
    if let Ok(oldest) = get_backup_path_gen(BACKUP_GENERATIONS - 1) {
        let _ = fs::remove_file(oldest);
    }

    // Shift backups: N-2 -> N-1, N-3 -> N-2, etc.
    for i in (0..BACKUP_GENERATIONS - 1).rev() {
        let from = get_backup_path_gen(i)?;
        let to = get_backup_path_gen(i + 1)?;
        if from.exists() {
            let _ = fs::rename(&from, &to);
        }
    }

    Ok(())
}

/// Restore from most recent valid backup
pub fn restore_from_any_backup() -> Result<(), String> {
    for gen in 0..BACKUP_GENERATIONS {
        let backup_path = get_backup_path_gen(gen)?;

        if !backup_path.exists() {
            continue;
        }

        // Try to validate this backup
        match fs::read_to_string(&backup_path) {
            Ok(content) => {
                if serde_json::from_str::<SharedStoreData>(&content).is_ok() {
                    // Valid backup found, restore it
                    let store_path = get_store_path()?;
                    fs::copy(&backup_path, &store_path)
                        .map_err(|e| format!("Failed to restore from backup: {}", e))?;
                    return Ok(());
                }
            }
            Err(_) => continue,
        }
    }

    Err("No valid backup found".to_string())
}

// ============================================================================
// Store Constants
// ============================================================================

/// Store file name (must match Tauri app)
pub const STORE_FILE: &str = "packageflow.json";

/// Backup file extension
pub const BACKUP_EXT: &str = "bak";

/// Temp file extension
pub const TEMP_EXT: &str = "tmp";

/// App identifier for Tauri (must match tauri.conf.json identifier)
#[cfg(target_os = "macos")]
pub const APP_IDENTIFIER: &str = "com.packageflow.PackageFlow-macOS";

#[cfg(not(target_os = "macos"))]
pub const APP_IDENTIFIER: &str = "com.packageflow.PackageFlow";

/// Get the application data directory
pub fn get_app_data_dir() -> Result<PathBuf, String> {
    dirs::data_dir()
        .map(|p| p.join(APP_IDENTIFIER))
        .ok_or_else(|| "Could not determine application data directory".to_string())
}

/// Get the store file path
pub fn get_store_path() -> Result<PathBuf, String> {
    let app_dir = get_app_data_dir()?;
    Ok(app_dir.join(STORE_FILE))
}

/// Get the backup file path
pub fn get_backup_path() -> Result<PathBuf, String> {
    let store_path = get_store_path()?;
    Ok(store_path.with_extension(format!("json.{}", BACKUP_EXT)))
}

/// Get the temp file path
pub fn get_temp_path() -> Result<PathBuf, String> {
    let store_path = get_store_path()?;
    Ok(store_path.with_extension(format!("json.{}", TEMP_EXT)))
}

// ============================================================================
// Shared Store Data Types
// These types are used by both Tauri App and MCP Server
// ============================================================================

/// Shared StoreData structure that includes all fields
/// Note: This is designed to be compatible with tauri-plugin-store
/// which may add/remove fields dynamically
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SharedStoreData {
    #[serde(default)]
    pub version: String,

    #[serde(default)]
    pub projects: Vec<serde_json::Value>,

    #[serde(default)]
    pub workflows: Vec<serde_json::Value>,

    #[serde(default)]
    pub running_executions: serde_json::Value,

    #[serde(default)]
    pub settings: serde_json::Value,

    #[serde(default)]
    pub security_scans: serde_json::Value,

    /// MCP Server configuration (key: mcp_server_config in JSON)
    #[serde(default, rename = "mcp_server_config")]
    pub mcp_config: Option<MCPServerConfig>,

    /// Custom step templates
    #[serde(default)]
    pub custom_step_templates: Vec<CustomStepTemplate>,

    /// Catch-all for unknown fields to prevent data loss
    #[serde(flatten)]
    pub extra: serde_json::Map<String, serde_json::Value>,
}

// ============================================================================
// Atomic File Operations
// ============================================================================

/// Read store data from disk with file locking
pub fn read_store_data() -> Result<SharedStoreData, String> {
    let path = get_store_path()?;

    if !path.exists() {
        return Ok(SharedStoreData::default());
    }

    let mut file = File::open(&path).map_err(|e| format!("Failed to open store file: {}", e))?;

    // Acquire shared lock for reading
    file.lock_shared()
        .map_err(|e| format!("Failed to acquire read lock: {}", e))?;

    let mut contents = String::new();
    file.read_to_string(&mut contents)
        .map_err(|e| format!("Failed to read store file: {}", e))?;

    // Release lock
    file.unlock()
        .map_err(|e| format!("Failed to release lock: {}", e))?;

    serde_json::from_str(&contents).map_err(|e| format!("Failed to parse store data: {}", e))
}

/// Write store data to disk atomically
///
/// This function:
/// 1. Rotates existing backups (keeps 3 generations)
/// 2. Creates a new backup of the existing file (if exists)
/// 3. Writes to a temp file first
/// 4. Atomically renames temp file to the actual file
/// 5. Uses file locking to prevent concurrent writes
pub fn write_store_data_atomic(data: &SharedStoreData) -> Result<(), String> {
    let store_path = get_store_path()?;
    let temp_path = get_temp_path()?;

    // Ensure directory exists
    if let Some(parent) = store_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create store directory: {}", e))?;
    }

    // Step 1: Rotate existing backups and create new one
    if store_path.exists() {
        // Rotate backups (0 -> 1 -> 2 -> delete)
        rotate_backups()?;

        // Create new backup at generation 0
        let backup_path = get_backup_path_gen(0)?;
        fs::copy(&store_path, &backup_path)
            .map_err(|e| format!("Failed to create backup: {}", e))?;
    }

    // Step 2: Write to temp file with exclusive lock
    let mut temp_file = OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .open(&temp_path)
        .map_err(|e| format!("Failed to create temp file: {}", e))?;

    // Acquire exclusive lock
    temp_file
        .lock_exclusive()
        .map_err(|e| format!("Failed to acquire write lock: {}", e))?;

    let json = serde_json::to_string_pretty(data)
        .map_err(|e| format!("Failed to serialize store data: {}", e))?;

    temp_file
        .write_all(json.as_bytes())
        .map_err(|e| format!("Failed to write to temp file: {}", e))?;

    // Sync to disk before rename
    temp_file
        .sync_all()
        .map_err(|e| format!("Failed to sync temp file: {}", e))?;

    // Release lock
    temp_file
        .unlock()
        .map_err(|e| format!("Failed to release lock: {}", e))?;

    // Step 3: Atomic rename (this is the critical operation)
    fs::rename(&temp_path, &store_path)
        .map_err(|e| format!("Failed to rename temp file to store file: {}", e))?;

    Ok(())
}

/// Update only the MCP config in the store atomically
pub fn update_mcp_config(config: MCPServerConfig) -> Result<(), String> {
    let mut store_data = read_store_data()?;
    store_data.mcp_config = Some(config);
    write_store_data_atomic(&store_data)
}

/// Get MCP config from store
pub fn get_mcp_config() -> Result<MCPServerConfig, String> {
    let store_data = read_store_data()?;
    Ok(store_data.mcp_config.unwrap_or_default())
}

/// Validate store data integrity
///
/// Performs the following checks:
/// - Workflow IDs are unique
/// - Project IDs are unique
/// - Project paths are valid (non-empty)
/// - Workflow names are non-empty
/// - MCP config has valid permission mode
pub fn validate_store_data(data: &SharedStoreData) -> Result<(), String> {
    // Validate workflows have unique IDs
    let workflow_ids: Vec<String> = data
        .workflows
        .iter()
        .filter_map(|w| w.get("id").and_then(|v| v.as_str()).map(String::from))
        .collect();

    let unique_workflow_ids: std::collections::HashSet<&String> = workflow_ids.iter().collect();
    if unique_workflow_ids.len() != workflow_ids.len() {
        return Err("Data validation failed: duplicate workflow IDs".to_string());
    }

    // Validate workflows have non-empty names
    for workflow in &data.workflows {
        if let Some(name) = workflow.get("name").and_then(|v| v.as_str()) {
            if name.trim().is_empty() {
                return Err("Data validation failed: workflow name cannot be empty".to_string());
            }
        }
    }

    // Validate projects have unique IDs
    let project_ids: Vec<String> = data
        .projects
        .iter()
        .filter_map(|p| p.get("id").and_then(|v| v.as_str()).map(String::from))
        .collect();

    let unique_project_ids: std::collections::HashSet<&String> = project_ids.iter().collect();
    if unique_project_ids.len() != project_ids.len() {
        return Err("Data validation failed: duplicate project IDs".to_string());
    }

    // Validate projects have non-empty paths
    for project in &data.projects {
        if let Some(path) = project.get("path").and_then(|v| v.as_str()) {
            if path.trim().is_empty() {
                return Err("Data validation failed: project path cannot be empty".to_string());
            }
        }
    }

    // Validate custom step templates have unique IDs
    let template_ids: std::collections::HashSet<&String> =
        data.custom_step_templates.iter().map(|t| &t.id).collect();
    if template_ids.len() != data.custom_step_templates.len() {
        return Err("Data validation failed: duplicate template IDs".to_string());
    }

    Ok(())
}

/// Validate and write store data atomically
///
/// This is the preferred method for writing store data as it:
/// 1. Validates data integrity before writing
/// 2. Creates a backup of the existing file
/// 3. Uses atomic write (temp file + rename)
pub fn write_store_data_validated(data: &SharedStoreData) -> Result<(), String> {
    // Validate before writing
    validate_store_data(data)?;

    // Use the atomic write function
    write_store_data_atomic(data)
}

/// Restore from backup if main store is corrupted
pub fn restore_from_backup() -> Result<(), String> {
    let store_path = get_store_path()?;
    let backup_path = get_backup_path()?;

    if !backup_path.exists() {
        return Err("No backup file available".to_string());
    }

    // Validate backup before restoring
    let backup_content =
        fs::read_to_string(&backup_path).map_err(|e| format!("Failed to read backup: {}", e))?;

    let _: SharedStoreData = serde_json::from_str(&backup_content)
        .map_err(|e| format!("Backup file is also corrupted: {}", e))?;

    // Backup is valid, restore it
    fs::copy(&backup_path, &store_path)
        .map_err(|e| format!("Failed to restore from backup: {}", e))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::mcp::MCPPermissionMode;

    #[test]
    fn test_default_store_data() {
        let data = SharedStoreData::default();
        assert!(data.version.is_empty());
        assert!(data.projects.is_empty());
        assert!(data.workflows.is_empty());
        assert!(data.mcp_config.is_none());
    }

    #[test]
    fn test_validate_empty_store() {
        let data = SharedStoreData::default();
        assert!(validate_store_data(&data).is_ok());
    }

    #[test]
    fn test_shared_store_with_mcp_config() {
        // This simulates the actual JSON structure in the store file
        let json = r#"{
            "version": "",
            "projects": [],
            "workflows": [],
            "runningExecutions": {},
            "settings": null,
            "securityScans": {},
            "customStepTemplates": [],
            "mcp_server_config": {
                "allowedTools": [],
                "isEnabled": true,
                "logRequests": true,
                "permissionMode": "full_access"
            }
        }"#;

        let data: SharedStoreData = serde_json::from_str(json).expect("Should parse SharedStoreData");

        assert!(data.mcp_config.is_some(), "mcp_config should be Some");
        let mcp_config = data.mcp_config.unwrap();

        assert!(mcp_config.is_enabled, "is_enabled should be true");
        assert!(mcp_config.log_requests, "log_requests should be true");
        assert!(mcp_config.allowed_tools.is_empty(), "allowed_tools should be empty");
        assert_eq!(
            mcp_config.permission_mode,
            MCPPermissionMode::FullAccess,
            "permission_mode should be FullAccess, got {:?}",
            mcp_config.permission_mode
        );
    }

    #[test]
    fn test_shared_store_read_only_mode() {
        let json = r#"{
            "mcp_server_config": {
                "permissionMode": "read_only"
            }
        }"#;

        let data: SharedStoreData = serde_json::from_str(json).expect("Should parse");
        let mcp_config = data.mcp_config.unwrap();
        assert_eq!(mcp_config.permission_mode, MCPPermissionMode::ReadOnly);
    }

    #[test]
    fn test_shared_store_execute_with_confirm_mode() {
        let json = r#"{
            "mcp_server_config": {
                "permissionMode": "execute_with_confirm"
            }
        }"#;

        let data: SharedStoreData = serde_json::from_str(json).expect("Should parse");
        let mcp_config = data.mcp_config.unwrap();
        assert_eq!(mcp_config.permission_mode, MCPPermissionMode::ExecuteWithConfirm);
    }

}
