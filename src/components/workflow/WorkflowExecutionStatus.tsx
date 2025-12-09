/**
 * Workflow Execution Status Component
 * Displays execution status, progress, and provides action buttons
 */

import { Loader2, CheckCircle2, XCircle, StopCircle, Play, Terminal } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { WorkflowExecutionState } from '../../hooks/useWorkflowExecution';
import { formatDuration } from '../../hooks/useWorkflowExecution';

interface WorkflowExecutionStatusProps {
  state: WorkflowExecutionState;
  workflowName?: string;
  onCancel?: () => void;
  onViewOutput?: () => void;
  onClear?: () => void;
  compact?: boolean;
  className?: string;
}

/**
 * Full execution status display with progress and actions
 */
export function WorkflowExecutionStatus({
  state,
  workflowName,
  onCancel,
  onViewOutput,
  onClear,
  compact = false,
  className,
}: WorkflowExecutionStatusProps) {
  const { status, currentNode, progress, completedNodes, totalNodes, error, startedAt, finishedAt } =
    state;

  // Don't render if idle
  if (status === 'idle') {
    return null;
  }

  const isActive = status === 'starting' || status === 'running';
  const duration = formatDuration(startedAt, finishedAt);

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <ExecutionStatusIcon status={status} size="sm" />
        {isActive && currentNode && (
          <span className="text-xs text-muted-foreground truncate max-w-[120px]">
            {currentNode.name}
          </span>
        )}
        {isActive && onCancel && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCancel();
            }}
            className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-red-400 transition-colors"
            title="Cancel execution"
          >
            <StopCircle className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'p-3 rounded-lg border transition-colors',
        status === 'running' && 'bg-blue-500/10 border-blue-500/30',
        status === 'starting' && 'bg-blue-500/10 border-blue-500/30',
        status === 'completed' && 'bg-green-500/10 border-green-500/30',
        status === 'failed' && 'bg-red-500/10 border-red-500/30',
        status === 'cancelled' && 'bg-muted/50 border-muted',
        className
      )}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <ExecutionStatusIcon status={status} />
          <span className="text-sm font-medium text-foreground">
            {getStatusText(status)}
          </span>
          {workflowName && (
            <span className="text-xs text-muted-foreground">- {workflowName}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {duration && (
            <span className="text-xs text-muted-foreground mr-2">{duration}</span>
          )}
          {onViewOutput && state.output.length > 0 && (
            <button
              onClick={onViewOutput}
              className="p-1.5 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors"
              title="View output"
            >
              <Terminal className="w-4 h-4" />
            </button>
          )}
          {isActive && onCancel && (
            <button
              onClick={onCancel}
              className="p-1.5 hover:bg-accent rounded text-muted-foreground hover:text-red-400 transition-colors"
              title="Cancel execution"
            >
              <StopCircle className="w-4 h-4" />
            </button>
          )}
          {!isActive && onClear && (
            <button
              onClick={onClear}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 hover:bg-accent rounded transition-colors"
              title="Dismiss"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>

      {/* Progress bar for running state */}
      {isActive && totalNodes > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Step {completedNodes + 1} of {totalNodes}
              {currentNode && (
                <span className="text-foreground ml-1.5">- {currentNode.name}</span>
              )}
            </span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-300 ease-out rounded-full',
                'bg-gradient-to-r from-blue-500 to-blue-400',
                isActive && 'animate-pulse'
              )}
              style={{ width: `${Math.max(progress, 2)}%` }}
            />
          </div>
        </div>
      )}

      {/* Error message */}
      {status === 'failed' && error && (
        <div className="mt-2 p-2 bg-red-500/10 rounded text-xs text-red-400 font-mono">
          {error}
        </div>
      )}

      {/* Success summary */}
      {status === 'completed' && (
        <div className="mt-1 text-xs text-green-400">
          All {totalNodes} step{totalNodes !== 1 ? 's' : ''} completed successfully
        </div>
      )}
    </div>
  );
}

/**
 * Compact status icon with animation
 */
interface ExecutionStatusIconProps {
  status: WorkflowExecutionState['status'];
  size?: 'sm' | 'md';
  className?: string;
}

export function ExecutionStatusIcon({
  status,
  size = 'md',
  className,
}: ExecutionStatusIconProps) {
  const sizeClass = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  switch (status) {
    case 'starting':
    case 'running':
      return (
        <Loader2
          className={cn(sizeClass, 'text-blue-400 animate-spin', className)}
        />
      );
    case 'completed':
      return (
        <CheckCircle2 className={cn(sizeClass, 'text-green-400', className)} />
      );
    case 'failed':
      return <XCircle className={cn(sizeClass, 'text-red-400', className)} />;
    case 'cancelled':
      return (
        <StopCircle className={cn(sizeClass, 'text-muted-foreground', className)} />
      );
    default:
      return null;
  }
}

/**
 * Execute button with integrated loading state
 */
interface ExecuteButtonProps {
  isExecuting: boolean;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
}

export function ExecuteButton({
  isExecuting,
  disabled = false,
  onClick,
  className,
}: ExecuteButtonProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      disabled={disabled || isExecuting}
      className={cn(
        'p-1.5 rounded transition-all duration-200',
        isExecuting
          ? 'bg-blue-500/20 cursor-wait'
          : 'hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      title={isExecuting ? 'Running...' : disabled ? 'No steps to run' : 'Run workflow'}
    >
      {isExecuting ? (
        <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
      ) : (
        <Play className="w-4 h-4 text-green-400" />
      )}
    </button>
  );
}

/**
 * Inline status badge for workflow cards
 */
interface WorkflowStatusBadgeProps {
  state: WorkflowExecutionState;
  className?: string;
}

export function WorkflowStatusBadge({ state, className }: WorkflowStatusBadgeProps) {
  const { status, progress, currentNode } = state;

  if (status === 'idle') {
    return null;
  }

  const isActive = status === 'starting' || status === 'running';

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
        status === 'running' && 'bg-blue-500/20 text-blue-400',
        status === 'starting' && 'bg-blue-500/20 text-blue-400',
        status === 'completed' && 'bg-green-500/20 text-green-400',
        status === 'failed' && 'bg-red-500/20 text-red-400',
        status === 'cancelled' && 'bg-muted/50 text-muted-foreground',
        className
      )}
    >
      <ExecutionStatusIcon status={status} size="sm" />
      <span>
        {isActive ? (
          currentNode ? (
            <span className="truncate max-w-[100px] inline-block align-middle">
              {currentNode.name}
            </span>
          ) : (
            `${progress}%`
          )
        ) : (
          getStatusText(status)
        )}
      </span>
    </div>
  );
}

function getStatusText(status: WorkflowExecutionState['status']): string {
  switch (status) {
    case 'starting':
      return 'Starting...';
    case 'running':
      return 'Running';
    case 'completed':
      return 'Completed';
    case 'failed':
      return 'Failed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return '';
  }
}
