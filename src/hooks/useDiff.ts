/**
 * useDiff Hook - Manages diff data loading for Git Diff Viewer
 * @see specs/010-git-diff-viewer/tasks.md - T011
 */

import { useState, useEffect, useCallback } from 'react';
import { gitAPI, type FileDiff } from '../lib/tauri-api';

export type DiffType = 'staged' | 'unstaged';

export interface UseDiffOptions {
  /** Project path */
  projectPath: string;
  /** File path relative to repository root */
  filePath: string;
  /** Diff type - staged or unstaged */
  diffType: DiffType;
  /** Whether to skip initial fetch */
  skip?: boolean;
}

export interface UseDiffResult {
  /** The diff data, or null if not loaded */
  diff: FileDiff | null;
  /** Whether the diff is currently loading */
  isLoading: boolean;
  /** Error message if loading failed */
  error: string | null;
  /** Refetch the diff */
  refetch: () => Promise<void>;
}

/**
 * Hook for loading and managing diff data for a single file
 */
export function useDiff({
  projectPath,
  filePath,
  diffType,
  skip = false,
}: UseDiffOptions): UseDiffResult {
  const [diff, setDiff] = useState<FileDiff | null>(null);
  const [isLoading, setIsLoading] = useState(!skip);
  const [error, setError] = useState<string | null>(null);

  const fetchDiff = useCallback(async () => {
    if (!projectPath || !filePath) {
      setDiff(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await gitAPI.getFileDiff(
        projectPath,
        filePath,
        diffType === 'staged'
      );

      if (response.success) {
        setDiff(response.diff || null);
        setError(null);
      } else {
        setDiff(null);
        setError(response.error || 'Failed to load diff');
      }
    } catch (err) {
      setDiff(null);
      setError(err instanceof Error ? err.message : 'Failed to load diff');
      console.error('Diff loading error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [projectPath, filePath, diffType]);

  // Fetch diff on mount and when dependencies change
  useEffect(() => {
    if (!skip) {
      fetchDiff();
    }
  }, [fetchDiff, skip]);

  return {
    diff,
    isLoading,
    error,
    refetch: fetchDiff,
  };
}
