// useSnapshotSearch Hook
// Provides snapshot search, timeline, and audit report functionality

import { useState, useCallback } from 'react';
import { snapshotAPI } from '../lib/tauri-api';
import type {
  SnapshotSearchCriteria,
  SearchResponse,
  TimelineEntry,
  SecurityAuditReport,
  ExportFormat,
} from '../types/snapshot';

export interface UseSnapshotSearchResult {
  // Search
  searchResults: SearchResponse | null;
  isSearching: boolean;
  searchError: string | null;
  search: (criteria: SnapshotSearchCriteria) => Promise<void>;
  clearSearch: () => void;

  // Timeline
  timeline: TimelineEntry[];
  isLoadingTimeline: boolean;
  timelineError: string | null;
  loadTimeline: (projectPath: string, limit?: number) => Promise<void>;

  // Audit Report
  auditReport: SecurityAuditReport | null;
  isGeneratingReport: boolean;
  reportError: string | null;
  generateReport: (projectPath: string) => Promise<void>;
  exportReport: (format: ExportFormat) => Promise<string | null>;
}

export function useSnapshotSearch(): UseSnapshotSearchResult {
  // Search state
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Timeline state
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);

  // Audit report state
  const [auditReport, setAuditReport] = useState<SecurityAuditReport | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  // Search snapshots
  const search = useCallback(async (criteria: SnapshotSearchCriteria) => {
    setIsSearching(true);
    setSearchError(null);

    try {
      const response = await snapshotAPI.searchSnapshots(criteria);
      setSearchResults(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Search failed';
      setSearchError(message);
      setSearchResults(null);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Clear search results
  const clearSearch = useCallback(() => {
    setSearchResults(null);
    setSearchError(null);
  }, []);

  // Load timeline
  const loadTimeline = useCallback(async (projectPath: string, limit?: number) => {
    setIsLoadingTimeline(true);
    setTimelineError(null);

    try {
      const entries = await snapshotAPI.getSnapshotTimeline(projectPath, limit);
      setTimeline(entries);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load timeline';
      setTimelineError(message);
      setTimeline([]);
    } finally {
      setIsLoadingTimeline(false);
    }
  }, []);

  // Generate audit report
  const generateReport = useCallback(async (projectPath: string) => {
    setIsGeneratingReport(true);
    setReportError(null);

    try {
      const report = await snapshotAPI.generateSecurityAuditReport(projectPath);
      setAuditReport(report);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate report';
      setReportError(message);
      setAuditReport(null);
    } finally {
      setIsGeneratingReport(false);
    }
  }, []);

  // Export report
  const exportReport = useCallback(
    async (format: ExportFormat): Promise<string | null> => {
      if (!auditReport) {
        return null;
      }

      try {
        const content = await snapshotAPI.exportSecurityReport(auditReport, format);
        return content;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to export report';
        setReportError(message);
        return null;
      }
    },
    [auditReport]
  );

  return {
    // Search
    searchResults,
    isSearching,
    searchError,
    search,
    clearSearch,

    // Timeline
    timeline,
    isLoadingTimeline,
    timelineError,
    loadTimeline,

    // Audit Report
    auditReport,
    isGeneratingReport,
    reportError,
    generateReport,
    exportReport,
  };
}
