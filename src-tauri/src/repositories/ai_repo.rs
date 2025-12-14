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
        let provider_str = format!("{:?}", service.provider).to_lowercase();
        let now = Utc::now().to_rfc3339();

        self.db.with_connection(|conn| {
            conn.execute(
                r#"
                INSERT OR REPLACE INTO ai_services
                (id, name, provider, endpoint, model, is_default, is_enabled, created_at, updated_at)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
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
        let category_str = format!("{:?}", category).to_lowercase();

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
        let category_str = format!("{:?}", template.category).to_lowercase();
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
