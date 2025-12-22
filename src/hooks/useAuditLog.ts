/**
 * useAuditLog Hook
 * Manages fetching and filtering of security audit logs
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type {
  AuditEvent,
  AuditStats,
  AuditFilter,
  AuditLogResponse,
  AuditTimeRange,
  AuditEventType,
  AuditActorType,
  AuditOutcome,
} from '../types/audit';

interface UseAuditLogOptions {
  /** Initial page size */
  pageSize?: number;
  /** Auto-refresh interval in ms (0 = disabled) */
  autoRefreshInterval?: number;
}

interface UseAuditLogReturn {
  // Data
  events: AuditEvent[];
  stats: AuditStats | null;
  total: number;
  hasMore: boolean;

  // Loading states
  isLoading: boolean;
  isLoadingMore: boolean;
  isLoadingStats: boolean;

  // Error
  error: string | null;

  // Pagination
  page: number;
  pageSize: number;
  loadMore: () => Promise<void>;

  // Filtering
  filters: AuditFilter;
  setTimeRange: (range: AuditTimeRange, customFrom?: string, customTo?: string) => void;
  setEventTypes: (types: AuditEventType[]) => void;
  setActorType: (type: AuditActorType | undefined) => void;
  setOutcome: (outcome: AuditOutcome | undefined) => void;
  resetFilters: () => void;

  // Actions
  refresh: () => Promise<void>;
  exportEvents: () => Promise<string | null>;
}

/** Calculate date range from preset */
function getDateRangeFromPreset(
  range: AuditTimeRange,
  customFrom?: string,
  customTo?: string
): { from?: string; to?: string } {
  const now = new Date();

  switch (range) {
    case 'last_24h': {
      const from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      return { from: from.toISOString(), to: now.toISOString() };
    }
    case 'last_7d': {
      const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { from: from.toISOString(), to: now.toISOString() };
    }
    case 'last_30d': {
      const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { from: from.toISOString(), to: now.toISOString() };
    }
    case 'custom':
      return { from: customFrom, to: customTo };
    default:
      return {};
  }
}

/** Calculate days from time range for stats query */
function getDaysFromTimeRange(range: AuditTimeRange): number {
  switch (range) {
    case 'last_24h':
      return 1;
    case 'last_7d':
      return 7;
    case 'last_30d':
      return 30;
    default:
      return 7;
  }
}

const DEFAULT_PAGE_SIZE = 50;

export function useAuditLog(options: UseAuditLogOptions = {}): UseAuditLogReturn {
  const { pageSize = DEFAULT_PAGE_SIZE, autoRefreshInterval = 0 } = options;

  // State
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [timeRange, setTimeRangeState] = useState<AuditTimeRange>('last_7d');
  const [customFrom, setCustomFrom] = useState<string>();
  const [customTo, setCustomTo] = useState<string>();
  const [eventTypes, setEventTypesState] = useState<AuditEventType[]>([]);
  const [actorType, setActorTypeState] = useState<AuditActorType>();
  const [outcome, setOutcomeState] = useState<AuditOutcome>();

  // Computed filters
  const filters = useMemo<AuditFilter>(() => {
    const dateRange = getDateRangeFromPreset(timeRange, customFrom, customTo);
    return {
      ...dateRange,
      eventTypes: eventTypes.length > 0 ? eventTypes : undefined,
      actorType,
      outcome,
      limit: pageSize,
      offset: page * pageSize,
    };
  }, [timeRange, customFrom, customTo, eventTypes, actorType, outcome, pageSize, page]);

  // Fetch events
  const fetchEvents = useCallback(
    async (appendMode = false) => {
      try {
        if (appendMode) {
          setIsLoadingMore(true);
        } else {
          setIsLoading(true);
        }
        setError(null);

        const response = await invoke<AuditLogResponse>('get_audit_events', {
          filter: filters,
        });

        if (appendMode) {
          setEvents((prev) => [...prev, ...response.events]);
        } else {
          setEvents(response.events);
        }
        setTotal(response.total);
        setHasMore(response.hasMore);
      } catch (e) {
        setError(`Failed to load audit events: ${e}`);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [filters]
  );

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      setIsLoadingStats(true);
      const days = getDaysFromTimeRange(timeRange);
      const statsData = await invoke<AuditStats>('get_audit_stats', {
        days,
      });
      setStats(statsData);
    } catch (e) {
      console.error('Failed to load audit stats:', e);
    } finally {
      setIsLoadingStats(false);
    }
  }, [timeRange]);

  // Initial load and refresh on filter change
  useEffect(() => {
    setPage(0);
    fetchEvents();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange, customFrom, customTo, eventTypes, actorType, outcome]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;

    const interval = setInterval(() => {
      fetchEvents();
      fetchStats();
    }, autoRefreshInterval);

    return () => clearInterval(interval);
  }, [autoRefreshInterval, fetchEvents, fetchStats]);

  // Actions
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore) return;
    setPage((p) => p + 1);
    await fetchEvents(true);
  }, [hasMore, isLoadingMore, fetchEvents]);

  const refresh = useCallback(async () => {
    setPage(0);
    await Promise.all([fetchEvents(), fetchStats()]);
  }, [fetchEvents, fetchStats]);

  const setTimeRange = useCallback(
    (range: AuditTimeRange, from?: string, to?: string) => {
      setTimeRangeState(range);
      setCustomFrom(from);
      setCustomTo(to);
    },
    []
  );

  const resetFilters = useCallback(() => {
    setTimeRangeState('last_7d');
    setCustomFrom(undefined);
    setCustomTo(undefined);
    setEventTypesState([]);
    setActorTypeState(undefined);
    setOutcomeState(undefined);
  }, []);

  const exportEvents = useCallback(async (): Promise<string | null> => {
    try {
      const result = await invoke<string>('export_audit_events', { filter: filters });
      return result;
    } catch (e) {
      setError(`Failed to export events: ${e}`);
      return null;
    }
  }, [filters]);

  return {
    events,
    stats,
    total,
    hasMore,
    isLoading,
    isLoadingMore,
    isLoadingStats,
    error,
    page,
    pageSize,
    loadMore,
    filters,
    setTimeRange,
    setEventTypes: setEventTypesState,
    setActorType: setActorTypeState,
    setOutcome: setOutcomeState,
    resetFilters,
    refresh,
    exportEvents,
  };
}
