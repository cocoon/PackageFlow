/**
 * Workflow state management hook
 * @see specs/001-expo-workflow-automation/spec.md - US1
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type {
  Workflow,
  WorkflowNode,
  NodePosition,
  ExecutionStatus,
  NodeStatus,
  TriggerWorkflowConfig,
} from '../types/workflow';
import { isScriptNodeConfig } from '../types/workflow';
import {
  createWorkflow,
  addNodeToWorkflow,
  updateNodeInWorkflow,
  removeNodeFromWorkflow,
  reorderNodes,
  insertNodeAtPosition,
  reorderNodesByPosition,
  saveWorkflow as saveWorkflowApi,
  executeWorkflow as executeWorkflowApi,
  cancelExecution as cancelExecutionApi,
  continueExecution as continueExecutionApi,
} from '../lib/workflow-storage';
import {
  tauriEvents,
  workflowAPI,
  type NodeStartedPayload,
  type NodeCompletedPayload,
  type ExecutionCompletedPayload,
  type ExecutionPausedPayload,
  type ChildExecutionStartedPayload,
  type ChildExecutionProgressPayload,
  type ChildExecutionCompletedPayload,
  type UnlistenFn,
} from '../lib/tauri-api';

interface ChildProgressInfo {
  currentStep: number;
  totalSteps: number;
  currentNodeName?: string;
}

interface UseWorkflowReturn {
  workflow: Workflow | null;
  hasChanges: boolean;
  isSaving: boolean;
  saveSuccess: boolean;

  executionId: string | null;
  executionStatus: ExecutionStatus | null;
  nodeStatuses: Map<string, NodeStatus>;
  /** Feature 013: Child execution progress for trigger-workflow nodes */
  childProgressMap: Map<string, ChildProgressInfo>;

  createNew: (name?: string) => Promise<void>;
  loadWorkflow: (workflow: Workflow) => Promise<void>;
  setName: (name: string) => void;
  setDescription: (description: string) => void;
  updateWorkflow: (workflow: Workflow) => void;

  addNode: (name: string, command: string, cwd?: string) => void;
  addTriggerWorkflowNode: (
    name: string,
    targetWorkflowId: string,
    targetWorkflowName: string
  ) => void;
  updateNode: (nodeId: string, updates: Partial<Pick<WorkflowNode, 'name' | 'config'>>) => void;
  updateNodePosition: (nodeId: string, position: NodePosition) => Promise<Workflow | null>;
  deleteNode: (nodeId: string) => void;
  moveNode: (fromIndex: number, toIndex: number) => void;

  insertNodeAt: (name: string, command: string, insertIndex: number, cwd?: string) => void;
  insertNodeBefore: (targetNodeId: string, name: string, command: string, cwd?: string) => void;
  insertNodeAfter: (targetNodeId: string, name: string, command: string, cwd?: string) => void;
  duplicateNode: (nodeId: string) => void;
  reorderByPosition: () => void;

  save: () => Promise<Workflow | null>;
  execute: () => Promise<boolean>;
  cancel: () => Promise<boolean>;
  continueExecution: () => Promise<boolean>;

  onSaved: React.MutableRefObject<((workflow: Workflow) => void) | null>;
}

