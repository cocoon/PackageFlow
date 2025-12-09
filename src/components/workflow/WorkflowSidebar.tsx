/**
 * Workflow Sidebar Component
 * @see specs/001-expo-workflow-automation/spec.md - US3
 */

import { useState, useMemo, useCallback } from 'react';
import { Workflow as WorkflowIcon, MoreVertical, Trash2, Copy, ArrowUpFromLine, ArrowDownToLine, ArrowUpDown, Check, GripVertical, Loader2, CheckCircle, XCircle, MinusCircle } from 'lucide-react';
import type { ExecutionStatus } from '../../types/workflow';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DeleteConfirmDialog } from '../ui/ConfirmDialog';
import type { Workflow } from '../../types/workflow';
import type { WorkflowSortMode } from '../../types/tauri';

interface WorkflowSidebarProps {
  workflows: Workflow[];
  selectedWorkflowId: string | null;
  sortMode: WorkflowSortMode;
  workflowOrder: string[];
  /** Map of workflow ID to execution status */
  executionStatuses?: Map<string, ExecutionStatus>;
  onSelectWorkflow: (workflow: Workflow) => void;
  onCreateWorkflow: () => void;
  onDeleteWorkflow: (workflowId: string) => void;
  onDuplicateWorkflow?: (workflow: Workflow) => void;
  onSortModeChange: (mode: WorkflowSortMode) => void;
  onWorkflowOrderChange: (order: string[]) => void;
}

const SORT_OPTIONS: { value: WorkflowSortMode; label: string }[] = [
  { value: 'name', label: 'Name (A-Z)' },
  { value: 'updated', label: 'Recently Updated' },
  { value: 'created', label: 'Date Created' },
  { value: 'custom', label: 'Custom Order' },
];

