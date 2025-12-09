/**
 * useMonorepoTool Hook
 * Feature: 008-monorepo-support
 *
 * Hook for detecting and managing monorepo tools in a project.
 * Optimized for performance with lazy version loading.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { monorepoAPI } from '../lib/tauri-api';
import type { MonorepoToolType, MonorepoToolInfo } from '../types/monorepo';

// Version cache per project path to avoid repeated npx calls
const versionCache = new Map<string, Map<string, string | null>>();

export interface UseMonorepoToolState {
  /** Whether the hook is currently loading */
  loading: boolean;
  /** Error message if detection failed */
  error: string | null;
  /** List of detected monorepo tools */
  tools: MonorepoToolInfo[];
  /** Primary/recommended monorepo tool */
  primaryTool: MonorepoToolType | null;
  /** Currently selected tool (defaults to primary) */
  selectedTool: MonorepoToolType | null;
  /** Whether any monorepo tool was detected */
  hasMonorepoTool: boolean;
  /** Cached tool versions (lazy loaded) */
  toolVersions: Map<string, string | null>;
  /** Whether version is being loaded */
  versionLoading: boolean;
}

export interface UseMonorepoToolActions {
  /** Refresh tool detection */
  refresh: () => Promise<void>;
  /** Select a specific tool */
  selectTool: (tool: MonorepoToolType) => void;
  /** Get info for a specific tool */
  getToolInfo: (type: MonorepoToolType) => MonorepoToolInfo | undefined;
  /** Check if a specific tool is available */
  isToolAvailable: (type: MonorepoToolType) => boolean;
  /** Fetch version for a tool (lazy loading) */
  fetchVersion: (toolType: MonorepoToolType) => Promise<string | null>;
}

export type UseMonorepoToolReturn = UseMonorepoToolState & UseMonorepoToolActions;

/**
 * Hook for detecting and managing monorepo tools
 *
 * @param projectPath - The path to the project directory
 * @returns State and actions for monorepo tool management
 */
export function useMonorepoTool(projectPath: string | null): UseMonorepoToolReturn {
  const [loading, setLoading] = useState(false);
  const [versionLoading, setVersionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tools, setTools] = useState<MonorepoToolInfo[]>([]);
  const [primaryTool, setPrimaryTool] = useState<MonorepoToolType | null>(null);
  const [selectedTool, setSelectedTool] = useState<MonorepoToolType | null>(null);
  const [toolVersions, setToolVersions] = useState<Map<string, string | null>>(new Map());

  // Track if version fetch is already in progress
  const versionFetchInProgress = useRef<Set<string>>(new Set());

  // Fast tool detection (no version checks)
  const detectTools = useCallback(async () => {
    if (!projectPath) {
      setTools([]);
      setPrimaryTool(null);
      setSelectedTool(null);
      setToolVersions(new Map());
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await monorepoAPI.detectTools(projectPath);

      if (response.success) {
        setTools(response.tools || []);
        setPrimaryTool(response.primary || null);

        // Always select the primary tool for the current project
        if (response.primary) {
          setSelectedTool(response.primary);
        } else {
          setSelectedTool(null);
        }

        // Load cached versions if available
        const cached = versionCache.get(projectPath);
        if (cached) {
          setToolVersions(new Map(cached));
        } else {
          setToolVersions(new Map());
        }
      } else {
        setError(response.error || 'Failed to detect monorepo tools');
        setTools([]);
        setPrimaryTool(null);
        setSelectedTool(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setTools([]);
      setPrimaryTool(null);
      setSelectedTool(null);
    } finally {
      setLoading(false);
    }
  }, [projectPath]);

  // Detect tools when project path changes
  useEffect(() => {
    detectTools();
  }, [detectTools]);

  // Lazy version fetching
  const fetchVersion = useCallback(async (toolType: MonorepoToolType): Promise<string | null> => {
    if (!projectPath) return null;

    // Skip if already fetched
    const cached = toolVersions.get(toolType);
    if (cached !== undefined) return cached;

    // Skip if fetch already in progress
    if (versionFetchInProgress.current.has(toolType)) return null;

    versionFetchInProgress.current.add(toolType);
    setVersionLoading(true);

    try {
      const version = await monorepoAPI.getToolVersion(projectPath, toolType);

      // Update state
      setToolVersions(prev => {
        const newMap = new Map(prev);
        newMap.set(toolType, version);
        return newMap;
      });

      // Update cache
      if (!versionCache.has(projectPath)) {
        versionCache.set(projectPath, new Map());
      }
      versionCache.get(projectPath)!.set(toolType, version);

      return version;
    } catch {
      return null;
    } finally {
      versionFetchInProgress.current.delete(toolType);
      setVersionLoading(false);
    }
  }, [projectPath, toolVersions]);

  // Auto-fetch version for selected tool (deferred to avoid blocking)
  useEffect(() => {
    if (selectedTool && selectedTool !== 'unknown' && selectedTool !== 'workspaces') {
      // Defer version fetch to next tick to not block rendering
      const timer = setTimeout(() => {
        fetchVersion(selectedTool);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedTool, fetchVersion]);

  const selectTool = useCallback((tool: MonorepoToolType) => {
    setSelectedTool(tool);
  }, []);

  const getToolInfo = useCallback(
    (type: MonorepoToolType): MonorepoToolInfo | undefined => {
      const tool = tools.find((t) => t.type === type);
      if (tool) {
        // Inject cached version if available
        const version = toolVersions.get(type);
        if (version) {
          return { ...tool, version };
        }
      }
      return tool;
    },
    [tools, toolVersions]
  );

  const isToolAvailable = useCallback(
    (type: MonorepoToolType): boolean => {
      const tool = tools.find((t) => t.type === type);
      return tool?.isAvailable ?? false;
    },
    [tools]
  );

  const hasMonorepoTool = tools.length > 0 && primaryTool !== 'unknown';

  return {
    // State
    loading,
    versionLoading,
    error,
    tools,
    primaryTool,
    selectedTool,
    hasMonorepoTool,
    toolVersions,
    // Actions
    refresh: detectTools,
    selectTool,
    getToolInfo,
    isToolAvailable,
    fetchVersion,
  };
}

export default useMonorepoTool;
