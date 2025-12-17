/**
 * Workflow Execution Context
 * Provides shared workflow execution state across all components
 * Prevents state loss when switching tabs
 */

import { createContext, useContext, ReactNode } from 'react';
import {
  useWorkflowExecution,
  type WorkflowExecutionState,
  type OutputLine,
} from '../hooks/useWorkflowExecution';

/** Result type for executeWorkflow */
type ExecuteWorkflowResult =
  | { success: true; executionId: string }
  | { success: false; error: string };

/** Result type for cancelExecution */
type CancelExecutionResult = { success: true } | { success: false; error: string };

interface WorkflowExecutionContextValue {
  /** All execution states */
  executions: Record<string, WorkflowExecutionState>;
  /** Get execution state for a specific workflow */
  getExecutionState: (workflowId: string) => WorkflowExecutionState;
  /** Execute a workflow */
  executeWorkflow: (workflowId: string, totalNodes: number) => Promise<ExecuteWorkflowResult>;
  /** Cancel a running workflow execution */
  cancelExecution: (workflowId: string) => Promise<CancelExecutionResult>;
  /** Clear execution state for a workflow */
  clearExecution: (workflowId: string) => void;
  /** Check if a workflow is currently executing */
  isExecuting: (workflowId: string) => boolean;
}

const WorkflowExecutionContext = createContext<WorkflowExecutionContextValue | null>(null);

export function WorkflowExecutionProvider({ children }: { children: ReactNode }) {
  const workflowExecution = useWorkflowExecution();

  return (
    <WorkflowExecutionContext.Provider value={workflowExecution}>
      {children}
    </WorkflowExecutionContext.Provider>
  );
}

export function useWorkflowExecutionContext(): WorkflowExecutionContextValue {
  const context = useContext(WorkflowExecutionContext);
  if (!context) {
    throw new Error('useWorkflowExecutionContext must be used within a WorkflowExecutionProvider');
  }
  return context;
}

// Re-export types for convenience
export type { WorkflowExecutionState, OutputLine };
