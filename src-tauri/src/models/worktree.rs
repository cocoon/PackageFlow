// Worktree data models
// Represents Git worktree information

use serde::{Deserialize, Serialize};

/// Represents a Git worktree
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Worktree {
    pub path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub branch: Option<String>,
    pub head: String,
    pub is_main: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub is_bare: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub is_detached: Option<bool>,
}

impl Worktree {
    pub fn new(path: String, head: String) -> Self {
        Self {
            path,
            branch: None,
            head,
            is_main: false,
            is_bare: None,
            is_detached: None,
        }
    }

    pub fn main(path: String, branch: String, head: String) -> Self {
        Self {
            path,
            branch: Some(branch),
            head,
            is_main: true,
            is_bare: Some(false),
            is_detached: Some(false),
        }
    }
}

/// Extended worktree status information
/// T001: WorktreeStatus type for enhanced worktree management
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorktreeStatus {
    pub uncommitted_count: i32,
    pub ahead: i32,
    pub behind: i32,
    pub has_tracking_branch: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_commit_time: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_commit_message: Option<String>,
    pub has_running_process: bool,
}

impl Default for WorktreeStatus {
    fn default() -> Self {
        Self {
            uncommitted_count: 0,
            ahead: 0,
            behind: 0,
            has_tracking_branch: false,
            last_commit_time: None,
            last_commit_message: None,
            has_running_process: false,
        }
    }
}

/// Editor definition for IDE integration
/// T002: EditorDefinition type for open in editor feature
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EditorDefinition {
    pub id: String,
    pub name: String,
    pub command: String,
    #[serde(default)]
    pub args: Vec<String>,
    pub is_available: bool,
}

/// Worktree template for creating worktrees with preset configurations
/// T047: WorktreeTemplate type for template/preset feature
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorktreeTemplate {
    pub id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    /// Branch naming pattern with placeholders: {name}, {date}, {user}
    pub branch_pattern: String,
    /// Path pattern for worktree location with placeholders
    pub path_pattern: String,
    /// Scripts to run after worktree creation
    #[serde(default)]
    pub post_create_scripts: Vec<String>,
    /// Whether to open in editor after creation
    #[serde(default)]
    pub open_in_editor: bool,
    /// Preferred editor ID to use
    #[serde(skip_serializing_if = "Option::is_none")]
    pub preferred_editor: Option<String>,
    /// Base branch to create from (e.g., "main", "develop")
    #[serde(skip_serializing_if = "Option::is_none")]
    pub base_branch: Option<String>,
    /// Whether this is a default template
    #[serde(default)]
    pub is_default: bool,
    /// Creation timestamp
    pub created_at: String,
    /// Last modified timestamp
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,
}

impl WorktreeTemplate {
    pub fn new(id: String, name: String, branch_pattern: String, path_pattern: String) -> Self {
        Self {
            id,
            name,
            description: None,
            branch_pattern,
            path_pattern,
            post_create_scripts: vec![],
            open_in_editor: true,
            preferred_editor: None,
            base_branch: None,
            is_default: false,
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: None,
        }
    }

    /// Create a default "Feature" template
    pub fn feature_template() -> Self {
        Self {
            id: "feature".to_string(),
            name: "Feature Branch".to_string(),
            description: Some("Create a new feature branch worktree".to_string()),
            branch_pattern: "feature/{name}".to_string(),
            path_pattern: ".worktrees/{name}".to_string(),
            post_create_scripts: vec!["install".to_string()],
            open_in_editor: true,
            preferred_editor: None,
            base_branch: Some("main".to_string()),
            is_default: true,
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: None,
        }
    }

    /// Create a default "Bugfix" template
    pub fn bugfix_template() -> Self {
        Self {
            id: "bugfix".to_string(),
            name: "Bugfix Branch".to_string(),
            description: Some("Create a bugfix branch worktree".to_string()),
            branch_pattern: "bugfix/{name}".to_string(),
            path_pattern: ".worktrees/bugfix-{name}".to_string(),
            post_create_scripts: vec!["install".to_string()],
            open_in_editor: true,
            preferred_editor: None,
            base_branch: Some("main".to_string()),
            is_default: false,
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: None,
        }
    }

    /// Create a default "Release" template
    pub fn release_template() -> Self {
        Self {
            id: "release".to_string(),
            name: "Release Branch".to_string(),
            description: Some("Create a release branch worktree".to_string()),
            branch_pattern: "release/{name}".to_string(),
            path_pattern: ".worktrees/release-{name}".to_string(),
            post_create_scripts: vec!["install".to_string(), "build".to_string()],
            open_in_editor: true,
            preferred_editor: None,
            base_branch: Some("main".to_string()),
            is_default: false,
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: None,
        }
    }

    /// Apply pattern with variable substitution
    pub fn apply_pattern(pattern: &str, name: &str, repo_name: &str) -> String {
        let now = chrono::Utc::now();
        pattern
            .replace("{name}", name)
            .replace("{repo}", repo_name)
            .replace("{date}", &now.format("%Y%m%d").to_string())
            .replace("{user}", &whoami::username())
    }
}

impl EditorDefinition {
    pub fn vscode() -> Self {
        Self {
            id: "vscode".to_string(),
            name: "VS Code".to_string(),
            command: "code".to_string(),
            args: vec![],
            is_available: false,
        }
    }

    pub fn cursor() -> Self {
        Self {
            id: "cursor".to_string(),
            name: "Cursor".to_string(),
            command: "cursor".to_string(),
            args: vec![],
            is_available: false,
        }
    }

    pub fn vscode_insiders() -> Self {
        Self {
            id: "vscode-insiders".to_string(),
            name: "VS Code Insiders".to_string(),
            command: "code-insiders".to_string(),
            args: vec![],
            is_available: false,
        }
    }
}
