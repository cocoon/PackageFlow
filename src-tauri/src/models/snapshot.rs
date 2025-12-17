// Time Machine - Execution Snapshot Models
// Captures dependency state at workflow execution time

use serde::{Deserialize, Serialize};

/// Lockfile type for a project
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum LockfileType {
    Npm,
    Pnpm,
    Yarn,
    Bun,
}

impl LockfileType {
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "npm" => Some(Self::Npm),
            "pnpm" => Some(Self::Pnpm),
            "yarn" => Some(Self::Yarn),
            "bun" => Some(Self::Bun),
            _ => None,
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Npm => "npm",
            Self::Pnpm => "pnpm",
            Self::Yarn => "yarn",
            Self::Bun => "bun",
        }
    }

    /// Get the lockfile filename for this type
    pub fn lockfile_name(&self) -> &'static str {
        match self {
            Self::Npm => "package-lock.json",
            Self::Pnpm => "pnpm-lock.yaml",
            Self::Yarn => "yarn.lock",
            Self::Bun => "bun.lockb",
        }
    }
}

/// Snapshot capture status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum SnapshotStatus {
    Capturing,
    Completed,
    Failed,
}

impl SnapshotStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Capturing => "capturing",
            Self::Completed => "completed",
            Self::Failed => "failed",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "capturing" => Some(Self::Capturing),
            "completed" => Some(Self::Completed),
            "failed" => Some(Self::Failed),
            _ => None,
        }
    }
}

/// A single dependency entry in the snapshot
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SnapshotDependency {
    pub id: Option<i64>,
    pub snapshot_id: String,
    pub name: String,
    pub version: String,
    pub is_direct: bool,
    pub is_dev: bool,
    pub has_postinstall: bool,
    pub postinstall_script: Option<String>,
    pub integrity_hash: Option<String>,
    pub resolved_url: Option<String>,
}

/// Execution snapshot - captures dependency state at a point in time
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecutionSnapshot {
    pub id: String,
    pub workflow_id: String,
    pub execution_id: String,
    pub project_path: String,
    pub status: SnapshotStatus,
    pub lockfile_type: Option<LockfileType>,
    pub lockfile_hash: Option<String>,
    pub dependency_tree_hash: Option<String>,
    pub package_json_hash: Option<String>,
    pub total_dependencies: i32,
    pub direct_dependencies: i32,
    pub dev_dependencies: i32,
    pub security_score: Option<i32>,
    pub postinstall_count: i32,
    pub storage_path: Option<String>,
    pub compressed_size: Option<i64>,
    pub execution_duration_ms: Option<i64>,
    pub error_message: Option<String>,
    pub created_at: String,
}

/// Snapshot list item (lightweight for list views)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SnapshotListItem {
    pub id: String,
    pub workflow_id: String,
    pub execution_id: String,
    pub status: SnapshotStatus,
    pub lockfile_type: Option<LockfileType>,
    pub total_dependencies: i32,
    pub security_score: Option<i32>,
    pub postinstall_count: i32,
    pub created_at: String,
}

/// Snapshot with full dependency list
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SnapshotWithDependencies {
    pub snapshot: ExecutionSnapshot,
    pub dependencies: Vec<SnapshotDependency>,
}

/// Postinstall script entry for security tracking
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PostinstallEntry {
    pub package_name: String,
    pub version: String,
    pub script: String,
    pub script_hash: String,
}

/// Security context for a snapshot
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SecurityContext {
    pub postinstall_scripts: Vec<PostinstallEntry>,
    pub typosquatting_suspects: Vec<TyposquattingAlert>,
    pub integrity_issues: Vec<IntegrityIssue>,
}

/// Typosquatting alert
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TyposquattingAlert {
    pub package_name: String,
    pub similar_to: String,
    pub distance: u32,
    pub confidence: f64,
}

/// Integrity issue
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IntegrityIssue {
    pub package_name: String,
    pub version: String,
    pub expected_hash: Option<String>,
    pub actual_hash: Option<String>,
    pub issue_type: String,
}

/// Dependency change type
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum DependencyChangeType {
    Added,
    Removed,
    Updated,
    Unchanged,
}

/// A dependency change between two snapshots
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DependencyChange {
    pub name: String,
    pub change_type: DependencyChangeType,
    pub old_version: Option<String>,
    pub new_version: Option<String>,
    pub is_direct: bool,
    pub is_dev: bool,
    pub postinstall_changed: bool,
    pub old_postinstall: Option<String>,
    pub new_postinstall: Option<String>,
}

/// Postinstall script change
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PostinstallChange {
    pub package_name: String,
    pub change_type: DependencyChangeType,
    pub old_script: Option<String>,
    pub new_script: Option<String>,
}

/// Summary statistics for a diff
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiffSummary {
    pub added_count: i32,
    pub removed_count: i32,
    pub updated_count: i32,
    pub unchanged_count: i32,
    pub postinstall_added: i32,
    pub postinstall_removed: i32,
    pub postinstall_changed: i32,
    pub security_score_change: Option<i32>,
}

/// Timing information for diff
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimingDiff {
    pub old_duration_ms: Option<i64>,
    pub new_duration_ms: Option<i64>,
    pub diff_ms: Option<i64>,
    pub diff_percentage: Option<f64>,
}

/// Full snapshot diff result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SnapshotDiff {
    pub snapshot_a_id: String,
    pub snapshot_b_id: String,
    pub summary: DiffSummary,
    pub timing: TimingDiff,
    pub dependency_changes: Vec<DependencyChange>,
    pub postinstall_changes: Vec<PostinstallChange>,
    pub lockfile_type_changed: bool,
    pub old_lockfile_type: Option<LockfileType>,
    pub new_lockfile_type: Option<LockfileType>,
}

/// Create snapshot request
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateSnapshotRequest {
    pub workflow_id: String,
    pub execution_id: String,
    pub project_path: String,
}

/// Snapshot filter options
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SnapshotFilter {
    pub workflow_id: Option<String>,
    pub project_path: Option<String>,
    pub status: Option<SnapshotStatus>,
    pub from_date: Option<String>,
    pub to_date: Option<String>,
    pub limit: Option<i32>,
    pub offset: Option<i32>,
}
