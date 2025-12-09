/**
 * DiffUnifiedView Component - Unified (inline) diff display
 * @see specs/010-git-diff-viewer/tasks.md - T014
 */

import { useRef, useEffect } from 'react';
import { DiffHunk } from './DiffHunk';
import type { FileDiff } from '../../../types/git';

interface DiffUnifiedViewProps {
  /** The diff data to display */
  diff: FileDiff;
  /** Currently focused hunk index */
  focusedHunkIndex?: number | null;
  /** Handler for hunk focus changes */
  onHunkFocus?: (index: number) => void;
  /** Whether to show line numbers */
  showLineNumbers?: boolean;
  /** Language for syntax highlighting (overrides auto-detected) */
  language?: string;
}

/**
 * Renders a unified (inline) diff view
 */
export function DiffUnifiedView({
  diff,
  focusedHunkIndex,
  onHunkFocus,
  showLineNumbers = true,
  language,
}: DiffUnifiedViewProps) {
  // Use provided language or fall back to auto-detected
  const effectiveLanguage = language || diff.language;
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll focused hunk into view
  useEffect(() => {
    if (focusedHunkIndex !== null && focusedHunkIndex !== undefined && containerRef.current) {
      const hunkElements = containerRef.current.querySelectorAll('[data-hunk-index]');
      const targetHunk = hunkElements[focusedHunkIndex];
      if (targetHunk) {
        targetHunk.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [focusedHunkIndex]);

  // Handle binary files
  if (diff.isBinary) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center text-muted-foreground">
          <p className="text-lg font-medium">Binary file</p>
          <p className="text-sm mt-1">Cannot display diff for binary files</p>
        </div>
      </div>
    );
  }

  // Handle empty diff (no changes)
  if (diff.hunks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center text-muted-foreground">
          <p className="text-lg font-medium">No changes</p>
          <p className="text-sm mt-1">This file has no {diff.status === 'added' ? 'content' : 'changes'} to display</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="overflow-auto h-full bg-background">
      {diff.hunks.map((hunk) => (
        <div key={hunk.index} data-hunk-index={hunk.index}>
          <DiffHunk
            hunk={hunk}
            isFocused={focusedHunkIndex === hunk.index}
            onClick={() => onHunkFocus?.(hunk.index)}
            showLineNumbers={showLineNumbers}
            language={effectiveLanguage}
          />
        </div>
      ))}
    </div>
  );
}
