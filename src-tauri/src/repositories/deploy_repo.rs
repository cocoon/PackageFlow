// Deploy Repository
// Handles all database operations for deploy accounts and configurations

use chrono::{DateTime, Utc};
use rusqlite::params;

use crate::models::deploy::{DeployAccount, DeploymentConfig, DeploymentEnvironment, EnvVariable, PlatformType};
use crate::utils::database::Database;

/// Repository for deploy data access
pub struct DeployRepository {
    db: Database,
}

impl DeployRepository {
    /// Create a new DeployRepository
    pub fn new(db: Database) -> Self {
        Self { db }
    }

    // =========================================================================
    // Deploy Accounts
    // =========================================================================

    /// List all deploy accounts
    pub fn list_accounts(&self) -> Result<Vec<DeployAccount>, String> {
        self.db.with_connection(|conn| {
            let mut stmt = conn
                .prepare(
                    r#"
                    SELECT id, platform, platform_user_id, username, display_name,
                           avatar_url, access_token, connected_at, expires_at
                    FROM deploy_accounts
                    ORDER BY connected_at DESC
                    "#,
                )
                .map_err(|e| format!("Failed to prepare statement: {}", e))?;

            let rows = stmt
                .query_map([], |row| {
                    Ok(AccountRow {
                        id: row.get(0)?,
                        platform: row.get(1)?,
                        platform_user_id: row.get(2)?,
                        username: row.get(3)?,
                        display_name: row.get(4)?,
                        avatar_url: row.get(5)?,
                        access_token: row.get(6)?,
                        connected_at: row.get(7)?,
                        expires_at: row.get(8)?,
                    })
                })
                .map_err(|e| format!("Failed to query deploy accounts: {}", e))?;

            let mut accounts = Vec::new();
            for row in rows {
                let row = row.map_err(|e| format!("Failed to read row: {}", e))?;
                accounts.push(row.into_account()?);
            }

            Ok(accounts)
        })
    }

    /// List accounts by platform
    pub fn list_accounts_by_platform(
        &self,
        platform: PlatformType,
    ) -> Result<Vec<DeployAccount>, String> {
        let platform_str = platform_to_string(&platform);

        self.db.with_connection(|conn| {
            let mut stmt = conn
                .prepare(
                    r#"
                    SELECT id, platform, platform_user_id, username, display_name,
                           avatar_url, access_token, connected_at, expires_at
                    FROM deploy_accounts
                    WHERE platform = ?1
                    ORDER BY connected_at DESC
                    "#,
                )
                .map_err(|e| format!("Failed to prepare statement: {}", e))?;

            let rows = stmt
                .query_map(params![platform_str], |row| {
                    Ok(AccountRow {
                        id: row.get(0)?,
                        platform: row.get(1)?,
                        platform_user_id: row.get(2)?,
                        username: row.get(3)?,
                        display_name: row.get(4)?,
                        avatar_url: row.get(5)?,
                        access_token: row.get(6)?,
                        connected_at: row.get(7)?,
                        expires_at: row.get(8)?,
                    })
                })
                .map_err(|e| format!("Failed to query deploy accounts: {}", e))?;

            let mut accounts = Vec::new();
            for row in rows {
                let row = row.map_err(|e| format!("Failed to read row: {}", e))?;
                accounts.push(row.into_account()?);
            }

            Ok(accounts)
        })
    }

    /// Get a deploy account by ID
    pub fn get_account(&self, id: &str) -> Result<Option<DeployAccount>, String> {
        self.db.with_connection(|conn| {
            let result = conn.query_row(
                r#"
                SELECT id, platform, platform_user_id, username, display_name,
                       avatar_url, access_token, connected_at, expires_at
                FROM deploy_accounts
                WHERE id = ?1
                "#,
                params![id],
                |row| {
                    Ok(AccountRow {
                        id: row.get(0)?,
                        platform: row.get(1)?,
                        platform_user_id: row.get(2)?,
                        username: row.get(3)?,
                        display_name: row.get(4)?,
                        avatar_url: row.get(5)?,
                        access_token: row.get(6)?,
                        connected_at: row.get(7)?,
                        expires_at: row.get(8)?,
                    })
                },
            );

            match result {
                Ok(row) => Ok(Some(row.into_account()?)),
                Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
                Err(e) => Err(format!("Failed to get deploy account: {}", e)),
            }
        })
    }

