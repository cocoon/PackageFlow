/**
 * Workflow Execution History Hook
 * Manages CRUD operations for execution history records via backend API
 */

import { useState, useCallback, useEffect } from 'react';
import { workflowAPI } from '../lib/tauri-api';
import type {
  ExecutionHistoryItem,
  ExecutionHistorySettings,
} from '../lib/tauri-api';

interface UseExecutionHistoryReturn {
  /** All history items for a specific workflow */
  getHistory: (workflowId: string) => ExecutionHistoryItem[];
  /** Refresh history from backend */
  refreshHistory: (workflowId: string) => Promise<void>;
  /** Add a new history item */
  addHistory: (item: ExecutionHistoryItem) => Promise<void>;
  /** Delete a specific history item */
  deleteHistory: (workflowId: string, historyId: string) => Promise<void>;
  /** Clear all history for a workflow */
  clearWorkflowHistory: (workflowId: string) => Promise<void>;
  /** Get current settings */
  settings: ExecutionHistorySettings;
  /** Update settings */
  updateSettings: (settings: Partial<ExecutionHistorySettings>) => Promise<void>;
  /** Loading state */
  isLoading: boolean;
}

const defaultSettings: ExecutionHistorySettings = {
  maxHistoryPerWorkflow: 50,
  retentionDays: 30,
  maxOutputLines: 500,
};

export function useExecutionHistory(): UseExecutionHistoryReturn {
  const [histories, setHistories] = useState<Record<string, ExecutionHistoryItem[]>>({});
  const [settings, setSettings] = useState<ExecutionHistorySettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  // Load all history on mount
  useEffect(() => {
    const loadAll = async () => {
      try {
        const data = await workflowAPI.loadAllExecutionHistory();
        setHistories(data.histories || {});
        if (data.settings) {
          setSettings(data.settings);
        }
      } catch (error) {
        console.error('[useExecutionHistory] Failed to load history:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAll();
  }, []);

  /** Get history for a specific workflow */
  const getHistory = useCallback(
    (workflowId: string): ExecutionHistoryItem[] => {
      return histories[workflowId] || [];
    },
    [histories]
  );

  /** Refresh history from backend */
  const refreshHistory = useCallback(async (workflowId: string) => {
    try {
      const items = await workflowAPI.loadExecutionHistory(workflowId);
      setHistories((prev) => ({
        ...prev,
        [workflowId]: items,
      }));
    } catch (error) {
      console.error('[useExecutionHistory] Failed to refresh history:', error);
    }
  }, []);

  /** Add a new history item */
  const addHistory = useCallback(async (item: ExecutionHistoryItem) => {
    try {
      await workflowAPI.saveExecutionHistory(item);
      // Refresh the history for this workflow
      const items = await workflowAPI.loadExecutionHistory(item.workflowId);
      setHistories((prev) => ({
        ...prev,
        [item.workflowId]: items,
      }));
    } catch (error) {
      console.error('[useExecutionHistory] Failed to add history:', error);
      throw error;
    }
  }, []);

  /** Delete a specific history item */
  const deleteHistory = useCallback(
    async (workflowId: string, historyId: string) => {
      try {
        await workflowAPI.deleteExecutionHistory(workflowId, historyId);
        setHistories((prev) => {
          const items = prev[workflowId]?.filter((item) => item.id !== historyId) || [];
          if (items.length === 0) {
            const { [workflowId]: _, ...rest } = prev;
            return rest;
          }
          return { ...prev, [workflowId]: items };
        });
      } catch (error) {
        console.error('[useExecutionHistory] Failed to delete history:', error);
        throw error;
      }
    },
    []
  );

  /** Clear all history for a workflow */
  const clearWorkflowHistory = useCallback(async (workflowId: string) => {
    try {
      await workflowAPI.clearWorkflowExecutionHistory(workflowId);
      setHistories((prev) => {
        const { [workflowId]: _, ...rest } = prev;
        return rest;
      });
    } catch (error) {
      console.error('[useExecutionHistory] Failed to clear history:', error);
      throw error;
    }
  }, []);

  /** Update settings */
  const updateSettings = useCallback(async (updates: Partial<ExecutionHistorySettings>) => {
    try {
      const newSettings = { ...settings, ...updates };
      await workflowAPI.updateExecutionHistorySettings(newSettings);
      setSettings(newSettings);
    } catch (error) {
      console.error('[useExecutionHistory] Failed to update settings:', error);
      throw error;
    }
  }, [settings]);

  return {
    getHistory,
    refreshHistory,
    addHistory,
    deleteHistory,
    clearWorkflowHistory,
    settings,
    updateSettings,
    isLoading,
  };
}
