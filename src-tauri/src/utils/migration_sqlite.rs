// JSON to SQLite Migration
// Handles migrating existing data from packageflow.json to SQLite database

use chrono::Utc;
use rusqlite::{params, Connection};
use serde_json::Value;
use std::path::PathBuf;

use super::database::Database;
use super::shared_store::{get_store_path, SharedStoreData, STORE_FILE};
use crate::models::mcp::{MCPPermissionMode, MCPServerConfig};
use crate::models::step_template::CustomStepTemplate;

/// Check if migration from JSON to SQLite is needed
pub fn needs_migration() -> Result<bool, String> {
    let json_path = get_store_path()?;
    let migrated_marker = json_path.with_extension("json.migrated");

    // Migration needed if JSON exists but hasn't been migrated
    Ok(json_path.exists() && !migrated_marker.exists())
}

/// Migrate data from JSON store to SQLite database
pub fn migrate_from_json(db: &Database) -> Result<MigrationResult, String> {
    let json_path = get_store_path()?;
    let marker_path = json_path.with_extension("json.migrated");

    // Skip if already migrated (marker file exists)
    if marker_path.exists() {
        log::info!("[Migration] Already migrated, skipping");
        return Ok(MigrationResult::no_migration_needed());
    }

    if !json_path.exists() {
        log::info!("[Migration] No JSON file to migrate");
        return Ok(MigrationResult::no_migration_needed());
    }

    log::info!("[Migration] Starting migration from JSON to SQLite...");
    log::info!("[Migration] JSON path: {:?}", json_path);

    // Create backup before migration
    let backup_path = match create_backup(&json_path) {
        Ok(path) => {
            log::info!("[Migration] Created backup at: {:?}", path);
            Some(path)
        }
        Err(e) => {
            log::warn!("[Migration] Failed to create backup: {}, continuing anyway", e);
            None
        }
    };

    // Read JSON data
    let content = std::fs::read_to_string(&json_path)
        .map_err(|e| format!("Failed to read JSON store: {}", e))?;

    log::info!("[Migration] Read {} bytes from JSON file", content.len());

    let store_data: SharedStoreData = serde_json::from_str(&content)
        .map_err(|e| {
            log::error!("[Migration] Failed to parse JSON: {}", e);
            format!("Failed to parse JSON store: {}", e)
        })?;

    log::info!(
        "[Migration] Parsed JSON: {} projects, {} workflows",
        store_data.projects.len(),
        store_data.workflows.len()
    );

    // Migrate data to SQLite in a transaction
    let result = db.with_transaction(|conn| {
        let mut stats = MigrationStats::default();

        // Migrate projects
        log::info!("[Migration] Migrating projects...");
        stats.projects = migrate_projects(conn, &store_data.projects)?;
        log::info!("[Migration] Migrated {} projects", stats.projects);

        // Migrate workflows
        log::info!("[Migration] Migrating workflows...");
        stats.workflows = migrate_workflows(conn, &store_data.workflows)?;
        log::info!("[Migration] Migrated {} workflows", stats.workflows);

        // Migrate settings
        log::info!("[Migration] Migrating settings...");
        stats.settings = migrate_settings(conn, &store_data.settings)?;
        log::info!("[Migration] Migrated {} settings", stats.settings);

        // Migrate security scans
        log::info!("[Migration] Migrating security scans...");
        stats.security_scans = migrate_security_scans(conn, &store_data.security_scans)?;
        log::info!("[Migration] Migrated {} security scans", stats.security_scans);

        // Migrate MCP config
        if let Some(mcp_config) = &store_data.mcp_config {
            log::info!("[Migration] Migrating MCP config...");
            migrate_mcp_config(conn, mcp_config)?;
            stats.mcp_config = true;
        }

        // Migrate custom step templates
        log::info!("[Migration] Migrating custom step templates...");
        stats.templates = migrate_custom_templates(conn, &store_data.custom_step_templates)?;
        log::info!("[Migration] Migrated {} templates", stats.templates);

        // Migrate extra fields (AI services, deploy accounts, etc.)
        log::info!("[Migration] Migrating extra fields...");
        migrate_extra_fields(conn, &store_data.extra)?;

        Ok(stats)
    })?;

    // Create marker file to indicate migration is complete
    std::fs::write(&marker_path, "Migration completed")
        .map_err(|e| format!("Failed to create migration marker: {}", e))?;

    // Delete the original JSON file (backup is kept for safety)
    if let Err(e) = std::fs::remove_file(&json_path) {
        log::warn!("[Migration] Failed to delete JSON file: {}, manual cleanup may be needed", e);
    } else {
        log::info!("[Migration] Deleted original JSON file");
    }

    log::info!("[Migration] Migration completed successfully!");
    log::info!(
        "[Migration] Stats: {} projects, {} workflows, {} settings, {} security scans, {} templates",
        result.projects, result.workflows, result.settings, result.security_scans, result.templates
    );

    Ok(MigrationResult {
        success: true,
        stats: result,
        backup_path,
    })
}