    /// Save a deploy account
    pub fn save_account(&self, account: &DeployAccount) -> Result<(), String> {
        let platform_str = platform_to_string(&account.platform);
        let connected_at_str = account.connected_at.to_rfc3339();
        let expires_at_str = account.expires_at.map(|dt| dt.to_rfc3339());

        self.db.with_connection(|conn| {
            conn.execute(
                r#"
                INSERT OR REPLACE INTO deploy_accounts
                (id, platform, platform_user_id, username, display_name,
                 avatar_url, access_token, connected_at, expires_at)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
                "#,
                params![
                    account.id,
                    platform_str,
                    account.platform_user_id,
                    account.username,
                    account.display_name,
                    account.avatar_url,
                    account.access_token,
                    connected_at_str,
                    expires_at_str,
                ],
            )
            .map_err(|e| format!("Failed to save deploy account: {}", e))?;

            Ok(())
        })
    }

    /// Delete a deploy account
    pub fn delete_account(&self, id: &str) -> Result<bool, String> {
        self.db.with_connection(|conn| {
            let rows_affected = conn
                .execute("DELETE FROM deploy_accounts WHERE id = ?1", params![id])
                .map_err(|e| format!("Failed to delete deploy account: {}", e))?;

            Ok(rows_affected > 0)
        })
    }

    // =========================================================================
    // Deployment Configurations
    // =========================================================================

    /// Get deployment config for a project
    pub fn get_config(&self, project_id: &str) -> Result<Option<DeploymentConfig>, String> {
        self.db.with_connection(|conn| {
            let result = conn.query_row(
                r#"
                SELECT project_id, platform, account_id, environment, framework_preset,
                       env_variables, root_directory, install_command, build_command,
                       output_directory, netlify_site_id, netlify_site_name,
                       cloudflare_account_id, cloudflare_project_name
                FROM deployment_configs
                WHERE project_id = ?1
                "#,
                params![project_id],
                |row| {
                    Ok(ConfigRow {
                        project_id: row.get(0)?,
                        platform: row.get(1)?,
                        account_id: row.get(2)?,
                        environment: row.get(3)?,
                        framework_preset: row.get(4)?,
                        env_variables: row.get(5)?,
                        root_directory: row.get(6)?,
                        install_command: row.get(7)?,
                        build_command: row.get(8)?,
                        output_directory: row.get(9)?,
                        netlify_site_id: row.get(10)?,
                        netlify_site_name: row.get(11)?,
                        cloudflare_account_id: row.get(12)?,
                        cloudflare_project_name: row.get(13)?,
                    })
                },
            );

            match result {
                Ok(row) => Ok(Some(row.into_config()?)),
                Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
                Err(e) => Err(format!("Failed to get deployment config: {}", e)),
            }
        })
    }

    /// Save deployment config for a project
    pub fn save_config(&self, config: &DeploymentConfig) -> Result<(), String> {
        let platform_str = platform_to_string(&config.platform);
        let environment_str = environment_to_string(&config.environment);

        let env_vars_json = serde_json::to_string(&config.env_variables)
            .map_err(|e| format!("Failed to serialize env_variables: {}", e))?;

        self.db.with_connection(|conn| {
            conn.execute(
                r#"
                INSERT OR REPLACE INTO deployment_configs
                (project_id, platform, account_id, environment, framework_preset,
                 env_variables, root_directory, install_command, build_command,
                 output_directory, netlify_site_id, netlify_site_name,
                 cloudflare_account_id, cloudflare_project_name)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)
                "#,
                params![
                    config.project_id,
                    platform_str,
                    config.account_id,
                    environment_str,
                    config.framework_preset,
                    env_vars_json,
                    config.root_directory,
                    config.install_command,
                    config.build_command,
                    config.output_directory,
                    config.netlify_site_id,
                    config.netlify_site_name,
                    config.cloudflare_account_id,
                    config.cloudflare_project_name,
                ],
            )
            .map_err(|e| format!("Failed to save deployment config: {}", e))?;

            Ok(())
        })
    }

    /// Delete deployment config for a project
    pub fn delete_config(&self, project_id: &str) -> Result<bool, String> {
        self.db.with_connection(|conn| {
            let rows_affected = conn
                .execute(
                    "DELETE FROM deployment_configs WHERE project_id = ?1",
                    params![project_id],
                )
                .map_err(|e| format!("Failed to delete deployment config: {}", e))?;

            Ok(rows_affected > 0)
        })
    }
}

