/**
 * Workflow Node Component
 * @see specs/001-expo-workflow-automation/spec.md - US1
 */

import type { WorkflowNode as WorkflowNodeType, NodeStatus } from '../../types/workflow';
import { isScriptNodeConfig, isTriggerWorkflowConfig } from '../../types/workflow';

interface WorkflowNodeProps {
  node: WorkflowNodeType;
  status?: NodeStatus;
  isSelected?: boolean;
  onSelect?: (nodeId: string) => void;
  onEdit?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
  disabled?: boolean;
}

function getStatusColor(status?: NodeStatus): string {
  switch (status) {
    case 'running':
      return 'border-blue-500 bg-blue-500/10';
    case 'completed':
      return 'border-green-500 bg-green-500/10';
    case 'failed':
      return 'border-red-500 bg-red-500/10';
    case 'skipped':
      return 'border-gray-500 bg-gray-500/10';
    case 'pending':
    default:
      return 'border-border bg-secondary';
  }
}

function getStatusIcon(status?: NodeStatus): string {
  switch (status) {
    case 'running':
      return '⏳';
    case 'completed':
      return '✓';
    case 'failed':
      return '✗';
    case 'skipped':
      return '⏭';
    case 'pending':
    default:
      return '○';
  }
}

export function WorkflowNode({
  node,
  status,
  isSelected = false,
  onSelect,
  onEdit,
  onDelete,
  disabled = false,
}: WorkflowNodeProps) {
  const statusColor = getStatusColor(status);
  const statusIcon = getStatusIcon(status);

  const handleClick = () => {
    if (!disabled && onSelect) {
      onSelect(node.id);
    }
  };

  const handleDoubleClick = () => {
    if (!disabled && onEdit) {
      onEdit(node.id);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled && onDelete) {
      onDelete(node.id);
    }
  };

  return (
    <div
      className={`
        relative p-4 rounded-lg border-2 cursor-pointer
        transition-all duration-200
        ${statusColor}
        ${isSelected ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-background' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-400'}
      `}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {!disabled && onDelete && (
        <button
          onClick={handleDelete}
          className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 hover:bg-red-500 rounded-full text-white text-sm flex items-center justify-center"
          title="Delete node"
        >
          ×
        </button>
      )}

      <div className="absolute -top-3 -left-3 w-6 h-6 bg-muted rounded-full flex items-center justify-center text-xs text-foreground">
        {node.order + 1}
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{statusIcon}</span>
        <span className="font-medium text-foreground truncate">{node.name}</span>
      </div>

      {isScriptNodeConfig(node.config) && (
        <>
          <div className="text-sm text-muted-foreground font-mono bg-muted/50 p-2 rounded truncate">
            {node.config.command}
          </div>

          {node.config.cwd && (
            <div className="mt-2 text-xs text-muted-foreground truncate">
              📁 {node.config.cwd}
            </div>
          )}
        </>
      )}

      {isTriggerWorkflowConfig(node.config) && (
        <div className="text-sm text-purple-400 font-mono bg-purple-900/20 p-2 rounded truncate">
          🔗 Workflow: {node.config.targetWorkflowId.substring(0, 8)}...
        </div>
      )}
    </div>
  );
}
