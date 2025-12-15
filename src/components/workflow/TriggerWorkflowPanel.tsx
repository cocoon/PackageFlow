/**
 * Trigger Workflow Panel - Side Panel for Trigger Workflow Node Configuration
 * Feature 013: Workflow Trigger Workflow
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Workflow, Play, Pause, AlertCircle, Save, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { WorkflowNode, TriggerWorkflowConfig, NodeStatus } from '../../types/workflow';
import { isTriggerWorkflowConfig } from '../../types/workflow';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { WorkflowSelector } from './WorkflowSelector';

interface TriggerWorkflowPanelProps {
  node: WorkflowNode | null;
  status?: NodeStatus;
  currentWorkflowId: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (nodeId: string, updates: { name: string; config: TriggerWorkflowConfig }) => void;
  onDelete: (nodeId: string) => void;
  disabled?: boolean;
}

/**
 * Get status badge configuration
 */
function getStatusBadge(status?: NodeStatus) {
  switch (status) {
    case 'running':
      return { label: 'Running', className: 'bg-purple-500/20 text-purple-400 border-purple-500/30' };
    case 'completed':
      return { label: 'Completed', className: 'bg-green-500/20 text-green-400 border-green-500/30' };
    case 'failed':
      return { label: 'Failed', className: 'bg-red-500/20 text-red-400 border-red-500/30' };
    case 'skipped':
      return { label: 'Skipped', className: 'bg-muted/50 text-muted-foreground border-muted' };
    case 'pending':
      return { label: 'Pending', className: 'bg-muted/50 text-muted-foreground border-muted' };
    default:
      return null;
  }
}

/**
 * Trigger Workflow Panel Component
 * Slide-out panel for editing trigger-workflow node configuration
 */
