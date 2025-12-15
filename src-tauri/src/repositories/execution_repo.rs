// Execution Repository
// Handles all database operations for workflow executions

use rusqlite::params;

use crate::commands::workflow::{ExecutionHistoryItem, WorkflowOutputLine};
use crate::models::Execution;
use crate::utils::database::Database;

/// Repository for execution data access
pub struct ExecutionRepository {
    db: Database,
}

impl ExecutionRepository {
    /// Create a new ExecutionRepository
    pub fn new(db: Database) -> Self {
        Self { db }
    }

    // =========================================================================
    // Running Executions (ephemeral, in-memory state persisted to DB)
    // =========================================================================

    /// List all running executions
    pub fn list_running(&self) -> Result<Vec<Execution>, String> {
        self.db.with_connection(|conn| {
            let mut stmt = conn
                .prepare("SELECT id, workflow_id, execution_data FROM running_executions")
                .map_err(|e| format!("Failed to prepare statement: {}", e))?;

            let rows = stmt
                .query_map([], |row| {
                    let execution_data: String = row.get(2)?;
                    Ok(execution_data)
                })
                .map_err(|e| format!("Failed to query running executions: {}", e))?;

            let mut executions = Vec::new();
            for row in rows {
                let json = row.map_err(|e| format!("Failed to read row: {}", e))?;
                let execution: Execution = serde_json::from_str(&json)
                    .map_err(|e| format!("Failed to parse execution: {}", e))?;
                executions.push(execution);
            }

            Ok(executions)
        })
    }

    /// Get a running execution by ID
    pub fn get_running(&self, id: &str) -> Result<Option<Execution>, String> {
        self.db.with_connection(|conn| {
            let result = conn.query_row(
                "SELECT execution_data FROM running_executions WHERE id = ?1",
                params![id],
                |row| {
                    let execution_data: String = row.get(0)?;
                    Ok(execution_data)
                },
            );

            match result {
                Ok(json) => {
                    let execution: Execution = serde_json::from_str(&json)
                        .map_err(|e| format!("Failed to parse execution: {}", e))?;
                    Ok(Some(execution))
                }
                Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
                Err(e) => Err(format!("Failed to get running execution: {}", e)),
            }
        })
    }

    /// Save a running execution
    pub fn save_running(&self, execution: &Execution) -> Result<(), String> {
        let execution_data = serde_json::to_string(execution)
            .map_err(|e| format!("Failed to serialize execution: {}", e))?;

        self.db.with_connection(|conn| {
            conn.execute(
                r#"
                INSERT OR REPLACE INTO running_executions (id, workflow_id, execution_data)
                VALUES (?1, ?2, ?3)
                "#,
                params![execution.id, execution.workflow_id, execution_data],
            )
            .map_err(|e| format!("Failed to save running execution: {}", e))?;

            Ok(())
        })
    }

    /// Delete a running execution
    pub fn delete_running(&self, id: &str) -> Result<bool, String> {
        self.db.with_connection(|conn| {
            let rows_affected = conn
                .execute("DELETE FROM running_executions WHERE id = ?1", params![id])
                .map_err(|e| format!("Failed to delete running execution: {}", e))?;

            Ok(rows_affected > 0)
        })
    }

    /// List all running executions as a HashMap keyed by execution ID
    pub fn list_running_as_map(&self) -> Result<std::collections::HashMap<String, Execution>, String> {
        let executions = self.list_running()?;
        let mut map = std::collections::HashMap::new();
        for execution in executions {
            map.insert(execution.id.clone(), execution);
        }
        Ok(map)
    }

    /// Clear all running executions (called on app restart)
    pub fn clear_running(&self) -> Result<usize, String> {
        self.db.with_connection(|conn| {
            let rows_affected = conn
                .execute("DELETE FROM running_executions", [])
                .map_err(|e| format!("Failed to clear running executions: {}", e))?;

            Ok(rows_affected)
        })
    }

    // =========================================================================
    // Execution History
    // =========================================================================

    /// List execution history (most recent first)
    pub fn list_history(&self, limit: Option<usize>) -> Result<Vec<ExecutionHistoryItem>, String> {
        let limit = limit.unwrap_or(100);

        self.db.with_connection(|conn| {
            let mut stmt = conn
                .prepare(
                    r#"
                    SELECT id, workflow_id, workflow_name, status, started_at, finished_at,
                           duration_ms, node_count, completed_node_count, error_message,
                           output, triggered_by
                    FROM execution_history
                    ORDER BY started_at DESC
                    LIMIT ?1
                    "#,
                )
                .map_err(|e| format!("Failed to prepare statement: {}", e))?;

            let rows = stmt
                .query_map(params![limit as i64], |row| {
                    Ok(HistoryRow {
                        id: row.get(0)?,
                        workflow_id: row.get(1)?,
                        workflow_name: row.get(2)?,
                        status: row.get(3)?,
                        started_at: row.get(4)?,
                        finished_at: row.get(5)?,
                        duration_ms: row.get(6)?,
                        node_count: row.get(7)?,
                        completed_node_count: row.get(8)?,
                        error_message: row.get(9)?,
                        output: row.get(10)?,
                        triggered_by: row.get(11)?,
                    })
                })
                .map_err(|e| format!("Failed to query execution history: {}", e))?;

            let mut history = Vec::new();
            for row in rows {
                let row = row.map_err(|e| format!("Failed to read row: {}", e))?;
                history.push(row.into_history()?);
            }

            Ok(history)
        })
    }

