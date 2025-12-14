// Settings Repository
// Handles all database operations for settings (key-value store)

use chrono::Utc;
use rusqlite::params;
use serde::{de::DeserializeOwned, Serialize};

use crate::utils::database::Database;
use crate::utils::store::{AppSettings, KeyboardShortcutsSettings};

/// Well-known settings keys
pub const KEY_APP_SETTINGS: &str = "app_settings";
pub const KEY_KEYBOARD_SHORTCUTS: &str = "keyboard_shortcuts";
pub const KEY_PROJECT_SORT_MODE: &str = "project_sort_mode";
pub const KEY_PROJECT_ORDER: &str = "project_order";
pub const KEY_WORKFLOW_SORT_MODE: &str = "workflow_sort_mode";
pub const KEY_WORKFLOW_ORDER: &str = "workflow_order";

/// Repository for settings data access
pub struct SettingsRepository {
    db: Database,
}

impl SettingsRepository {
    /// Create a new SettingsRepository
    pub fn new(db: Database) -> Self {
        Self { db }
    }

    /// Get a setting value by key
    pub fn get<T: DeserializeOwned>(&self, key: &str) -> Result<Option<T>, String> {
        self.db.with_connection(|conn| {
            let result = conn.query_row(
                "SELECT value FROM settings WHERE key = ?1",
                params![key],
                |row| {
                    let value: String = row.get(0)?;
                    Ok(value)
                },
            );

            match result {
                Ok(json) => {
                    let value: T = serde_json::from_str(&json)
                        .map_err(|e| format!("Failed to parse setting '{}': {}", key, e))?;
                    Ok(Some(value))
                }
                Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
                Err(e) => Err(format!("Failed to get setting '{}': {}", key, e)),
            }
        })
    }

    /// Get a setting value or return default
    pub fn get_or_default<T: DeserializeOwned + Default>(&self, key: &str) -> Result<T, String> {
        self.get(key).map(|opt| opt.unwrap_or_default())
    }

    /// Set a setting value
    pub fn set<T: Serialize>(&self, key: &str, value: &T) -> Result<(), String> {
        let json = serde_json::to_string(value)
            .map_err(|e| format!("Failed to serialize setting '{}': {}", key, e))?;

        let now = Utc::now().to_rfc3339();

        self.db.with_connection(|conn| {
            conn.execute(
                "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3)",
                params![key, json, now],
            )
            .map_err(|e| format!("Failed to save setting '{}': {}", key, e))?;

            Ok(())
        })
    }

    /// Delete a setting
    pub fn delete(&self, key: &str) -> Result<bool, String> {
        self.db.with_connection(|conn| {
            let rows_affected = conn
                .execute("DELETE FROM settings WHERE key = ?1", params![key])
                .map_err(|e| format!("Failed to delete setting '{}': {}", key, e))?;

            Ok(rows_affected > 0)
        })
    }

    /// List all setting keys
    pub fn list_keys(&self) -> Result<Vec<String>, String> {
        self.db.with_connection(|conn| {
            let mut stmt = conn
                .prepare("SELECT key FROM settings ORDER BY key")
                .map_err(|e| format!("Failed to prepare statement: {}", e))?;

            let rows = stmt
                .query_map([], |row| row.get(0))
                .map_err(|e| format!("Failed to query settings: {}", e))?;

            let mut keys = Vec::new();
            for row in rows {
                keys.push(row.map_err(|e| format!("Failed to read row: {}", e))?);
            }

            Ok(keys)
        })
    }

    // =========================================================================
    // Typed convenience methods for common settings
    // =========================================================================

    /// Get app settings
    pub fn get_app_settings(&self) -> Result<AppSettings, String> {
        self.get_or_default(KEY_APP_SETTINGS)
    }

    /// Save app settings
    pub fn save_app_settings(&self, settings: &AppSettings) -> Result<(), String> {
        self.set(KEY_APP_SETTINGS, settings)
    }

    /// Get keyboard shortcuts settings
    pub fn get_keyboard_shortcuts(&self) -> Result<KeyboardShortcutsSettings, String> {
        self.get_or_default(KEY_KEYBOARD_SHORTCUTS)
    }

    /// Save keyboard shortcuts settings
    pub fn save_keyboard_shortcuts(
        &self,
        shortcuts: &KeyboardShortcutsSettings,
    ) -> Result<(), String> {
        self.set(KEY_KEYBOARD_SHORTCUTS, shortcuts)
    }

    /// Get project sort mode
    pub fn get_project_sort_mode(&self) -> Result<String, String> {
        self.get(KEY_PROJECT_SORT_MODE)
            .map(|opt| opt.unwrap_or_else(|| "lastOpened".to_string()))
    }

    /// Set project sort mode
    pub fn set_project_sort_mode(&self, mode: &str) -> Result<(), String> {
        self.set(KEY_PROJECT_SORT_MODE, &mode.to_string())
    }

    /// Get project order (for custom sorting)
    pub fn get_project_order(&self) -> Result<Vec<String>, String> {
        self.get_or_default(KEY_PROJECT_ORDER)
    }

    /// Set project order
    pub fn set_project_order(&self, order: &[String]) -> Result<(), String> {
        self.set(KEY_PROJECT_ORDER, &order)
    }

    /// Get workflow sort mode
    pub fn get_workflow_sort_mode(&self) -> Result<String, String> {
        self.get(KEY_WORKFLOW_SORT_MODE)
            .map(|opt| opt.unwrap_or_else(|| "updated".to_string()))
    }

    /// Set workflow sort mode
    pub fn set_workflow_sort_mode(&self, mode: &str) -> Result<(), String> {
        self.set(KEY_WORKFLOW_SORT_MODE, &mode.to_string())
    }

    /// Get workflow order (for custom sorting)
    pub fn get_workflow_order(&self) -> Result<Vec<String>, String> {
        self.get_or_default(KEY_WORKFLOW_ORDER)
    }

    /// Set workflow order
    pub fn set_workflow_order(&self, order: &[String]) -> Result<(), String> {
        self.set(KEY_WORKFLOW_ORDER, &order)
    }
}