export function TriggerWorkflowPanel({
  node,
  status,
  currentWorkflowId,
  isOpen,
  onClose,
  onSave,
  onDelete,
  disabled = false,
}: TriggerWorkflowPanelProps) {
  const [name, setName] = useState('');
  const [targetWorkflowId, setTargetWorkflowId] = useState('');
  const [targetWorkflowName, setTargetWorkflowName] = useState('');
  const [waitForCompletion, setWaitForCompletion] = useState(true);
  const [onChildFailure, setOnChildFailure] = useState<'fail' | 'continue'>('fail');
  const [hasChanges, setHasChanges] = useState(false);

  // Extract trigger config from node
  const triggerConfig = useMemo(() => {
    if (node && isTriggerWorkflowConfig(node.config)) {
      return node.config;
    }
    return null;
  }, [node]);

  // Sync form state with node prop
  useEffect(() => {
    if (node && triggerConfig) {
      setName(node.name);
      setTargetWorkflowId(triggerConfig.targetWorkflowId);
      // targetWorkflowName might be stored in the config or we just use the ID
      setTargetWorkflowName((triggerConfig as TriggerWorkflowConfig & { targetWorkflowName?: string }).targetWorkflowName || '');
      setWaitForCompletion(triggerConfig.waitForCompletion);
      setOnChildFailure(triggerConfig.onChildFailure);
      setHasChanges(false);
    }
  }, [node, triggerConfig]);

  // Track changes
  useEffect(() => {
    if (!node || !triggerConfig) return;

    const nameChanged = name !== node.name;
    const targetChanged = targetWorkflowId !== triggerConfig.targetWorkflowId;
    const waitChanged = waitForCompletion !== triggerConfig.waitForCompletion;
    const failureChanged = onChildFailure !== triggerConfig.onChildFailure;

    setHasChanges(nameChanged || targetChanged || waitChanged || failureChanged);
  }, [name, targetWorkflowId, waitForCompletion, onChildFailure, node, triggerConfig]);

  // Handle save
  const handleSave = useCallback(() => {
    if (!node || !name.trim() || !targetWorkflowId) return;

    const config: TriggerWorkflowConfig & { targetWorkflowName?: string } = {
      targetWorkflowId,
      targetWorkflowName,
      waitForCompletion,
      onChildFailure,
    };

    onSave(node.id, { name: name.trim(), config });
    setHasChanges(false);
  }, [node, name, targetWorkflowId, targetWorkflowName, waitForCompletion, onChildFailure, onSave]);

  // Handle delete
  const handleDelete = useCallback(() => {
    if (!node) return;
    onDelete(node.id);
    onClose();
  }, [node, onDelete, onClose]);

  // Handle workflow selection
  const handleWorkflowSelect = useCallback((workflowId: string, workflowName: string) => {
    setTargetWorkflowId(workflowId);
    setTargetWorkflowName(workflowName);
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (hasChanges && !disabled) {
          handleSave();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasChanges, disabled, handleSave, onClose]);

  const statusBadge = getStatusBadge(status);

  // Only render if this is a trigger-workflow node
  if (!node || !triggerConfig) return null;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={cn(
          'fixed right-0 top-0 h-full w-full max-w-md bg-card border-l border-border z-50',
          'transform transition-transform duration-300 ease-in-out',
          'flex flex-col',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-600">
              <Workflow className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Trigger Workflow
              </h2>
              {node && (
                <span className="text-xs text-muted-foreground">#{node.order + 1}</span>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-auto w-auto p-2"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Status Badge */}
          {statusBadge && (
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded-full border',
                  statusBadge.className
                )}
              >
                {statusBadge.label}
              </span>
            </div>
          )}

          {/* Name Input */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Workflow className="w-4 h-4" />
              Step Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Run Deploy Workflow"
              disabled={disabled}
              className="bg-background border-border text-foreground"
            />
          </div>

          {/* Target Workflow Selector */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Play className="w-4 h-4" />
              Target Workflow
            </label>
            <WorkflowSelector
              value={targetWorkflowId}
              currentWorkflowId={currentWorkflowId}
              onChange={handleWorkflowSelect}
              disabled={disabled}
            />
            {!targetWorkflowId && (
              <p className="text-xs text-amber-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Select a workflow to trigger
              </p>
            )}
          </div>

          {/* Wait for Completion Toggle */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Pause className="w-4 h-4" />
              Execution Mode
            </label>
            <div className="flex gap-2">
              <Button
                variant={waitForCompletion ? "default" : "outline"}
                type="button"
                onClick={() => setWaitForCompletion(true)}
                disabled={disabled}
                className={cn(
                  'flex-1 h-auto px-3 py-2 text-sm',
                  waitForCompletion && 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                )}
              >
                Wait for completion
              </Button>
              <Button
                variant={!waitForCompletion ? "default" : "outline"}
                type="button"
                onClick={() => setWaitForCompletion(false)}
                disabled={disabled}
                className={cn(
                  'flex-1 h-auto px-3 py-2 text-sm',
                  !waitForCompletion && 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                )}
              >
                Fire and forget
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {waitForCompletion
                ? 'Wait for the target workflow to complete before continuing'
                : 'Start the target workflow and continue immediately'}
            </p>
          </div>

          {/* On Child Failure (only when waiting) */}
          {waitForCompletion && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <AlertCircle className="w-4 h-4" />
                On Failure
              </label>
              <div className="flex gap-2">
                <Button
                  variant={onChildFailure === 'fail' ? "default" : "outline"}
                  type="button"
                  onClick={() => setOnChildFailure('fail')}
                  disabled={disabled}
                  className={cn(
                    'flex-1 h-auto px-3 py-2 text-sm',
                    onChildFailure === 'fail' && 'bg-red-500/20 border-red-500/50 text-red-300'
                  )}
                >
                  Stop workflow
                </Button>
                <Button
                  variant={onChildFailure === 'continue' ? "default" : "outline"}
                  type="button"
                  onClick={() => setOnChildFailure('continue')}
                  disabled={disabled}
                  className={cn(
                    'flex-1 h-auto px-3 py-2 text-sm',
                    onChildFailure === 'continue' && 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                  )}
                >
                  Continue anyway
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {onChildFailure === 'fail'
                  ? 'Stop the main workflow if the target workflow fails'
                  : 'Continue the main workflow even if the target workflow fails'}
              </p>
            </div>
          )}

          {/* Info Box */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <h4 className="text-sm font-medium text-foreground mb-2">Tips</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>- Press Cmd/Ctrl + S to save changes</li>
              <li>- Press Escape to close the panel</li>
              <li>- Maximum recursion depth is 5 levels</li>
              <li>- Circular dependencies will be detected</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border space-y-3">
          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={disabled || !hasChanges || !name.trim() || !targetWorkflowId}
            className={cn(
              'w-full',
              hasChanges
                ? 'bg-purple-600 hover:bg-purple-500 text-white'
                : 'bg-muted text-muted-foreground'
            )}
          >
            <Save className="w-4 h-4 mr-2" />
            {hasChanges ? 'Save Changes' : 'Saved'}
          </Button>

          {/* Delete Button */}
          <Button
            onClick={handleDelete}
            disabled={disabled}
            variant="ghost"
            className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Step
          </Button>
        </div>
      </div>
    </>
  );
}
