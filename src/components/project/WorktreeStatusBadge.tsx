/**
 * Worktree Status Badge Component
 * Displays at-a-glance status information for a worktree
 * @see specs/001-worktree-enhancements/tasks.md - T023, T025-T027
 */

import { ArrowUp, ArrowDown, Clock, FileEdit } from 'lucide-react';
import type { WorktreeStatus } from '../../lib/tauri-api';
import { formatRelativeTime } from '../../hooks/useWorktreeStatuses';
import { cn } from '../../lib/utils';

interface WorktreeStatusBadgeProps {
  status: WorktreeStatus | undefined;
  isLoading?: boolean;
  compact?: boolean;
  className?: string;
}

export function WorktreeStatusBadge({
  status,
  isLoading = false,
  compact = false,
  className,
}: WorktreeStatusBadgeProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="h-4 w-16 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  // No status available
  if (!status) {
    return null;
  }

  const { uncommittedCount, ahead, behind, hasTrackingBranch, lastCommitTime } = status;

  // Check if there's anything to show
  const hasChanges = uncommittedCount > 0;
  const hasAheadBehind = hasTrackingBranch && (ahead > 0 || behind > 0);
  const hasLastCommit = !!lastCommitTime;

  if (!hasChanges && !hasAheadBehind && !hasLastCommit) {
    return null;
  }

  if (compact) {
    return (
      <div className={cn('flex items-center gap-1.5 text-xs', className)}>
        {/* Uncommitted changes */}
        {hasChanges && (
          <span
            className="flex items-center gap-0.5 text-yellow-400"
            title={`${uncommittedCount} uncommitted change${uncommittedCount > 1 ? 's' : ''}`}
          >
            <FileEdit className="w-3 h-3" />
            <span>{uncommittedCount}</span>
          </span>
        )}

        {/* Ahead/Behind */}
        {hasAheadBehind && (
          <>
            {ahead > 0 && (
              <span
                className="flex items-center gap-0.5 text-green-400"
                title={`${ahead} commit${ahead > 1 ? 's' : ''} ahead`}
              >
                <ArrowUp className="w-3 h-3" />
                <span>{ahead}</span>
              </span>
            )}
            {behind > 0 && (
              <span
                className="flex items-center gap-0.5 text-orange-400"
                title={`${behind} commit${behind > 1 ? 's' : ''} behind`}
              >
                <ArrowDown className="w-3 h-3" />
                <span>{behind}</span>
              </span>
            )}
          </>
        )}

        {/* Last commit time */}
        {hasLastCommit && (
          <span
            className="flex items-center gap-0.5 text-muted-foreground"
            title={`Last commit: ${lastCommitTime}`}
          >
            <Clock className="w-3 h-3" />
            <span>{formatRelativeTime(lastCommitTime)}</span>
          </span>
        )}
      </div>
    );
  }

  // Full display
  return (
    <div className={cn('flex flex-wrap items-center gap-2 text-xs', className)}>
      {/* Uncommitted changes badge */}
      {hasChanges && (
        <span
          className="flex items-center gap-1 px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded"
          title={`${uncommittedCount} uncommitted change${uncommittedCount > 1 ? 's' : ''}`}
        >
          <FileEdit className="w-3 h-3" />
          <span>{uncommittedCount} change{uncommittedCount > 1 ? 's' : ''}</span>
        </span>
      )}

      {/* Ahead badge */}
      {hasAheadBehind && ahead > 0 && (
        <span
          className="flex items-center gap-1 px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded"
          title={`${ahead} commit${ahead > 1 ? 's' : ''} ahead of remote`}
        >
          <ArrowUp className="w-3 h-3" />
          <span>{ahead} ahead</span>
        </span>
      )}

      {/* Behind badge */}
      {hasAheadBehind && behind > 0 && (
        <span
          className="flex items-center gap-1 px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded"
          title={`${behind} commit${behind > 1 ? 's' : ''} behind remote`}
        >
          <ArrowDown className="w-3 h-3" />
          <span>{behind} behind</span>
        </span>
      )}

      {/* Last commit time */}
      {hasLastCommit && (
        <span
          className="flex items-center gap-1 text-muted-foreground"
          title={status.lastCommitMessage || `Last commit: ${lastCommitTime}`}
        >
          <Clock className="w-3 h-3" />
          <span>{formatRelativeTime(lastCommitTime)}</span>
        </span>
      )}
    </div>
  );
}

/**
 * Inline status indicators for compact display in worktree list
 */
interface WorktreeStatusIndicatorsProps {
  status: WorktreeStatus | undefined;
  className?: string;
}

export function WorktreeStatusIndicators({
  status,
  className,
}: WorktreeStatusIndicatorsProps) {
  if (!status) return null;

  const { uncommittedCount, ahead, behind, hasTrackingBranch } = status;
  const hasChanges = uncommittedCount > 0;
  const hasAheadBehind = hasTrackingBranch && (ahead > 0 || behind > 0);

  if (!hasChanges && !hasAheadBehind) {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {/* Uncommitted changes dot */}
      {hasChanges && (
        <span
          className="w-2 h-2 bg-yellow-400 rounded-full"
          title={`${uncommittedCount} uncommitted change${uncommittedCount > 1 ? 's' : ''}`}
        />
      )}

      {/* Ahead indicator */}
      {hasAheadBehind && ahead > 0 && (
        <span
          className="w-2 h-2 bg-green-400 rounded-full"
          title={`${ahead} commit${ahead > 1 ? 's' : ''} ahead`}
        />
      )}

      {/* Behind indicator */}
      {hasAheadBehind && behind > 0 && (
        <span
          className="w-2 h-2 bg-orange-400 rounded-full"
          title={`${behind} commit${behind > 1 ? 's' : ''} behind`}
        />
      )}
    </div>
  );
}
