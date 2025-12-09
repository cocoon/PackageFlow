/**
 * Monorepo Tool Support Types
 * Feature: 008-monorepo-support
 */

// Monorepo tool type enumeration
export type MonorepoToolType = 'nx' | 'turbo' | 'workspaces' | 'lerna' | 'unknown';

// Tool detection result
export interface MonorepoToolInfo {
  type: MonorepoToolType;
  version: string | null;
  configPath: string;
  isAvailable: boolean;
}

// Dependency graph structures
export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  cycles?: string[][];
  affectedNodes?: string[];
}

export interface DependencyNode {
  id: string;
  name: string;
  type: 'application' | 'library' | 'e2e' | 'package';
  root: string;
  tags?: string[];
  scriptsCount: number;
}

export interface DependencyEdge {
  source: string;
  target: string;
  type: 'static' | 'implicit' | 'dynamic';
}

// Nx-specific types
export interface NxTarget {
  name: string;
  projects: string[];
  cached: boolean;
}

export interface NxConfig {
  version: number;
  npmScope?: string;
  defaultProject?: string;
  workspaceLayout?: {
    appsDir?: string;
    libsDir?: string;
  };
}

// Turborepo-specific types
export interface TurboPipeline {
  name: string;
  dependsOn?: string[];
  cache: boolean;
  outputs?: string[];
  inputs?: string[];
}

export interface TurboConfig {
  version: string;
  baseBranch?: string;
  globalDependencies?: string[];
  pipeline: Record<string, TurboPipelineConfig>;
}

export interface TurboPipelineConfig {
  dependsOn?: string[];
  cache?: boolean;
  outputs?: string[];
  inputs?: string[];
}

export interface TurboCacheStatus {
  totalSize: string;
  hitRate: number;
  entries?: number;
  lastCleared?: string;
}

// Batch execution types
export interface BatchExecutionParams {
  packages: string[];
  script: string;
  parallel?: boolean;
  stopOnError?: boolean;
}

export interface BatchExecutionResult {
  packageName: string;
  success: boolean;
  exitCode: number;
  duration: number;
  cached?: boolean;
  output?: string;
  error?: string;
}

// API Request/Response types
export interface DetectMonorepoToolsParams {
  projectPath: string;
}

export interface DetectMonorepoToolsResponse {
  success: boolean;
  tools?: MonorepoToolInfo[];
  primary?: MonorepoToolType;
  error?: 'INVALID_PATH' | 'NOT_A_DIRECTORY';
}

export interface GetDependencyGraphParams {
  projectPath: string;
  tool: MonorepoToolType;
  includeAffected?: boolean;
  base?: string;
}

export interface GetDependencyGraphResponse {
  success: boolean;
  graph?: DependencyGraph;
  error?: 'INVALID_PATH' | 'TOOL_NOT_AVAILABLE' | 'PARSE_ERROR' | 'GIT_ERROR';
}

export interface GetNxTargetsParams {
  projectPath: string;
}

export interface GetNxTargetsResponse {
  success: boolean;
  targets?: NxTarget[];
  error?: 'NX_NOT_FOUND' | 'PARSE_ERROR' | 'EXECUTION_ERROR';
}

export interface GetTurboPipelinesParams {
  projectPath: string;
}

export interface GetTurboPipelinesResponse {
  success: boolean;
  pipelines?: TurboPipeline[];
  error?: 'TURBO_NOT_FOUND' | 'PARSE_ERROR';
}

export interface RunNxCommandParams {
  projectPath: string;
  command: 'run' | 'affected' | 'run-many';
  target: string;
  project?: string;
  projects?: string[];
  base?: string;
  parallel?: number;
}

export interface RunNxCommandResponse {
  success: boolean;
  executionId?: string;
  error?: 'NX_NOT_FOUND' | 'INVALID_PARAMS' | 'EXECUTION_ERROR';
}

export interface RunTurboCommandParams {
  projectPath: string;
  task: string;
  filter?: string[];
  force?: boolean;
  dryRun?: boolean;
  concurrency?: number;
}

export interface RunTurboCommandResponse {
  success: boolean;
  executionId?: string;
  error?: 'TURBO_NOT_FOUND' | 'INVALID_PARAMS' | 'EXECUTION_ERROR';
}

export interface GetTurboCacheStatusParams {
  projectPath: string;
}

export interface GetTurboCacheStatusResponse {
  success: boolean;
  status?: TurboCacheStatus;
  error?: 'TURBO_NOT_FOUND' | 'PARSE_ERROR';
}

export interface ClearTurboCacheParams {
  projectPath: string;
}

export interface ClearTurboCacheResponse {
  success: boolean;
  error?: 'TURBO_NOT_FOUND' | 'PERMISSION_DENIED';
}

// Nx Cache types
export interface NxCacheStatus {
  totalSize: string;
  entries?: number;
}

export interface GetNxCacheStatusParams {
  projectPath: string;
}

export interface GetNxCacheStatusResponse {
  success: boolean;
  status?: NxCacheStatus;
  error?: 'NX_NOT_FOUND' | 'PARSE_ERROR';
}

export interface ClearNxCacheParams {
  projectPath: string;
}

export interface ClearNxCacheResponse {
  success: boolean;
  error?: 'NX_NOT_FOUND' | 'PERMISSION_DENIED';
}

export interface RunBatchScriptsParams {
  projectPath: string;
  packages: string[];
  script: string;
  tool: MonorepoToolType;
  parallel?: boolean;
  stopOnError?: boolean;
}

export interface RunBatchScriptsResponse {
  success: boolean;
  executionId?: string;
  error?: 'INVALID_PARAMS' | 'EXECUTION_ERROR';
}

// Event payload types
export interface BatchProgressPayload {
  executionId: string;
  total: number;
  completed: number;
  running: string[];
  results: BatchExecutionResult[];
}

export interface BatchCompletedPayload {
  executionId: string;
  success: boolean;
  results: BatchExecutionResult[];
  duration: number;
}

export const MonorepoErrorMessages: Record<string, string> = {
  INVALID_PATH: 'Cannot access the specified path',
  NOT_A_DIRECTORY: 'The specified path is not a directory',
  NX_NOT_FOUND: 'Nx not found, please ensure the nx package is installed',
  TURBO_NOT_FOUND: 'Turbo not found, please ensure the turbo package is installed',
  TOOL_NOT_AVAILABLE: 'The specified monorepo tool is not available',
  PARSE_ERROR: 'Configuration file format error',
  GIT_ERROR: 'Git operation failed, please check Git status',
  EXECUTION_ERROR: 'Command execution failed',
  INVALID_PARAMS: 'Invalid parameters',
  PERMISSION_DENIED: 'Permission denied, unable to execute operation',
};
