/**
 * Child Execution State Management Hook
 * Feature 013: Workflow Trigger Workflow
 * Tracks child workflow execution status and progress for trigger-workflow nodes
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  tauriEvents,
  type ChildExecutionStartedPayload,
  type ChildExecutionProgressPayload,
  type ChildExecutionCompletedPayload,
  type UnlistenFn,
} from '../lib/tauri-api';

/** Child execution state for a single trigger-workflow node */
export interface ChildExecutionState {
  /** Child execution ID */
  childExecutionId: string;
  /** Child workflow ID */
  childWorkflowId: string;
  /** Child workflow name */
  childWorkflowName: string;
  /** Execution status */
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  /** Current step index (0-based) */
  currentStep: number;
  /** Total steps in child workflow */
  totalSteps: number;
  /** Current node being executed */
  currentNodeName?: string;
  /** Duration in milliseconds (when completed) */
  durationMs?: number;
  /** Error message (when failed) */
  errorMessage?: string;
  /** Start time */
  startedAt: Date;
  /** End time (when completed) */
  finishedAt?: Date;
}

/** Map of parentNodeId -> child execution state */
export type ChildExecutionMap = Record<string, ChildExecutionState>;

/** Map of parentExecutionId -> child execution map */
export type ExecutionChildrenMap = Record<string, ChildExecutionMap>;

interface UseChildExecutionOptions {
  /** Callback when child execution starts */
  onChildStarted?: (parentNodeId: string, state: ChildExecutionState) => void;
  /** Callback when child execution progresses */
  onChildProgress?: (parentNodeId: string, state: ChildExecutionState) => void;
  /** Callback when child execution completes */
  onChildCompleted?: (parentNodeId: string, state: ChildExecutionState) => void;
}

/**
 * Hook to manage child workflow execution state
 * Tracks child executions for trigger-workflow nodes
 */
