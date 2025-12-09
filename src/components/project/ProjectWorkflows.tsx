/**
 * Project workflows component
 * @see specs/002-frontend-project-manager/tasks.md - T3.3
 */

import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, MoreVertical, ExternalLink, Link2, Unlink, Workflow as WorkflowIcon, Terminal } from 'lucide-react';
import type { Workflow } from '../../types/workflow';
import {
  loadWorkflowsByProject,
  loadWorkflows,
  createWorkflowForProject,
  deleteWorkflow as deleteWorkflowApi,
  saveWorkflow,
} from '../../lib/workflow-storage';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { useWorkflowExecutionContext } from '../../contexts/WorkflowExecutionContext';
import {
  ExecuteButton,
  WorkflowStatusBadge,
  WorkflowExecutionStatus,
} from '../workflow/WorkflowExecutionStatus';
import { WorkflowOutputPanel } from '../workflow/WorkflowOutputPanel';

interface ProjectWorkflowsProps {
  projectId: string;
  projectPath: string;
  scripts: Record<string, string>;
  onEditWorkflow?: (workflow: Workflow) => void;
  onNavigateToWorkflow?: (workflow: Workflow, projectPath: string) => void;
}

export function ProjectWorkflows({
  projectId,
  projectPath,
  scripts: _scripts,
  onEditWorkflow,
  onNavigateToWorkflow,
}: ProjectWorkflowsProps) {
  // TODO: T3.4 - Implement drag-to-create workflow nodes using scripts
  void _scripts;
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [globalWorkflows, setGlobalWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [contextMenu, setContextMenu] = useState<{ workflowId: string; x: number; y: number } | null>(null);
  const [outputPanelWorkflowId, setOutputPanelWorkflowId] = useState<string | null>(null);

  // Workflow execution state management (from context to persist across tab switches)
  const {
    getExecutionState,
    executeWorkflow: startExecution,
    cancelExecution,
    clearExecution,
    isExecuting,
  } = useWorkflowExecutionContext();

  const loadProjectWorkflows = useCallback(async () => {
    setIsLoading(true);
    try {
      const loaded = await loadWorkflowsByProject(projectId);
      setWorkflows(loaded);
    } catch (error) {
      console.error('Failed to load project workflows:', error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const loadGlobalWorkflowsList = useCallback(async () => {
    try {
      const all = await loadWorkflows();
      const globals = all.filter(w => !w.projectId);
      setGlobalWorkflows(globals);
    } catch (error) {
      console.error('Failed to load global workflows:', error);
    }
  }, []);

  useEffect(() => {
    loadProjectWorkflows();
  }, [loadProjectWorkflows]);

  const handleAddClick = () => {
    loadGlobalWorkflowsList();
    setShowAddDialog(true);
  };

  const handleCreateWorkflow = async () => {
    if (!newWorkflowName.trim()) return;

    const newWorkflow = createWorkflowForProject(projectId, newWorkflowName.trim());
    const response = await saveWorkflow(newWorkflow);

    if (response.success && response.workflow) {
      setWorkflows(prev => [...prev, response.workflow!]);
      setShowNewForm(false);
      setShowAddDialog(false);
      setNewWorkflowName('');

      if (onNavigateToWorkflow) {
        onNavigateToWorkflow(response.workflow, projectPath);
      } else if (onEditWorkflow) {
        onEditWorkflow(response.workflow);
      }
    }
  };

  const handleLinkWorkflow = async (workflow: Workflow) => {
    const updatedWorkflow: Workflow = {
      ...workflow,
      projectId,
    };

    const response = await saveWorkflow(updatedWorkflow);

    if (response.success && response.workflow) {
      setWorkflows(prev => [...prev, response.workflow!]);
      setGlobalWorkflows(prev => prev.filter(w => w.id !== workflow.id));
      setShowLinkDialog(false);
      setShowAddDialog(false);
    }
  };

  const handleExecuteWorkflow = async (workflow: Workflow) => {
    console.log('[ProjectWorkflows] handleExecuteWorkflow called with:', workflow.id);

    // Don't start if already executing
    if (isExecuting(workflow.id)) {
      console.log('[ProjectWorkflows] Workflow already executing, skipping');
      return;
    }

    try {
      const result = await startExecution(workflow.id, workflow.nodes.length);
      console.log('[ProjectWorkflows] executeWorkflow result:', result);
      if (!result.success) {
        console.error('Failed to execute workflow:', result.error);
      }
    } catch (error) {
      console.error('Failed to execute workflow:', error);
    }
  };

  const handleCancelExecution = async (workflowId: string) => {
    try {
      await cancelExecution(workflowId);
    } catch (error) {
      console.error('Failed to cancel workflow:', error);
    }
  };

  const handleViewOutput = (workflowId: string) => {
    setOutputPanelWorkflowId(workflowId);
  };

  const _handleDeleteWorkflow = async (workflowId: string) => {
    try {
      const response = await deleteWorkflowApi(workflowId);
      if (response.success) {
        setWorkflows(prev => prev.filter(w => w.id !== workflowId));
      }
    } catch (error) {
      console.error('Failed to delete workflow:', error);
    }
    setContextMenu(null);
  };
  void _handleDeleteWorkflow;

  const handleUnlinkWorkflow = async (workflowId: string) => {
    const workflow = workflows.find(w => w.id === workflowId);
    if (!workflow) return;

    try {
      const updatedWorkflow: Workflow = {
        ...workflow,
        projectId: undefined,
      };

      const response = await saveWorkflow(updatedWorkflow);
      if (response.success) {
        setWorkflows(prev => prev.filter(w => w.id !== workflowId));
      }
    } catch (error) {
      console.error('Failed to unlink workflow:', error);
    }
    setContextMenu(null);
  };

  const handleEditClick = (workflow: Workflow) => {
    if (onNavigateToWorkflow) {
      onNavigateToWorkflow(workflow, projectPath);
    } else if (onEditWorkflow) {
      onEditWorkflow(workflow);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, workflowId: string) => {
    e.preventDefault();
    setContextMenu({ workflowId, x: e.clientX, y: e.clientY });
  };

  const closeContextMenu = () => setContextMenu(null);

  useEffect(() => {
    if (!contextMenu) return;

    const handleClickOutside = () => closeContextMenu();
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenu]);

  if (isLoading) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-4" onClick={closeContextMenu}>
      {/* Add workflow button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Project workflows</h3>
        <button
          onClick={handleAddClick}
          className="flex items-center gap-1.5 px-2 py-1 text-sm text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
        >
          <Plus className="w-4 h-4" />
          New
        </button>
      </div>

      {/* Workflow list */}
      {workflows.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          <WorkflowIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No workflows yet</p>
          <p className="text-sm mt-1">Click "New" to create a project-specific workflow</p>
        </div>
      ) : (
        <div className="space-y-2">
          {workflows.map(workflow => {
            const executionState = getExecutionState(workflow.id);
            const workflowIsExecuting = isExecuting(workflow.id);
            const hasExecutionState = executionState.status !== 'idle';

            return (
              <div
                key={workflow.id}
                onContextMenu={e => handleContextMenu(e, workflow.id)}
                className="group p-3 bg-card/50 rounded-lg border border-border hover:border-accent transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <WorkflowIcon className="w-5 h-5 text-blue-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium text-foreground truncate">
                          {workflow.name}
                        </h4>
                        {/* Inline status badge when executing or has result */}
                        {hasExecutionState && (
                          <WorkflowStatusBadge state={executionState} />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {workflow.nodes.length} steps
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    {/* Execute button with loading state */}
                    <ExecuteButton
                      isExecuting={workflowIsExecuting}
                      disabled={workflow.nodes.length === 0}
                      onClick={() => handleExecuteWorkflow(workflow)}
                    />
                    {/* View output button when there's output */}
                    {executionState.output.length > 0 && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleViewOutput(workflow.id);
                        }}
                        className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="View output"
                      >
                        <Terminal className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleContextMenu(e, workflow.id);
                      }}
                      className={`p-1.5 rounded hover:bg-muted transition-opacity ${
                        contextMenu?.workflowId === workflow.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                      title="More options"
                    >
                      <MoreVertical className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>

                {/* Expanded execution status for running/completed/failed states */}
                {hasExecutionState && !workflowIsExecuting && executionState.status !== 'idle' && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <WorkflowExecutionStatus
                      state={executionState}
                      onCancel={() => handleCancelExecution(workflow.id)}
                      onViewOutput={() => handleViewOutput(workflow.id)}
                      onClear={() => clearExecution(workflow.id)}
                      compact={false}
                    />
                  </div>
                )}

                {/* Running progress bar */}
                {workflowIsExecuting && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>
                        {executionState.currentNode
                          ? `Running: ${executionState.currentNode.name}`
                          : 'Starting...'}
                      </span>
                      <span>{executionState.progress}%</span>
                    </div>
                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${Math.max(executionState.progress, 2)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-card border border-border rounded-lg shadow-xl py-1 min-w-[140px]"
          style={{
            left: Math.min(contextMenu.x, window.innerWidth - 160),
            top: contextMenu.y,
          }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => {
              const workflow = workflows.find(w => w.id === contextMenu.workflowId);
              if (workflow) handleEditClick(workflow);
              closeContextMenu();
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-foreground hover:bg-accent"
          >
            <Edit className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={() => handleUnlinkWorkflow(contextMenu.workflowId)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-yellow-400 hover:bg-accent"
          >
            <Unlink className="w-4 h-4" />
            Unlink
          </button>
        </div>
      )}

      {/* Add workflow selection dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogClose onClick={() => setShowAddDialog(false)} />
          <DialogHeader>
            <DialogTitle className="text-foreground">Add workflow</DialogTitle>
          </DialogHeader>

          {!showNewForm && !showLinkDialog ? (
            <div className="space-y-3 mt-4">
              <button
                onClick={() => setShowNewForm(true)}
                className="w-full flex items-center gap-3 p-4 bg-muted/50 hover:bg-muted rounded-lg transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">Create new workflow</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Create a project-specific workflow and start editing</div>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground ml-auto" />
              </button>

              <button
                onClick={() => setShowLinkDialog(true)}
                disabled={globalWorkflows.length === 0}
                className="w-full flex items-center gap-3 p-4 bg-muted/50 hover:bg-muted rounded-lg transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-10 h-10 rounded-lg bg-purple-600 flex items-center justify-center shrink-0">
                  <Link2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">Link existing workflow</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {globalWorkflows.length > 0
                      ? `Choose a global workflow to link to this project (${globalWorkflows.length} available)`
                      : 'No global workflows available'
                    }
                  </div>
                </div>
              </button>
            </div>
          ) : showNewForm ? (
            <div className="mt-4">
              <input
                type="text"
                placeholder="Workflow name"
                value={newWorkflowName}
                onChange={e => setNewWorkflowName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreateWorkflow();
                  if (e.key === 'Escape') {
                    setShowNewForm(false);
                    setNewWorkflowName('');
                  }
                }}
                autoFocus
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-blue-500"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Working directory will default to: {projectPath}
              </p>
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowNewForm(false);
                    setNewWorkflowName('');
                  }}
                  className="text-muted-foreground"
                >
                  Back
                </Button>
                <Button
                  onClick={handleCreateWorkflow}
                  disabled={!newWorkflowName.trim()}
                  className="bg-blue-600 hover:bg-blue-500"
                >
                  Create and edit
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <div className="max-h-64 overflow-y-auto space-y-2">
                {globalWorkflows.map(workflow => (
                  <button
                    key={workflow.id}
                    onClick={() => handleLinkWorkflow(workflow)}
                    className="w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted rounded-lg transition-colors text-left"
                  >
                    <div>
                      <div className="text-sm font-medium text-foreground">{workflow.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {workflow.nodes.length} steps
                      </div>
                    </div>
                    <Link2 className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="ghost"
                  onClick={() => setShowLinkDialog(false)}
                  className="text-muted-foreground"
                >
                  Back
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Output Panel Dialog */}
      {outputPanelWorkflowId && (
        <WorkflowOutputPanel
          workflowId={outputPanelWorkflowId}
          workflowName={workflows.find(w => w.id === outputPanelWorkflowId)?.name || 'Workflow'}
          state={getExecutionState(outputPanelWorkflowId)}
          onClose={() => setOutputPanelWorkflowId(null)}
        />
      )}
    </div>
  );
}
