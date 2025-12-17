// Time Machine - Snapshot Hooks
// React hooks for snapshot operations

import { useState, useCallback, useEffect } from 'react';
import { snapshotAPI } from '../lib/tauri-api';
import type {
  ExecutionSnapshot,
  SnapshotListItem,
  SnapshotWithDependencies,
  SnapshotFilter,
  SnapshotDiff,
  SnapshotStorageStats,
  SecurityInsight,
  InsightSummary,
} from '../types/snapshot';

// =========================================================================
// useSnapshots - List and manage snapshots
// =========================================================================

export interface UseSnapshotsOptions {
  workflowId?: string;
  projectPath?: string;
  limit?: number;
  autoLoad?: boolean;
}

export interface UseSnapshotsReturn {
  snapshots: SnapshotListItem[];
  loading: boolean;
  error: string | null;
  loadSnapshots: (filter?: SnapshotFilter) => Promise<void>;
  deleteSnapshot: (snapshotId: string) => Promise<boolean>;
  pruneSnapshots: (keepPerWorkflow?: number) => Promise<number>;
  refresh: () => Promise<void>;
}

export function useSnapshots(options: UseSnapshotsOptions = {}): UseSnapshotsReturn {
  const { workflowId, projectPath, limit = 50, autoLoad = true } = options;

  const [snapshots, setSnapshots] = useState<SnapshotListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSnapshots = useCallback(
    async (filter?: SnapshotFilter) => {
      setLoading(true);
      setError(null);
      try {
        const result = await snapshotAPI.listSnapshots(
          filter ?? { workflowId, projectPath, limit }
        );
        setSnapshots(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    [workflowId, projectPath, limit]
  );

  const deleteSnapshot = useCallback(async (snapshotId: string) => {
    try {
      const result = await snapshotAPI.deleteSnapshot(snapshotId);
      if (result) {
        setSnapshots((prev) => prev.filter((s) => s.id !== snapshotId));
      }
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    }
  }, []);

  const pruneSnapshots = useCallback(async (keepPerWorkflow?: number) => {
    try {
      const count = await snapshotAPI.pruneSnapshots(keepPerWorkflow);
      await loadSnapshots();
      return count;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return 0;
    }
  }, [loadSnapshots]);

  const refresh = useCallback(() => loadSnapshots(), [loadSnapshots]);

  useEffect(() => {
    if (autoLoad) {
      loadSnapshots();
    }
  }, [autoLoad, loadSnapshots]);

  return {
    snapshots,
    loading,
    error,
    loadSnapshots,
    deleteSnapshot,
    pruneSnapshots,
    refresh,
  };
}

// =========================================================================
// useSnapshot - Get a single snapshot with details
// =========================================================================

export interface UseSnapshotOptions {
  snapshotId: string | null;
  includeDependencies?: boolean;
  autoLoad?: boolean;
}

export interface UseSnapshotReturn {
  snapshot: ExecutionSnapshot | null;
  dependencies: SnapshotWithDependencies['dependencies'] | null;
  loading: boolean;
  error: string | null;
  loadSnapshot: () => Promise<void>;
}

export function useSnapshot(options: UseSnapshotOptions): UseSnapshotReturn {
  const { snapshotId, includeDependencies = false, autoLoad = true } = options;

  const [snapshot, setSnapshot] = useState<ExecutionSnapshot | null>(null);
  const [dependencies, setDependencies] = useState<
    SnapshotWithDependencies['dependencies'] | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSnapshot = useCallback(async () => {
    if (!snapshotId) {
      setSnapshot(null);
      setDependencies(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (includeDependencies) {
        const result = await snapshotAPI.getSnapshotWithDependencies(snapshotId);
        setSnapshot(result?.snapshot ?? null);
        setDependencies(result?.dependencies ?? null);
      } else {
        const result = await snapshotAPI.getSnapshot(snapshotId);
        setSnapshot(result);
        setDependencies(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [snapshotId, includeDependencies]);

  useEffect(() => {
    if (autoLoad) {
      loadSnapshot();
    }
  }, [autoLoad, loadSnapshot]);

  return {
    snapshot,
    dependencies,
    loading,
    error,
    loadSnapshot,
  };
}

// =========================================================================
// useLatestSnapshot - Get the latest snapshot for a workflow
// =========================================================================

export interface UseLatestSnapshotReturn {
  snapshot: ExecutionSnapshot | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useLatestSnapshot(workflowId: string | null): UseLatestSnapshotReturn {
  const [snapshot, setSnapshot] = useState<ExecutionSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!workflowId) {
      setSnapshot(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await snapshotAPI.getLatestSnapshot(workflowId);
      setSnapshot(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [workflowId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    snapshot,
    loading,
    error,
    refresh,
  };
}

// =========================================================================
// useSnapshotDiff - Compare two snapshots
// =========================================================================

export interface UseSnapshotDiffReturn {
  diff: SnapshotDiff | null;
  aiPrompt: string | null;
  loading: boolean;
  error: string | null;
  compare: (snapshotAId: string, snapshotBId: string) => Promise<void>;
  generateAiPrompt: (snapshotAId: string, snapshotBId: string) => Promise<void>;
  clear: () => void;
}

export function useSnapshotDiff(): UseSnapshotDiffReturn {
  const [diff, setDiff] = useState<SnapshotDiff | null>(null);
  const [aiPrompt, setAiPrompt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const compare = useCallback(async (snapshotAId: string, snapshotBId: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await snapshotAPI.compareSnapshots(snapshotAId, snapshotBId);
      setDiff(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const generateAiPrompt = useCallback(async (snapshotAId: string, snapshotBId: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await snapshotAPI.getDiffAiPrompt(snapshotAId, snapshotBId);
      setAiPrompt(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setDiff(null);
    setAiPrompt(null);
    setError(null);
  }, []);

  return {
    diff,
    aiPrompt,
    loading,
    error,
    compare,
    generateAiPrompt,
    clear,
  };
}

// =========================================================================
// useComparisonCandidates - Get comparison candidates for a workflow
// =========================================================================

export interface UseComparisonCandidatesReturn {
  candidates: ExecutionSnapshot[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useComparisonCandidates(
  workflowId: string | null,
  limit = 10
): UseComparisonCandidatesReturn {
  const [candidates, setCandidates] = useState<ExecutionSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!workflowId) {
      setCandidates([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await snapshotAPI.getComparisonCandidates(workflowId, limit);
      setCandidates(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [workflowId, limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    candidates,
    loading,
    error,
    refresh,
  };
}

// =========================================================================
// useSecurityInsights - Get security insights for a snapshot
// =========================================================================

export interface UseSecurityInsightsReturn {
  insights: SecurityInsight[];
  summary: InsightSummary | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  dismissInsight: (insightId: string) => Promise<boolean>;
}

export function useSecurityInsights(snapshotId: string | null): UseSecurityInsightsReturn {
  const [insights, setInsights] = useState<SecurityInsight[]>([]);
  const [summary, setSummary] = useState<InsightSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!snapshotId) {
      setInsights([]);
      setSummary(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [insightsResult, summaryResult] = await Promise.all([
        snapshotAPI.getSecurityInsights(snapshotId),
        snapshotAPI.getInsightSummary(snapshotId),
      ]);
      setInsights(insightsResult);
      setSummary(summaryResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [snapshotId]);

  const dismissInsight = useCallback(
    async (insightId: string) => {
      try {
        const result = await snapshotAPI.dismissInsight(insightId);
        if (result) {
          setInsights((prev) =>
            prev.map((i) => (i.id === insightId ? { ...i, isDismissed: true } : i))
          );
          // Refresh summary
          if (snapshotId) {
            const newSummary = await snapshotAPI.getInsightSummary(snapshotId);
            setSummary(newSummary);
          }
        }
        return result;
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        return false;
      }
    },
    [snapshotId]
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    insights,
    summary,
    loading,
    error,
    refresh,
    dismissInsight,
  };
}

// =========================================================================
// useSnapshotStorage - Storage statistics and management
// =========================================================================

export interface UseSnapshotStorageReturn {
  stats: SnapshotStorageStats | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  cleanupOrphaned: () => Promise<number>;
}

export function useSnapshotStorage(): UseSnapshotStorageReturn {
  const [stats, setStats] = useState<SnapshotStorageStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await snapshotAPI.getStorageStats();
      setStats(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const cleanupOrphaned = useCallback(async () => {
    try {
      const count = await snapshotAPI.cleanupOrphanedStorage();
      await refresh();
      return count;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return 0;
    }
  }, [refresh]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    stats,
    loading,
    error,
    refresh,
    cleanupOrphaned,
  };
}
