/**
 * useNxCommands Hook
 * Feature: 008-monorepo-support
 *
 * Hook for managing Nx command execution.
 */

import { useState, useCallback, useEffect } from 'react';
import { monorepoAPI, tauriEvents, type ScriptOutputPayload, type ScriptCompletedPayload } from '../lib/tauri-api';
import type { NxTarget, RunNxCommandParams } from '../types/monorepo';
import { useDebouncedOutput } from './useDebouncedOutput';

export interface NxCommandExecution {
  executionId: string;
  target: string;
  project?: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  output: string;
  exitCode?: number;
  startedAt: Date;
}

export interface UseNxCommandsState {
  /** Whether targets are being loaded */
  loading: boolean;
  /** Error message if loading failed */
  error: string | null;
  /** Available Nx targets */
  targets: NxTarget[];
  /** Currently running executions */
  executions: Map<string, NxCommandExecution>;
}

export interface UseNxCommandsActions {
  /** Refresh targets from the project */
  refreshTargets: () => Promise<void>;
  /** Run an Nx target */
  runTarget: (target: string, project?: string) => Promise<string | null>;
  /** Run Nx affected */
  runAffected: (target: string, base?: string) => Promise<string | null>;
  /** Run Nx run-many */
  runMany: (target: string, projects: string[]) => Promise<string | null>;
  /** Cancel a running execution */
  cancelExecution: (executionId: string) => void;
  /** Clear completed executions */
  clearCompleted: () => void;
}

export type UseNxCommandsReturn = UseNxCommandsState & UseNxCommandsActions;

/**
 * Hook for Nx command management
 *
 * @param projectPath - The path to the Nx workspace
 * @returns State and actions for Nx command execution
 */
export function useNxCommands(projectPath: string | null): UseNxCommandsReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targets, setTargets] = useState<NxTarget[]>([]);
  const [executions, setExecutions] = useState<Map<string, NxCommandExecution>>(new Map());

  // Load targets
  const refreshTargets = useCallback(async () => {
    if (!projectPath) {
      setTargets([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await monorepoAPI.getNxTargets(projectPath);
      if (response.success && response.targets) {
        setTargets(response.targets);
      } else {
        setError(response.error || 'Failed to load Nx targets');
        setTargets([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setTargets([]);
    } finally {
      setLoading(false);
    }
  }, [projectPath]);

  // Load targets when project changes
  useEffect(() => {
    refreshTargets();
  }, [refreshTargets]);

  // Debounced output handler for performance
  const { bufferOutput, flush: flushOutput } = useDebouncedOutput(
    useCallback((outputs) => {
      setExecutions((prev) => {
        const updated = new Map(prev);
        let hasChanges = false;

        for (const [executionId, output] of Object.entries(outputs)) {
          const execution = prev.get(executionId);
          if (execution) {
            updated.set(executionId, {
              ...execution,
              output: execution.output + output,
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

  // Run a target
  const runTarget = useCallback(
    async (target: string, project?: string): Promise<string | null> => {
      if (!projectPath) return null;

      const params: RunNxCommandParams = {
        projectPath,
        command: project ? 'run' : 'run-many',
        target,
        project,
      };

      try {
        const response = await monorepoAPI.runNxCommand(params);
        if (response.success && response.executionId) {
          setExecutions((prev) => {
            const updated = new Map(prev);
            updated.set(response.executionId!, {
              executionId: response.executionId!,
              target,
              project,
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

  // Run affected
  const runAffected = useCallback(
    async (target: string, base?: string): Promise<string | null> => {
      if (!projectPath) return null;

      const params: RunNxCommandParams = {
        projectPath,
        command: 'affected',
        target,
        base: base || 'main',
      };

      try {
        const response = await monorepoAPI.runNxCommand(params);
        if (response.success && response.executionId) {
          setExecutions((prev) => {
            const updated = new Map(prev);
            updated.set(response.executionId!, {
              executionId: response.executionId!,
              target,
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

  // Run many
  const runMany = useCallback(
    async (target: string, projects: string[]): Promise<string | null> => {
      if (!projectPath) return null;

      const params: RunNxCommandParams = {
        projectPath,
        command: 'run-many',
        target,
        projects,
      };

      try {
        const response = await monorepoAPI.runNxCommand(params);
        if (response.success && response.executionId) {
          setExecutions((prev) => {
            const updated = new Map(prev);
            updated.set(response.executionId!, {
              executionId: response.executionId!,
              target,
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

  // Cancel execution (mark as cancelled in state)
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

  // Clear completed executions
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
    targets,
    executions,
    // Actions
    refreshTargets,
    runTarget,
    runAffected,
    runMany,
    cancelExecution,
    clearCompleted,
  };
}

export default useNxCommands;