export function useWorkflow(): UseWorkflowReturn {
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [originalWorkflow, setOriginalWorkflow] = useState<Workflow | null>(null);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus | null>(null);
  const [nodeStatuses, setNodeStatuses] = useState<Map<string, NodeStatus>>(new Map());
  const [childProgressMap, setChildProgressMap] = useState<Map<string, ChildProgressInfo>>(
    new Map()
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const onSavedRef = useRef<((workflow: Workflow) => void) | null>(null);
  const executionIdRef = useRef<string | null>(null);

  const hasChanges = useMemo(() => {
    if (!workflow) return false;
    return JSON.stringify(workflow) !== JSON.stringify(originalWorkflow);
  }, [workflow, originalWorkflow]);

  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveSuccessTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAutoSavingRef = useRef(false);
  const saveVersionRef = useRef(0);

  useEffect(() => {
    if (!hasChanges || !workflow?.id || !workflow.name.trim() || isAutoSavingRef.current) return;

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(async () => {
      if (!workflow) return;

      isAutoSavingRef.current = true;
      setIsSaving(true);
      setSaveSuccess(false);

      const versionAtStart = saveVersionRef.current;

      const response = await saveWorkflowApi(workflow);

      await new Promise((resolve) => setTimeout(resolve, 500));

      if (response.success && response.workflow && saveVersionRef.current === versionAtStart) {
        setWorkflow(response.workflow);
        setOriginalWorkflow(response.workflow);
        setIsSaving(false);
        setSaveSuccess(true);

        if (onSavedRef.current) {
          onSavedRef.current(response.workflow);
        }

        if (saveSuccessTimeoutRef.current) {
          clearTimeout(saveSuccessTimeoutRef.current);
        }
        saveSuccessTimeoutRef.current = setTimeout(() => {
          setSaveSuccess(false);
        }, 2000);
      } else {
        setIsSaving(false);
      }

      isAutoSavingRef.current = false;
    }, 1000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [workflow, hasChanges]);

  const createNew = useCallback(async (name: string = 'New Workflow') => {
    const newWorkflow = createWorkflow(name);

    const response = await saveWorkflowApi(newWorkflow);
    if (response.success && response.workflow) {
      setWorkflow(response.workflow);
      setOriginalWorkflow(response.workflow);
    } else {
      setWorkflow(newWorkflow);
      setOriginalWorkflow(null);
    }

    setExecutionId(null);
    setExecutionStatus(null);
    setNodeStatuses(new Map());
  }, []);

  const loadWorkflow = useCallback(async (wf: Workflow) => {
    setWorkflow(wf);
    setOriginalWorkflow(wf);

    // Check if this workflow has a running execution and restore state
    try {
      await workflowAPI.restoreRunningExecutions();
      const runningExecutions = await workflowAPI.getRunningExecutions();

      // Find execution for this workflow
      const runningEntry = Object.entries(runningExecutions).find(
        ([_, exec]) => exec.workflowId === wf.id && exec.status === 'running'
      );

      if (runningEntry) {
        const [execId, exec] = runningEntry;

        // Restore execution state
        setExecutionId(execId);
        executionIdRef.current = execId;
        setExecutionStatus('running');

        // Restore node statuses from nodeResults
        const restoredStatuses = new Map<string, NodeStatus>();
        for (const [, result] of Object.entries(exec.nodeResults || {})) {
          // Use result.nodeId as the key (not the Object.entries key)
          restoredStatuses.set(result.nodeId, result.status as NodeStatus);
        }
        // Set pending for nodes not in results
        wf.nodes.forEach((node) => {
          if (!restoredStatuses.has(node.id)) {
            restoredStatuses.set(node.id, 'pending');
          }
        });

        // If workflow is running but no node is marked as running,
        // find the first pending node and mark it as running
        const hasRunningNode = Array.from(restoredStatuses.values()).some((s) => s === 'running');
        if (!hasRunningNode) {
          // Find first pending node in order
          const sortedNodes = [...wf.nodes].sort((a, b) => a.order - b.order);
          for (const node of sortedNodes) {
            if (restoredStatuses.get(node.id) === 'pending') {
              restoredStatuses.set(node.id, 'running');
              break;
            }
          }
        }

        setNodeStatuses(restoredStatuses);
        setChildProgressMap(new Map());
      } else {
        // No running execution, reset state
        setExecutionId(null);
        executionIdRef.current = null;
        setExecutionStatus(null);
        setNodeStatuses(new Map());
        setChildProgressMap(new Map());
      }
    } catch (error) {
      console.error('[loadWorkflow] Failed to check running executions:', error);
      // Reset state on error
      setExecutionId(null);
      executionIdRef.current = null;
      setExecutionStatus(null);
      setNodeStatuses(new Map());
      setChildProgressMap(new Map());
    }
  }, []);

  const setName = useCallback((name: string) => {
    setWorkflow((prev) => (prev ? { ...prev, name } : null));
  }, []);

  const setDescription = useCallback((description: string) => {
    setWorkflow((prev) => (prev ? { ...prev, description } : null));
  }, []);

  const updateWorkflow = useCallback((updated: Workflow) => {
    setWorkflow(updated);
  }, []);

  const addNode = useCallback((name: string, command: string, cwd?: string) => {
    setWorkflow((prev) => {
      if (!prev) return null;
      return addNodeToWorkflow(prev, name, command, cwd ? { cwd } : undefined);
    });
  }, []);

  const addTriggerWorkflowNode = useCallback(
    (name: string, targetWorkflowId: string, targetWorkflowName: string) => {
      setWorkflow((prev) => {
        if (!prev) return null;

        const newOrder = prev.nodes.length;
        const newNode: WorkflowNode = {
          id: crypto.randomUUID(),
          type: 'trigger-workflow',
          name,
          order: newOrder,
          config: {
            targetWorkflowId,
            targetWorkflowName,
            waitForCompletion: true,
            onChildFailure: 'fail',
          } as TriggerWorkflowConfig & { targetWorkflowName?: string },
        };

        const sortedNodes = [...prev.nodes].sort((a, b) => a.order - b.order);
        const lastNode = sortedNodes[sortedNodes.length - 1];
        if (lastNode?.position) {
          newNode.position = {
            x: lastNode.position.x,
            y: lastNode.position.y + 180,
          };
        }

        return {
          ...prev,
          nodes: [...prev.nodes, newNode],
          updatedAt: new Date().toISOString(),
        };
      });
    },
    []
  );

  const updateNode = useCallback(
    (nodeId: string, updates: Partial<Pick<WorkflowNode, 'name' | 'config'>>) => {
      setWorkflow((prev) => {
        if (!prev) return null;
        return updateNodeInWorkflow(prev, nodeId, updates);
      });
    },
    []
  );

  const workflowRef = useRef<Workflow | null>(null);
  workflowRef.current = workflow;

  // Track current workflow ID for event filtering
  const workflowIdRef = useRef<string | null>(null);
  workflowIdRef.current = workflow?.id ?? null;

  const updateNodePosition = useCallback(
    async (nodeId: string, position: NodePosition): Promise<Workflow | null> => {
      const currentWorkflow = workflowRef.current;
      if (!currentWorkflow) return null;

      saveVersionRef.current += 1;

      const updatedNodes = currentWorkflow.nodes.map((node) =>
        node.id === nodeId ? { ...node, position } : node
      );
      const updatedWorkflow = {
        ...currentWorkflow,
        nodes: updatedNodes,
        updatedAt: new Date().toISOString(),
      };

      const response = await saveWorkflowApi(updatedWorkflow);

      if (response.success && response.workflow) {
        setWorkflow(response.workflow);
        setOriginalWorkflow(response.workflow);
        return response.workflow;
      }
      return null;
    },
    []
  );

  const deleteNode = useCallback((nodeId: string) => {
    setWorkflow((prev) => {
      if (!prev) return null;
      return removeNodeFromWorkflow(prev, nodeId);
    });
  }, []);

  const moveNode = useCallback((fromIndex: number, toIndex: number) => {
    setWorkflow((prev) => {
      if (!prev) return null;
      return reorderNodes(prev, fromIndex, toIndex);
    });
  }, []);

  const insertNodeAt = useCallback(
    (name: string, command: string, insertIndex: number, cwd?: string) => {
      setWorkflow((prev) => {
        if (!prev) return null;
        return insertNodeAtPosition(prev, name, command, insertIndex, cwd ? { cwd } : undefined);
      });
    },
    []
  );

  const insertNodeBefore = useCallback(
    (targetNodeId: string, name: string, command: string, cwd?: string) => {
      setWorkflow((prev) => {
        if (!prev) return null;
        const targetNode = prev.nodes.find((n) => n.id === targetNodeId);
        if (!targetNode) return prev;
        return insertNodeAtPosition(
          prev,
          name,
          command,
          targetNode.order,
          cwd ? { cwd } : undefined
        );
      });
    },
    []
  );

  const insertNodeAfter = useCallback(
    (targetNodeId: string, name: string, command: string, cwd?: string) => {
      setWorkflow((prev) => {
        if (!prev) return null;
        const targetNode = prev.nodes.find((n) => n.id === targetNodeId);
        if (!targetNode) return prev;
        return insertNodeAtPosition(
          prev,
          name,
          command,
          targetNode.order + 1,
          cwd ? { cwd } : undefined
        );
      });
    },
    []
  );

  const duplicateNode = useCallback((nodeId: string) => {
    setWorkflow((prev) => {
      if (!prev) return null;
      const targetNode = prev.nodes.find((n) => n.id === nodeId);
      if (!targetNode) return prev;

      if (isScriptNodeConfig(targetNode.config)) {
        return insertNodeAtPosition(
          prev,
          `${targetNode.name} (copy)`,
          targetNode.config.command,
          targetNode.order + 1,
          { cwd: targetNode.config.cwd, timeout: targetNode.config.timeout }
        );
      }

      const newId = crypto.randomUUID();
      const insertIndex = targetNode.order + 1;

      const updatedNodes = prev.nodes.map((n) => ({
        ...n,
        order: n.order >= insertIndex ? n.order + 1 : n.order,
      }));

      const duplicatedNode: WorkflowNode = {
        ...targetNode,
        id: newId,
        name: `${targetNode.name} (copy)`,
        order: insertIndex,
        position: targetNode.position
          ? { x: targetNode.position.x, y: targetNode.position.y + 180 }
          : undefined,
      };

      return {
        ...prev,
        nodes: [...updatedNodes, duplicatedNode],
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  const reorderByPosition = useCallback(() => {
    setWorkflow((prev) => {
      if (!prev) return null;
      return reorderNodesByPosition(prev);
    });
  }, []);

  const save = useCallback(async (): Promise<Workflow | null> => {
    if (!workflow) return null;

    const response = await saveWorkflowApi(workflow);
    if (response.success && response.workflow) {
      setWorkflow(response.workflow);
      setOriginalWorkflow(response.workflow);
      return response.workflow;
    }
    return null;
  }, [workflow]);

  const execute = useCallback(async (): Promise<boolean> => {
    if (!workflow || !workflow.id) return false;

    if (hasChanges) {
      const savedWorkflow = await save();
      if (!savedWorkflow) return false;
    }

    const initialStatuses = new Map<string, NodeStatus>();
    workflow.nodes.forEach((node) => {
      initialStatuses.set(node.id, 'pending');
    });
    setNodeStatuses(initialStatuses);
    setChildProgressMap(new Map());
    // Clear executionId first to accept any completion events
    // This prevents race condition where event arrives before API returns
    setExecutionId(null);
    executionIdRef.current = null; // Also update ref immediately for event handlers
    setExecutionStatus('running');

    const response = await executeWorkflowApi(workflow.id);
    if (response.success && response.executionId) {
      const newExecutionId = response.executionId;
      // Only set executionId if not already completed (race condition protection)
      setExecutionId((prevId) => {
        // If prevId is still null, we can safely set the new one
        // The completion handler will also set it to null when done
        return prevId === null ? newExecutionId : prevId;
      });
      return true;
    }

    setExecutionStatus(null);
    return false;
  }, [workflow, hasChanges, save]);

  const cancel = useCallback(async (): Promise<boolean> => {
    if (!executionId) return false;

    const response = await cancelExecutionApi(executionId);
    if (response.success) {
      setExecutionStatus('cancelled');
    }
    return response.success;
  }, [executionId]);

  const continueExec = useCallback(async (): Promise<boolean> => {
    if (!executionId) return false;

    const response = await continueExecutionApi(executionId);
    if (response.success) {
      setExecutionStatus('running');
    }
    return response.success;
  }, [executionId]);

  useEffect(() => {
    executionIdRef.current = executionId;
  }, [executionId]);

  useEffect(() => {
    let isMounted = true;
    const cleanupFns: UnlistenFn[] = [];

    const handleNodeStarted = (event: NodeStartedPayload) => {
      if (!isMounted) return;
      // Filter by workflowId - only process events for the current workflow
      if (workflowIdRef.current && event.workflowId !== workflowIdRef.current) return;

      setNodeStatuses((prev) => new Map(prev).set(event.nodeId, 'running'));
      // Also set execution status to running if not already set
      setExecutionStatus((prev) => (prev === null ? 'running' : prev));
      // Update executionId if not set (for events from Context-initiated executions)
      if (!executionIdRef.current) {
        setExecutionId(event.executionId);
        executionIdRef.current = event.executionId;
      }
    };

    const handleNodeCompleted = (event: NodeCompletedPayload) => {
      if (!isMounted) return;
      // Filter by workflowId - only process events for the current workflow
      if (workflowIdRef.current && event.workflowId !== workflowIdRef.current) return;

      setNodeStatuses((prev) => new Map(prev).set(event.nodeId, event.status as NodeStatus));
    };

    const handleExecutionCompleted = (event: ExecutionCompletedPayload) => {
      if (!isMounted) return;
      // Filter by workflowId - only process events for the current workflow
      if (workflowIdRef.current && event.workflowId !== workflowIdRef.current) return;

      console.log(
        '[useWorkflow] handleExecutionCompleted:',
        event.executionId,
        event.status,
        'current ref:',
        executionIdRef.current
      );
      setExecutionStatus(event.status as ExecutionStatus);
      setExecutionId(null);
    };

    const handleExecutionPaused = (event: ExecutionPausedPayload) => {
      if (!isMounted) return;
      // Filter by workflowId - only process events for the current workflow
      if (workflowIdRef.current && event.workflowId !== workflowIdRef.current) return;

      setExecutionStatus('paused');
    };

    const handleChildStarted = (event: ChildExecutionStartedPayload) => {
      if (!isMounted) return;
      if (!executionIdRef.current || event.parentExecutionId === executionIdRef.current) {
        setChildProgressMap((prev) => {
          const newMap = new Map(prev);
          newMap.set(event.parentNodeId, {
            currentStep: 0,
            totalSteps: 0,
          });
          return newMap;
        });
      }
    };

    const handleChildProgress = (event: ChildExecutionProgressPayload) => {
      if (!isMounted) return;
      if (!executionIdRef.current || event.parentExecutionId === executionIdRef.current) {
        setChildProgressMap((prev) => {
          const newMap = new Map(prev);
          newMap.set(event.parentNodeId, {
            currentStep: event.currentStep,
            totalSteps: event.totalSteps,
            currentNodeName: event.currentNodeName,
          });
          return newMap;
        });
      }
    };

    const handleChildCompleted = (event: ChildExecutionCompletedPayload) => {
      if (!isMounted) return;
      if (!executionIdRef.current || event.parentExecutionId === executionIdRef.current) {
        setChildProgressMap((prev) => {
          const newMap = new Map(prev);
          newMap.delete(event.parentNodeId);
          return newMap;
        });
      }
    };

    const setup = async () => {
      const unsub1 = await tauriEvents.onWorkflowNodeStarted(handleNodeStarted);
      if (isMounted) cleanupFns.push(unsub1);
      else unsub1();

      const unsub2 = await tauriEvents.onWorkflowNodeCompleted(handleNodeCompleted);
      if (isMounted) cleanupFns.push(unsub2);
      else unsub2();

      const unsub3 = await tauriEvents.onWorkflowCompleted(handleExecutionCompleted);
      if (isMounted) cleanupFns.push(unsub3);
      else unsub3();

      const unsub4 = await tauriEvents.onWorkflowPaused(handleExecutionPaused);
      if (isMounted) cleanupFns.push(unsub4);
      else unsub4();

      const unsub5 = await tauriEvents.onChildExecutionStarted(handleChildStarted);
      if (isMounted) cleanupFns.push(unsub5);
      else unsub5();

      const unsub6 = await tauriEvents.onChildExecutionProgress(handleChildProgress);
      if (isMounted) cleanupFns.push(unsub6);
      else unsub6();

      const unsub7 = await tauriEvents.onChildExecutionCompleted(handleChildCompleted);
      if (isMounted) cleanupFns.push(unsub7);
      else unsub7();
    };

    setup();

    return () => {
      isMounted = false;
      cleanupFns.forEach((fn) => fn?.());
    };
  }, []);

  return {
    workflow,
    hasChanges,
    isSaving,
    saveSuccess,
    executionId,
    executionStatus,
    nodeStatuses,
    childProgressMap,
    createNew,
    loadWorkflow,
    setName,
    setDescription,
    updateWorkflow,
    addNode,
    addTriggerWorkflowNode,
    updateNode,
    updateNodePosition,
    deleteNode,
    moveNode,
    insertNodeAt,
    insertNodeBefore,
    insertNodeAfter,
    duplicateNode,
    reorderByPosition,
    save,
    execute,
    cancel,
    continueExecution: continueExec,
    onSaved: onSavedRef,
  };
}
