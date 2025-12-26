//! Process management utilities
//!
//! Functions for managing process trees and cleanup.

use tauri::{AppHandle, Manager};

use crate::utils::path_resolver;
use super::state::ScriptExecutionState;
use super::types::ExecutionStatus;

/// Retention period for completed scripts (5 minutes)
pub const COMPLETED_SCRIPT_RETENTION_SECS: u64 = 5 * 60;

/// Get all descendant PIDs of a process (children, grandchildren, etc.)
pub fn get_descendant_pids(pid: u32) -> Vec<u32> {
    let mut descendants = Vec::new();

    // Use pgrep -P to find direct children
    let output = path_resolver::create_command("pgrep")
        .args(["-P", &pid.to_string()])
        .output();

    if let Ok(output) = output {
        let pids_str = String::from_utf8_lossy(&output.stdout);
        for line in pids_str.lines() {
            if let Ok(child_pid) = line.trim().parse::<u32>() {
                // Add this child
                descendants.push(child_pid);
                // Recursively get this child's descendants
                descendants.extend(get_descendant_pids(child_pid));
            }
        }
    }

    descendants
}

/// Kill a process tree (process and all descendants)
pub fn kill_process_tree(pid: u32) -> Result<(), String> {
    println!("[kill_process_tree] Killing process tree for PID: {}", pid);

    // Get all descendant PIDs first
    let descendants = get_descendant_pids(pid);
    println!(
        "[kill_process_tree] Found {} descendants: {:?}",
        descendants.len(),
        descendants
    );

    // Kill descendants first (in reverse order - deepest first)
    for &child_pid in descendants.iter().rev() {
        println!("[kill_process_tree] Killing descendant PID: {}", child_pid);
        #[cfg(unix)]
        {
            // SIGTERM first for graceful shutdown
            unsafe {
                libc::kill(child_pid as i32, libc::SIGTERM);
            }
        }
    }

    // Kill the main process
    println!("[kill_process_tree] Killing main PID: {}", pid);
    #[cfg(unix)]
    {
        unsafe {
            libc::kill(pid as i32, libc::SIGTERM);
        }
    }

    // Give processes a moment to terminate gracefully
    std::thread::sleep(std::time::Duration::from_millis(100));

    // Force kill any remaining processes with SIGKILL
    for &child_pid in descendants.iter().rev() {
        #[cfg(unix)]
        {
            unsafe {
                libc::kill(child_pid as i32, libc::SIGKILL);
            }
        }
    }

    #[cfg(unix)]
    {
        unsafe {
            libc::kill(pid as i32, libc::SIGKILL);
        }
    }

    Ok(())
}

/// Clean up expired completed scripts (Feature 007: T025)
pub async fn cleanup_expired_executions(app: &AppHandle) {
    let state = app.state::<ScriptExecutionState>();
    let mut executions = state.executions.write().await;

    let expired_ids: Vec<String> = executions
        .iter()
        .filter(|(_, exec)| {
            // Only clean up completed scripts (not running)
            exec.status != ExecutionStatus::Running
        })
        .filter(|(_, exec)| {
            // Check if retention period has passed
            exec.started_at.elapsed().as_secs() > COMPLETED_SCRIPT_RETENTION_SECS
        })
        .map(|(id, _)| id.clone())
        .collect();

    for id in expired_ids {
        executions.remove(&id);
    }
}
