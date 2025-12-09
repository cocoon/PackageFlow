/**
 * Execution History Context
 * Provides shared execution history state across all components
 * Ensures history updates are synchronized across UI
 */

import { createContext, useContext, ReactNode } from 'react';
import { useExecutionHistory } from '../hooks/useExecutionHistory';
import type { ExecutionHistoryItem, ExecutionHistorySettings } from '../lib/tauri-api';

interface ExecutionHistoryContextValue {
  /** Get history for a specific workflow */
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

const ExecutionHistoryContext = createContext<ExecutionHistoryContextValue | null>(null);

export function ExecutionHistoryProvider({ children }: { children: ReactNode }) {
  const executionHistory = useExecutionHistory();

  return (
    <ExecutionHistoryContext.Provider value={executionHistory}>
      {children}
    </ExecutionHistoryContext.Provider>
  );
}

export function useExecutionHistoryContext(): ExecutionHistoryContextValue {
  const context = useContext(ExecutionHistoryContext);
  if (!context) {
    throw new Error('useExecutionHistoryContext must be used within an ExecutionHistoryProvider');
  }
  return context;
}
