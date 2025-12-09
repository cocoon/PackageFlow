/**
 * Workflow Canvas Component (Linear Layout)
 * @see specs/001-expo-workflow-automation/spec.md - US2
 */

import { WorkflowNode } from './WorkflowNode';
import { WorkflowConnection } from './WorkflowConnection';
import type { WorkflowNode as WorkflowNodeType, NodeStatus } from '../../types/workflow';

interface WorkflowCanvasProps {
  nodes: WorkflowNodeType[];
  nodeStatuses: Map<string, NodeStatus>;
  selectedNodeId: string | null;
  disabled?: boolean;
  onSelectNode: (nodeId: string) => void;
  onEditNode: (nodeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
}

export function WorkflowCanvas({
  nodes,
  nodeStatuses,
  selectedNodeId,
  disabled = false,
  onSelectNode,
  onEditNode,
  onDeleteNode,
}: WorkflowCanvasProps) {
  const sortedNodes = [...nodes].sort((a, b) => a.order - b.order);

  if (sortedNodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <p className="text-lg">No steps yet</p>
          <p className="text-sm mt-2">Click "Add Step" to start building your workflow</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2">
      {sortedNodes.map((node, index) => (
        <div key={node.id}>
          <WorkflowNode
            node={node}
            status={nodeStatuses.get(node.id)}
            isSelected={selectedNodeId === node.id}
            onSelect={onSelectNode}
            onEdit={onEditNode}
            onDelete={onDeleteNode}
            disabled={disabled}
          />

          {index < sortedNodes.length - 1 && (
            <WorkflowConnection
              fromStatus={nodeStatuses.get(node.id)}
              toStatus={nodeStatuses.get(sortedNodes[index + 1].id)}
            />
          )}
        </div>
      ))}
    </div>
  );
}