/// Convert PlatformType to string
fn platform_to_string(platform: &PlatformType) -> &'static str {
    match platform {
        PlatformType::GithubPages => "github_pages",
        PlatformType::Netlify => "netlify",
        PlatformType::CloudflarePages => "cloudflare_pages",
    }
}

/// Convert string to PlatformType
fn string_to_platform(s: &str) -> PlatformType {
    match s {
        "github_pages" => PlatformType::GithubPages,
        "netlify" => PlatformType::Netlify,
        "cloudflare_pages" => PlatformType::CloudflarePages,
        _ => PlatformType::GithubPages,
    }
}

/// Convert DeploymentEnvironment to string
fn environment_to_string(env: &DeploymentEnvironment) -> &'static str {
    match env {
        DeploymentEnvironment::Production => "production",
        DeploymentEnvironment::Preview => "preview",
    }
}

/// Convert string to DeploymentEnvironment
fn string_to_environment(s: &str) -> DeploymentEnvironment {
    match s.to_lowercase().as_str() {
        "preview" => DeploymentEnvironment::Preview,
        _ => DeploymentEnvironment::Production,
    }
}

/// Internal row structure for deploy accounts
struct AccountRow {
    id: String,
    platform: String,
    platform_user_id: String,
    username: String,
    display_name: Option<String>,
    avatar_url: Option<String>,
    access_token: String,
    connected_at: String,
    expires_at: Option<String>,
}

impl AccountRow {
    fn into_account(self) -> Result<DeployAccount, String> {
        let connected_at = DateTime::parse_from_rfc3339(&self.connected_at)
            .map(|dt| dt.with_timezone(&Utc))
            .unwrap_or_else(|_| Utc::now());

        let expires_at = self
            .expires_at
            .as_ref()
            .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
            .map(|dt| dt.with_timezone(&Utc));

        Ok(DeployAccount {
            id: self.id,
            platform: string_to_platform(&self.platform),
            platform_user_id: self.platform_user_id,
            username: self.username,
            display_name: self.display_name,
            avatar_url: self.avatar_url,
            access_token: self.access_token,
            connected_at,
            expires_at,
        })
    }
}

/// Internal row structure for deployment configs
struct ConfigRow {
    project_id: String,
    platform: String,
    account_id: Option<String>,
    environment: Option<String>,
    framework_preset: Option<String>,
    env_variables: Option<String>,
    root_directory: Option<String>,
    install_command: Option<String>,
    build_command: Option<String>,
    output_directory: Option<String>,
    netlify_site_id: Option<String>,
    netlify_site_name: Option<String>,
    cloudflare_account_id: Option<String>,
    cloudflare_project_name: Option<String>,
}

impl ConfigRow {
    fn into_config(self) -> Result<DeploymentConfig, String> {
        let env_variables: Vec<EnvVariable> = self
            .env_variables
            .as_ref()
            .and_then(|json| serde_json::from_str(json).ok())
            .unwrap_or_default();

        let environment = self
            .environment
            .as_ref()
            .map(|s| string_to_environment(s))
            .unwrap_or_default();

        Ok(DeploymentConfig {
            project_id: self.project_id,
            platform: string_to_platform(&self.platform),
            account_id: self.account_id,
            environment,
            framework_preset: self.framework_preset,
            env_variables,
            root_directory: self.root_directory,
            install_command: self.install_command,
            build_command: self.build_command,
            output_directory: self.output_directory,
            netlify_site_id: self.netlify_site_id,
            netlify_site_name: self.netlify_site_name,
            cloudflare_account_id: self.cloudflare_account_id,
            cloudflare_project_name: self.cloudflare_project_name,
        })
    }
}
