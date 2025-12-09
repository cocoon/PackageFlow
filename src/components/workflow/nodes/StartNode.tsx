/**
 * Start Node - Workflow Entry Point
 * A visual node representing the beginning of a workflow
 */

import { memo } from 'react';
import { Handle, Position, type Node } from '@xyflow/react';
import { cn } from '../../../lib/utils';
import { Zap } from 'lucide-react';

export interface StartNodeData extends Record<string, unknown> {
  label: string;
}

export type StartNodeType = Node<StartNodeData, 'start'>;

interface StartNodeProps {
  selected?: boolean;
}

/**
 * Start Node Component
 * Displays the workflow entry point with n8n-like styling
 */
export const StartNode = memo(({ selected }: StartNodeProps) => {
  return (
    <div
      className={cn(
        'flex items-center justify-center w-16 h-16 rounded-full border-2 transition-all duration-300',
        'border-emerald-500 bg-emerald-500/20',
        selected && 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-background',
        'shadow-lg shadow-emerald-500/20'
      )}
    >
      {/* Icon */}
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500">
        <Zap className="w-5 h-5 text-white" />
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className={cn(
          '!w-3 !h-3 !border-2 !bg-card !border-emerald-500',
          'hover:!border-emerald-400 hover:!bg-emerald-400/20 transition-colors'
        )}
      />
    </div>
  );
});

StartNode.displayName = 'StartNode';