/// Migration result
#[derive(Debug)]
pub struct MigrationResult {
    pub success: bool,
    pub stats: MigrationStats,
    pub backup_path: Option<PathBuf>,
}

impl MigrationResult {
    fn no_migration_needed() -> Self {
        Self {
            success: true,
            stats: MigrationStats::default(),
            backup_path: None,
        }
    }
}

/// Migration statistics
#[derive(Debug, Default)]
pub struct MigrationStats {
    pub projects: usize,
    pub workflows: usize,
    pub settings: usize,
    pub security_scans: usize,
    pub templates: usize,
    pub mcp_config: bool,
}

/// Create a timestamped backup of the JSON file
fn create_backup(json_path: &PathBuf) -> Result<PathBuf, String> {
    let timestamp = Utc::now().format("%Y%m%d_%H%M%S");
    let backup_name = format!("{}.backup.{}", STORE_FILE, timestamp);
    let backup_path = json_path.with_file_name(backup_name);

    std::fs::copy(json_path, &backup_path)
        .map_err(|e| format!("Failed to create backup: {}", e))?;

    Ok(backup_path)
}

/// Migrate projects from JSON to SQLite
fn migrate_projects(conn: &Connection, projects: &[Value]) -> Result<usize, String> {
    let mut count = 0;

    for project in projects {
        let id = project["id"].as_str().unwrap_or_default();
        let name = project["name"].as_str().unwrap_or_default();
        let path = project["path"].as_str().unwrap_or_default();

        if id.is_empty() || path.is_empty() {
            log::warn!("Skipping invalid project: {:?}", project);
            continue;
        }

        conn.execute(
            r#"
            INSERT OR REPLACE INTO projects
            (id, name, path, version, description, is_monorepo, package_manager,
             scripts, worktree_sessions, created_at, last_opened_at,
             monorepo_tool, framework, ui_framework)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)
            "#,
            params![
                id,
                name,
                path,
                project["version"].as_str().unwrap_or("0.0.0"),
                project["description"].as_str(),
                project["isMonorepo"].as_bool().unwrap_or(false) as i32,
                project["packageManager"].as_str().unwrap_or("unknown"),
                project.get("scripts").map(|v| v.to_string()),
                project.get("worktreeSessions").map(|v| v.to_string()),
                project["createdAt"].as_str().unwrap_or_default(),
                project["lastOpenedAt"].as_str().unwrap_or_default(),
                // New fields for migration v7
                project["monorepoTool"].as_str(),
                project["framework"].as_str(),
                project["uiFramework"].as_str(),
            ],
        )
        .map_err(|e| format!("Failed to insert project {}: {}", id, e))?;

        count += 1;
    }

    Ok(count)
}

