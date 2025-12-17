/**
 * Workflow Execution State Management Hook
 * Tracks workflow execution status, progress, and output
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  tauriEvents,
  workflowAPI,
  type NodeStartedPayload,
  type ExecutionOutputPayload,
  type NodeCompletedPayload,
  type ExecutionCompletedPayload,
  type UnlistenFn,
  type ChildExecutionStartedPayload,
  type ChildExecutionProgressPayload,
  type ChildExecutionCompletedPayload,
} from '../lib/tauri-api';
import type { ChildExecutionState } from './useChildExecution';

/** Execution state for a single workflow */
export interface WorkflowExecutionState {
  /** Execution ID from backend */
  executionId: string | null;
  /** Current execution status */
  status: 'idle' | 'starting' | 'running' | 'completed' | 'failed' | 'cancelled';
  /** Currently executing node info */
  currentNode: {
    id: string;
    name: string;
  } | null;
  /** Execution progress (0-100) */
  progress: number;
  /** Total nodes in workflow */
  totalNodes: number;
  /** Completed nodes count */
  completedNodes: number;
  /** Error message if failed */
  error: string | null;
  /** Output lines (limited to last N lines) */
  output: OutputLine[];
  /** Execution start time */
  startedAt: Date | null;
  /** Execution end time */
  finishedAt: Date | null;
  /** Feature 013: Child execution states (for trigger-workflow nodes) */
  childExecutions: Record<string, ChildExecutionState>;
}

export interface OutputLine {
  id: string;
  nodeId: string;
  nodeName?: string;
  nodeType?: 'script' | 'trigger-workflow';
  content: string;
  stream: 'stdout' | 'stderr' | 'system';
  timestamp: Date;
}

interface UseWorkflowExecutionOptions {
  /** Maximum output lines to keep */
  maxOutputLines?: number;
  /** Callback when execution completes */
  onComplete?: (status: 'completed' | 'failed' | 'cancelled') => void;
}

const initialState: WorkflowExecutionState = {
  executionId: null,
  status: 'idle',
  currentNode: null,
  progress: 0,
  totalNodes: 0,
  completedNodes: 0,
  error: null,
  output: [],
  startedAt: null,
  finishedAt: null,
  childExecutions: {},
};

/**
 * Hook to manage workflow execution state for multiple workflows
 */
