/**
 * Insertable Edge - Custom Edge with Insert Button
 * A visual connection between nodes with a '+' button for inserting new nodes
 */

import { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, Position, type Edge } from '@xyflow/react';
import { cn } from '../../../lib/utils';
import { Button } from '../../ui/Button';
import { Plus } from 'lucide-react';
import type { NodeStatus } from '../../../types/workflow';

export interface InsertableEdgeData extends Record<string, unknown> {
  fromStatus?: NodeStatus;
  toStatus?: NodeStatus;
  insertIndex: number;
  onInsertClick?: (insertIndex: number) => void;
  disabled?: boolean;
}

export type InsertableEdgeType = Edge<InsertableEdgeData, 'insertable'>;

/**
 * Get edge style based on connected nodes' statuses
 */
function getEdgeStyle(fromStatus?: NodeStatus, toStatus?: NodeStatus) {
  // Source node completed and target is running
  if (fromStatus === 'completed' && toStatus === 'running') {
    return {
      strokeColor: '#3b82f6', // blue
      animated: true,
      strokeWidth: 2,
    };
  }

  // Both completed
  if (fromStatus === 'completed' && toStatus === 'completed') {
    return {
      strokeColor: '#22c55e', // green
      animated: false,
      strokeWidth: 2,
    };
  }

  // Source completed, target pending
  if (fromStatus === 'completed') {
    return {
      strokeColor: '#22c55e80', // green with opacity
      animated: false,
      strokeWidth: 2,
    };
  }

  // Source running
  if (fromStatus === 'running') {
    return {
      strokeColor: '#3b82f6', // blue
      animated: true,
      strokeWidth: 2,
    };
  }

  // Source failed
  if (fromStatus === 'failed') {
    return {
      strokeColor: '#ef444480', // red with opacity
      animated: false,
      strokeWidth: 2,
    };
  }

  // Default (pending)
  return {
    strokeColor: 'hsl(var(--border))', // Use CSS variable for border color
    animated: false,
    strokeWidth: 2,
  };
}

interface InsertableEdgeProps {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: Position;
  targetPosition: Position;
  data?: InsertableEdgeData;
  selected?: boolean;
}

/**
 * Insertable Edge Component
 * Displays a bezier curve connection with a '+' button for inserting nodes
 */
export const InsertableEdge = memo(function InsertableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: InsertableEdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    curvature: 0.25,
  });

  const style = getEdgeStyle(data?.fromStatus, data?.toStatus);
  const disabled = data?.disabled ?? false;

  const handleInsertClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled && data?.onInsertClick && data.insertIndex !== undefined) {
      data.onInsertClick(data.insertIndex);
    }
  };

  return (
    <>
      {/* Animated background for running state */}
      {style.animated && (
        <BaseEdge
          id={`${id}-bg`}
          path={edgePath}
          style={{
            stroke: style.strokeColor,
            strokeWidth: style.strokeWidth + 4,
            opacity: 0.2,
          }}
        />
      )}

      {/* Main edge */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: style.strokeColor,
          strokeWidth: style.strokeWidth,
          strokeLinecap: 'round',
        }}
        className={cn(style.animated && 'animated-edge', selected && 'edge-selected')}
      />

      {/* Insert button - always visible with subtle opacity, more visible on hover */}
      {!disabled && (
        <EdgeLabelRenderer>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleInsertClick}
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
            }}
            className={cn(
              'nodrag nopan',
              'h-6 w-6 rounded-full',
              'bg-muted/80 hover:bg-blue-600',
              'border-2 border-border hover:border-blue-500',
              'opacity-40 hover:opacity-100 hover:scale-110',
              'focus:opacity-100 focus:ring-2 focus:ring-blue-500'
            )}
            title="Insert step here"
          >
            <Plus className="w-3.5 h-3.5 text-foreground hover:text-white" />
          </Button>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

InsertableEdge.displayName = 'InsertableEdge';
