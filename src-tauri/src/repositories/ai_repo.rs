// AI Repository
// Handles all database operations for AI services and templates

use chrono::Utc;
use rusqlite::params;

use crate::models::ai::{AIProvider, AIServiceConfig, CommitFormat, PromptTemplate, TemplateCategory};
use crate::utils::database::Database;

/// Repository for AI service and template data access
pub struct AIRepository {
    db: Database,
}

impl AIRepository {
    /// Create a new AIRepository
    pub fn new(db: Database) -> Self {
        Self { db }
    }

    // =========================================================================
    // AI Services
    // =========================================================================

    /// List all AI services
    pub fn list_services(&self) -> Result<Vec<AIServiceConfig>, String> {
        self.db.with_connection(|conn| {
            let mut stmt = conn
                .prepare(
                    r#"
                    SELECT id, name, provider, endpoint, model, is_default, is_enabled,
                           created_at, updated_at
                    FROM ai_services
                    ORDER BY name
                    "#,
                )
                .map_err(|e| format!("Failed to prepare statement: {}", e))?;

            let rows = stmt
                .query_map([], |row| {
                    Ok(AIServiceRow {
                        id: row.get(0)?,
                        name: row.get(1)?,
                        provider: row.get(2)?,
                        endpoint: row.get(3)?,
                        model: row.get(4)?,
                        is_default: row.get(5)?,
                        is_enabled: row.get(6)?,
                        created_at: row.get(7)?,
                        updated_at: row.get(8)?,
                    })
                })
                .map_err(|e| format!("Failed to query AI services: {}", e))?;

            let mut services = Vec::new();
            for row in rows {
                let row = row.map_err(|e| format!("Failed to read row: {}", e))?;
                services.push(row.into_service()?);
            }

            Ok(services)
        })
    }

    /// Get an AI service by ID
    pub fn get_service(&self, id: &str) -> Result<Option<AIServiceConfig>, String> {
        self.db.with_connection(|conn| {
            let result = conn.query_row(
                r#"
                SELECT id, name, provider, endpoint, model, is_default, is_enabled,
                       created_at, updated_at
                FROM ai_services
                WHERE id = ?1
                "#,
                params![id],
                |row| {
                    Ok(AIServiceRow {
                        id: row.get(0)?,
                        name: row.get(1)?,
                        provider: row.get(2)?,
                        endpoint: row.get(3)?,
                        model: row.get(4)?,
                        is_default: row.get(5)?,
                        is_enabled: row.get(6)?,
                        created_at: row.get(7)?,
                        updated_at: row.get(8)?,
                    })
                },
            );

            match result {
                Ok(row) => Ok(Some(row.into_service()?)),
                Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
                Err(e) => Err(format!("Failed to get AI service: {}", e)),
            }
        })
    }

    /// Get the default AI service
    pub fn get_default_service(&self) -> Result<Option<AIServiceConfig>, String> {
        self.db.with_connection(|conn| {
            let result = conn.query_row(
                r#"
                SELECT id, name, provider, endpoint, model, is_default, is_enabled,
                       created_at, updated_at
                FROM ai_services
                WHERE is_default = 1 AND is_enabled = 1
                LIMIT 1
                "#,
                [],
                |row| {
                    Ok(AIServiceRow {
                        id: row.get(0)?,
                        name: row.get(1)?,
                        provider: row.get(2)?,
                        endpoint: row.get(3)?,
                        model: row.get(4)?,
                        is_default: row.get(5)?,
                        is_enabled: row.get(6)?,
                        created_at: row.get(7)?,
                        updated_at: row.get(8)?,
                    })
                },
            );

            match result {
                Ok(row) => Ok(Some(row.into_service()?)),
                Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
                Err(e) => Err(format!("Failed to get default AI service: {}", e)),
            }
        })
    }

