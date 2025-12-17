/**
 * Worktree Statuses Hook
 * Fetches and manages worktree status information
 * @see specs/001-worktree-enhancements/tasks.md - T024
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  worktreeAPI,
  type WorktreeStatus,
  type GetAllWorktreeStatusesResponse,
} from '../lib/tauri-api';

interface UseWorktreeStatusesOptions {
  /** Project path to fetch statuses for */
  projectPath: string;
  /** Whether to auto-refresh on mount */
  autoRefresh?: boolean;
  /** Auto-refresh interval in milliseconds (default: 30000 = 30s) */
  refreshInterval?: number;
}

interface UseWorktreeStatusesReturn {
  /** Map of worktree path to status */
  statuses: Record<string, WorktreeStatus>;
  /** Whether statuses are being loaded */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Manually refresh all statuses */
  refresh: () => Promise<void>;
  /** Get status for a specific worktree */
  getStatus: (worktreePath: string) => WorktreeStatus | undefined;
  /** Last refresh timestamp */
  lastRefreshedAt: Date | null;
}

export function useWorktreeStatuses({
  projectPath,
  autoRefresh = true,
  refreshInterval = 30000,
}: UseWorktreeStatusesOptions): UseWorktreeStatusesReturn {
  const [statuses, setStatuses] = useState<Record<string, WorktreeStatus>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    if (!projectPath) return;

    setIsLoading(true);
    setError(null);

    try {
      const response: GetAllWorktreeStatusesResponse =
        await worktreeAPI.getAllWorktreeStatuses(projectPath);

      if (response.success && response.statuses) {
        setStatuses(response.statuses);
        setLastRefreshedAt(new Date());
      } else {
        setError(response.error || 'Failed to fetch worktree statuses');
      }
    } catch (err) {
      console.error('Error fetching worktree statuses:', err);
      setError('Failed to fetch worktree statuses');
    } finally {
      setIsLoading(false);
    }
  }, [projectPath]);

  const getStatus = useCallback(
    (worktreePath: string): WorktreeStatus | undefined => {
      return statuses[worktreePath];
    },
    [statuses]
  );

  // Initial fetch and auto-refresh setup
  useEffect(() => {
    if (!projectPath) return;

    // Initial fetch
    refresh();

    // Setup auto-refresh
    if (autoRefresh && refreshInterval > 0) {
      intervalRef.current = setInterval(refresh, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [projectPath, autoRefresh, refreshInterval, refresh]);

  return {
    statuses,
    isLoading,
    error,
    refresh,
    getStatus,
    lastRefreshedAt,
  };
}

/**
 * Format relative time from ISO date string
 * @param isoDate ISO 8601 date string
 * @returns Human-readable relative time (e.g., "2 hours ago", "3 days ago")
 */
export function formatRelativeTime(isoDate: string | null | undefined): string {
  if (!isoDate) return 'Unknown';

  try {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);

    if (diffSeconds < 60) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else if (diffWeeks < 4) {
      return `${diffWeeks}w ago`;
    } else {
      return `${diffMonths}mo ago`;
    }
  } catch {
    return 'Unknown';
  }
}
