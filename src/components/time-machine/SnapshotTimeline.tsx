// Snapshot Timeline Component
// Displays a timeline of execution snapshots

import { useState } from 'react';
import {
  Clock,
  Package,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import type { SnapshotListItem } from '../../types/snapshot';
import { SecurityBadge } from './SecurityBadge';
import { cn } from '../../lib/utils';

interface SnapshotTimelineProps {
  snapshots: SnapshotListItem[];
  loading?: boolean;
  selectedId?: string | null;
  onSelect?: (snapshot: SnapshotListItem) => void;
  onDelete?: (snapshotId: string) => void;
  onCompare?: (snapshotA: SnapshotListItem, snapshotB: SnapshotListItem) => void;
  compareMode?: boolean;
  className?: string;
}

export function SnapshotTimeline({
  snapshots,
  loading = false,
  selectedId,
  onSelect,
  onDelete,
  onCompare,
  compareMode = false,
  className,
}: SnapshotTimelineProps) {
  const [compareSelection, setCompareSelection] = useState<SnapshotListItem | null>(null);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateStr);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="text-green-500" size={16} />;
      case 'failed':
        return <XCircle className="text-red-500" size={16} />;
      case 'capturing':
        return <Loader2 className="text-blue-500 animate-spin" size={16} />;
      default:
        return <Clock className="text-gray-400" size={16} />;
    }
  };

  const getLockfileIcon = (type?: string) => {
    const colors: Record<string, string> = {
      npm: 'text-red-500',
      pnpm: 'text-yellow-500',
      yarn: 'text-blue-500',
      bun: 'text-orange-500',
    };
    return (
      <Package size={14} className={type ? colors[type] || 'text-gray-400' : 'text-gray-400'} />
    );
  };

  const handleClick = (snapshot: SnapshotListItem) => {
    if (compareMode && onCompare) {
      if (!compareSelection) {
        setCompareSelection(snapshot);
      } else {
        onCompare(compareSelection, snapshot);
        setCompareSelection(null);
      }
    } else {
      onSelect?.(snapshot);
    }
  };

  const handleDelete = (e: React.MouseEvent, snapshotId: string) => {
    e.stopPropagation();
    onDelete?.(snapshotId);
  };

  if (loading && snapshots.length === 0) {
    return (
      <div className={cn('flex items-center justify-center py-8', className)}>
        <Loader2 className="animate-spin text-gray-400" size={24} />
        <span className="ml-2 text-gray-500">Loading snapshots...</span>
      </div>
    );
  }

  if (snapshots.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-8 text-center', className)}>
        <Clock className="text-gray-400 mb-2" size={32} />
        <p className="text-gray-500">No snapshots yet</p>
        <p className="text-gray-400 text-sm mt-1">
          Snapshots are captured automatically when workflows execute
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-1', className)}>
      {compareMode && (
        <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
          {compareSelection ? (
            <span className="text-blue-600 dark:text-blue-400">
              Select another snapshot to compare with{' '}
              <strong>{formatRelativeTime(compareSelection.createdAt)}</strong>
            </span>
          ) : (
            <span className="text-blue-600 dark:text-blue-400">
              Select the first snapshot to compare
            </span>
          )}
        </div>
      )}

      {snapshots.map((snapshot, index) => {
        const isSelected = selectedId === snapshot.id;
        const isCompareSelected = compareSelection?.id === snapshot.id;

        return (
          <div
            key={snapshot.id}
            onClick={() => handleClick(snapshot)}
            className={cn(
              'group relative flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all',
              'hover:bg-gray-100 dark:hover:bg-gray-800',
              isSelected && 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800',
              isCompareSelected && 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800',
              !isSelected && !isCompareSelected && 'border border-transparent'
            )}
          >
            {/* Timeline connector */}
            {index < snapshots.length - 1 && (
              <div className="absolute left-[22px] top-[40px] w-0.5 h-[calc(100%-20px)] bg-gray-200 dark:bg-gray-700" />
            )}

            {/* Status indicator */}
            <div className="flex-shrink-0 z-10 bg-white dark:bg-gray-900 rounded-full p-1">
              {getStatusIcon(snapshot.status)}
            </div>

            {/* Main content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {formatRelativeTime(snapshot.createdAt)}
                </span>
                {getLockfileIcon(snapshot.lockfileType)}
                {snapshot.postinstallCount > 0 && (
                  <span className="flex items-center text-amber-500 text-xs">
                    <AlertTriangle size={12} className="mr-0.5" />
                    {snapshot.postinstallCount}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                <span>{snapshot.totalDependencies} deps</span>
                <SecurityBadge score={snapshot.securityScore} size="sm" showLabel />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onDelete && (
                <button
                  onClick={(e) => handleDelete(e, snapshot.id)}
                  className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500"
                  title="Delete snapshot"
                >
                  <Trash2 size={14} />
                </button>
              )}
              {!compareMode && (
                <ChevronRight size={16} className="text-gray-400" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
