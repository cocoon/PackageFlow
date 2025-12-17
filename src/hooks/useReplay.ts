// Execution Replay Hook
// Manages replay preparation and execution state

import { useState, useCallback } from 'react';
import { snapshotAPI } from '../lib/tauri-api';
import type {
  ReplayPreparation,
  ReplayResult,
  ReplayOption,
  ExecuteReplayRequest,
} from '../types/snapshot';

export interface ReplayState {
  isPreparing: boolean;
  isExecuting: boolean;
  preparation: ReplayPreparation | null;
  result: ReplayResult | null;
  error: string | null;
}

export function useReplay() {
  const [state, setState] = useState<ReplayState>({
    isPreparing: false,
    isExecuting: false,
    preparation: null,
    result: null,
    error: null,
  });

  const prepareReplay = useCallback(
    async (snapshotId: string): Promise<ReplayPreparation | null> => {
      setState((prev) => ({
        ...prev,
        isPreparing: true,
        error: null,
        preparation: null,
        result: null,
      }));

      try {
        const preparation = await snapshotAPI.prepareReplay(snapshotId);
        setState((prev) => ({
          ...prev,
          isPreparing: false,
          preparation,
        }));
        return preparation;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setState((prev) => ({
          ...prev,
          isPreparing: false,
          error: errorMessage,
        }));
        return null;
      }
    },
    []
  );

  const executeReplay = useCallback(
    async (
      snapshotId: string,
      option: ReplayOption,
      force = false
    ): Promise<ReplayResult | null> => {
      setState((prev) => ({
        ...prev,
        isExecuting: true,
        error: null,
        result: null,
      }));

      try {
        const request: ExecuteReplayRequest = {
          snapshotId,
          option,
          force,
        };
        const result = await snapshotAPI.executeReplay(request);
        setState((prev) => ({
          ...prev,
          isExecuting: false,
          result,
        }));
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setState((prev) => ({
          ...prev,
          isExecuting: false,
          error: errorMessage,
        }));
        return null;
      }
    },
    []
  );

  const restoreLockfile = useCallback(
    async (snapshotId: string): Promise<boolean> => {
      setState((prev) => ({
        ...prev,
        isExecuting: true,
        error: null,
      }));

      try {
        const success = await snapshotAPI.restoreLockfile(snapshotId);
        setState((prev) => ({
          ...prev,
          isExecuting: false,
        }));
        return success;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setState((prev) => ({
          ...prev,
          isExecuting: false,
          error: errorMessage,
        }));
        return false;
      }
    },
    []
  );

  const reset = useCallback(() => {
    setState({
      isPreparing: false,
      isExecuting: false,
      preparation: null,
      result: null,
      error: null,
    });
  }, []);

  return {
    ...state,
    prepareReplay,
    executeReplay,
    restoreLockfile,
    reset,
  };
}