    /// List execution history for a specific workflow
    pub fn list_history_by_workflow(
        &self,
        workflow_id: &str,
        limit: Option<usize>,
    ) -> Result<Vec<ExecutionHistoryItem>, String> {
        let limit = limit.unwrap_or(50);

        self.db.with_connection(|conn| {
            let mut stmt = conn
                .prepare(
                    r#"
                    SELECT id, workflow_id, workflow_name, status, started_at, finished_at,
                           duration_ms, node_count, completed_node_count, error_message,
                           output, triggered_by
                    FROM execution_history
                    WHERE workflow_id = ?1
                    ORDER BY started_at DESC
                    LIMIT ?2
                    "#,
                )
                .map_err(|e| format!("Failed to prepare statement: {}", e))?;

            let rows = stmt
                .query_map(params![workflow_id, limit as i64], |row| {
                    Ok(HistoryRow {
                        id: row.get(0)?,
                        workflow_id: row.get(1)?,
                        workflow_name: row.get(2)?,
                        status: row.get(3)?,
                        started_at: row.get(4)?,
                        finished_at: row.get(5)?,
                        duration_ms: row.get(6)?,
                        node_count: row.get(7)?,
                        completed_node_count: row.get(8)?,
                        error_message: row.get(9)?,
                        output: row.get(10)?,
                        triggered_by: row.get(11)?,
                    })
                })
                .map_err(|e| format!("Failed to query execution history: {}", e))?;

            let mut history = Vec::new();
            for row in rows {
                let row = row.map_err(|e| format!("Failed to read row: {}", e))?;
                history.push(row.into_history()?);
            }

            Ok(history)
        })
    }

    /// Save execution history entry
    pub fn save_history(&self, history: &ExecutionHistoryItem) -> Result<(), String> {
        let output_json = serde_json::to_string(&history.output)
            .map_err(|e| format!("Failed to serialize output: {}", e))?;

        self.db.with_connection(|conn| {
            conn.execute(
                r#"
                INSERT OR REPLACE INTO execution_history
                (id, workflow_id, workflow_name, status, started_at, finished_at,
                 duration_ms, node_count, completed_node_count, error_message,
                 output, triggered_by)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
                "#,
                params![
                    history.id,
                    history.workflow_id,
                    history.workflow_name,
                    history.status,
                    history.started_at,
                    history.finished_at,
                    history.duration_ms as i64,
                    history.node_count as i32,
                    history.completed_node_count as i32,
                    history.error_message,
                    output_json,
                    history.triggered_by,
                ],
            )
            .map_err(|e| format!("Failed to save execution history: {}", e))?;

            Ok(())
        })
    }

    /// Delete execution history entry
    pub fn delete_history(&self, id: &str) -> Result<bool, String> {
        self.db.with_connection(|conn| {
            let rows_affected = conn
                .execute("DELETE FROM execution_history WHERE id = ?1", params![id])
                .map_err(|e| format!("Failed to delete execution history: {}", e))?;

            Ok(rows_affected > 0)
        })
    }

    /// Delete all execution history for a workflow
    pub fn clear_workflow_history(&self, workflow_id: &str) -> Result<usize, String> {
        self.db.with_connection(|conn| {
            let rows_affected = conn
                .execute(
                    "DELETE FROM execution_history WHERE workflow_id = ?1",
                    params![workflow_id],
                )
                .map_err(|e| format!("Failed to clear workflow history: {}", e))?;

            Ok(rows_affected)
        })
    }

    /// List all execution history grouped by workflow_id
    pub fn list_all_history_grouped(
        &self,
    ) -> Result<std::collections::HashMap<String, Vec<ExecutionHistoryItem>>, String> {
        let history = self.list_history(Some(10000))?; // Get all history

        let mut grouped: std::collections::HashMap<String, Vec<ExecutionHistoryItem>> =
            std::collections::HashMap::new();
        for item in history {
            grouped
                .entry(item.workflow_id.clone())
                .or_insert_with(Vec::new)
                .push(item);
        }

        Ok(grouped)
    }

    /// Delete old execution history (keep last N entries per workflow)
    pub fn prune_history(&self, keep_per_workflow: usize) -> Result<usize, String> {
        self.db.with_connection(|conn| {
            let rows_affected = conn
                .execute(
                    r#"
                    DELETE FROM execution_history
                    WHERE id NOT IN (
                        SELECT id FROM (
                            SELECT id, ROW_NUMBER() OVER (
                                PARTITION BY workflow_id
                                ORDER BY started_at DESC
                            ) as rn
                            FROM execution_history
                        )
                        WHERE rn <= ?1
                    )
                    "#,
                    params![keep_per_workflow as i64],
                )
                .map_err(|e| format!("Failed to prune execution history: {}", e))?;

            Ok(rows_affected)
        })
    }
}

/// Internal row structure for execution history
struct HistoryRow {
    id: String,
    workflow_id: String,
    workflow_name: String,
    status: String,
    started_at: String,
    finished_at: String,
    duration_ms: i64,
    node_count: i32,
    completed_node_count: i32,
    error_message: Option<String>,
    output: Option<String>,
    triggered_by: String,
}

impl HistoryRow {
    fn into_history(self) -> Result<ExecutionHistoryItem, String> {
        let output: Vec<WorkflowOutputLine> = self
            .output
            .as_ref()
            .and_then(|json| serde_json::from_str(json).ok())
            .unwrap_or_default();

        Ok(ExecutionHistoryItem {
            id: self.id,
            workflow_id: self.workflow_id,
            workflow_name: self.workflow_name,
            status: self.status,
            started_at: self.started_at,
            finished_at: self.finished_at,
            duration_ms: self.duration_ms as u64,
            node_count: self.node_count as usize,
            completed_node_count: self.completed_node_count as usize,
            error_message: self.error_message,
            output,
            triggered_by: self.triggered_by,
        })
    }
}
