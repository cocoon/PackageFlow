// MCP Repository
// Handles all database operations for MCP server configuration

use rusqlite::params;

use crate::models::mcp::{MCPEncryptedSecrets, MCPPermissionMode, MCPServerConfig};
use crate::utils::database::Database;

/// Repository for MCP configuration data access
pub struct MCPRepository {
    db: Database,
}

impl MCPRepository {
    /// Create a new MCPRepository
    pub fn new(db: Database) -> Self {
        Self { db }
    }

    /// Get MCP server configuration
    pub fn get_config(&self) -> Result<MCPServerConfig, String> {
        self.db.with_connection(|conn| {
            let result = conn.query_row(
                r#"
                SELECT is_enabled, permission_mode, allowed_tools, log_requests, encrypted_secrets
                FROM mcp_config
                WHERE id = 1
                "#,
                [],
                |row| {
                    Ok(MCPConfigRow {
                        is_enabled: row.get(0)?,
                        permission_mode: row.get(1)?,
                        allowed_tools: row.get(2)?,
                        log_requests: row.get(3)?,
                        encrypted_secrets: row.get(4)?,
                    })
                },
            );

            match result {
                Ok(row) => row.into_config(),
                Err(rusqlite::Error::QueryReturnedNoRows) => Ok(MCPServerConfig::default()),
                Err(e) => Err(format!("Failed to get MCP config: {}", e)),
            }
        })
    }

    /// Save MCP server configuration
    pub fn save_config(&self, config: &MCPServerConfig) -> Result<(), String> {
        let allowed_tools_json = serde_json::to_string(&config.allowed_tools)
            .map_err(|e| format!("Failed to serialize allowed_tools: {}", e))?;

        let encrypted_secrets_json = serde_json::to_string(&config.encrypted_secrets)
            .map_err(|e| format!("Failed to serialize encrypted_secrets: {}", e))?;

        let permission_mode_str = match config.permission_mode {
            MCPPermissionMode::ReadOnly => "read_only",
            MCPPermissionMode::ExecuteWithConfirm => "execute_with_confirm",
            MCPPermissionMode::FullAccess => "full_access",
        };

        self.db.with_connection(|conn| {
            conn.execute(
                r#"
                INSERT OR REPLACE INTO mcp_config
                (id, is_enabled, permission_mode, allowed_tools, log_requests, encrypted_secrets)
                VALUES (1, ?1, ?2, ?3, ?4, ?5)
                "#,
                params![
                    config.is_enabled as i32,
                    permission_mode_str,
                    allowed_tools_json,
                    config.log_requests as i32,
                    encrypted_secrets_json,
                ],
            )
            .map_err(|e| format!("Failed to save MCP config: {}", e))?;

            Ok(())
        })
    }

    /// Update MCP enabled state
    pub fn set_enabled(&self, enabled: bool) -> Result<(), String> {
        self.db.with_connection(|conn| {
            conn.execute(
                "UPDATE mcp_config SET is_enabled = ?1 WHERE id = 1",
                params![enabled as i32],
            )
            .map_err(|e| format!("Failed to update MCP enabled state: {}", e))?;

            Ok(())
        })
    }

    /// Update MCP permission mode
    pub fn set_permission_mode(&self, mode: MCPPermissionMode) -> Result<(), String> {
        let mode_str = match mode {
            MCPPermissionMode::ReadOnly => "read_only",
            MCPPermissionMode::ExecuteWithConfirm => "execute_with_confirm",
            MCPPermissionMode::FullAccess => "full_access",
        };

        self.db.with_connection(|conn| {
            conn.execute(
                "UPDATE mcp_config SET permission_mode = ?1 WHERE id = 1",
                params![mode_str],
            )
            .map_err(|e| format!("Failed to update MCP permission mode: {}", e))?;

            Ok(())
        })
    }

    /// Update log requests setting
    pub fn set_log_requests(&self, enabled: bool) -> Result<(), String> {
        self.db.with_connection(|conn| {
            conn.execute(
                "UPDATE mcp_config SET log_requests = ?1 WHERE id = 1",
                params![enabled as i32],
            )
            .map_err(|e| format!("Failed to update log_requests: {}", e))?;

            Ok(())
        })
    }
}

/// Internal row structure for mapping database rows
struct MCPConfigRow {
    is_enabled: i32,
    permission_mode: String,
    allowed_tools: String,
    log_requests: i32,
    encrypted_secrets: Option<String>,
}

impl MCPConfigRow {
    fn into_config(self) -> Result<MCPServerConfig, String> {
        let permission_mode = match self.permission_mode.as_str() {
            "read_only" => MCPPermissionMode::ReadOnly,
            "execute_with_confirm" => MCPPermissionMode::ExecuteWithConfirm,
            "full_access" => MCPPermissionMode::FullAccess,
            _ => MCPPermissionMode::ReadOnly,
        };

        let allowed_tools: Vec<String> = serde_json::from_str(&self.allowed_tools)
            .unwrap_or_default();

        let encrypted_secrets: MCPEncryptedSecrets = self
            .encrypted_secrets
            .as_ref()
            .map(|json| serde_json::from_str(json).ok())
            .flatten()
            .unwrap_or_default();

        Ok(MCPServerConfig {
            is_enabled: self.is_enabled != 0,
            permission_mode,
            allowed_tools,
            log_requests: self.log_requests != 0,
            encrypted_secrets,
        })
    }
}
