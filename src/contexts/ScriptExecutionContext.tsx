/**
 * Script Execution Context
 * Provides shared script execution state across all components
 */

import { createContext, useContext, ReactNode } from 'react';
import { useScriptExecution, type RunningScript } from '../hooks/useScriptExecution';
import type { ExecuteScriptParams } from '../lib/tauri-api';

interface ScriptExecutionContextValue {
  // State
  runningScripts: Map<string, RunningScript>;
  activeExecutionId: string | null;

  // Operations
  executeScript: (params: ExecuteScriptParams & { projectName?: string }) => Promise<string | null>;
  cancelScript: (executionId: string) => Promise<boolean>;
  setActiveExecution: (executionId: string | null) => void;
  registerExternalExecution: (
    executionId: string,
    scriptName: string,
    projectPath: string,
    projectName?: string
  ) => void;
  clearOutput: (executionId: string) => Promise<void>;
  clearAllOutputs: () => void;

  // Feature 008: stdin interaction
  writeToStdin: (executionId: string, input: string) => Promise<boolean>;
  sendInterrupt: (executionId: string) => Promise<boolean>;

  // Feature 008: PTY integration - register PTY sessions for icon state and port detection
  registerPtyExecution: (
    sessionId: string,
    scriptName: string,
    projectPath: string,
    projectName?: string
  ) => void;
  updatePtyOutput: (sessionId: string, output: string) => void;
  updatePtyStatus: (
    sessionId: string,
    status: 'running' | 'completed' | 'failed',
    exitCode?: number
  ) => void;
  removePtyExecution: (sessionId: string) => void;

  // Feature 008: Kill all PTY sessions (for "Stop All Processes")
  killAllPtySignal: number;
  triggerKillAllPty: () => void;
  // Direct kill function registration (for beforeunload sync call)
  registerKillAllPtyFn: (fn: () => void) => void;
  killAllPtyDirect: () => void;

  // Computed
  getScriptOutput: (executionId: string) => string;
  getActiveOutput: () => string;
  isAnyRunning: () => boolean;
}

const ScriptExecutionContext = createContext<ScriptExecutionContextValue | null>(null);

export function ScriptExecutionProvider({ children }: { children: ReactNode }) {
  const scriptExecution = useScriptExecution();

  return (
    <ScriptExecutionContext.Provider value={scriptExecution}>
      {children}
    </ScriptExecutionContext.Provider>
  );
}

export function useScriptExecutionContext(): ScriptExecutionContextValue {
  const context = useContext(ScriptExecutionContext);
  if (!context) {
    throw new Error('useScriptExecutionContext must be used within a ScriptExecutionProvider');
  }
  return context;
}

// Re-export type for convenience
export type { RunningScript };