interface SortableWorkflowItemProps {
  workflow: Workflow;
  isActive: boolean;
  isMenuOpen: boolean;
  isDraggable: boolean;
  executionStatus?: ExecutionStatus;
  onSelect: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

function SortableWorkflowItem({
  workflow,
  isActive,
  isMenuOpen,
  isDraggable,
  executionStatus,
  onSelect,
  onContextMenu,
}: SortableWorkflowItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: workflow.id, disabled: !isDraggable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Get execution status icon
  const getStatusIcon = () => {
    switch (executionStatus) {
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'cancelled':
        return <MinusCircle className="w-4 h-4 text-muted-foreground" />;
      case 'paused':
        return <MinusCircle className="w-4 h-4 text-yellow-400" />;
      default:
        return <WorkflowIcon className={`w-4 h-4 ${isActive ? '' : 'text-muted-foreground'}`} />;
    }
  };

  const IconArea = () => (
    <div className="relative flex-shrink-0 w-4 h-4">
      <span className={`absolute inset-0 flex items-center justify-center transition-opacity duration-150 ${isDraggable ? 'group-hover:opacity-0' : ''}`}>
        {getStatusIcon()}
      </span>
      {isDraggable && (
        <button
          {...attributes}
          {...listeners}
          className="absolute inset-0 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          title="Drag to reorder"
          onClick={e => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </button>
      )}
    </div>
  );

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="group relative"
    >
      <button
        onClick={onSelect}
        onContextMenu={onContextMenu}
        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors ${
          isActive
            ? 'bg-blue-600/20 text-blue-400'
            : 'hover:bg-accent text-foreground'
        }`}
      >
        <IconArea />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">
            {workflow.name || 'Untitled workflow'}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>{workflow.nodes.length} steps</span>
            {(workflow.webhook?.enabled || workflow.incomingWebhook?.enabled) && (
              <span className="flex items-center gap-0.5">
                <span className="text-muted-foreground">·</span>
                {workflow.webhook?.enabled && (
                  <span title="Outgoing Webhook enabled" className="text-green-500">
                    <ArrowUpFromLine className="w-3 h-3" />
                  </span>
                )}
                {workflow.incomingWebhook?.enabled && (
                  <span title="Incoming Webhook enabled" className="text-purple-500">
                    <ArrowDownToLine className="w-3 h-3" />
                  </span>
                )}
              </span>
            )}
          </div>
        </div>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onContextMenu(e);
        }}
        className={`absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted transition-opacity ${
          isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
        title="More options"
      >
        <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
    </li>
  );
}

export function WorkflowSidebar({
  workflows,
  selectedWorkflowId,
  sortMode,
  workflowOrder,
  executionStatuses,
  onSelectWorkflow,
  onCreateWorkflow,
  onDeleteWorkflow,
  onDuplicateWorkflow,
  onSortModeChange,
  onWorkflowOrderChange,
}: WorkflowSidebarProps) {
  const [deleteTarget, setDeleteTarget] = useState<Workflow | null>(null);
  const [contextMenu, setContextMenu] = useState<{ workflowId: string; x: number; y: number } | null>(null);
  const [showSortMenu, setShowSortMenu] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const sortedWorkflows = useMemo(() => {
    const sorted = [...workflows];
    switch (sortMode) {
      case 'name':
        return sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      case 'updated':
        return sorted.sort((a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      case 'created':
        return sorted.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case 'custom':
        return sorted.sort((a, b) => {
          const aIndex = workflowOrder.indexOf(a.id);
          const bIndex = workflowOrder.indexOf(b.id);
          if (aIndex === -1 && bIndex === -1) return (a.name || '').localeCompare(b.name || '');
          if (aIndex === -1) return 1;
          if (bIndex === -1) return -1;
          return aIndex - bIndex;
        });
      default:
        return sorted.sort((a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
    }
  }, [workflows, sortMode, workflowOrder]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortedWorkflows.findIndex(w => w.id === active.id);
      const newIndex = sortedWorkflows.findIndex(w => w.id === over.id);

      const newSortedWorkflows = arrayMove(sortedWorkflows, oldIndex, newIndex);
      const newOrder = newSortedWorkflows.map(w => w.id);
      onWorkflowOrderChange(newOrder);
    }
  }, [sortedWorkflows, onWorkflowOrderChange]);

  const handleContextMenu = (e: React.MouseEvent, workflowId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const isButtonClick = e.type === 'click';
    setContextMenu({
      workflowId,
      x: isButtonClick ? rect.right - 140 : e.clientX,
      y: isButtonClick ? rect.bottom + 4 : e.clientY,
    });
  };

  const closeContextMenu = () => setContextMenu(null);

  const handleDeleteClick = (workflow: Workflow) => {
    setDeleteTarget(workflow);
    closeContextMenu();
  };

  const handleDuplicateClick = (workflow: Workflow) => {
    onDuplicateWorkflow?.(workflow);
    closeContextMenu();
  };

  const handleConfirmDelete = () => {
    if (deleteTarget) {
      onDeleteWorkflow(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background" onClick={closeContextMenu}>
      {/* Header and add button */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Workflows</h2>
          <div className="flex items-center gap-1">
            {/* Sort button */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSortMenu(!showSortMenu);
                }}
                className={`p-1.5 rounded hover:bg-accent transition-colors ${
                  showSortMenu ? 'bg-accent' : ''
                }`}
                title="Sort by"
              >
                <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
              </button>
              {/* Sort menu */}
              {showSortMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowSortMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-lg shadow-xl py-1 min-w-[160px] whitespace-nowrap">
                    {SORT_OPTIONS.map(option => (
                      <button
                        key={option.value}
                        onClick={() => {
                          onSortModeChange(option.value);
                          setShowSortMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-foreground hover:bg-accent"
                      >
                        <Check
                          className={`w-4 h-4 ${
                            sortMode === option.value ? 'opacity-100' : 'opacity-0'
                          }`}
                        />
                        {option.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button
              onClick={onCreateWorkflow}
              className="p-1.5 rounded hover:bg-accent transition-colors"
              title="Create workflow"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Workflow list */}
      <div className="flex-1 overflow-y-auto">
        {sortedWorkflows.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            No workflows yet
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortedWorkflows.map(w => w.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="p-2 space-y-1">
                {sortedWorkflows.map((workflow) => (
                  <SortableWorkflowItem
                    key={workflow.id}
                    workflow={workflow}
                    isActive={selectedWorkflowId === workflow.id}
                    isMenuOpen={contextMenu?.workflowId === workflow.id}
                    isDraggable={sortMode === 'custom'}
                    executionStatus={executionStatuses?.get(workflow.id)}
                    onSelect={() => onSelectWorkflow(workflow)}
                    onContextMenu={(e) => handleContextMenu(e, workflow.id)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Drag hint - only show in custom mode */}
      {sortMode === 'custom' && sortedWorkflows.length > 1 && (
        <div className="px-2 py-1.5 border-t border-border text-xs text-muted-foreground text-center">
          Drag items to reorder
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <>
          {/* Transparent overlay - click anywhere to close */}
          <div
            className="fixed inset-0 z-40"
            onClick={closeContextMenu}
          />
          <div
            className="fixed z-50 bg-card border border-border rounded-lg shadow-xl py-1 min-w-[140px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
          {onDuplicateWorkflow && (
            <button
              onClick={() => {
                const workflow = workflows.find(w => w.id === contextMenu.workflowId);
                if (workflow) handleDuplicateClick(workflow);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-foreground hover:bg-accent"
            >
              <Copy className="w-4 h-4" />
              Duplicate
            </button>
          )}
          <button
            onClick={() => {
              const workflow = workflows.find(w => w.id === contextMenu.workflowId);
              if (workflow) handleDeleteClick(workflow);
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-400 hover:bg-accent"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
        </>
      )}

      {/* Delete confirmation dialog */}
      <DeleteConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        itemType="workflow"
        itemName={deleteTarget?.name || ''}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