    /// Save an AI service
    pub fn save_service(&self, service: &AIServiceConfig) -> Result<(), String> {
        let provider_str = service.provider.to_string();
        let now = Utc::now().to_rfc3339();

        self.db.with_connection(|conn| {
            // Use INSERT ... ON CONFLICT DO UPDATE to avoid triggering ON DELETE CASCADE
            // INSERT OR REPLACE would delete the old row first, which cascades to ai_api_keys
            conn.execute(
                r#"
                INSERT INTO ai_services
                (id, name, provider, endpoint, model, is_default, is_enabled, created_at, updated_at)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
                ON CONFLICT(id) DO UPDATE SET
                    name = excluded.name,
                    provider = excluded.provider,
                    endpoint = excluded.endpoint,
                    model = excluded.model,
                    is_default = excluded.is_default,
                    is_enabled = excluded.is_enabled,
                    updated_at = excluded.updated_at
                "#,
                params![
                    service.id,
                    service.name,
                    provider_str,
                    service.endpoint,
                    service.model,
                    service.is_default as i32,
                    service.is_enabled as i32,
                    service.created_at.to_rfc3339(),
                    now,
                ],
            )
            .map_err(|e| format!("Failed to save AI service: {}", e))?;

            Ok(())
        })
    }

    /// Delete an AI service
    pub fn delete_service(&self, id: &str) -> Result<bool, String> {
        self.db.with_connection(|conn| {
            let rows_affected = conn
                .execute("DELETE FROM ai_services WHERE id = ?1", params![id])
                .map_err(|e| format!("Failed to delete AI service: {}", e))?;

            Ok(rows_affected > 0)
        })
    }

    // =========================================================================
    // AI Templates
    // =========================================================================

    /// List all AI templates
    pub fn list_templates(&self) -> Result<Vec<PromptTemplate>, String> {
        self.db.with_connection(|conn| {
            let mut stmt = conn
                .prepare(
                    r#"
                    SELECT id, name, description, category, template, output_format,
                           is_default, is_builtin, created_at, updated_at
                    FROM ai_templates
                    ORDER BY name
                    "#,
                )
                .map_err(|e| format!("Failed to prepare statement: {}", e))?;

            let rows = stmt
                .query_map([], |row| {
                    Ok(TemplateRow {
                        id: row.get(0)?,
                        name: row.get(1)?,
                        description: row.get(2)?,
                        category: row.get(3)?,
                        template: row.get(4)?,
                        output_format: row.get(5)?,
                        is_default: row.get(6)?,
                        is_builtin: row.get(7)?,
                        created_at: row.get(8)?,
                        updated_at: row.get(9)?,
                    })
                })
                .map_err(|e| format!("Failed to query AI templates: {}", e))?;

            let mut templates = Vec::new();
            for row in rows {
                let row = row.map_err(|e| format!("Failed to read row: {}", e))?;
                templates.push(row.into_template()?);
            }

            Ok(templates)
        })
    }

    /// List templates by category
    pub fn list_templates_by_category(
        &self,
        category: TemplateCategory,
    ) -> Result<Vec<PromptTemplate>, String> {
        let category_str = template_category_to_string(&category);

        self.db.with_connection(|conn| {
            let mut stmt = conn
                .prepare(
                    r#"
                    SELECT id, name, description, category, template, output_format,
                           is_default, is_builtin, created_at, updated_at
                    FROM ai_templates
                    WHERE category = ?1
                    ORDER BY name
                    "#,
                )
                .map_err(|e| format!("Failed to prepare statement: {}", e))?;

            let rows = stmt
                .query_map(params![category_str], |row| {
                    Ok(TemplateRow {
                        id: row.get(0)?,
                        name: row.get(1)?,
                        description: row.get(2)?,
                        category: row.get(3)?,
                        template: row.get(4)?,
                        output_format: row.get(5)?,
                        is_default: row.get(6)?,
                        is_builtin: row.get(7)?,
                        created_at: row.get(8)?,
                        updated_at: row.get(9)?,
                    })
                })
                .map_err(|e| format!("Failed to query AI templates: {}", e))?;

            let mut templates = Vec::new();
            for row in rows {
                let row = row.map_err(|e| format!("Failed to read row: {}", e))?;
                templates.push(row.into_template()?);
            }

            Ok(templates)
        })
    }

