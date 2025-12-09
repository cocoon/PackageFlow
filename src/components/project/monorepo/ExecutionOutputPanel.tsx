/**
 * ExecutionOutputPanel Component
 * Feature: 008-monorepo-support
 *
 * Displays monorepo task execution output in a dialog with terminal-like styling.
 * Similar to WorkflowOutputPanel but adapted for Turbo/Nx executions.
 */

import { useRef, useEffect, useState } from 'react';
import { X, Terminal, Copy, Check, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '../../../lib/utils';

export type ExecutionStatus = 'running' | 'completed' | 'failed' | 'cancelled';

export interface ExecutionOutputPanelProps {
  /** Unique identifier for the execution */
  executionId: string;
  /** Task name being executed */
  taskName: string;
  /** Current execution status */
  status: ExecutionStatus;
  /** Output content from the execution */
  output: string;
  /** Exit code if execution completed */
  exitCode?: number;
  /** Whether the result was cached */
  cached?: boolean;
  /** Callback to close the panel */
  onClose: () => void;
}

/**
 * Status icon component
 */
function StatusIcon({ status, className }: { status: ExecutionStatus; className?: string }) {
  switch (status) {
    case 'running':
      return <Loader2 className={cn('w-4 h-4 text-purple-400 animate-spin', className)} />;
    case 'completed':
      return <CheckCircle2 className={cn('w-4 h-4 text-green-400', className)} />;
    case 'failed':
      return <XCircle className={cn('w-4 h-4 text-red-400', className)} />;
    case 'cancelled':
      return <AlertCircle className={cn('w-4 h-4 text-muted-foreground', className)} />;
  }
}

/**
 * Get status display text
 */
function getStatusText(status: ExecutionStatus, exitCode?: number): string {
  switch (status) {
    case 'running':
      return 'Running...';
    case 'completed':
      return exitCode !== undefined ? `Completed (Exit: ${exitCode})` : 'Completed';
    case 'failed':
      return exitCode !== undefined ? `Failed (Exit: ${exitCode})` : 'Failed';
    case 'cancelled':
      return 'Cancelled';
  }
}

export function ExecutionOutputPanel({
  executionId: _executionId,
  taskName,
  status,
  output,
  exitCode,
  cached,
  onClose,
}: ExecutionOutputPanelProps) {
  void _executionId; // Reserved for future use
  const outputRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  const isActive = status === 'running';

  // Auto-scroll to bottom when new output arrives
  useEffect(() => {
    if (autoScroll && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output, autoScroll]);

  // Handle scroll to detect if user scrolled up
  const handleScroll = () => {
    if (outputRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = outputRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      setAutoScroll(isAtBottom);
    }
  };

  // Copy all output to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 animate-in fade-in-0 duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="execution-output-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="fixed inset-4 md:inset-8 lg:inset-12 flex flex-col bg-card rounded-xl border border-border/50 shadow-2xl shadow-black/50 animate-in fade-in-0 zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 text-muted-foreground" />
            <h2 id="execution-output-title" className="text-sm font-medium text-foreground">
              {taskName}
            </h2>
            <StatusIcon status={status} />
            <span className="text-xs text-muted-foreground">
              {getStatusText(status, exitCode)}
            </span>
            {cached && (
              <span className="px-1.5 py-0.5 text-[10px] bg-green-500/20 text-green-400 rounded">
                CACHED
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {/* Copy button */}
            <button
              onClick={handleCopy}
              disabled={!output}
              className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Copy output"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
            {/* Close button */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Output content */}
        <div
          ref={outputRef}
          onScroll={handleScroll}
          className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed bg-background"
        >
          {!output ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Terminal className="w-12 h-12 mb-3 opacity-30" />
              <p>{isActive ? 'Waiting for output...' : 'No output'}</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              <pre className="whitespace-pre-wrap break-all text-foreground/90">
                {output}
              </pre>
              {/* Cursor indicator when running */}
              {isActive && (
                <span className="inline-block w-2 h-4 bg-purple-400 animate-pulse" />
              )}
            </div>
          )}
        </div>

        {/* Footer with status */}
        {(status === 'completed' || status === 'failed' || status === 'cancelled') && (
          <div
            className={cn(
              'px-4 py-2 border-t text-xs',
              status === 'completed' && 'border-green-500/30 bg-green-500/10 text-green-400',
              status === 'failed' && 'border-red-500/30 bg-red-500/10 text-red-400',
              status === 'cancelled' && 'border-zinc-500/30 bg-zinc-500/10 text-muted-foreground'
            )}
          >
            {status === 'completed' ? (
              <span>Task completed successfully{exitCode !== undefined && ` with exit code ${exitCode}`}</span>
            ) : status === 'cancelled' ? (
              <span>Task was cancelled</span>
            ) : (
              <span>Task failed{exitCode !== undefined && ` with exit code ${exitCode}`}</span>
            )}
          </div>
        )}

        {/* Auto-scroll indicator */}
        {!autoScroll && isActive && (
          <button
            onClick={() => {
              setAutoScroll(true);
              if (outputRef.current) {
                outputRef.current.scrollTop = outputRef.current.scrollHeight;
              }
            }}
            className="absolute bottom-16 right-6 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs rounded-full shadow-lg transition-colors"
          >
            Scroll to bottom
          </button>
        )}
      </div>
    </div>
  );
}

export default ExecutionOutputPanel;