export function useWorkflowExecution(options: UseWorkflowExecutionOptions = {}) {
  const { maxOutputLines = 200, onComplete } = options;

  // Map of workflowId -> execution state
  const [executions, setExecutions] = useState<Record<string, WorkflowExecutionState>>({});

  // Track active listeners
  const listenersRef = useRef<UnlistenFn[]>([]);
  const outputIdCounter = useRef(0);
  const onCompleteRef = useRef(onComplete);
  const isSubscribedRef = useRef(false);

  // Keep onComplete ref up to date
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Restore running executions from backend on mount
  // This handles the case when user navigates away and back
  const hasRestoredRef = useRef(false);
  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    const restoreExecutions = async () => {
      try {
        await workflowAPI.restoreRunningExecutions();
        const runningExecutions = await workflowAPI.getRunningExecutions();

        // Convert backend execution state to frontend state
        if (Object.keys(runningExecutions).length > 0) {
          // Fetch output history for each running execution from backend buffer
          const outputPromises = Object.values(runningExecutions).map(async (exec) => {
            try {
              const outputResponse = await workflowAPI.getWorkflowOutput(exec.workflowId);
              return { workflowId: exec.workflowId, output: outputResponse };
            } catch (error) {
              console.error(
                `[useWorkflowExecution] Failed to get output for ${exec.workflowId}:`,
                error
              );
              return { workflowId: exec.workflowId, output: null };
            }
          });

          const outputResults = await Promise.all(outputPromises);
          const outputMap = new Map(outputResults.map((r) => [r.workflowId, r.output]));

          setExecutions((prev) => {
            const newStates = { ...prev };

            for (const [executionId, exec] of Object.entries(runningExecutions)) {
              if (exec.status === 'running') {
                // Calculate progress from nodeResults
                const nodeResults = Object.values(exec.nodeResults || {});
                const totalNodes = nodeResults.length;
                const completedNodes = nodeResults.filter(
                  (n) => n.status === 'completed' || n.status === 'failed' || n.status === 'skipped'
                ).length;
                const runningNode = nodeResults.find((n) => n.status === 'running');

                // Get output from backend buffer or preserve existing
                const backendOutput = outputMap.get(exec.workflowId);
                const existingState = prev[exec.workflowId];

                // Convert backend output lines to frontend OutputLine format
                const restoredOutput: OutputLine[] =
                  backendOutput?.lines?.map((line) => ({
                    id: `${line.nodeId}-${line.timestamp}`,
                    nodeId: line.nodeId,
                    nodeName: line.nodeName,
                    content: line.content,
                    stream: line.stream as 'stdout' | 'stderr' | 'system',
                    timestamp: new Date(line.timestamp),
                  })) ||
                  existingState?.output ||
                  [];

                newStates[exec.workflowId] = {
                  executionId,
                  status: 'running',
                  currentNode: runningNode
                    ? {
                        id: runningNode.nodeId,
                        name: runningNode.nodeId, // We don't have the name, use ID
                      }
                    : null,
                  progress: totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0,
                  totalNodes,
                  completedNodes,
                  error: null,
                  // Use output from backend buffer
                  output: restoredOutput,
                  startedAt: exec.startedAt ? new Date(exec.startedAt) : null,
                  finishedAt: null,
                  // Preserve existing child executions
                  childExecutions: existingState?.childExecutions || {},
                };
              }
            }

            console.log(
              '[useWorkflowExecution] Restored running executions with output:',
              Object.keys(runningExecutions)
            );
            return newStates;
          });
        }
      } catch (error) {
        console.error('[useWorkflowExecution] Failed to restore executions:', error);
      }
    };

    restoreExecutions();
  }, []);

  /** Get execution state for a specific workflow */
  const getExecutionState = useCallback(
    (workflowId: string): WorkflowExecutionState => {
      return executions[workflowId] || initialState;
    },
    [executions]
  );

  /** Update execution state for a workflow */
  const updateExecution = useCallback(
    (workflowId: string, updates: Partial<WorkflowExecutionState>) => {
      setExecutions((prev) => ({
        ...prev,
        [workflowId]: {
          ...(prev[workflowId] || initialState),
          ...updates,
        },
      }));
    },
    []
  );

  /** Start workflow execution */
  const executeWorkflow = useCallback(
    async (workflowId: string, totalNodes: number) => {
      // Set starting state
      updateExecution(workflowId, {
        executionId: null,
        status: 'starting',
        currentNode: null,
        progress: 0,
        totalNodes,
        completedNodes: 0,
        error: null,
        output: [],
        startedAt: new Date(),
        finishedAt: null,
        childExecutions: {},
      });

      try {
        const executionId = await workflowAPI.executeWorkflow(workflowId);
        // Only update to 'running' if not already in a terminal state
        // This prevents race condition where execution completes before this Promise resolves
        setExecutions((prev) => {
          const currentState = prev[workflowId];
          // If already completed/failed/cancelled, don't override with 'running'
          if (
            currentState &&
            (currentState.status === 'completed' ||
              currentState.status === 'failed' ||
              currentState.status === 'cancelled')
          ) {
            return prev;
          }
          return {
            ...prev,
            [workflowId]: {
              ...(prev[workflowId] || initialState),
              executionId,
              status: 'running',
            },
          };
        });
        return { success: true as const, executionId };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        updateExecution(workflowId, {
          status: 'failed',
          error: errorMessage,
          finishedAt: new Date(),
        });
        return { success: false as const, error: errorMessage };
      }
    },
    [updateExecution]
  );

  /** Cancel workflow execution */
  const cancelExecution = useCallback(
    async (workflowId: string) => {
      const state = executions[workflowId];
      if (!state?.executionId) return { success: false as const, error: 'No active execution' };

      try {
        await workflowAPI.cancelExecution(state.executionId);
        updateExecution(workflowId, {
          status: 'cancelled',
          finishedAt: new Date(),
        });
        return { success: true as const };
      } catch (error) {
        return { success: false as const, error: String(error) };
      }
    },
    [executions, updateExecution]
  );

  /** Clear execution state for a workflow */
  const clearExecution = useCallback((workflowId: string) => {
    setExecutions((prev) => {
      const newState = { ...prev };
      delete newState[workflowId];
      return newState;
    });
  }, []);

  /** Check if a workflow is currently executing */
  const isExecuting = useCallback(
    (workflowId: string) => {
      const state = executions[workflowId];
      return state?.status === 'starting' || state?.status === 'running';
    },
    [executions]
  );

  useEffect(() => {
    if (isSubscribedRef.current) {
      return;
    }

    let isMounted = true;

    const setupListeners = async () => {
      isSubscribedRef.current = true;

      // Node started event - add system message with node info
      const unlistenNodeStarted = await tauriEvents.onWorkflowNodeStarted(
        (payload: NodeStartedPayload) => {
          if (!isMounted) return;
          setExecutions((prev) => {
            // Use workflowId from payload directly (fixes output mixing between workflows)
            const workflowId = payload.workflowId;
            if (!workflowId || !prev[workflowId]) return prev;

            // If workflow is 'starting' but executionId is null, update its executionId
            const needsExecutionIdUpdate =
              prev[workflowId].status === 'starting' && prev[workflowId].executionId === null;

            // Determine node type from payload
            const nodeType =
              payload.nodeType === 'trigger-workflow' ? 'trigger-workflow' : 'script';

            // Create a system message for node start
            // Feature 013: Use target workflow name for trigger-workflow nodes
            const displayName =
              nodeType === 'trigger-workflow' && payload.targetWorkflowName
                ? payload.targetWorkflowName
                : payload.nodeName;
            const startLine: OutputLine = {
              id: `node-start-${++outputIdCounter.current}`,
              nodeId: payload.nodeId,
              nodeName: payload.nodeName,
              nodeType,
              content:
                nodeType === 'trigger-workflow'
                  ? `>> Triggering workflow: ${displayName}`
                  : `> Starting: ${payload.nodeName}`,
              stream: 'system',
              timestamp: new Date(),
            };

            const currentOutput = prev[workflowId].output || [];
            const newOutput = [...currentOutput, startLine].slice(-maxOutputLines);

            return {
              ...prev,
              [workflowId]: {
                ...prev[workflowId],
                // Update executionId and status if this was a 'starting' workflow
                ...(needsExecutionIdUpdate
                  ? { executionId: payload.executionId, status: 'running' as const }
                  : {}),
                currentNode: {
                  id: payload.nodeId,
                  name: payload.nodeName,
                },
                output: newOutput,
              },
            };
          });
        }
      );

      // If unmounted during setup, clean up immediately
      if (!isMounted) {
        unlistenNodeStarted();
        return;
      }

      // Output event - inherit node metadata from the last system message for this node
      const unlistenOutput = await tauriEvents.onWorkflowOutput(
        (payload: ExecutionOutputPayload) => {
          if (!isMounted) return;
          setExecutions((prev) => {
            // Use workflowId from payload directly (fixes output mixing between workflows)
            const workflowId = payload.workflowId;
            if (!workflowId || !prev[workflowId]) return prev;

            const currentOutput = prev[workflowId].output || [];

            // Find the last system message for this nodeId to get metadata
            const nodeSystemLine = [...currentOutput]
              .reverse()
              .find(
                (line) =>
                  line.nodeId === payload.nodeId && line.stream === 'system' && line.nodeName
              );

            const newLine: OutputLine = {
              id: `output-${++outputIdCounter.current}`,
              nodeId: payload.nodeId,
              nodeName: nodeSystemLine?.nodeName,
              nodeType: nodeSystemLine?.nodeType,
              content: payload.output,
              stream: payload.stream,
              timestamp: new Date(payload.timestamp),
            };

            const newOutput = [...currentOutput, newLine].slice(-maxOutputLines);

            return {
              ...prev,
              [workflowId]: {
                ...prev[workflowId],
                output: newOutput,
              },
            };
          });
        }
      );

      if (!isMounted) {
        unlistenNodeStarted();
        unlistenOutput();
        return;
      }

      // Node completed event - add completion message with status
      const unlistenNodeCompleted = await tauriEvents.onWorkflowNodeCompleted(
        (payload: NodeCompletedPayload) => {
          if (!isMounted) return;
          setExecutions((prev) => {
            // Use workflowId from payload directly (fixes output mixing between workflows)
            const workflowId = payload.workflowId;
            if (!workflowId || !prev[workflowId]) return prev;

            const state = prev[workflowId];
            const newCompletedNodes = state.completedNodes + 1;
            const progress =
              state.totalNodes > 0 ? Math.round((newCompletedNodes / state.totalNodes) * 100) : 0;

            // Find the node metadata from output
            const currentOutput = state.output || [];
            const nodeSystemLine = [...currentOutput]
              .reverse()
              .find(
                (line) =>
                  line.nodeId === payload.nodeId && line.stream === 'system' && line.nodeName
              );

            // Create completion message based on status
            let completionContent: string;
            if (payload.status === 'completed') {
              completionContent = `[OK] Node completed${payload.exitCode !== undefined ? ` (exit code: ${payload.exitCode})` : ''}`;
            } else if (payload.status === 'cancelled') {
              completionContent = `[CANCELLED] Node cancelled${payload.errorMessage ? `: ${payload.errorMessage}` : ''}`;
            } else {
              completionContent = `[FAIL] Node failed${payload.exitCode !== undefined ? ` (exit code: ${payload.exitCode})` : ''}${payload.errorMessage ? `: ${payload.errorMessage}` : ''}`;
            }

            const completionLine: OutputLine = {
              id: `node-complete-${++outputIdCounter.current}`,
              nodeId: payload.nodeId,
              nodeName: nodeSystemLine?.nodeName,
              nodeType: nodeSystemLine?.nodeType,
              content: completionContent,
              stream: 'system',
              timestamp: new Date(payload.finishedAt),
            };

            const newOutput = [...currentOutput, completionLine].slice(-maxOutputLines);

            return {
              ...prev,
              [workflowId]: {
                ...state,
                completedNodes: newCompletedNodes,
                progress,
                currentNode: null,
                output: newOutput,
              },
            };
          });
        }
      );

      if (!isMounted) {
        unlistenNodeStarted();
        unlistenOutput();
        unlistenNodeCompleted();
        return;
      }

      // Execution completed event
      const unlistenCompleted = await tauriEvents.onWorkflowCompleted(
        (payload: ExecutionCompletedPayload) => {
          if (!isMounted) return;
          setExecutions((prev) => {
            const workflowId = payload.workflowId;
            const state = prev[workflowId];
            if (!state) return prev;

            const finalStatus =
              payload.status === 'completed'
                ? 'completed'
                : payload.status === 'cancelled'
                  ? 'cancelled'
                  : 'failed';

            // Call onComplete callback
            if (onCompleteRef.current) {
              setTimeout(() => onCompleteRef.current?.(finalStatus), 0);
            }

            // Save execution history (async, fire and forget)
            const startedAt = state.startedAt?.toISOString() || new Date().toISOString();
            const finishedAt = payload.finishedAt;
            const durationMs = new Date(finishedAt).getTime() - new Date(startedAt).getTime();

            const historyItem = {
              id: state.executionId || `exec-${Date.now()}`,
              workflowId: payload.workflowId,
              workflowName: workflowId, // Will be resolved by backend or UI
              status: finalStatus,
              startedAt,
              finishedAt,
              durationMs: Math.max(0, durationMs),
              nodeCount: state.totalNodes,
              completedNodeCount: state.completedNodes,
              errorMessage: state.error || undefined,
              output: state.output.map((line) => ({
                nodeId: line.nodeId,
                nodeName: line.nodeName || '',
                content: line.content,
                stream: line.stream,
                timestamp:
                  line.timestamp instanceof Date ? line.timestamp.toISOString() : line.timestamp,
              })),
              triggeredBy: 'manual' as const,
            };

            // Save to backend (fire and forget)
            workflowAPI.saveExecutionHistory(historyItem).catch((err) => {
              console.error('[useWorkflowExecution] Failed to save execution history:', err);
            });

            return {
              ...prev,
              [workflowId]: {
                ...state,
                status: finalStatus,
                progress: finalStatus === 'completed' ? 100 : state.progress,
                currentNode: null,
                finishedAt: new Date(payload.finishedAt),
              },
            };
          });
        }
      );

      if (!isMounted) {
        unlistenNodeStarted();
        unlistenOutput();
        unlistenNodeCompleted();
        unlistenCompleted();
        return;
      }

      // Feature 013: Child execution started event
      const unlistenChildStarted = await tauriEvents.onChildExecutionStarted(
        (payload: ChildExecutionStartedPayload) => {
          if (!isMounted) return;
          setExecutions((prev) => {
            // Find workflow by parent execution ID
            const workflowId = Object.keys(prev).find(
              (id) => prev[id].executionId === payload.parentExecutionId
            );
            if (!workflowId) return prev;

            const state = prev[workflowId];
            const newChildState: ChildExecutionState = {
              childExecutionId: payload.childExecutionId,
              childWorkflowId: payload.childWorkflowId,
              childWorkflowName: payload.childWorkflowName,
              status: 'running',
              currentStep: 0,
              totalSteps: 0,
              startedAt: new Date(payload.startedAt),
            };

            return {
              ...prev,
              [workflowId]: {
                ...state,
                childExecutions: {
                  ...state.childExecutions,
                  [payload.parentNodeId]: newChildState,
                },
              },
            };
          });
        }
      );

      if (!isMounted) {
        unlistenNodeStarted();
        unlistenOutput();
        unlistenNodeCompleted();
        unlistenCompleted();
        unlistenChildStarted();
        return;
      }

      // Feature 013: Child execution progress event
      const unlistenChildProgress = await tauriEvents.onChildExecutionProgress(
        (payload: ChildExecutionProgressPayload) => {
          if (!isMounted) return;
          setExecutions((prev) => {
            const workflowId = Object.keys(prev).find(
              (id) => prev[id].executionId === payload.parentExecutionId
            );
            if (!workflowId) return prev;

            const state = prev[workflowId];
            const existingChild = state.childExecutions[payload.parentNodeId];
            if (!existingChild) return prev;

            return {
              ...prev,
              [workflowId]: {
                ...state,
                childExecutions: {
                  ...state.childExecutions,
                  [payload.parentNodeId]: {
                    ...existingChild,
                    currentStep: payload.currentStep,
                    totalSteps: payload.totalSteps,
                    currentNodeName: payload.currentNodeName,
                  },
                },
              },
            };
          });
        }
      );

      if (!isMounted) {
        unlistenNodeStarted();
        unlistenOutput();
        unlistenNodeCompleted();
        unlistenCompleted();
        unlistenChildStarted();
        unlistenChildProgress();
        return;
      }

      // Feature 013: Child execution completed event
      const unlistenChildCompleted = await tauriEvents.onChildExecutionCompleted(
        (payload: ChildExecutionCompletedPayload) => {
          if (!isMounted) return;
          setExecutions((prev) => {
            const workflowId = Object.keys(prev).find(
              (id) => prev[id].executionId === payload.parentExecutionId
            );
            if (!workflowId) return prev;

            const state = prev[workflowId];
            const existingChild = state.childExecutions[payload.parentNodeId];
            if (!existingChild) return prev;

            return {
              ...prev,
              [workflowId]: {
                ...state,
                childExecutions: {
                  ...state.childExecutions,
                  [payload.parentNodeId]: {
                    ...existingChild,
                    status: payload.status,
                    durationMs: payload.durationMs,
                    errorMessage: payload.errorMessage,
                    finishedAt: new Date(payload.finishedAt),
                  },
                },
              },
            };
          });
        }
      );

      if (!isMounted) {
        unlistenNodeStarted();
        unlistenOutput();
        unlistenNodeCompleted();
        unlistenCompleted();
        unlistenChildStarted();
        unlistenChildProgress();
        unlistenChildCompleted();
        return;
      }

      listenersRef.current = [
        unlistenNodeStarted,
        unlistenOutput,
        unlistenNodeCompleted,
        unlistenCompleted,
        unlistenChildStarted,
        unlistenChildProgress,
        unlistenChildCompleted,
      ];
    };

    setupListeners();

    return () => {
      isMounted = false;
      listenersRef.current.forEach((unlisten) => unlisten());
      listenersRef.current = [];
      isSubscribedRef.current = false;
    };
  }, [maxOutputLines]); // Removed onComplete from deps - using ref instead

  return {
    executions,
    getExecutionState,
    executeWorkflow,
    cancelExecution,
    clearExecution,
    isExecuting,
  };
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(startedAt: Date | null, finishedAt: Date | null): string {
  if (!startedAt) return '';

  const end = finishedAt || new Date();
  const durationMs = end.getTime() - startedAt.getTime();

  if (durationMs < 1000) {
    return `${durationMs}ms`;
  } else if (durationMs < 60000) {
    return `${(durationMs / 1000).toFixed(1)}s`;
  } else {
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }
}
