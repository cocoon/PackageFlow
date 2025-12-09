/**
 * GitDiffViewer Component - Main diff viewer modal
 * @see specs/010-git-diff-viewer/tasks.md - T015
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, RefreshCw, Loader2, FileCode, FilePlus, FileX, FileSymlink, Columns2, AlignJustify } from 'lucide-react';
import { useDiff, type DiffType } from '../../../hooks/useDiff';
import { DiffUnifiedView } from './DiffUnifiedView';
import { DiffSplitView } from './DiffSplitView';
import { cn } from '../../../lib/utils';
import type { FileDiffStatus } from '../../../types/git';

export type ViewMode = 'unified' | 'split';

interface GitDiffViewerProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Handler for closing the modal */
  onClose: () => void;
  /** Project path */
  projectPath: string;
  /** File path relative to repository root */
  filePath: string;
  /** Initial diff type */
  initialDiffType?: DiffType;
  /** Callback when staging changes occur */
  onStagingChange?: () => void;
}

/**
 * Main diff viewer modal component
 */
export function GitDiffViewer({
  isOpen,
  onClose,
  projectPath,
  filePath,
  initialDiffType = 'unstaged',
  onStagingChange,
}: GitDiffViewerProps) {
  const [diffType, setDiffType] = useState<DiffType>(initialDiffType);
  const [focusedHunkIndex, setFocusedHunkIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('unified');
  const scrollPositionRef = useRef<number>(0);

  const { diff, isLoading, error, refetch } = useDiff({
    projectPath,
    filePath,
    diffType,
    skip: !isOpen,
  });

  // Reset state when file changes
  useEffect(() => {
    setFocusedHunkIndex(null);
    setDiffType(initialDiffType);
  }, [filePath, initialDiffType]);

  // Handle view mode toggle with scroll preservation (T024)
  const handleViewModeToggle = useCallback((newMode: ViewMode) => {
    // Save current scroll position
    const contentContainer = document.querySelector('[data-diff-content]');
    if (contentContainer) {
      scrollPositionRef.current = contentContainer.scrollTop;
    }
    setViewMode(newMode);
  }, []);

  // Restore scroll position after view mode change
  useEffect(() => {
    const contentContainer = document.querySelector('[data-diff-content]');
    if (contentContainer && scrollPositionRef.current > 0) {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        contentContainer.scrollTop = scrollPositionRef.current;
      });
    }
  }, [viewMode]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // Tab to switch diff type
      if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setDiffType((prev) => (prev === 'staged' ? 'unstaged' : 'staged'));
        return;
      }

      // 'v' to toggle view mode
      if (e.key === 'v' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleViewModeToggle(viewMode === 'unified' ? 'split' : 'unified');
        return;
      }

      // Navigation with n/p for hunks
      if (diff && diff.hunks.length > 0) {
        if (e.key === 'n') {
          e.preventDefault();
          setFocusedHunkIndex((prev) => {
            if (prev === null) return 0;
            return Math.min(prev + 1, diff.hunks.length - 1);
          });
        } else if (e.key === 'p') {
          e.preventDefault();
          setFocusedHunkIndex((prev) => {
            if (prev === null) return diff.hunks.length - 1;
            return Math.max(prev - 1, 0);
          });
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, diff, viewMode, handleViewModeToggle]);

  const handleRefresh = useCallback(() => {
    refetch();
    onStagingChange?.();
  }, [refetch, onStagingChange]);

  // Get file icon based on status
  const getFileIcon = (status?: FileDiffStatus) => {
    switch (status) {
      case 'added':
        return <FilePlus className="w-4 h-4 text-green-400" />;
      case 'deleted':
        return <FileX className="w-4 h-4 text-red-400" />;
      case 'renamed':
        return <FileSymlink className="w-4 h-4 text-yellow-400" />;
      default:
        return <FileCode className="w-4 h-4 text-blue-400" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-background rounded-lg shadow-2xl w-[95vw] h-[90vh] max-w-7xl flex flex-col overflow-hidden border border-border">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            {getFileIcon(diff?.status)}
            <div>
              <h2 className="text-sm font-medium text-foreground truncate max-w-md" title={filePath}>
                {filePath.split('/').pop()}
              </h2>
              <p className="text-xs text-muted-foreground truncate max-w-md" title={filePath}>
                {filePath}
              </p>
            </div>
            {diff && (
              <div className="flex items-center gap-2 ml-4 text-xs">
                <span className="text-green-400">+{diff.additions}</span>
                <span className="text-red-400">-{diff.deletions}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-muted rounded-md p-0.5">
              <button
                onClick={() => handleViewModeToggle('unified')}
                className={cn(
                  'p-1.5 rounded transition-colors',
                  viewMode === 'unified'
                    ? 'bg-blue-600 text-white'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                title="Unified view (v)"
              >
                <AlignJustify className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleViewModeToggle('split')}
                className={cn(
                  'p-1.5 rounded transition-colors',
                  viewMode === 'split'
                    ? 'bg-blue-600 text-white'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                title="Split view (v)"
              >
                <Columns2 className="w-4 h-4" />
              </button>
            </div>

            {/* Diff Type Toggle */}
            <div className="flex items-center bg-muted rounded-md p-0.5">
              <button
                onClick={() => setDiffType('unstaged')}
                className={cn(
                  'px-3 py-1 text-xs rounded transition-colors',
                  diffType === 'unstaged'
                    ? 'bg-blue-600 text-white'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Unstaged
              </button>
              <button
                onClick={() => setDiffType('staged')}
                className={cn(
                  'px-3 py-1 text-xs rounded transition-colors',
                  diffType === 'staged'
                    ? 'bg-blue-600 text-white'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Staged
              </button>
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-accent transition-colors disabled:opacity-50"
              title="Refresh (R)"
            >
              <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-accent transition-colors"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden" data-diff-content>
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <p className="text-red-400">{error}</p>
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-sm transition-colors"
              >
                Retry
              </button>
            </div>
          ) : !diff ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">
                No {diffType} changes for this file
              </p>
            </div>
          ) : viewMode === 'unified' ? (
            <DiffUnifiedView
              diff={diff}
              focusedHunkIndex={focusedHunkIndex}
              onHunkFocus={setFocusedHunkIndex}
            />
          ) : (
            <DiffSplitView
              diff={diff}
              focusedHunkIndex={focusedHunkIndex}
              onHunkFocus={setFocusedHunkIndex}
            />
          )}
        </div>

        {/* Footer - Keyboard Shortcuts Hint */}
        <div className="px-4 py-2 border-t border-border bg-card text-xs text-muted-foreground flex items-center gap-4">
          <span>
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-muted-foreground">Esc</kbd> Close
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-muted-foreground">Tab</kbd> Toggle Staged/Unstaged
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-muted-foreground">v</kbd> Toggle View Mode
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-muted-foreground">n</kbd> / <kbd className="px-1.5 py-0.5 bg-muted rounded text-muted-foreground">p</kbd> Navigate Hunks
          </span>
        </div>
      </div>
    </div>
  );
}
