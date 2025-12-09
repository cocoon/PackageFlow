/**
 * DiffHunk Component - Renders a hunk (section of changes) in a diff
 * @see specs/010-git-diff-viewer/tasks.md - T013
 */

import { cn } from '../../../lib/utils';
import { DiffLine } from './DiffLine';
import type { DiffHunk as DiffHunkType } from '../../../types/git';

interface DiffHunkProps {
  /** Hunk data */
  hunk: DiffHunkType;
  /** Whether this hunk is focused */
  isFocused?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Whether to show line numbers */
  showLineNumbers?: boolean;
  /** Language for syntax highlighting */
  language?: string;
}

/**
 * Renders a diff hunk with header and content lines
 */
export function DiffHunk({
  hunk,
  isFocused = false,
  onClick,
  showLineNumbers = true,
  language,
}: DiffHunkProps) {
  // Show only the context (function name, etc.) if available, otherwise show a simplified indicator
  const hunkHeader = hunk.header ? hunk.header : `Changes at line ${hunk.oldStart}`;

  return (
    <div
      className={cn(
        'border-b border-border last:border-b-0',
        isFocused && 'ring-2 ring-blue-500 ring-inset'
      )}
      onClick={onClick}
    >
      {/* Hunk Header */}
      <div className="bg-blue-900/20 text-blue-400 font-mono text-sm px-4 py-1.5 sticky top-0 z-10 border-b border-border">
        <span className="select-all">{hunkHeader}</span>
      </div>

      {/* Lines */}
      <div className="overflow-x-auto">
        {hunk.lines.map((line) => (
          <DiffLine
            key={`${hunk.index}-${line.index}`}
            line={line}
            showLineNumbers={showLineNumbers}
            language={language}
          />
        ))}
      </div>
    </div>
  );
}
