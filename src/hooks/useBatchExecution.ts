/**
 * useBatchExecution Hook
 * Feature: 008-monorepo-support
 *
 * Hook for managing batch script execution across multiple packages.
 */

import { useState, useCallback, useEffect } from 'react';
import { monorepoAPI, monorepoEvents } from '../lib/tauri-api';
import type {
  MonorepoToolType,
  BatchExecutionResult,
  BatchProgressPayload,
  BatchCompletedPayload,
} from '../types/monorepo';

export interface BatchExecution {
  executionId: string;
  script: string;
  packages: string[];
  tool: MonorepoToolType;
  status: 'running' | 'completed' | 'failed';
  progress: {
    total: number;
    completed: number;
    running: string[];
  };
  results: BatchExecutionResult[];
  startedAt: Date;
  duration?: number;
}

export interface UseBatchExecutionState {
  /** Whether a batch is currently running */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Current batch execution */
  currentExecution: BatchExecution | null;
  /** History of completed executions */
  executionHistory: BatchExecution[];
}

export interface UseBatchExecutionActions {
  /** Run a script across multiple packages */
  runBatch: (
    script: string,
    packages: string[],
    options?: { parallel?: boolean; stopOnError?: boolean }
  ) => Promise<void>;
  /** Clear error */
  clearError: () => void;
  /** Clear execution history */
  clearHistory: () => void;
}

export type UseBatchExecutionReturn = UseBatchExecutionState & UseBatchExecutionActions;

/**
 * Hook for batch script execution
 *
 * @param projectPath - The path to the project
 * @param tool - The monorepo tool type
 * @returns State and actions for batch execution
 */
export function useBatchExecution(
  projectPath: string | null,
  tool: MonorepoToolType | null
): UseBatchExecutionReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentExecution, setCurrentExecution] = useState<BatchExecution | null>(null);
  const [executionHistory, setExecutionHistory] = useState<BatchExecution[]>([]);

  // Listen for batch progress events
  useEffect(() => {
    let unsubscribeProgress: (() => void) | null = null;
    let unsubscribeCompleted: (() => void) | null = null;

    const setupListeners = async () => {
      unsubscribeProgress = await monorepoEvents.onBatchProgress(
        (payload: BatchProgressPayload) => {
          setCurrentExecution((prev) => {
            if (prev && prev.executionId === payload.executionId) {
              return {
                ...prev,
                progress: {
                  total: payload.total,
                  completed: payload.completed,
                  running: payload.running,
                },
                results: payload.results,
              };
            }
            return prev;
          });
        }
      );

      unsubscribeCompleted = await monorepoEvents.onBatchCompleted(
        (payload: BatchCompletedPayload) => {
          setCurrentExecution((prev) => {
            if (prev && prev.executionId === payload.executionId) {
              const completedExecution: BatchExecution = {
                ...prev,
                status: payload.success ? 'completed' : 'failed',
                progress: {
                  total: payload.results.length,
                  completed: payload.results.length,
                  running: [],
                },
                results: payload.results,
                duration: payload.duration,
              };

              // Add to history - use setTimeout to avoid nested state updates
              setTimeout(() => {
                setExecutionHistory((history) => {
                  // Check if already exists to prevent duplicates
                  if (history.some((h) => h.executionId === payload.executionId)) {
                    return history;
                  }
                  return [completedExecution, ...history].slice(0, 10);
                });
                setLoading(false);
              }, 0);

              return null;
            }
            return prev;
          });
        }
      );
    };

    setupListeners();

    return () => {
      if (unsubscribeProgress) unsubscribeProgress();
      if (unsubscribeCompleted) unsubscribeCompleted();
    };
  }, []);

  // Run batch
  const runBatch = useCallback(
    async (
      script: string,
      packages: string[],
      options?: { parallel?: boolean; stopOnError?: boolean }
    ) => {
      if (!projectPath || !tool || tool === 'unknown') {
        setError('No valid monorepo tool detected');
        return;
      }

      if (packages.length === 0) {
        setError('No packages selected');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await monorepoAPI.runBatchScripts({
          projectPath,
          packages,
          script,
          tool,
          parallel: options?.parallel ?? true,
          stopOnError: options?.stopOnError ?? false,
        });

        if (response.success && response.executionId) {
          setCurrentExecution({
            executionId: response.executionId,
            script,
            packages,
            tool,
            status: 'running',
            progress: {
              total: packages.length,
              completed: 0,
              running: packages,
            },
            results: [],
            startedAt: new Date(),
          });
        } else {
          setError(response.error || 'Failed to start batch execution');
          setLoading(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    },
    [projectPath, tool]
  );

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Clear history
  const clearHistory = useCallback(() => {
    setExecutionHistory([]);
  }, []);

  return {
    // State
    loading,
    error,
    currentExecution,
    executionHistory,
    // Actions
    runBatch,
    clearError,
    clearHistory,
  };
}

export default useBatchExecution;