    /// Save an AI template
    pub fn save_template(&self, template: &PromptTemplate) -> Result<(), String> {
        let category_str = template_category_to_string(&template.category);
        let now = Utc::now().to_rfc3339();
        let output_format_str = template.output_format.as_ref().map(commit_format_to_string);

        self.db.with_connection(|conn| {
            conn.execute(
                r#"
                INSERT OR REPLACE INTO ai_templates
                (id, name, description, category, template, output_format,
                 is_default, is_builtin, created_at, updated_at)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
                "#,
                params![
                    template.id,
                    template.name,
                    template.description,
                    category_str,
                    template.template,
                    output_format_str,
                    template.is_default as i32,
                    template.is_builtin as i32,
                    template.created_at.to_rfc3339(),
                    now,
                ],
            )
            .map_err(|e| format!("Failed to save AI template: {}", e))?;

            Ok(())
        })
    }

    /// Delete an AI template
    pub fn delete_template(&self, id: &str) -> Result<bool, String> {
        self.db.with_connection(|conn| {
            let rows_affected = conn
                .execute("DELETE FROM ai_templates WHERE id = ?1", params![id])
                .map_err(|e| format!("Failed to delete AI template: {}", e))?;

            Ok(rows_affected > 0)
        })
    }

    // =========================================================================
    // Project AI Settings
    // =========================================================================

    /// Get project-specific AI settings
    pub fn get_project_settings(
        &self,
        project_path: &str,
    ) -> Result<crate::models::ai::ProjectAISettings, String> {
        self.db.with_connection(|conn| {
            let result = conn.query_row(
                r#"
                SELECT project_path, preferred_service_id, preferred_template_id
                FROM project_ai_settings
                WHERE project_path = ?1
                "#,
                params![project_path],
                |row| {
                    Ok(crate::models::ai::ProjectAISettings {
                        project_path: row.get(0)?,
                        preferred_service_id: row.get(1)?,
                        preferred_template_id: row.get(2)?,
                    })
                },
            );

            match result {
                Ok(settings) => Ok(settings),
                Err(rusqlite::Error::QueryReturnedNoRows) => {
                    Ok(crate::models::ai::ProjectAISettings {
                        project_path: project_path.to_string(),
                        preferred_service_id: None,
                        preferred_template_id: None,
                    })
                }
                Err(e) => Err(format!("Failed to get project AI settings: {}", e)),
            }
        })
    }

    /// Save project-specific AI settings
    pub fn save_project_settings(
        &self,
        settings: &crate::models::ai::ProjectAISettings,
    ) -> Result<(), String> {
        self.db.with_connection(|conn| {
            conn.execute(
                r#"
                INSERT OR REPLACE INTO project_ai_settings
                (project_path, preferred_service_id, preferred_template_id)
                VALUES (?1, ?2, ?3)
                "#,
                params![
                    settings.project_path,
                    settings.preferred_service_id,
                    settings.preferred_template_id,
                ],
            )
            .map_err(|e| format!("Failed to save project AI settings: {}", e))?;

            Ok(())
        })
    }

    /// Set default service (clears other defaults first)
    pub fn set_default_service(&self, id: &str) -> Result<(), String> {
        self.db.with_connection(|conn| {
            // Clear all defaults
            conn.execute("UPDATE ai_services SET is_default = 0", [])
                .map_err(|e| format!("Failed to clear default services: {}", e))?;

            // Set new default
            let rows = conn
                .execute(
                    "UPDATE ai_services SET is_default = 1 WHERE id = ?1",
                    params![id],
                )
                .map_err(|e| format!("Failed to set default service: {}", e))?;

            if rows == 0 {
                return Err(format!("Service not found: {}", id));
            }

            Ok(())
        })
    }

