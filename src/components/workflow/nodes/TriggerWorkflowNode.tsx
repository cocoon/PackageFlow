/**
 * Trigger Workflow Node - n8n Style Custom Node Component
 * A visual node for triggering another workflow in the workflow
 * @see specs/013-workflow-trigger-workflow/spec.md
 */

import { memo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position, type Node } from '@xyflow/react';
import { cn } from '../../../lib/utils';
import { Workflow, Check, X, Clock, SkipForward, Loader2, Trash2, Plus, Pencil, Copy, ChevronUp, ChevronDown, Download, Star, AlertTriangle } from 'lucide-react';
import type { NodeStatus, OnChildFailure } from '../../../types/workflow';

export interface TriggerWorkflowNodeData extends Record<string, unknown> {
  label: string;
  targetWorkflowId: string;
  targetWorkflowName?: string;
  waitForCompletion: boolean;
  onChildFailure: OnChildFailure;
  status?: NodeStatus;
  order: number;
  // Child execution progress
  childProgress?: {
    currentStep: number;
    totalSteps: number;
    currentNodeName?: string;
  };
  // Action callbacks
  onEdit?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
  onInsertBefore?: (nodeId: string) => void;
  onInsertAfter?: (nodeId: string) => void;
  onDuplicate?: (nodeId: string) => void;
  // Node sharing callbacks
  onExportNode?: (nodeId: string) => void;
  onSaveAsTemplate?: (nodeId: string) => void;
  nodeId?: string;
  disabled?: boolean;
  // Cycle detection warning
  hasCycleWarning?: boolean;
}

export type TriggerWorkflowNodeType = Node<TriggerWorkflowNodeData, 'trigger-workflow'>;

/**
 * Get status configuration for visual styling
 */
function getStatusConfig(status?: NodeStatus) {
  switch (status) {
    case 'running':
      return {
        borderColor: 'border-purple-500',
        bgColor: 'bg-purple-950/80',
        iconBg: 'bg-purple-500',
        icon: Loader2,
        iconClass: 'animate-spin',
        glowColor: 'shadow-purple-500/40',
        headerBg: 'bg-purple-900/30',
        // Dark background needs light text
        titleColor: 'text-white',
        orderColor: 'text-white/60',
        labelColor: 'text-white/70',
      };
    case 'completed':
      return {
        borderColor: 'border-green-500',
        bgColor: 'bg-green-950/80',
        iconBg: 'bg-green-500',
        icon: Check,
        iconClass: '',
        glowColor: 'shadow-green-500/40',
        headerBg: 'bg-green-900/30',
        // Dark background needs light text
        titleColor: 'text-white',
        orderColor: 'text-white/60',
        labelColor: 'text-white/70',
      };
    case 'failed':
      return {
        borderColor: 'border-red-500',
        bgColor: 'bg-red-950/80',
        iconBg: 'bg-red-500',
        icon: X,
        iconClass: '',
        glowColor: 'shadow-red-500/40',
        headerBg: 'bg-red-900/30',
        // Dark background needs light text
        titleColor: 'text-white',
        orderColor: 'text-white/60',
        labelColor: 'text-white/70',
      };
    case 'skipped':
      return {
        borderColor: 'border-muted-foreground',
        bgColor: 'bg-card/80',
        iconBg: 'bg-muted-foreground',
        icon: SkipForward,
        iconClass: '',
        glowColor: '',
        headerBg: 'bg-muted/50',
        // Light background needs dark text
        titleColor: 'text-foreground',
        orderColor: 'text-muted-foreground',
        labelColor: 'text-muted-foreground',
      };
    case 'pending':
    default:
      return {
        borderColor: 'border-purple-600',
        bgColor: 'bg-card/90',
        iconBg: 'bg-purple-600',
        icon: Clock,
        iconClass: '',
        glowColor: '',
        headerBg: 'bg-purple-800/30',
        // Light background needs dark text
        titleColor: 'text-foreground',
        orderColor: 'text-muted-foreground',
        labelColor: 'text-muted-foreground',
      };
  }
}

interface TriggerWorkflowNodeProps {
  data: TriggerWorkflowNodeData;
  selected?: boolean;
}

/**
 * Trigger Workflow Node Component
 * Displays a workflow trigger step with n8n-like styling
 */