/// Migrate workflows from JSON to SQLite
fn migrate_workflows(conn: &Connection, workflows: &[Value]) -> Result<usize, String> {
    let mut count = 0;

    for workflow in workflows {
        let id = workflow["id"].as_str().unwrap_or_default();
        let name = workflow["name"].as_str().unwrap_or_default();

        if id.is_empty() {
            log::warn!("Skipping invalid workflow: {:?}", workflow);
            continue;
        }

        conn.execute(
            r#"
            INSERT OR REPLACE INTO workflows
            (id, name, description, project_id, nodes, webhook, incoming_webhook,
             created_at, updated_at, last_executed_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
            "#,
            params![
                id,
                name,
                workflow["description"].as_str(),
                workflow["projectId"].as_str(),
                workflow.get("nodes").map(|v| v.to_string()).unwrap_or_else(|| "[]".to_string()),
                workflow.get("webhook").map(|v| v.to_string()),
                workflow.get("incomingWebhook").map(|v| v.to_string()),
                workflow["createdAt"].as_str().unwrap_or_default(),
                workflow["updatedAt"].as_str().unwrap_or_default(),
                workflow["lastExecutedAt"].as_str(),
            ],
        )
        .map_err(|e| format!("Failed to insert workflow {}: {}", id, e))?;

        count += 1;
    }

    Ok(count)
}

/// Migrate settings from JSON to SQLite (key-value pairs)
fn migrate_settings(conn: &Connection, settings: &Value) -> Result<usize, String> {
    if settings.is_null() {
        return Ok(0);
    }

    let mut count = 0;
    let now = Utc::now().to_rfc3339();

    // Store the entire settings object as a single key for simplicity
    // This preserves all fields including any we don't explicitly know about
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3)",
        params!["app_settings", settings.to_string(), now],
    )
    .map_err(|e| format!("Failed to insert app_settings: {}", e))?;
    count += 1;

    // Also extract individual settings for easier querying
    if let Value::Object(map) = settings {
        for (key, value) in map {
            // Skip if already handled as app_settings
            if key == "keyboardShortcuts" {
                conn.execute(
                    "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3)",
                    params!["keyboard_shortcuts", value.to_string(), now],
                )
                .map_err(|e| format!("Failed to insert keyboard_shortcuts: {}", e))?;
                count += 1;
            }
        }
    }

    Ok(count)
}

/// Migrate security scans from JSON to SQLite
fn migrate_security_scans(conn: &Connection, scans: &Value) -> Result<usize, String> {
    if scans.is_null() {
        return Ok(0);
    }

    let mut count = 0;

    if let Value::Object(map) = scans {
        for (project_id, scan_data) in map {
            let package_manager = scan_data["packageManager"]
                .as_str()
                .unwrap_or("unknown");

            conn.execute(
                r#"
                INSERT OR REPLACE INTO security_scans
                (project_id, package_manager, last_scan, scan_history, snooze_until)
                VALUES (?1, ?2, ?3, ?4, ?5)
                "#,
                params![
                    project_id,
                    package_manager,
                    scan_data.get("lastScan").map(|v| v.to_string()),
                    scan_data.get("scanHistory").map(|v| v.to_string()).unwrap_or_else(|| "[]".to_string()),
                    scan_data["snoozeUntil"].as_str(),
                ],
            )
            .map_err(|e| format!("Failed to insert security scan for {}: {}", project_id, e))?;

            count += 1;
        }
    }

    Ok(count)
}

/// Migrate MCP configuration
fn migrate_mcp_config(
    conn: &Connection,
    config: &MCPServerConfig,
) -> Result<(), String> {
    conn.execute(
        r#"
        UPDATE mcp_config SET
            is_enabled = ?1,
            permission_mode = ?2,
            allowed_tools = ?3,
            log_requests = ?4,
            encrypted_secrets = ?5
        WHERE id = 1
        "#,
        params![
            config.is_enabled as i32,
            match config.permission_mode {
                MCPPermissionMode::ReadOnly => "read_only",
                MCPPermissionMode::ExecuteWithConfirm => "execute_with_confirm",
                MCPPermissionMode::FullAccess => "full_access",
            },
            serde_json::to_string(&config.allowed_tools).unwrap_or_else(|_| "[]".to_string()),
            config.log_requests as i32,
            serde_json::to_string(&config.encrypted_secrets).ok(),
        ],
    )
    .map_err(|e| format!("Failed to update MCP config: {}", e))?;

    Ok(())
}