    /// Set default template for a category (clears other defaults in same category first)
    pub fn set_default_template(&self, id: &str) -> Result<(), String> {
        self.db.with_connection(|conn| {
            // Get the category of the target template
            let category: String = conn
                .query_row(
                    "SELECT category FROM ai_templates WHERE id = ?1",
                    params![id],
                    |row| row.get(0),
                )
                .map_err(|e| format!("Template not found: {}", e))?;

            // Clear defaults only within the same category
            conn.execute(
                "UPDATE ai_templates SET is_default = 0 WHERE category = ?1",
                params![category],
            )
            .map_err(|e| format!("Failed to clear default templates: {}", e))?;

            // Set new default
            conn.execute(
                "UPDATE ai_templates SET is_default = 1 WHERE id = ?1",
                params![id],
            )
            .map_err(|e| format!("Failed to set default template: {}", e))?;

            Ok(())
        })
    }

    /// Get template by ID
    pub fn get_template(&self, id: &str) -> Result<Option<PromptTemplate>, String> {
        self.db.with_connection(|conn| {
            let result = conn.query_row(
                r#"
                SELECT id, name, description, category, template, output_format,
                       is_default, is_builtin, created_at, updated_at
                FROM ai_templates
                WHERE id = ?1
                "#,
                params![id],
                |row| {
                    Ok(TemplateRow {
                        id: row.get(0)?,
                        name: row.get(1)?,
                        description: row.get(2)?,
                        category: row.get(3)?,
                        template: row.get(4)?,
                        output_format: row.get(5)?,
                        is_default: row.get(6)?,
                        is_builtin: row.get(7)?,
                        created_at: row.get(8)?,
                        updated_at: row.get(9)?,
                    })
                },
            );

            match result {
                Ok(row) => Ok(Some(row.into_template()?)),
                Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
                Err(e) => Err(format!("Failed to get template: {}", e)),
            }
        })
    }

    /// Get default template for a specific category
    pub fn get_default_template(
        &self,
        category: Option<&TemplateCategory>,
    ) -> Result<Option<PromptTemplate>, String> {
        self.db.with_connection(|conn| {
            let result = if let Some(cat) = category {
                let category_str = template_category_to_string(cat);
                conn.query_row(
                    r#"
                    SELECT id, name, description, category, template, output_format,
                           is_default, is_builtin, created_at, updated_at
                    FROM ai_templates
                    WHERE is_default = 1 AND category = ?1
                    LIMIT 1
                    "#,
                    params![category_str],
                    |row| {
                        Ok(TemplateRow {
                            id: row.get(0)?,
                            name: row.get(1)?,
                            description: row.get(2)?,
                            category: row.get(3)?,
                            template: row.get(4)?,
                            output_format: row.get(5)?,
                            is_default: row.get(6)?,
                            is_builtin: row.get(7)?,
                            created_at: row.get(8)?,
                            updated_at: row.get(9)?,
                        })
                    },
                )
            } else {
                conn.query_row(
                    r#"
                    SELECT id, name, description, category, template, output_format,
                           is_default, is_builtin, created_at, updated_at
                    FROM ai_templates
                    WHERE is_default = 1
                    LIMIT 1
                    "#,
                    [],
                    |row| {
                        Ok(TemplateRow {
                            id: row.get(0)?,
                            name: row.get(1)?,
                            description: row.get(2)?,
                            category: row.get(3)?,
                            template: row.get(4)?,
                            output_format: row.get(5)?,
                            is_default: row.get(6)?,
                            is_builtin: row.get(7)?,
                            created_at: row.get(8)?,
                            updated_at: row.get(9)?,
                        })
                    },
                )
            };

            match result {
                Ok(row) => Ok(Some(row.into_template()?)),
                Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
                Err(e) => Err(format!("Failed to get default template: {}", e)),
            }
        })
    }

    /// Check if a service name already exists (excluding given ID)
    pub fn service_name_exists(&self, name: &str, exclude_id: Option<&str>) -> Result<bool, String> {
        self.db.with_connection(|conn| {
            let count: i64 = if let Some(id) = exclude_id {
                conn.query_row(
                    "SELECT COUNT(*) FROM ai_services WHERE name = ?1 AND id != ?2",
                    params![name, id],
                    |row| row.get(0),
                )
            } else {
                conn.query_row(
                    "SELECT COUNT(*) FROM ai_services WHERE name = ?1",
                    params![name],
                    |row| row.get(0),
                )
            }
            .map_err(|e| format!("Failed to check service name: {}", e))?;

            Ok(count > 0)
        })
    }

