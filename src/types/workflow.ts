/**
 * Workflow type definitions
 * @see specs/001-expo-workflow-automation/data-model.md
 * @see specs/013-workflow-trigger-workflow/data-model.md
 */

import type { WebhookConfig } from './webhook';
import type { IncomingWebhookConfig } from './incoming-webhook';

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  projectId?: string;
  nodes: WorkflowNode[];
  createdAt: string;
  updatedAt: string;
  lastExecutedAt?: string;
  webhook?: WebhookConfig;
  incomingWebhook?: IncomingWebhookConfig;
}

export interface NodePosition {
  x: number;
  y: number;
}

export type NodeType = 'script' | 'trigger-workflow';
export type OnChildFailure = 'fail' | 'continue';

export interface ScriptNodeConfig {
  command: string;
  cwd?: string;
  timeout?: number;
}

export interface TriggerWorkflowConfig {
  targetWorkflowId: string;
  waitForCompletion: boolean;
  onChildFailure: OnChildFailure;
}

export type NodeConfig = ScriptNodeConfig | TriggerWorkflowConfig;

export interface WorkflowNode {
  id: string;
  type: NodeType;
  name: string;
  config: NodeConfig;
  order: number;
  position?: NodePosition;
}

export function isScriptNodeConfig(config: NodeConfig): config is ScriptNodeConfig {
  return 'command' in config;
}

export function isTriggerWorkflowConfig(config: NodeConfig): config is TriggerWorkflowConfig {
  return 'targetWorkflowId' in config;
}

export interface Execution {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  startedAt: string;
  finishedAt?: string;
  nodeResults: NodeResult[];
  parentExecutionId?: string;
  parentNodeId?: string;
  depth: number;
}

export type ExecutionStatus =
  | 'starting'
  | 'running'
  | 'completed'
  | 'failed'
  | 'paused'
  | 'cancelled';

export interface ChildExecutionResult {
  childExecutionId: string;
  childWorkflowId: string;
  childWorkflowName: string;
  status: 'completed' | 'failed' | 'cancelled';
  durationMs: number;
  errorMessage?: string;
}

export interface NodeResult {
  nodeId: string;
  status: NodeStatus;
  output: string;
  errorMessage?: string;
  startedAt: string;
  finishedAt?: string;
  exitCode?: number;
  childExecutionResult?: ChildExecutionResult;
}

export type NodeStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface WorkflowStore {
  version: string;
  workflows: Workflow[];
  settings: UserSettings;
}

export interface UserSettings {
  defaultCwd?: string;
  defaultTimeout?: number;
}

export interface NodeStartedEvent {
  executionId: string;
  nodeId: string;
  timestamp: string;
}

export interface OutputEvent {
  executionId: string;
  nodeId: string;
  type: 'stdout' | 'stderr';
  data: string;
  timestamp: string;
}

export interface NodeCompletedEvent {
  executionId: string;
  nodeId: string;
  status: 'completed' | 'failed';
  exitCode: number;
  errorMessage?: string;
  timestamp: string;
}

export interface ExecutionCompletedEvent {
  executionId: string;
  workflowId: string;
  status: 'completed' | 'failed' | 'cancelled';
  timestamp: string;
}

export interface ExecutionPausedEvent {
  executionId: string;
  failedNodeId: string;
  errorMessage: string;
  timestamp: string;
}

export interface ChildExecutionStartedEvent {
  parentExecutionId: string;
  parentNodeId: string;
  childExecutionId: string;
  childWorkflowId: string;
  childWorkflowName: string;
  startedAt: string;
}

export interface ChildExecutionProgressEvent {
  parentExecutionId: string;
  parentNodeId: string;
  childExecutionId: string;
  currentStep: number;
  totalSteps: number;
  currentNodeId: string;
  currentNodeName: string;
  timestamp: string;
}

export interface ChildExecutionCompletedEvent {
  parentExecutionId: string;
  parentNodeId: string;
  childExecutionId: string;
  childWorkflowId: string;
  status: 'completed' | 'failed' | 'cancelled';
  durationMs: number;
  errorMessage?: string;
  finishedAt: string;
}

export interface CycleDetectionResult {
  hasCycle: boolean;
  cyclePath?: string[];
  cycleNames?: string[];
}

export interface AvailableWorkflow {
  id: string;
  name: string;
  description?: string;
  stepCount: number;
  projectId?: string;
  projectName?: string;
  lastExecutedAt?: string;
  cycleWarning?: CycleDetectionResult;
}

export interface LoadAllResponse {
  workflows: Workflow[];
}

export interface SaveResponse {
  success: boolean;
  workflow?: Workflow;
  error?: string;
}

export interface DeleteResponse {
  success: boolean;
  error?: string;
}

export interface ExecuteResponse {
  success: boolean;
  executionId?: string;
  error?: string;
}

export interface CancelResponse {
  success: boolean;
  error?: string;
}

export interface ContinueResponse {
  success: boolean;
  error?: string;
}

export interface RunningExecution {
  executionId: string;
  workflowId: string;
  workflowName: string;
  status: string;
  currentNodeIndex: number;
  pid: number | null;
  nodeId: string | null;
  command: string | null;
  cwd: string | null;
  startedAt: string;
  isRunning?: boolean;
}

export interface GetRunningResponse {
  success: boolean;
  executions: RunningExecution[];
  error?: string;
}

export interface RestoreRunningResponse {
  success: boolean;
  executions: RunningExecution[];
  error?: string;
}

export interface KillProcessResponse {
  success: boolean;
  error?: string;
}

export interface WorkflowAPI {
  loadWorkflows: () => Promise<LoadAllResponse>;
  saveWorkflow: (workflow: Workflow) => Promise<SaveResponse>;
  deleteWorkflow: (workflowId: string) => Promise<DeleteResponse>;
  executeWorkflow: (workflowId: string) => Promise<ExecuteResponse>;
  cancelExecution: (executionId: string) => Promise<CancelResponse>;
  continueExecution: (executionId: string) => Promise<ContinueResponse>;
  getRunningExecutions: () => Promise<GetRunningResponse>;
  restoreRunningExecutions: () => Promise<RestoreRunningResponse>;
  killProcess: (executionId: string) => Promise<KillProcessResponse>;
  onNodeStarted: (callback: (event: NodeStartedEvent) => void) => void;
  onExecutionOutput: (callback: (event: OutputEvent) => void) => void;
  onNodeCompleted: (callback: (event: NodeCompletedEvent) => void) => void;
  onExecutionCompleted: (callback: (event: ExecutionCompletedEvent) => void) => void;
  onExecutionPaused: (callback: (event: ExecutionPausedEvent) => void) => void;
  removeWorkflowListeners: () => void;
}
