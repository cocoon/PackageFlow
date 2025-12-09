import { useEffect, useRef, useMemo } from 'react';
import stripAnsi from 'strip-ansi';
import { cn } from '../../lib/utils';

interface OutputLine {
  type: 'stdout' | 'stderr' | 'system';
  content: string;
  timestamp: string;
  nodeId?: string;
}

interface TerminalOutputProps {
  lines: OutputLine[];
  maxLines?: number;
  className?: string;
}

function getSystemMessageType(content: string): 'trigger-start' | 'script-start' | 'node-complete' | 'node-fail' | 'default' {
  const trimmed = content.trim();
  if (trimmed.startsWith('>> Triggering workflow:')) return 'trigger-start';
  if (trimmed.startsWith('> Starting:')) return 'script-start';
  if (trimmed.includes('Node completed') || trimmed.includes('completed (exit code: 0)')) return 'node-complete';
  if (trimmed.includes('Node failed') || trimmed.includes('failed (exit code:')) return 'node-fail';
  return 'default';
}

export function TerminalOutput({
  lines,
  maxLines = 10000,
  className = '',
}: TerminalOutputProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  const displayLines = useMemo(() => {
    return lines.length > maxLines ? lines.slice(-maxLines) : lines;
  }, [lines, maxLines]);
  const isTruncated = lines.length > maxLines;

  useEffect(() => {
    if (autoScrollRef.current && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [displayLines]);

  const handleScroll = () => {
    if (!containerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    autoScrollRef.current = isAtBottom;
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={cn('bg-card rounded-lg p-4 font-mono text-sm overflow-auto', className)}
      style={{ minHeight: '200px' }}
    >
      {isTruncated && (
        <div className="text-yellow-500 text-xs mb-2 pb-2 border-b border-border">
          Output too long, truncated the first {lines.length - maxLines} lines
        </div>
      )}
      {displayLines.length === 0 ? (
        <div className="text-muted-foreground italic">Waiting for output...</div>
      ) : (
        displayLines.map((line, index) => (
          <OutputLineItem key={index} line={line} />
        ))
      )}
    </div>
  );
}

function OutputLineItem({ line }: { line: OutputLine }) {
  const content = stripAnsi(line.content);

  if (line.type === 'system') {
    const msgType = getSystemMessageType(content);

    if (msgType === 'trigger-start') {
      return (
        <div className="mt-3 first:mt-0">
          <div className="border-t border-purple-500/30 pt-2 mb-1" />
          <div className="flex items-center gap-2 text-purple-400 font-medium">
            <span className="text-purple-500">{'>>'}</span>
            <span>{content.replace(/^[\n]*>> /, '')}</span>
          </div>
        </div>
      );
    }

    if (msgType === 'script-start') {
      return (
        <div className="mt-3 first:mt-0">
          <div className="border-t border-blue-500/30 pt-2 mb-1" />
          <div className="flex items-center gap-2 text-blue-400 font-medium">
            <span className="text-blue-500">{'>'}</span>
            <span>{content.replace(/^[\n]*> /, '')}</span>
          </div>
        </div>
      );
    }

    if (msgType === 'node-complete') {
      return (
        <div className="text-green-500 text-xs mt-1 mb-2">
          {content}
        </div>
      );
    }

    if (msgType === 'node-fail') {
      return (
        <div className="text-red-400 text-xs mt-1 mb-2">
          {content}
        </div>
      );
    }

    return (
      <div className="text-blue-400 whitespace-pre-wrap break-all">
        {content}
      </div>
    );
  }

  if (line.type === 'stderr') {
    return (
      <div className="text-red-400 whitespace-pre-wrap break-all pl-4">
        {content}
      </div>
    );
  }

  return (
    <div className="text-foreground/90 whitespace-pre-wrap break-all pl-4">
      {content}
    </div>
  );
}

export type { OutputLine };
