/**
 * Git Status View - Shows branch info, remote status, and push/pull buttons
 * @see specs/009-git-integration/tasks.md - T015
 */

import { useState, useEffect, useCallback } from 'react';
import {
  GitBranch,
  ArrowUp,
  ArrowDown,
  Cloud,
  CloudOff,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { gitAPI } from '../../../lib/tauri-api';
import { Button } from '../../ui/Button';
import type { GitRemote } from '../../../types/git';

interface GitStatusViewProps {
  /** Current branch name */
  branch: string;
  /** Commits ahead of remote */
  ahead: number;
  /** Commits behind remote */
  behind: number;
  /** Whether there's a tracking branch */
  hasTrackingBranch: boolean;
  /** Project path for remote operations */
  projectPath: string;
  /** Push handler */
  onPush: () => Promise<{ success: boolean; error?: string }>;
  /** Pull handler */
  onPull: () => Promise<{ success: boolean; hasConflicts?: boolean; error?: string }>;
  /** Loading state */
  isLoading?: boolean;
  /** Callback when remotes change */
  onRemotesChange?: () => void;
}

export function GitStatusView({
  branch,
  ahead,
  behind,
  hasTrackingBranch,
  projectPath,
  onPush,
  onPull,
  isLoading = false,
  onRemotesChange,
}: GitStatusViewProps) {
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [remotes, setRemotes] = useState<GitRemote[]>([]);

  // Load remotes to check if any exist
  const loadRemotes = useCallback(async () => {
    if (!projectPath) return;

    try {
      const response = await gitAPI.getRemotes(projectPath);
      if (response.success && response.remotes) {
        setRemotes(response.remotes);
      }
    } catch (err) {
      console.error('Failed to load remotes:', err);
    }
  }, [projectPath]);

  useEffect(() => {
    loadRemotes();
  }, [loadRemotes]);

  const handlePush = async () => {
    if (remotes.length === 0) {
      setOperationError('No remote configured. Go to Settings tab to add one.');
      return;
    }

    setIsPushing(true);
    setOperationError(null);
    try {
      const result = await onPush();
      if (!result.success && result.error) {
        // Provide user-friendly error messages
        if (result.error.includes("does not appear to be a git repository") ||
            result.error.includes("No remote")) {
          setOperationError('No remote configured. Go to Settings tab to add one.');
        } else if (result.error.includes("AUTH_FAILED") || result.error.includes("could not read Username")) {
          setOperationError('Authentication failed. Check Settings > Authentication.');
        } else if (result.error.includes("NETWORK_ERROR") || result.error.includes("Could not resolve")) {
          setOperationError('Network error. Check your internet connection.');
        } else {
          setOperationError(result.error);
        }
      }
    } finally {
      setIsPushing(false);
    }
  };

  const handlePull = async () => {
    if (remotes.length === 0) {
      setOperationError('No remote configured. Go to Settings tab to add one.');
      return;
    }

    setIsPulling(true);
    setOperationError(null);
    try {
      const result = await onPull();
      if (!result.success && result.error) {
        // Provide user-friendly error messages
        if (result.error.includes("does not appear to be a git repository") ||
            result.error.includes("No remote")) {
          setOperationError('No remote configured. Go to Settings tab to add one.');
        } else if (result.error.includes("AUTH_FAILED") || result.error.includes("could not read Username")) {
          setOperationError('Authentication failed. Check Settings > Authentication.');
        } else if (result.error.includes("NETWORK_ERROR") || result.error.includes("Could not resolve")) {
          setOperationError('Network error. Check your internet connection.');
        } else if (result.error.includes("There is no tracking information")) {
          setOperationError('No upstream branch. Use "git push -u origin <branch>" to set upstream.');
        } else {
          setOperationError(result.error);
        }
      } else if (result.hasConflicts) {
        setOperationError('Merge conflicts detected. Please resolve them manually.');
      }
    } finally {
      setIsPulling(false);
    }
  };

  // Fetch from remote
  const handleFetch = async () => {
    if (remotes.length === 0) {
      setOperationError('No remote configured. Go to Settings tab to add one.');
      return;
    }

    setIsFetching(true);
    setOperationError(null);

    try {
      const response = await gitAPI.fetch(projectPath, { allRemotes: true });
      if (response.success) {
        onRemotesChange?.();
      } else {
        if (response.error === 'NETWORK_ERROR') {
          setOperationError('Network error. Check your internet connection.');
        } else if (response.error === 'AUTH_FAILED') {
          setOperationError('Authentication failed. Check Settings > Authentication.');
        } else {
          setOperationError(response.error || 'Failed to fetch');
        }
      }
    } catch (err) {
      setOperationError('Failed to fetch');
      console.error('Fetch error:', err);
    } finally {
      setIsFetching(false);
    }
  };

  const hasRemotes = remotes.length > 0;

  return (
    <div className="bg-card rounded-lg p-4 space-y-3">
      {/* Branch Info Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GitBranch className="w-5 h-5 text-blue-400" />
          <span className="font-medium text-foreground">{branch}</span>

          {/* Ahead/Behind indicators */}
          {hasTrackingBranch && (ahead > 0 || behind > 0) && (
            <div className="flex items-center gap-2 text-sm">
              {ahead > 0 && (
                <span
                  className="flex items-center gap-0.5 text-green-400"
                  title={`${ahead} commit${ahead > 1 ? 's' : ''} ahead of remote`}
                >
                  <ArrowUp className="w-3 h-3" />
                  <span>{ahead}</span>
                </span>
              )}
              {behind > 0 && (
                <span
                  className="flex items-center gap-0.5 text-orange-400"
                  title={`${behind} commit${behind > 1 ? 's' : ''} behind remote`}
                >
                  <ArrowDown className="w-3 h-3" />
                  <span>{behind}</span>
                </span>
              )}
            </div>
          )}

          {/* Tracking status */}
          {!hasTrackingBranch && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <CloudOff className="w-3 h-3" />
              No upstream
            </span>
          )}
          {hasTrackingBranch && ahead === 0 && behind === 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Cloud className="w-3 h-3" />
              Up to date
            </span>
          )}
        </div>

        {/* Fetch/Push/Pull Buttons */}
        <div className="flex items-center gap-2">
          {/* Fetch Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleFetch}
            disabled={isFetching || isPulling || isPushing || isLoading || !hasRemotes}
            title={!hasRemotes ? 'Configure remote in Settings' : 'Fetch from all remotes'}
          >
            {isFetching ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-1.5" />
            )}
            Fetch
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePull}
            disabled={isPulling || isPushing || isFetching || isLoading || !hasRemotes}
            title={!hasRemotes ? 'Configure remote in Settings' : 'Pull from remote'}
          >
            {isPulling ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <ArrowDown className="w-4 h-4 mr-1.5" />
            )}
            Pull
          </Button>
          <Button
            size="sm"
            onClick={handlePush}
            disabled={isPushing || isPulling || isFetching || isLoading || !hasRemotes || ahead === 0}
            className="bg-blue-600 hover:bg-blue-500 text-white"
            title={!hasRemotes ? 'Configure remote in Settings' : ahead === 0 ? 'Nothing to push' : 'Push to remote'}
          >
            {isPushing ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <ArrowUp className="w-4 h-4 mr-1.5" />
            )}
            Push
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {operationError && (
        <div className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded">
          {operationError}
        </div>
      )}
    </div>
  );
}
