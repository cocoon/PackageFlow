// Security Insights Hook
// Manages security dashboard state for a project

import { useState, useCallback } from 'react';
import { snapshotAPI } from '../lib/tauri-api';
import type { ProjectSecurityOverview } from '../types/snapshot';

export interface SecurityInsightsState {
  isLoading: boolean;
  overview: ProjectSecurityOverview | null;
  error: string | null;
  lastLoadedAt: Date | null;
}

export function useSecurityInsights() {
  const [state, setState] = useState<SecurityInsightsState>({
    isLoading: false,
    overview: null,
    error: null,
    lastLoadedAt: null,
  });

  const loadOverview = useCallback(
    async (projectPath: string): Promise<ProjectSecurityOverview | null> => {
      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

      try {
        const overview = await snapshotAPI.getProjectSecurityOverview(projectPath);
        setState({
          isLoading: false,
          overview,
          error: null,
          lastLoadedAt: new Date(),
        });
        return overview;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
        return null;
      }
    },
    []
  );

  const refresh = useCallback(
    async (projectPath: string) => {
      return loadOverview(projectPath);
    },
    [loadOverview]
  );

  const clear = useCallback(() => {
    setState({
      isLoading: false,
      overview: null,
      error: null,
      lastLoadedAt: null,
    });
  }, []);

  return {
    ...state,
    loadOverview,
    refresh,
    clear,
  };
}