/// Migrate custom step templates
fn migrate_custom_templates(
    conn: &Connection,
    templates: &[CustomStepTemplate],
) -> Result<usize, String> {
    let mut count = 0;

    for template in templates {
        // Convert category enum to string
        let category_str = serde_json::to_string(&template.category)
            .map(|s| s.trim_matches('"').to_string())
            .unwrap_or_else(|_| "custom".to_string());

        conn.execute(
            r#"
            INSERT OR REPLACE INTO custom_step_templates
            (id, name, command, category, description, is_custom, created_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
            "#,
            params![
                template.id,
                template.name,
                template.command,
                category_str,
                template.description,
                template.is_custom as i32,
                template.created_at,
            ],
        )
        .map_err(|e| format!("Failed to insert template {}: {}", template.id, e))?;

        count += 1;
    }

    Ok(count)
}

/// Migrate extra fields from the JSON store
/// Handles AI services, deploy accounts, and other fields stored in the 'extra' map
fn migrate_extra_fields(
    conn: &Connection,
    extra: &serde_json::Map<String, Value>,
) -> Result<(), String> {
    let now = Utc::now().to_rfc3339();

    // Migrate AI services
    if let Some(services) = extra.get("aiServices") {
        if let Value::Array(arr) = services {
            for service in arr {
                let id = service["id"].as_str().unwrap_or_default();
                if id.is_empty() {
                    continue;
                }

                conn.execute(
                    r#"
                    INSERT OR REPLACE INTO ai_services
                    (id, name, provider, endpoint, model, is_default, is_enabled, created_at, updated_at)
                    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
                    "#,
                    params![
                        id,
                        service["name"].as_str().unwrap_or_default(),
                        service["provider"].as_str().unwrap_or("openai"),
                        service["endpoint"].as_str().unwrap_or_default(),
                        service["model"].as_str().unwrap_or_default(),
                        service["isDefault"].as_bool().unwrap_or(false) as i32,
                        service["isEnabled"].as_bool().unwrap_or(true) as i32,
                        service["createdAt"].as_str().unwrap_or(&now),
                        service["updatedAt"].as_str().unwrap_or(&now),
                    ],
                )
                .map_err(|e| format!("Failed to insert AI service {}: {}", id, e))?;
            }
        }
    }

    // Migrate AI templates
    if let Some(templates) = extra.get("aiTemplates") {
        if let Value::Array(arr) = templates {
            for template in arr {
                let id = template["id"].as_str().unwrap_or_default();
                if id.is_empty() {
                    continue;
                }

                conn.execute(
                    r#"
                    INSERT OR REPLACE INTO ai_templates
                    (id, name, description, category, template, output_format,
                     is_default, is_builtin, created_at, updated_at)
                    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
                    "#,
                    params![
                        id,
                        template["name"].as_str().unwrap_or_default(),
                        template["description"].as_str(),
                        template["category"].as_str().unwrap_or("git_commit"),
                        template["template"].as_str().unwrap_or_default(),
                        template["outputFormat"].as_str(),
                        template["isDefault"].as_bool().unwrap_or(false) as i32,
                        template["isBuiltin"].as_bool().unwrap_or(false) as i32,
                        template["createdAt"].as_str().unwrap_or(&now),
                        template["updatedAt"].as_str().unwrap_or(&now),
                    ],
                )
                .map_err(|e| format!("Failed to insert AI template {}: {}", id, e))?;
            }
        }
    }

    // Migrate deploy accounts
    if let Some(accounts) = extra.get("deployAccounts") {
        if let Value::Array(arr) = accounts {
            for account in arr {
                let id = account["id"].as_str().unwrap_or_default();
                if id.is_empty() {
                    continue;
                }

                conn.execute(
                    r#"
                    INSERT OR REPLACE INTO deploy_accounts
                    (id, platform, platform_user_id, username, display_name,
                     avatar_url, access_token, connected_at, expires_at)
                    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
                    "#,
                    params![
                        id,
                        account["platform"].as_str().unwrap_or("github_pages"),
                        account["platformUserId"].as_str().unwrap_or_default(),
                        account["username"].as_str().unwrap_or_default(),
                        account["displayName"].as_str(),
                        account["avatarUrl"].as_str(),
                        account["accessToken"].as_str().unwrap_or_default(),
                        account["connectedAt"].as_str().unwrap_or(&now),
                        account["expiresAt"].as_str(),
                    ],
                )
                .map_err(|e| format!("Failed to insert deploy account {}: {}", id, e))?;
            }
        }
    }

    // Store any other extra fields as settings for preservation
    for (key, value) in extra {
        // Skip already migrated fields
        if matches!(
            key.as_str(),
            "aiServices" | "aiTemplates" | "deployAccounts" | "deployPreferences" | "deploymentConfigs"
        ) {
            continue;
        }

        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3)",
            params![key, value.to_string(), now],
        )
        .map_err(|e| format!("Failed to insert extra field {}: {}", key, e))?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_migrate_empty_store() {
        let dir = tempdir().unwrap();
        let db_path = dir.path().join("test.db");
        let db = Database::new(db_path).unwrap();

        // Create an empty JSON store
        let json_path = dir.path().join(STORE_FILE);
        std::fs::write(&json_path, "{}").unwrap();

        // Override the store path for testing
        // Note: In production, this would use the actual store path
    }
}