    /// Check if a template name already exists (excluding given ID)
    pub fn template_name_exists(&self, name: &str, exclude_id: Option<&str>) -> Result<bool, String> {
        self.db.with_connection(|conn| {
            let count: i64 = if let Some(id) = exclude_id {
                conn.query_row(
                    "SELECT COUNT(*) FROM ai_templates WHERE name = ?1 AND id != ?2",
                    params![name, id],
                    |row| row.get(0),
                )
            } else {
                conn.query_row(
                    "SELECT COUNT(*) FROM ai_templates WHERE name = ?1",
                    params![name],
                    |row| row.get(0),
                )
            }
            .map_err(|e| format!("Failed to check template name: {}", e))?;

            Ok(count > 0)
        })
    }

    // =========================================================================
    // API Key Management (encrypted storage)
    // =========================================================================

    /// Store an encrypted API key for a service
    pub fn store_api_key(
        &self,
        service_id: &str,
        ciphertext: &str,
        nonce: &str,
    ) -> Result<(), String> {
        let now = Utc::now().to_rfc3339();
        self.db.with_connection(|conn| {
            conn.execute(
                r#"
                INSERT OR REPLACE INTO ai_api_keys
                (service_id, ciphertext, nonce, created_at, updated_at)
                VALUES (?1, ?2, ?3, COALESCE((SELECT created_at FROM ai_api_keys WHERE service_id = ?1), ?4), ?4)
                "#,
                params![service_id, ciphertext, nonce, now],
            )
            .map_err(|e| format!("Failed to store API key: {}", e))?;

            Ok(())
        })
    }

    /// Get encrypted API key for a service
    pub fn get_api_key(&self, service_id: &str) -> Result<Option<(String, String)>, String> {
        self.db.with_connection(|conn| {
            let result = conn.query_row(
                "SELECT ciphertext, nonce FROM ai_api_keys WHERE service_id = ?1",
                params![service_id],
                |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
            );

            match result {
                Ok((ciphertext, nonce)) => Ok(Some((ciphertext, nonce))),
                Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
                Err(e) => Err(format!("Failed to get API key: {}", e)),
            }
        })
    }

    /// Delete API key for a service
    pub fn delete_api_key(&self, service_id: &str) -> Result<bool, String> {
        self.db.with_connection(|conn| {
            let rows = conn
                .execute("DELETE FROM ai_api_keys WHERE service_id = ?1", params![service_id])
                .map_err(|e| format!("Failed to delete API key: {}", e))?;

            Ok(rows > 0)
        })
    }

    /// Check if an API key exists for a service
    pub fn has_api_key(&self, service_id: &str) -> Result<bool, String> {
        self.db.with_connection(|conn| {
            let count: i64 = conn
                .query_row(
                    "SELECT COUNT(*) FROM ai_api_keys WHERE service_id = ?1",
                    params![service_id],
                    |row| row.get(0),
                )
                .map_err(|e| format!("Failed to check API key: {}", e))?;

            Ok(count > 0)
        })
    }

    /// List all service IDs that have stored API keys
    pub fn list_service_ids_with_keys(&self) -> Result<Vec<String>, String> {
        self.db.with_connection(|conn| {
            let mut stmt = conn
                .prepare("SELECT service_id FROM ai_api_keys")
                .map_err(|e| format!("Failed to prepare statement: {}", e))?;

            let rows = stmt
                .query_map([], |row| row.get(0))
                .map_err(|e| format!("Failed to list API keys: {}", e))?;

            let mut ids = Vec::new();
            for row in rows {
                ids.push(row.map_err(|e| format!("Failed to read row: {}", e))?);
            }

            Ok(ids)
        })
    }
}

