/**
 * Animated Edge - Custom Edge with Animation
 * A visual connection between nodes with status-based styling
 */

import { BaseEdge, getBezierPath, Position, type Edge } from '@xyflow/react';
import { cn } from '../../../lib/utils';
import type { NodeStatus } from '../../../types/workflow';

export interface AnimatedEdgeData extends Record<string, unknown> {
  fromStatus?: NodeStatus;
  toStatus?: NodeStatus;
}

export type AnimatedEdgeType = Edge<AnimatedEdgeData, 'animated'>;

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
    strokeColor: '#4b5563', // gray
    animated: false,
    strokeWidth: 2,
  };
}

interface AnimatedEdgeProps {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: Position;
  targetPosition: Position;
  data?: AnimatedEdgeData;
  selected?: boolean;
}

/**
 * Animated Edge Component
 * Displays a bezier curve connection with status-based animation
 */
export function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: AnimatedEdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    curvature: 0.25,
  });

  const style = getEdgeStyle(data?.fromStatus, data?.toStatus);

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
    </>
  );
}