export function useChildExecution(options: UseChildExecutionOptions = {}) {
  const { onChildStarted, onChildProgress, onChildCompleted } = options;

  // Map of parentExecutionId -> (parentNodeId -> child execution state)
  const [childExecutions, setChildExecutions] = useState<ExecutionChildrenMap>({});

  // Track active listeners
  const listenersRef = useRef<UnlistenFn[]>([]);
  const isSubscribedRef = useRef(false);

  // Keep callbacks in refs to avoid re-subscribing
  const onChildStartedRef = useRef(onChildStarted);
  const onChildProgressRef = useRef(onChildProgress);
  const onChildCompletedRef = useRef(onChildCompleted);

  useEffect(() => {
    onChildStartedRef.current = onChildStarted;
    onChildProgressRef.current = onChildProgress;
    onChildCompletedRef.current = onChildCompleted;
  }, [onChildStarted, onChildProgress, onChildCompleted]);

  /** Get child execution state for a specific node */
  const getChildExecutionState = useCallback(
    (parentExecutionId: string, parentNodeId: string): ChildExecutionState | null => {
      return childExecutions[parentExecutionId]?.[parentNodeId] || null;
    },
    [childExecutions]
  );

  /** Get all child executions for a parent execution */
  const getChildExecutions = useCallback(
    (parentExecutionId: string): ChildExecutionMap => {
      return childExecutions[parentExecutionId] || {};
    },
    [childExecutions]
  );

  /** Check if any child is currently running for a parent execution */
  const hasRunningChildren = useCallback(
    (parentExecutionId: string): boolean => {
      const children = childExecutions[parentExecutionId];
      if (!children) return false;
      return Object.values(children).some((child) => child.status === 'running');
    },
    [childExecutions]
  );

  /** Clear child execution state for a parent execution */
  const clearChildExecutions = useCallback((parentExecutionId: string) => {
    setChildExecutions((prev) => {
      const newState = { ...prev };
      delete newState[parentExecutionId];
      return newState;
    });
  }, []);

  /** Clear all child execution state */
  const clearAll = useCallback(() => {
    setChildExecutions({});
  }, []);

  // Set up event listeners
  useEffect(() => {
    if (isSubscribedRef.current) {
      return;
    }

    let isMounted = true;

    const setupListeners = async () => {
      isSubscribedRef.current = true;

      // Child execution started event
      const unlistenStarted = await tauriEvents.onChildExecutionStarted(
        (payload: ChildExecutionStartedPayload) => {
          if (!isMounted) return;

          const newState: ChildExecutionState = {
            childExecutionId: payload.childExecutionId,
            childWorkflowId: payload.childWorkflowId,
            childWorkflowName: payload.childWorkflowName,
            status: 'running',
            currentStep: 0,
            totalSteps: 0,
            startedAt: new Date(payload.startedAt),
          };

          setChildExecutions((prev) => ({
            ...prev,
            [payload.parentExecutionId]: {
              ...(prev[payload.parentExecutionId] || {}),
              [payload.parentNodeId]: newState,
            },
          }));

          onChildStartedRef.current?.(payload.parentNodeId, newState);
        }
      );

      if (!isMounted) {
        unlistenStarted();
        return;
      }

      // Child execution progress event
      const unlistenProgress = await tauriEvents.onChildExecutionProgress(
        (payload: ChildExecutionProgressPayload) => {
          if (!isMounted) return;

          setChildExecutions((prev) => {
            const parentChildren = prev[payload.parentExecutionId];
            if (!parentChildren) return prev;

            const existing = parentChildren[payload.parentNodeId];
            if (!existing) return prev;

            const updatedState: ChildExecutionState = {
              ...existing,
              currentStep: payload.currentStep,
              totalSteps: payload.totalSteps,
              currentNodeName: payload.currentNodeName,
            };

            onChildProgressRef.current?.(payload.parentNodeId, updatedState);

            return {
              ...prev,
              [payload.parentExecutionId]: {
                ...parentChildren,
                [payload.parentNodeId]: updatedState,
              },
            };
          });
        }
      );

      if (!isMounted) {
        unlistenStarted();
        unlistenProgress();
        return;
      }

      // Child execution completed event
      const unlistenCompleted = await tauriEvents.onChildExecutionCompleted(
        (payload: ChildExecutionCompletedPayload) => {
          if (!isMounted) return;

          setChildExecutions((prev) => {
            const parentChildren = prev[payload.parentExecutionId];
            if (!parentChildren) return prev;

            const existing = parentChildren[payload.parentNodeId];
            if (!existing) return prev;

            const updatedState: ChildExecutionState = {
              ...existing,
              status: payload.status,
              durationMs: payload.durationMs,
              errorMessage: payload.errorMessage,
              finishedAt: new Date(payload.finishedAt),
            };

            onChildCompletedRef.current?.(payload.parentNodeId, updatedState);

            return {
              ...prev,
              [payload.parentExecutionId]: {
                ...parentChildren,
                [payload.parentNodeId]: updatedState,
              },
            };
          });
        }
      );

      if (!isMounted) {
        unlistenStarted();
        unlistenProgress();
        unlistenCompleted();
        return;
      }

      listenersRef.current = [unlistenStarted, unlistenProgress, unlistenCompleted];
    };

    setupListeners();

    return () => {
      isMounted = false;
      listenersRef.current.forEach((unlisten) => unlisten());
      listenersRef.current = [];
      isSubscribedRef.current = false;
    };
  }, []);

  return {
    childExecutions,
    getChildExecutionState,
    getChildExecutions,
    hasRunningChildren,
    clearChildExecutions,
    clearAll,
  };
}

/**
 * Format child execution progress as a string
 */
export function formatChildProgress(state: ChildExecutionState): string {
  if (state.status !== 'running') {
    return state.status.charAt(0).toUpperCase() + state.status.slice(1);
  }

  if (state.totalSteps === 0) {
    return 'Starting...';
  }

  const progress = Math.round(((state.currentStep + 1) / state.totalSteps) * 100);
  return `Step ${state.currentStep + 1}/${state.totalSteps} (${progress}%)`;
}

/**
 * Format child execution duration
 */
export function formatChildDuration(durationMs?: number): string {
  if (!durationMs) return '';

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