export const TriggerWorkflowNode = memo(({ data, selected }: TriggerWorkflowNodeProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const config = getStatusConfig(data.status);
  const StatusIcon = config.icon;
  const showToolbar = (isHovered || selected) && !data.disabled;

  // Close context menu on outside click
  useEffect(() => {
    if (contextMenu) {
      const handleClick = () => setContextMenu(null);
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setContextMenu(null);
      };
      document.addEventListener('click', handleClick);
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('click', handleClick);
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [contextMenu]);

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setContextMenu(null);
    if (data.onEdit && data.nodeId) {
      data.onEdit(data.nodeId);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setContextMenu(null);
    if (data.onDelete && data.nodeId) {
      data.onDelete(data.nodeId);
    }
  };

  const handleInsertBefore = (e: React.MouseEvent) => {
    e.stopPropagation();
    setContextMenu(null);
    if (data.onInsertBefore && data.nodeId) {
      data.onInsertBefore(data.nodeId);
    }
  };

  const handleInsertAfter = (e: React.MouseEvent) => {
    e.stopPropagation();
    setContextMenu(null);
    if (data.onInsertAfter && data.nodeId) {
      data.onInsertAfter(data.nodeId);
    }
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setContextMenu(null);
    if (data.onDuplicate && data.nodeId) {
      data.onDuplicate(data.nodeId);
    }
  };

  const handleExportNode = (e: React.MouseEvent) => {
    e.stopPropagation();
    setContextMenu(null);
    if (data.onExportNode && data.nodeId) {
      data.onExportNode(data.nodeId);
    }
  };

  const handleSaveAsTemplate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setContextMenu(null);
    if (data.onSaveAsTemplate && data.nodeId) {
      data.onSaveAsTemplate(data.nodeId);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!data.disabled) {
      const menuWidth = 180;
      const menuHeight = 320;
      const padding = 8;

      let x = e.clientX;
      let y = e.clientY;

      if (x + menuWidth + padding > window.innerWidth) {
        x = window.innerWidth - menuWidth - padding;
      }
      if (y + menuHeight + padding > window.innerHeight) {
        y = window.innerHeight - menuHeight - padding;
      }
      x = Math.max(padding, x);
      y = Math.max(padding, y);

      setContextMenu({ x, y });
    }
  };

  return (
    <div
      className={cn(
        'relative min-w-[240px] max-w-[320px] rounded-xl border-2 transition-all duration-300',
        config.borderColor,
        config.bgColor,
        selected && 'ring-2 ring-purple-400 ring-offset-2 ring-offset-background',
        config.glowColor && `shadow-lg ${config.glowColor}`,
        'group'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onContextMenu={handleContextMenu}
    >
      {/* Hover Toolbar */}
      <div
        className={cn(
          'absolute -top-10 left-1/2 -translate-x-1/2 z-10',
          'flex items-center gap-1 px-2 py-1.5 rounded-lg',
          'bg-card border border-border shadow-lg',
          'transition-all duration-200',
          showToolbar ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        )}
      >
        <button
          onClick={handleInsertBefore}
          className="nodrag nopan p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-purple-400 transition-colors"
          title="Insert step before"
        >
          <div className="relative">
            <ChevronUp className="w-3.5 h-3.5 absolute -top-1" />
            <Plus className="w-3.5 h-3.5" />
          </div>
        </button>
        <button
          onClick={handleInsertAfter}
          className="nodrag nopan p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-purple-400 transition-colors"
          title="Insert step after"
        >
          <div className="relative">
            <Plus className="w-3.5 h-3.5" />
            <ChevronDown className="w-3.5 h-3.5 absolute -bottom-1" />
          </div>
        </button>
        <button
          onClick={handleDuplicate}
          className="nodrag nopan p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-green-400 transition-colors"
          title="Duplicate step"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleEdit}
          className="nodrag nopan p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-purple-400 transition-colors"
          title="Edit step"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleDelete}
          className="nodrag nopan p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-red-400 transition-colors"
          title="Delete step"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className={cn(
          '!w-3 !h-3 !border-2 !bg-card !border-purple-500',
          'hover:!border-purple-400 hover:!bg-purple-400/20 transition-colors'
        )}
      />

      {/* Node Header */}
      <div className={cn("flex items-center gap-3 px-4 py-3 border-b border-border/50", config.headerBg)}>
        {/* Icon */}
        <div
          className={cn(
            'flex items-center justify-center w-8 h-8 rounded-lg',
            config.iconBg
          )}
        >
          <Workflow className="w-4 h-4 text-white" />
        </div>

        {/* Title and Order */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn('text-xs font-mono', config.orderColor)}>#{data.order + 1}</span>
            <h3 className={cn('font-medium truncate text-sm', config.titleColor)}>
              {data.label}
            </h3>
          </div>
        </div>

        {/* Cycle Warning Icon */}
        {data.hasCycleWarning && (
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-yellow-500/20">
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
          </div>
        )}

        {/* Status Icon */}
        <div
          className={cn(
            'flex items-center justify-center w-6 h-6 rounded-full',
            config.iconBg
          )}
        >
          <StatusIcon className={cn('w-3.5 h-3.5 text-white', config.iconClass)} />
        </div>
      </div>

      {/* Node Body */}
      <div className="px-4 py-3 space-y-2">
        {/* Target Workflow */}
        <div className="relative">
          <div className={cn('text-xs mb-1 flex items-center gap-1', config.labelColor)}>
            <Workflow className="w-3 h-3" />
            <span>Target Workflow</span>
          </div>
          <div className="bg-purple-900/30 rounded-lg p-2 font-medium text-sm text-purple-200 truncate">
            {data.targetWorkflowName || 'Not selected'}
          </div>
        </div>

        {/* Child Progress (when running) */}
        {data.status === 'running' && data.childProgress && (
          <div className="bg-purple-900/20 rounded-lg p-2 border border-purple-500/30">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Progress</span>
              <span className="text-purple-300">
                {data.childProgress.currentStep}/{data.childProgress.totalSteps}
              </span>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 transition-all duration-300"
                style={{
                  width: `${(data.childProgress.currentStep / data.childProgress.totalSteps) * 100}%`
                }}
              />
            </div>
            {data.childProgress.currentNodeName && (
              <div className="text-xs text-muted-foreground mt-1 truncate">
                Running: {data.childProgress.currentNodeName}
              </div>
            )}
          </div>
        )}

        {/* Options */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className={cn(
            'px-2 py-0.5 rounded-full',
            data.waitForCompletion ? 'bg-green-900/30 text-green-400' : 'bg-muted text-muted-foreground'
          )}>
            {data.waitForCompletion ? 'Wait' : 'Fire & Forget'}
          </span>
          {data.waitForCompletion && (
            <span className={cn(
              'px-2 py-0.5 rounded-full',
              data.onChildFailure === 'fail' ? 'bg-red-900/30 text-red-400' : 'bg-yellow-900/30 text-yellow-400'
            )}>
              {data.onChildFailure === 'fail' ? 'Stop on Fail' : 'Continue on Fail'}
            </span>
          )}
        </div>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className={cn(
          '!w-3 !h-3 !border-2 !bg-card !border-purple-500',
          'hover:!border-purple-400 hover:!bg-purple-400/20 transition-colors'
        )}
      />

      {/* Context Menu */}
      {contextMenu && createPortal(
        <div
          className="fixed z-[9999] min-w-[180px] py-1 bg-card border border-border rounded-lg shadow-xl"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleInsertBefore}
            className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-accent flex items-center gap-2"
          >
            <div className="relative w-4 h-4">
              <ChevronUp className="w-3 h-3 absolute top-0 left-0.5" />
              <Plus className="w-3 h-3 absolute bottom-0 left-0.5" />
            </div>
            Insert Before
          </button>
          <button
            onClick={handleInsertAfter}
            className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-accent flex items-center gap-2"
          >
            <div className="relative w-4 h-4">
              <Plus className="w-3 h-3 absolute top-0 left-0.5" />
              <ChevronDown className="w-3 h-3 absolute bottom-0 left-0.5" />
            </div>
            Insert After
          </button>
          <div className="my-1 border-t border-border" />
          <button
            onClick={handleDuplicate}
            className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-accent flex items-center gap-2"
          >
            <Copy className="w-4 h-4" />
            Duplicate
          </button>
          <button
            onClick={handleEdit}
            className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-accent flex items-center gap-2"
          >
            <Pencil className="w-4 h-4" />
            Edit
          </button>
          <div className="my-1 border-t border-border" />
          {data.onExportNode && (
            <button
              onClick={handleExportNode}
              className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-accent flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export Step
            </button>
          )}
          {data.onSaveAsTemplate && (
            <button
              onClick={handleSaveAsTemplate}
              className="w-full px-3 py-2 text-left text-sm text-yellow-400 hover:bg-accent flex items-center gap-2"
            >
              <Star className="w-4 h-4" />
              Save as Template
            </button>
          )}
          <div className="my-1 border-t border-border" />
          <button
            onClick={handleDelete}
            className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-accent flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>,
        document.body
      )}
    </div>
  );
});

TriggerWorkflowNode.displayName = 'TriggerWorkflowNode';
