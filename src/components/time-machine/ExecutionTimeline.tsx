// Execution Timeline Component
// Cross-project timeline view of all snapshots

import { useEffect } from 'react';
import {
  Clock,
  Package,
  Shield,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  Calendar,
} from 'lucide-react';
import { useSnapshotSearch } from '../../hooks/useSnapshotSearch';
import { cn } from '../../lib/utils';
import type { TimelineEntry } from '../../types/snapshot';

interface ExecutionTimelineProps {
  projectPath: string;
  limit?: number;
  onSelectSnapshot?: (snapshotId: string) => void;
  className?: string;
}

export function ExecutionTimeline({
  projectPath,
  limit = 20,
  onSelectSnapshot,
  className,
}: ExecutionTimelineProps) {
  const { timeline, isLoadingTimeline, timelineError, loadTimeline } = useSnapshotSearch();

  // Load timeline on mount or project change
  useEffect(() => {
    if (projectPath) {
      loadTimeline(projectPath, limit);
    }
  }, [projectPath, limit, loadTimeline]);

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Group timeline entries by date
  const groupedEntries = timeline.reduce<Record<string, TimelineEntry[]>>((acc, entry) => {
    const dateKey = formatDate(entry.createdAt);
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(entry);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedEntries).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  // Compact path for display
  const compactPath = (path: string) => {
    const parts = path.split('/');
    if (parts.length <= 3) return path;
    return '.../' + parts.slice(-2).join('/');
  };

  if (isLoadingTimeline) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <RefreshCw className="w-5 h-5 animate-spin text-neutral-400" />
        <span className="ml-2 text-sm text-neutral-500">Loading timeline...</span>
      </div>
    );
  }

  if (timelineError) {
    return (
      <div className={cn('p-4 text-sm text-red-600 dark:text-red-400', className)}>
        {timelineError}
      </div>
    );
  }

  if (timeline.length === 0) {
    return (
      <div className={cn('p-8 text-center text-neutral-500', className)}>
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No execution history yet</p>
        <p className="text-xs mt-1">Snapshots will appear here after workflow executions</p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Header */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Execution Timeline
        </h3>
        <button
          onClick={() => loadTimeline(projectPath, limit)}
          className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto">
        {sortedDates.map((date) => (
          <div key={date}>
            {/* Date Header */}
            <div className="sticky top-0 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
              <div className="text-xs font-medium text-neutral-500 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {date}
              </div>
            </div>

            {/* Entries for this date */}
            <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {groupedEntries[date].map((entry) => (
                <TimelineEntryItem
                  key={entry.snapshotId}
                  entry={entry}
                  onSelect={() => onSelectSnapshot?.(entry.snapshotId)}
                  formatTime={formatTime}
                  compactPath={compactPath}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Timeline Entry Item Component
interface TimelineEntryItemProps {
  entry: TimelineEntry;
  onSelect: () => void;
  formatTime: (date: string) => string;
  compactPath: (path: string) => string;
}

function TimelineEntryItem({
  entry,
  onSelect,
  formatTime,
  compactPath,
}: TimelineEntryItemProps) {
  const statusColors = {
    completed: 'bg-green-500',
    failed: 'bg-red-500',
    capturing: 'bg-blue-500',
  };

  return (
    <button
      onClick={onSelect}
      className="w-full p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 flex items-start gap-3 text-left"
    >
      {/* Timeline dot */}
      <div className="flex flex-col items-center">
        <div className={cn('w-2.5 h-2.5 rounded-full', statusColors[entry.status])} />
        <div className="flex-1 w-px bg-neutral-200 dark:bg-neutral-700 mt-1" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500">{formatTime(entry.createdAt)}</span>
          {entry.hasSecurityIssues && (
            <span title="Has security issues">
              <AlertTriangle className="w-3 h-3 text-amber-500" />
            </span>
          )}
        </div>

        <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate mt-0.5">
          {compactPath(entry.projectPath)}
        </div>

        <div className="flex items-center gap-3 mt-1 text-xs text-neutral-500">
          <span className="flex items-center gap-1">
            <Package className="w-3 h-3" />
            {entry.totalDependencies}
          </span>

          {entry.postinstallCount > 0 && (
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-500">
              <AlertTriangle className="w-3 h-3" />
              {entry.postinstallCount}
            </span>
          )}

          {entry.securityScore !== null && entry.securityScore !== undefined && (
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              {entry.securityScore}
            </span>
          )}
        </div>
      </div>

      {/* Arrow */}
      <ChevronRight className="w-4 h-4 text-neutral-300 dark:text-neutral-600" />
    </button>
  );
}
