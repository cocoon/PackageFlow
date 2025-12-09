/**
 * DiffLine Component - Renders a single line in a diff
 * @see specs/010-git-diff-viewer/tasks.md - T012
 */

import { cn } from '../../../lib/utils';
import { DiffSyntaxHighlighter } from './DiffSyntaxHighlighter';
import type { DiffLine as DiffLineType } from '../../../types/git';

interface DiffLineProps {
  /** Line data */
  line: DiffLineType;
  /** Whether to show line numbers */
  showLineNumbers?: boolean;
  /** Line number gutter width class */
  gutterClass?: string;
  /** Language for syntax highlighting */
  language?: string;
}

/**
 * Renders a single diff line with appropriate styling
 */
export function DiffLine({
  line,
  showLineNumbers = true,
  gutterClass = 'w-12',
  language,
}: DiffLineProps) {
  const lineTypeStyles = {
    addition: 'bg-green-900/20',
    deletion: 'bg-red-900/20',
    context: 'bg-transparent',
  };

  const lineTypeGutterStyles = {
    addition: 'bg-green-900/30 text-green-400',
    deletion: 'bg-red-900/30 text-red-400',
    context: 'bg-card text-muted-foreground',
  };

  const lineTypePrefix = {
    addition: '+',
    deletion: '-',
    context: ' ',
  };

  return (
    <div
      className={cn(
        'flex font-mono text-sm leading-5 hover:bg-white/5',
        lineTypeStyles[line.lineType]
      )}
    >
      {showLineNumbers && (
        <>
          {/* Old line number */}
          <span
            className={cn(
              'flex-shrink-0 select-none text-right px-2 border-r border-border',
              gutterClass,
              lineTypeGutterStyles[line.lineType]
            )}
          >
            {line.oldLineNumber ?? ''}
          </span>
          {/* New line number */}
          <span
            className={cn(
              'flex-shrink-0 select-none text-right px-2 border-r border-border',
              gutterClass,
              lineTypeGutterStyles[line.lineType]
            )}
          >
            {line.newLineNumber ?? ''}
          </span>
        </>
      )}
      {/* Prefix (+/-/space) */}
      <span
        className={cn(
          'flex-shrink-0 w-5 text-center select-none',
          line.lineType === 'addition' && 'text-green-400',
          line.lineType === 'deletion' && 'text-red-400',
          line.lineType === 'context' && 'text-muted-foreground'
        )}
      >
        {lineTypePrefix[line.lineType]}
      </span>
      {/* Content */}
      <pre className="flex-1 overflow-x-auto whitespace-pre px-2">
        <code className="text-foreground">
          {language ? (
            <DiffSyntaxHighlighter content={line.content} language={language} />
          ) : (
            line.content
          )}
        </code>
      </pre>
    </div>
  );
}