/// Internal row structure for AI services
struct AIServiceRow {
    id: String,
    name: String,
    provider: String,
    endpoint: String,
    model: String,
    is_default: i32,
    is_enabled: i32,
    created_at: String,
    updated_at: String,
}

impl AIServiceRow {
    fn into_service(self) -> Result<AIServiceConfig, String> {
        use chrono::DateTime;

        let provider = match self.provider.as_str() {
            "openai" => AIProvider::OpenAI,
            "anthropic" => AIProvider::Anthropic,
            "gemini" => AIProvider::Gemini,
            "ollama" => AIProvider::Ollama,
            "lm_studio" => AIProvider::LMStudio,
            _ => AIProvider::OpenAI,
        };

        let created_at = DateTime::parse_from_rfc3339(&self.created_at)
            .map(|dt| dt.with_timezone(&Utc))
            .unwrap_or_else(|_| Utc::now());

        let updated_at = DateTime::parse_from_rfc3339(&self.updated_at)
            .map(|dt| dt.with_timezone(&Utc))
            .unwrap_or_else(|_| Utc::now());

        Ok(AIServiceConfig {
            id: self.id,
            name: self.name,
            provider,
            endpoint: self.endpoint,
            model: self.model,
            is_default: self.is_default != 0,
            is_enabled: self.is_enabled != 0,
            created_at,
            updated_at,
        })
    }
}

/// Internal row structure for AI templates
struct TemplateRow {
    id: String,
    name: String,
    description: Option<String>,
    category: String,
    template: String,
    output_format: Option<String>,
    is_default: i32,
    is_builtin: i32,
    created_at: String,
    updated_at: String,
}

impl TemplateRow {
    fn into_template(self) -> Result<PromptTemplate, String> {
        use chrono::DateTime;

        let category = match self.category.as_str() {
            "git_commit" => TemplateCategory::GitCommit,
            "pull_request" => TemplateCategory::PullRequest,
            "code_review" => TemplateCategory::CodeReview,
            "documentation" => TemplateCategory::Documentation,
            "release_notes" => TemplateCategory::ReleaseNotes,
            "custom" => TemplateCategory::Custom,
            _ => TemplateCategory::Custom,
        };

        let created_at = DateTime::parse_from_rfc3339(&self.created_at)
            .map(|dt| dt.with_timezone(&Utc))
            .unwrap_or_else(|_| Utc::now());

        let updated_at = DateTime::parse_from_rfc3339(&self.updated_at)
            .map(|dt| dt.with_timezone(&Utc))
            .unwrap_or_else(|_| Utc::now());

        let output_format = self.output_format.as_ref().map(|s| string_to_commit_format(s));

        Ok(PromptTemplate {
            id: self.id,
            name: self.name,
            description: self.description,
            category,
            template: self.template,
            output_format,
            is_default: self.is_default != 0,
            is_builtin: self.is_builtin != 0,
            created_at,
            updated_at,
        })
    }
}

/// Convert CommitFormat to string
fn commit_format_to_string(format: &CommitFormat) -> String {
    match format {
        CommitFormat::ConventionalCommits => "conventional_commits".to_string(),
        CommitFormat::Simple => "simple".to_string(),
        CommitFormat::Custom => "custom".to_string(),
    }
}

/// Convert string to CommitFormat
fn string_to_commit_format(s: &str) -> CommitFormat {
    match s {
        "conventional_commits" => CommitFormat::ConventionalCommits,
        "simple" => CommitFormat::Simple,
        "custom" => CommitFormat::Custom,
        _ => CommitFormat::ConventionalCommits,
    }
}

/// Convert TemplateCategory to database string (snake_case)
fn template_category_to_string(category: &TemplateCategory) -> &'static str {
    match category {
        TemplateCategory::GitCommit => "git_commit",
        TemplateCategory::PullRequest => "pull_request",
        TemplateCategory::CodeReview => "code_review",
        TemplateCategory::Documentation => "documentation",
        TemplateCategory::ReleaseNotes => "release_notes",
        TemplateCategory::Custom => "custom",
    }
}
