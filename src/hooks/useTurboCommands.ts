/**
 * useTurboCommands Hook
 * Feature: 008-monorepo-support
 *
 * Hook for managing Turborepo command execution.
 */

import { useState, useCallback, useEffect } from 'react';
import {
  monorepoAPI,
  tauriEvents,
  type ScriptOutputPayload,
  type ScriptCompletedPayload,
} from '../lib/tauri-api';
import type { TurboPipeline, RunTurboCommandParams } from '../types/monorepo';
import { useDebouncedOutput } from './useDebouncedOutput';

export interface TurboCommandExecution {
  executionId: string;
  task: string;
  filter?: string[];
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  output: string;
  exitCode?: number;
  startedAt: Date;
  cached?: boolean;
}

export interface UseTurboCommandsState {
  /** Whether pipelines are being loaded */
  loading: boolean;
  /** Error message if loading failed */
  error: string | null;
  /** Available Turbo pipelines */
  pipelines: TurboPipeline[];
  /** Currently running executions */
  executions: Map<string, TurboCommandExecution>;
}

export interface UseTurboCommandsActions {
  /** Refresh pipelines from turbo.json */
  refreshPipelines: () => Promise<void>;
  /** Run a Turbo task */
  runTask: (
    task: string,
    options?: { filter?: string[]; force?: boolean }
  ) => Promise<string | null>;
  /** Dry run a Turbo task */
  dryRun: (task: string, filter?: string[]) => Promise<string | null>;
  /** Cancel a running execution */
  cancelExecution: (executionId: string) => void;
  /** Clear completed executions */
  clearCompleted: () => void;
}

export type UseTurboCommandsReturn = UseTurboCommandsState & UseTurboCommandsActions;

/**
 * Hook for Turborepo command management
 *
 * @param projectPath - The path to the Turbo workspace
 * @returns State and actions for Turbo command execution
 */
export function useTurboCommands(projectPath: string | null): UseTurboCommandsReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pipelines, setPipelines] = useState<TurboPipeline[]>([]);
  const [executions, setExecutions] = useState<Map<string, TurboCommandExecution>>(new Map());

  // Load pipelines
  const refreshPipelines = useCallback(async () => {
    if (!projectPath) {
      setPipelines([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await monorepoAPI.getTurboPipelines(projectPath);
      if (response.success && response.pipelines) {
        setPipelines(response.pipelines);
      } else {
        setError(response.error || 'Failed to load Turbo pipelines');
        setPipelines([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setPipelines([]);
    } finally {
      setLoading(false);
    }
  }, [projectPath]);

  // Load pipelines when project changes
  useEffect(() => {
    refreshPipelines();
  }, [refreshPipelines]);

  // Debounced output handler for performance
  const { bufferOutput, flush: flushOutput } = useDebouncedOutput(
    useCallback((outputs) => {
      setExecutions((prev) => {
        const updated = new Map(prev);
        let hasChanges = false;

        for (const [executionId, output] of Object.entries(outputs)) {
          const execution = prev.get(executionId);
          if (execution) {
            const newOutput = execution.output + output;

            // Check for cache status in output
            let cached = execution.cached;
            if (newOutput.includes('FULL TURBO')) {
              cached = true;
            } else if (newOutput.includes('cache miss') || newOutput.includes('cache bypass')) {
              cached = false;
            }

            updated.set(executionId, {
              ...execution,
              output: newOutput,
              cached,
            });
            hasChanges = true;
          }
        }

        return hasChanges ? updated : prev;
      });
    }, []),
    { delay: 100, maxBufferSize: 32 * 1024 }
  );

  // Listen for script output and completion events
  useEffect(() => {
    const handleOutput = (data: ScriptOutputPayload) => {
      bufferOutput(data.executionId, data.output);
    };

    const handleCompleted = (data: ScriptCompletedPayload) => {
      // Flush any pending output before marking complete
      flushOutput();

      setExecutions((prev) => {
        const execution = prev.get(data.executionId);
        if (execution) {
          const updated = new Map(prev);
          updated.set(data.executionId, {
            ...execution,
            status: data.success ? 'completed' : 'failed',
            exitCode: data.exitCode,
          });
          return updated;
        }
        return prev;
      });
    };

    const unlistenOutput = tauriEvents.onScriptOutput(handleOutput);
    const unlistenCompleted = tauriEvents.onScriptCompleted(handleCompleted);

    return () => {
      unlistenOutput.then((unlisten) => unlisten());
      unlistenCompleted.then((unlisten) => unlisten());
    };
  }, [bufferOutput, flushOutput]);

  // Run a task
  const runTask = useCallback(
    async (
      task: string,
      options?: { filter?: string[]; force?: boolean }
    ): Promise<string | null> => {
      if (!projectPath) return null;

      const params: RunTurboCommandParams = {
        projectPath,
        task,
        filter: options?.filter,
        force: options?.force,
      };

      try {
        const response = await monorepoAPI.runTurboCommand(params);
        if (response.success && response.executionId) {
          setExecutions((prev) => {
            const updated = new Map(prev);
            updated.set(response.executionId!, {
              executionId: response.executionId!,
              task,
              filter: options?.filter,
              status: 'running',
              output: '',
              startedAt: new Date(),
            });
            return updated;
          });
          return response.executionId;
        }
        return null;
      } catch {
        return null;
      }
    },
    [projectPath]
  );

  // Dry run
  const dryRun = useCallback(
    async (task: string, filter?: string[]): Promise<string | null> => {
      if (!projectPath) return null;

      const params: RunTurboCommandParams = {
        projectPath,
        task,
        filter,
        dryRun: true,
      };

      try {
        const response = await monorepoAPI.runTurboCommand(params);
        if (response.success && response.executionId) {
          setExecutions((prev) => {
            const updated = new Map(prev);
            updated.set(response.executionId!, {
              executionId: response.executionId!,
              task,
              filter,
              status: 'running',
              output: '',
              startedAt: new Date(),
            });
            return updated;
          });
          return response.executionId;
        }
        return null;
      } catch {
        return null;
      }
    },
    [projectPath]
  );

  // Cancel execution
  const cancelExecution = useCallback((executionId: string) => {
    setExecutions((prev) => {
      const execution = prev.get(executionId);
      if (execution && execution.status === 'running') {
        const updated = new Map(prev);
        updated.set(executionId, {
          ...execution,
          status: 'cancelled',
        });
        return updated;
      }
      return prev;
    });
  }, []);

  // Clear completed
  const clearCompleted = useCallback(() => {
    setExecutions((prev) => {
      const updated = new Map(prev);
      for (const [id, execution] of updated) {
        if (execution.status !== 'running') {
          updated.delete(id);
        }
      }
      return updated;
    });
  }, []);

  return {
    // State
    loading,
    error,
    pipelines,
    executions,
    // Actions
    refreshPipelines,
    runTask,
    dryRun,
    cancelExecution,
    clearCompleted,
  };
}

export default useTurboCommands;
