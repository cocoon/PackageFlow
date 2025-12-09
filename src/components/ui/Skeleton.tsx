/**
 * Skeleton Loading Component
 * Placeholder UI while content is loading
 * @see specs/001-worktree-enhancements/tasks.md - T057
 */

import { cn } from '../../lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded bg-muted/50',
        className
      )}
    />
  );
}

/**
 * Worktree item skeleton for loading states
 */
export function WorktreeItemSkeleton() {
  return (
    <div className="p-3 rounded-lg border bg-card border-border">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Skeleton className="w-4 h-4" />
            <Skeleton className="w-32 h-4" />
          </div>
          <Skeleton className="w-48 h-3 mt-2" />
          <div className="flex items-center gap-2 mt-1">
            <Skeleton className="w-14 h-3" />
            <Skeleton className="w-20 h-3" />
          </div>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <Skeleton className="w-8 h-8 rounded" />
          <Skeleton className="w-8 h-8 rounded" />
        </div>
      </div>
    </div>
  );
}

/**
 * Worktree status badge skeleton
 */
export function WorktreeStatusSkeleton() {
  return (
    <div className="flex items-center gap-2">
      <Skeleton className="w-12 h-4 rounded-full" />
      <Skeleton className="w-16 h-4 rounded-full" />
    </div>
  );
}

/**
 * Template item skeleton
 */
export function TemplateItemSkeleton() {
  return (
    <div className="p-3 bg-background border border-border rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="w-4 h-4" />
          <Skeleton className="w-28 h-4" />
        </div>
        <Skeleton className="w-4 h-4" />
      </div>
      <Skeleton className="w-full h-3 mt-2" />
      <div className="flex items-center gap-4 mt-2">
        <Skeleton className="w-24 h-3" />
        <Skeleton className="w-16 h-3" />
      </div>
    </div>
  );
}
