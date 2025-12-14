// SQLite Schema Definitions and Migrations
// Contains all table definitions and migration logic

use rusqlite::{Connection, params};

/// Current schema version
pub const CURRENT_VERSION: i32 = 1;

/// Migration struct containing version and SQL statements
struct Migration {
    version: i32,
    description: &'static str,
    up: &'static str,
}

/// All migrations in order
const MIGRATIONS: &[Migration] = &[
    Migration {
        version: 1,
        description: "Initial schema",
        up: r#"
            -- Schema version tracking
            CREATE TABLE IF NOT EXISTS schema_version (
                version INTEGER PRIMARY KEY,
                applied_at TEXT NOT NULL DEFAULT (datetime('now')),
                description TEXT
            );

            -- Projects table
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                path TEXT NOT NULL UNIQUE,
                version TEXT DEFAULT '0.0.0',
                description TEXT,
                is_monorepo INTEGER DEFAULT 0,
                package_manager TEXT DEFAULT 'unknown' CHECK(package_manager IN ('npm', 'yarn', 'pnpm', 'bun', 'unknown')),
                scripts TEXT,
                worktree_sessions TEXT,
                created_at TEXT NOT NULL,
                last_opened_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_projects_path ON projects(path);
            CREATE INDEX IF NOT EXISTS idx_projects_last_opened ON projects(last_opened_at DESC);

            -- Workflows table
            CREATE TABLE IF NOT EXISTS workflows (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
                nodes TEXT NOT NULL DEFAULT '[]',
                webhook TEXT,
                incoming_webhook TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                last_executed_at TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_workflows_project ON workflows(project_id);
            CREATE INDEX IF NOT EXISTS idx_workflows_updated ON workflows(updated_at DESC);

            -- Running executions (ephemeral, cleared on app restart)
            CREATE TABLE IF NOT EXISTS running_executions (
                id TEXT PRIMARY KEY,
                workflow_id TEXT NOT NULL,
                execution_data TEXT NOT NULL
            );

            -- Execution history
            CREATE TABLE IF NOT EXISTS execution_history (
                id TEXT PRIMARY KEY,
                workflow_id TEXT NOT NULL,
                workflow_name TEXT NOT NULL,
                status TEXT NOT NULL,
                started_at TEXT NOT NULL,
                finished_at TEXT NOT NULL,
                duration_ms INTEGER NOT NULL,
                node_count INTEGER NOT NULL,
                completed_node_count INTEGER NOT NULL,
                error_message TEXT,
                output TEXT,
                triggered_by TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE INDEX IF NOT EXISTS idx_execution_history_workflow ON execution_history(workflow_id);
            CREATE INDEX IF NOT EXISTS idx_execution_history_created ON execution_history(created_at DESC);

            -- Security scans
            CREATE TABLE IF NOT EXISTS security_scans (
                project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
                package_manager TEXT NOT NULL,
                last_scan TEXT,
                scan_history TEXT DEFAULT '[]',
                snooze_until TEXT
            );

            -- Custom step templates
            CREATE TABLE IF NOT EXISTS custom_step_templates (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                command TEXT NOT NULL,
                category TEXT NOT NULL DEFAULT 'custom',
                description TEXT,
                is_custom INTEGER DEFAULT 1,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_templates_category ON custom_step_templates(category);

            -- Settings (key-value store for flexibility)
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            -- MCP configuration (singleton)
            CREATE TABLE IF NOT EXISTS mcp_config (
                id INTEGER PRIMARY KEY CHECK(id = 1),
                is_enabled INTEGER DEFAULT 0,
                permission_mode TEXT DEFAULT 'read_only' CHECK(permission_mode IN ('read_only', 'execute_with_confirm', 'full_access')),
                allowed_tools TEXT DEFAULT '[]',
                log_requests INTEGER DEFAULT 1,
                encrypted_secrets TEXT
            );
            -- Insert default MCP config
            INSERT OR IGNORE INTO mcp_config (id) VALUES (1);

            -- AI services
            CREATE TABLE IF NOT EXISTS ai_services (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                provider TEXT NOT NULL CHECK(provider IN ('openai', 'anthropic', 'gemini', 'ollama', 'lm_studio')),
                endpoint TEXT NOT NULL,
                model TEXT NOT NULL,
                is_default INTEGER DEFAULT 0,
                is_enabled INTEGER DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            -- AI prompt templates
            CREATE TABLE IF NOT EXISTS ai_templates (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                category TEXT NOT NULL DEFAULT 'git_commit' CHECK(category IN ('git_commit', 'pull_request', 'code_review', 'documentation', 'release_notes', 'custom')),
                template TEXT NOT NULL,
                output_format TEXT,
                is_default INTEGER DEFAULT 0,
                is_builtin INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_ai_templates_category ON ai_templates(category);

            -- Deploy accounts
            CREATE TABLE IF NOT EXISTS deploy_accounts (
                id TEXT PRIMARY KEY,
                platform TEXT NOT NULL CHECK(platform IN ('github_pages', 'netlify', 'cloudflare_pages')),
                platform_user_id TEXT NOT NULL,
                username TEXT NOT NULL,
                display_name TEXT,
                avatar_url TEXT,
                access_token TEXT NOT NULL,
                connected_at TEXT NOT NULL,
                expires_at TEXT,
                UNIQUE(platform, platform_user_id)
            );
            CREATE INDEX IF NOT EXISTS idx_deploy_accounts_platform ON deploy_accounts(platform);

            -- Deploy preferences (singleton)
            CREATE TABLE IF NOT EXISTS deploy_preferences (
                id INTEGER PRIMARY KEY CHECK(id = 1),
                default_github_pages_account_id TEXT REFERENCES deploy_accounts(id) ON DELETE SET NULL,
                default_netlify_account_id TEXT REFERENCES deploy_accounts(id) ON DELETE SET NULL,
                default_cloudflare_pages_account_id TEXT REFERENCES deploy_accounts(id) ON DELETE SET NULL
            );
            -- Insert default deploy preferences
            INSERT OR IGNORE INTO deploy_preferences (id) VALUES (1);

            -- Deployment configurations per project
            CREATE TABLE IF NOT EXISTS deployment_configs (
                project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
                platform TEXT NOT NULL,
                account_id TEXT REFERENCES deploy_accounts(id) ON DELETE SET NULL,
                environment TEXT DEFAULT 'production',
                framework_preset TEXT,
                env_variables TEXT DEFAULT '[]',
                root_directory TEXT,
                install_command TEXT,
                build_command TEXT,
                output_directory TEXT,
                netlify_site_id TEXT,
                netlify_site_name TEXT,
                cloudflare_account_id TEXT,
                cloudflare_project_name TEXT
            );

            -- Deployment history
            CREATE TABLE IF NOT EXISTS deployments (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                platform TEXT NOT NULL,
                status TEXT NOT NULL,
                url TEXT,
                created_at TEXT NOT NULL,
                completed_at TEXT,
                commit_hash TEXT,
                commit_message TEXT,
                error_message TEXT,
                admin_url TEXT,
                deploy_time INTEGER,
                branch TEXT,
                site_name TEXT,
                preview_url TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_deployments_project ON deployments(project_id);
            CREATE INDEX IF NOT EXISTS idx_deployments_created ON deployments(created_at DESC);

            -- Incoming webhook configurations
            CREATE TABLE IF NOT EXISTS incoming_webhooks (
                id TEXT PRIMARY KEY,
                workflow_id TEXT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
                secret TEXT NOT NULL,
                is_enabled INTEGER DEFAULT 1,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_incoming_webhooks_workflow ON incoming_webhooks(workflow_id);
        "#,
    },
];

/// Run all pending migrations using Database wrapper
pub fn migrate(db: &super::database::Database) -> Result<(), String> {
    db.with_connection(|conn| run_migrations(conn))
}

/// Run all pending migrations
pub fn run_migrations(conn: &Connection) -> Result<(), String> {
    // Ensure schema_version table exists first
    conn.execute(
        r#"
        CREATE TABLE IF NOT EXISTS schema_version (
            version INTEGER PRIMARY KEY,
            applied_at TEXT NOT NULL DEFAULT (datetime('now')),
            description TEXT
        )
        "#,
        [],
    )
    .map_err(|e| format!("Failed to create schema_version table: {}", e))?;

    // Get current version
    let current_version: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(version), 0) FROM schema_version",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    // Run pending migrations
    for migration in MIGRATIONS {
        if migration.version > current_version {
            log::info!(
                "Running migration v{}: {}",
                migration.version,
                migration.description
            );

            // Execute migration SQL
            conn.execute_batch(migration.up)
                .map_err(|e| format!("Migration v{} failed: {}", migration.version, e))?;

            // Record migration
            conn.execute(
                "INSERT INTO schema_version (version, description) VALUES (?1, ?2)",
                params![migration.version, migration.description],
            )
            .map_err(|e| format!("Failed to record migration v{}: {}", migration.version, e))?;

            log::info!("Migration v{} completed", migration.version);
        }
    }

    Ok(())
}

/// Get the current schema version
pub fn get_version(conn: &Connection) -> Result<i32, String> {
    conn.query_row(
        "SELECT COALESCE(MAX(version), 0) FROM schema_version",
        [],
        |row| row.get(0),
    )
    .map_err(|e| format!("Failed to get schema version: {}", e))
}

/// Check if a table exists
pub fn table_exists(conn: &Connection, table_name: &str) -> Result<bool, String> {
    let count: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?1",
            params![table_name],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to check table existence: {}", e))?;
    Ok(count > 0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_migrations() {
        let conn = Connection::open_in_memory().unwrap();
        run_migrations(&conn).unwrap();

        // Verify schema version
        let version = get_version(&conn).unwrap();
        assert_eq!(version, CURRENT_VERSION);

        // Verify tables exist
        assert!(table_exists(&conn, "projects").unwrap());
        assert!(table_exists(&conn, "workflows").unwrap());
        assert!(table_exists(&conn, "settings").unwrap());
        assert!(table_exists(&conn, "mcp_config").unwrap());
        assert!(table_exists(&conn, "ai_services").unwrap());
        assert!(table_exists(&conn, "deploy_accounts").unwrap());
    }

    #[test]
    fn test_idempotent_migrations() {
        let conn = Connection::open_in_memory().unwrap();

        // Run migrations twice
        run_migrations(&conn).unwrap();
        run_migrations(&conn).unwrap();

        // Should still be version 1
        let version = get_version(&conn).unwrap();
        assert_eq!(version, CURRENT_VERSION);
    }
}
