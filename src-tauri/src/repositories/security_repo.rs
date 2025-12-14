// Security Repository
// Handles all database operations for security scans

use rusqlite::params;
use serde_json::Value;

use crate::models::security::SecurityScanData;
use crate::utils::database::Database;

/// Repository for security scan data access
pub struct SecurityRepository {
    db: Database,
}

impl SecurityRepository {
    /// Create a new SecurityRepository
    pub fn new(db: Database) -> Self {
        Self { db }
    }

    /// Get security scan data for a project
    pub fn get(&self, project_id: &str) -> Result<Option<SecurityScanData>, String> {
        self.db.with_connection(|conn| {
            let result = conn.query_row(
                r#"
                SELECT package_manager, last_scan, scan_history, snooze_until
                FROM security_scans
                WHERE project_id = ?1
                "#,
                params![project_id],
                |row| {
                    let package_manager: String = row.get(0)?;
                    let last_scan: Option<String> = row.get(1)?;
                    let scan_history: String = row.get(2)?;
                    let snooze_until: Option<String> = row.get(3)?;
                    Ok((package_manager, last_scan, scan_history, snooze_until))
                },
            );

            match result {
                Ok((package_manager, last_scan, scan_history, snooze_until)) => {
                    // Parse JSON fields
                    let last_scan_data: Option<Value> = last_scan
                        .as_ref()
                        .map(|json| serde_json::from_str(json).ok())
                        .flatten();

                    let scan_history_data: Vec<Value> = serde_json::from_str(&scan_history)
                        .unwrap_or_default();

                    // Build SecurityScanData from stored data
                    let data = build_security_scan_data(
                        &package_manager,
                        last_scan_data,
                        scan_history_data,
                        snooze_until,
                    )?;

                    Ok(Some(data))
                }
                Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
                Err(e) => Err(format!("Failed to get security scan: {}", e)),
            }
        })
    }

    /// Save security scan data for a project
    pub fn save(&self, project_id: &str, data: &SecurityScanData) -> Result<(), String> {
        let package_manager = format!("{:?}", data.package_manager).to_lowercase();

        let last_scan_json = serde_json::to_string(&data)
            .map_err(|e| format!("Failed to serialize last_scan: {}", e))?;

        let scan_history_json = serde_json::to_string(&data.scan_history)
            .map_err(|e| format!("Failed to serialize scan_history: {}", e))?;

        self.db.with_connection(|conn| {
            conn.execute(
                r#"
                INSERT OR REPLACE INTO security_scans
                (project_id, package_manager, last_scan, scan_history, snooze_until)
                VALUES (?1, ?2, ?3, ?4, ?5)
                "#,
                params![
                    project_id,
                    package_manager,
                    last_scan_json,
                    scan_history_json,
                    data.snooze_until,
                ],
            )
            .map_err(|e| format!("Failed to save security scan: {}", e))?;

            Ok(())
        })
    }

    /// Delete security scan data for a project
    pub fn delete(&self, project_id: &str) -> Result<bool, String> {
        self.db.with_connection(|conn| {
            let rows_affected = conn
                .execute(
                    "DELETE FROM security_scans WHERE project_id = ?1",
                    params![project_id],
                )
                .map_err(|e| format!("Failed to delete security scan: {}", e))?;

            Ok(rows_affected > 0)
        })
    }

    /// Update snooze until date
    pub fn set_snooze_until(
        &self,
        project_id: &str,
        snooze_until: Option<&str>,
    ) -> Result<(), String> {
        self.db.with_connection(|conn| {
            conn.execute(
                "UPDATE security_scans SET snooze_until = ?1 WHERE project_id = ?2",
                params![snooze_until, project_id],
            )
            .map_err(|e| format!("Failed to update snooze_until: {}", e))?;

            Ok(())
        })
    }
}

/// Helper function to build SecurityScanData from stored values
fn build_security_scan_data(
    package_manager: &str,
    last_scan: Option<Value>,
    scan_history: Vec<Value>,
    snooze_until: Option<String>,
) -> Result<SecurityScanData, String> {
    use crate::models::{PackageManager, ScanStatus, VulnSummary, DependencyCount};

    let pm = match package_manager {
        "npm" => PackageManager::Npm,
        "yarn" => PackageManager::Yarn,
        "pnpm" => PackageManager::Pnpm,
        "bun" => PackageManager::Bun,
        _ => PackageManager::Unknown,
    };

    // If we have last_scan data, parse it
    if let Some(scan_data) = last_scan {
        if let Ok(data) = serde_json::from_value::<SecurityScanData>(scan_data) {
            return Ok(SecurityScanData {
                snooze_until,
                scan_history,
                ..data
            });
        }
    }

    // Return default structure
    Ok(SecurityScanData {
        status: ScanStatus::Pending,
        last_scan_at: None,
        package_manager: pm,
        vulnerabilities: Vec::new(),
        summary: VulnSummary::default(),
        dependencies: DependencyCount::default(),
        scan_history,
        snooze_until,
    })
}
