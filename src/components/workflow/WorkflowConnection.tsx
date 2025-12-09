/**
 * Workflow Connection Component
 * @see specs/001-expo-workflow-automation/spec.md - US2
 */

import type { NodeStatus } from '../../types/workflow';

interface WorkflowConnectionProps {
  fromStatus?: NodeStatus;
  toStatus?: NodeStatus;
}

function getConnectionColor(fromStatus?: NodeStatus, toStatus?: NodeStatus): string {
  if (fromStatus === 'completed') {
    if (toStatus === 'running') {
      return 'bg-blue-500';
    }
    if (toStatus === 'completed') {
      return 'bg-green-500';
    }
    return 'bg-green-500/50';
  }

  if (fromStatus === 'failed') {
    return 'bg-red-500/50';
  }

  if (fromStatus === 'running') {
    return 'bg-blue-500 animate-pulse';
  }

  return 'bg-muted';
}

export function WorkflowConnection({ fromStatus, toStatus }: WorkflowConnectionProps) {
  const color = getConnectionColor(fromStatus, toStatus);

  return (
    <div className="flex justify-center py-1">
      <div className="flex flex-col items-center">
        <div className={`w-0.5 h-6 ${color} transition-colors duration-300`} />
        <div
          className={`w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent ${color.replace('bg-', 'border-t-')} transition-colors duration-300`}
          style={{ borderTopColor: color.includes('bg-') ? undefined : 'currentColor' }}
        />
      </div>
    </div>
  );
}
