// Snapshot Commands
// Tauri commands for Time Machine functionality

use std::path::PathBuf;
use std::sync::Arc;
use tauri::State;

use crate::models::security_insight::{InsightSummary, SecurityInsight};
use crate::models::snapshot::{
    CreateSnapshotRequest, ExecutionSnapshot, SnapshotDiff, SnapshotFilter, SnapshotListItem,
    SnapshotWithDependencies,
};
use crate::repositories::SnapshotRepository;
use crate::services::snapshot::{SnapshotCaptureService, SnapshotDiffService, SnapshotStorage};
use crate::utils::database::Database;
use crate::DatabaseState;

/// Get the snapshot storage base path
fn get_storage_base_path() -> Result<PathBuf, String> {
    dirs::data_dir()
        .map(|p| p.join("com.packageflow.app").join("time-machine"))
        .ok_or_else(|| "Failed to get data directory".to_string())
}

// =========================================================================
// Snapshot CRUD Operations
// =========================================================================

/// List snapshots with optional filters
#[tauri::command]
pub async fn list_snapshots(
    db: State<'_, DatabaseState>,
    filter: Option<SnapshotFilter>,
) -> Result<Vec<SnapshotListItem>, String> {
    let db = (*db.0).clone();
    let filter = filter.unwrap_or_default();

    tokio::task::spawn_blocking(move || {
        let repo = SnapshotRepository::new(db);
        repo.list_snapshots(&filter)
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

/// Get a single snapshot by ID
#[tauri::command]
pub async fn get_snapshot(
    db: State<'_, DatabaseState>,
    snapshot_id: String,
) -> Result<Option<ExecutionSnapshot>, String> {
    let db = (*db.0).clone();

    tokio::task::spawn_blocking(move || {
        let repo = SnapshotRepository::new(db);
        repo.get_snapshot(&snapshot_id)
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

/// Get a snapshot with all its dependencies
#[tauri::command]
pub async fn get_snapshot_with_dependencies(
    db: State<'_, DatabaseState>,
    snapshot_id: String,
) -> Result<Option<SnapshotWithDependencies>, String> {
    let db = (*db.0).clone();

    tokio::task::spawn_blocking(move || {
        let repo = SnapshotRepository::new(db);
        repo.get_snapshot_with_dependencies(&snapshot_id)
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

/// Get the latest snapshot for a workflow
#[tauri::command]
pub async fn get_latest_snapshot(
    db: State<'_, DatabaseState>,
    workflow_id: String,
) -> Result<Option<ExecutionSnapshot>, String> {
    let db = (*db.0).clone();

    tokio::task::spawn_blocking(move || {
        let repo = SnapshotRepository::new(db);
        repo.get_latest_snapshot(&workflow_id)
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

/// Delete a snapshot
#[tauri::command]
pub async fn delete_snapshot(
    db: State<'_, DatabaseState>,
    snapshot_id: String,
) -> Result<bool, String> {
    let db = (*db.0).clone();
    let base_path = get_storage_base_path()?;

    tokio::task::spawn_blocking(move || {
        let repo = SnapshotRepository::new(db);
        let storage = SnapshotStorage::new(base_path);

        // Delete file storage first
        storage.delete_snapshot(&snapshot_id)?;

        // Delete database record
        repo.delete_snapshot(&snapshot_id)
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

/// Prune old snapshots (keep last N per workflow)
#[tauri::command]
pub async fn prune_snapshots(
    db: State<'_, DatabaseState>,
    keep_per_workflow: Option<usize>,
) -> Result<usize, String> {
    let db = (*db.0).clone();
    let keep = keep_per_workflow.unwrap_or(10);

    tokio::task::spawn_blocking(move || {
        let repo = SnapshotRepository::new(db);
        repo.prune_snapshots(keep)
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

// =========================================================================
// Snapshot Capture
// =========================================================================

/// Capture a new snapshot for a workflow execution
#[tauri::command]
pub async fn capture_snapshot(
    db: State<'_, DatabaseState>,
    request: CreateSnapshotRequest,
    duration_ms: Option<i64>,
) -> Result<ExecutionSnapshot, String> {
    let db = (*db.0).clone();
    let base_path = get_storage_base_path()?;

    tokio::task::spawn_blocking(move || {
        let storage = SnapshotStorage::new(base_path);
        let service = SnapshotCaptureService::new(storage, db);
        service.capture_snapshot(&request, duration_ms)
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

/// Capture snapshot in background (non-blocking)
/// Used by workflow executor to capture snapshots after execution completes
#[allow(dead_code)]
pub fn capture_snapshot_background(
    db: Arc<Database>,
    request: CreateSnapshotRequest,
    duration_ms: Option<i64>,
) {
    std::thread::spawn(move || {
        let base_path = match get_storage_base_path() {
            Ok(p) => p,
            Err(e) => {
                log::error!("[snapshot] Failed to get storage path: {}", e);
                return;
            }
        };

        let storage = SnapshotStorage::new(base_path);
        let service = SnapshotCaptureService::new(storage, (*db).clone());

        match service.capture_snapshot(&request, duration_ms) {
            Ok(snapshot) => {
                log::info!(
                    "[snapshot] Captured snapshot {} for workflow {} ({}ms)",
                    snapshot.id,
                    snapshot.workflow_id,
                    snapshot.execution_duration_ms.unwrap_or(0)
                );
            }
            Err(e) => {
                log::error!("[snapshot] Failed to capture snapshot: {}", e);
            }
        }
    });
}

// =========================================================================
// Snapshot Comparison
// =========================================================================

/// Compare two snapshots
#[tauri::command]
pub async fn compare_snapshots(
    db: State<'_, DatabaseState>,
    snapshot_a_id: String,
    snapshot_b_id: String,
) -> Result<SnapshotDiff, String> {
    let db = (*db.0).clone();

    tokio::task::spawn_blocking(move || {
        let service = SnapshotDiffService::new(db);
        service.compare_snapshots(&snapshot_a_id, &snapshot_b_id)
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

/// Generate AI-friendly prompt for diff analysis
#[tauri::command]
pub async fn get_diff_ai_prompt(
    db: State<'_, DatabaseState>,
    snapshot_a_id: String,
    snapshot_b_id: String,
) -> Result<String, String> {
    let db = (*db.0).clone();

    tokio::task::spawn_blocking(move || {
        let service = SnapshotDiffService::new(db);
        let diff = service.compare_snapshots(&snapshot_a_id, &snapshot_b_id)?;
        Ok(service.generate_ai_prompt(&diff))
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

/// Get comparison candidates (latest N snapshots for a workflow)
#[tauri::command]
pub async fn get_comparison_candidates(
    db: State<'_, DatabaseState>,
    workflow_id: String,
    limit: Option<i32>,
) -> Result<Vec<ExecutionSnapshot>, String> {
    let db = (*db.0).clone();
    let limit = limit.unwrap_or(10);

    tokio::task::spawn_blocking(move || {
        let service = SnapshotDiffService::new(db);
        service.get_comparison_candidates(&workflow_id, limit)
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

// =========================================================================
// Security Insights
// =========================================================================

/// Get security insights for a snapshot
#[tauri::command]
pub async fn get_security_insights(
    db: State<'_, DatabaseState>,
    snapshot_id: String,
) -> Result<Vec<SecurityInsight>, String> {
    let db = (*db.0).clone();

    tokio::task::spawn_blocking(move || {
        let repo = SnapshotRepository::new(db);
        repo.list_insights(&snapshot_id)
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

/// Get security insight summary for a snapshot
#[tauri::command]
pub async fn get_insight_summary(
    db: State<'_, DatabaseState>,
    snapshot_id: String,
) -> Result<InsightSummary, String> {
    let db = (*db.0).clone();

    tokio::task::spawn_blocking(move || {
        let repo = SnapshotRepository::new(db);
        repo.get_insight_summary(&snapshot_id)
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

/// Dismiss a security insight
#[tauri::command]
pub async fn dismiss_insight(
    db: State<'_, DatabaseState>,
    insight_id: String,
) -> Result<bool, String> {
    let db = (*db.0).clone();

    tokio::task::spawn_blocking(move || {
        let repo = SnapshotRepository::new(db);
        repo.dismiss_insight(&insight_id)
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

// =========================================================================
// Storage Management
// =========================================================================

/// Get storage statistics
#[tauri::command]
pub async fn get_snapshot_storage_stats(
    db: State<'_, DatabaseState>,
) -> Result<SnapshotStorageStats, String> {
    let db = (*db.0).clone();
    let base_path = get_storage_base_path()?;

    tokio::task::spawn_blocking(move || {
        let repo = SnapshotRepository::new(db);
        let storage = SnapshotStorage::new(base_path);

        // Get all snapshots
        let filter = SnapshotFilter::default();
        let snapshots = repo.list_snapshots(&filter)?;

        let mut total_size = 0u64;
        let snapshot_count = snapshots.len();

        for snapshot in &snapshots {
            if let Ok(size) = storage.get_snapshot_size(&snapshot.id) {
                total_size += size;
            }
        }

        Ok(SnapshotStorageStats {
            total_snapshots: snapshot_count,
            total_size_bytes: total_size,
            total_size_human: format_size(total_size),
        })
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

/// Cleanup orphaned storage
#[tauri::command]
pub async fn cleanup_orphaned_storage(
    db: State<'_, DatabaseState>,
) -> Result<usize, String> {
    let db = (*db.0).clone();
    let base_path = get_storage_base_path()?;

    tokio::task::spawn_blocking(move || {
        let repo = SnapshotRepository::new(db);
        let storage = SnapshotStorage::new(base_path);

        // Get all valid snapshot IDs
        let filter = SnapshotFilter::default();
        let snapshots = repo.list_snapshots(&filter)?;
        let valid_ids: Vec<String> = snapshots.iter().map(|s| s.id.clone()).collect();

        storage.cleanup_orphaned(&valid_ids)
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

// =========================================================================
// Helper Types and Functions
// =========================================================================

/// Storage statistics
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SnapshotStorageStats {
    pub total_snapshots: usize,
    pub total_size_bytes: u64,
    pub total_size_human: String,
}

/// Format byte size to human readable string
fn format_size(bytes: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = KB * 1024;
    const GB: u64 = MB * 1024;

    if bytes >= GB {
        format!("{:.2} GB", bytes as f64 / GB as f64)
    } else if bytes >= MB {
        format!("{:.2} MB", bytes as f64 / MB as f64)
    } else if bytes >= KB {
        format!("{:.2} KB", bytes as f64 / KB as f64)
    } else {
        format!("{} B", bytes)
    }
}
