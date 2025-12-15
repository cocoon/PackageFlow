/**
 * TurboPanelUnified Component
 * Feature: 008-monorepo-support
 *
 * Unified panel for Turborepo - combines task execution, batch operations,
 * and cache management into a single cohesive view.
 *
 * Design improvements (v2):
 * - P1: Task search with Cmd+/ shortcut
 * - P1: Tasks grouped by category (build, test, lint, dev)
 * - P2: Recent tasks quick access
 * - P2: Quick Switcher integration (Cmd+Shift+T)
 * - P3: Cleaner layout with better visual hierarchy
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Zap,
  CheckCircle2,
  XCircle,
  Loader2,
  Play,
  HardDrive,
  Layers,
  Trash2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Terminal,
} from 'lucide-react';
import { useTurboCommands, type TurboCommandExecution } from '../../../hooks/useTurboCommands';
import { useBatchExecution, type BatchExecution } from '../../../hooks/useBatchExecution';
import { monorepoAPI } from '../../../lib/tauri-api';
import { PackageFilterBar, type PackageInfo } from './PackageFilterBar';
import {
  TaskSearchBar,
  TaskCategoryGroup,
  RecentTasks,
  useRecentTasks,
  type TaskItem,
} from './TaskComponents';
import { TaskQuickSwitcher, useTaskQuickSwitcher } from './TaskQuickSwitcher';
import type { DependencyNode, TurboCacheStatus as TurboCacheStatusType } from '../../../types/monorepo';
import { ExecutionOutputPanel, type ExecutionStatus } from './ExecutionOutputPanel';
import { Button } from '../../ui/Button';
import { cn } from '../../../lib/utils';

interface TurboPanelUnifiedProps {
  projectPath: string;
  /** Packages for batch execution */
  packages: DependencyNode[];
  /** Available scripts across all packages */
  availableScripts: string[];
  className?: string;
}

/**
 * Collapsible section wrapper
 */
function CollapsibleSection({
  title,
  icon: Icon,
  iconColor,
  expanded,
  onToggle,
  children,
  badge,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div className="border-t border-border">
      <Button
        variant="ghost"
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-4 py-2.5 h-auto justify-start"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
        <Icon className={cn('w-4 h-4', iconColor)} />
        <span className="text-sm font-medium text-foreground">{title}</span>
        {badge}
      </Button>
      {expanded && <div className="pb-4">{children}</div>}
    </div>
  );
}

/**
 * Execution item display
 */
function ExecutionItem({
  execution,
  onViewOutput,
}: {
  execution: TurboCommandExecution;
  onViewOutput: (execution: TurboCommandExecution) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const statusIcon = {
    running: <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />,
    completed: <CheckCircle2 className="w-4 h-4 text-green-400" />,
    failed: <XCircle className="w-4 h-4 text-red-400" />,
    cancelled: <AlertCircle className="w-4 h-4 text-muted-foreground" />,
  }[execution.status];

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 hover:bg-accent/50 transition-colors">
        <Button
          variant="ghost"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 flex-1 h-auto justify-start px-0 py-0"
        >
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
          {statusIcon}
          <span className="flex-1 text-sm font-medium text-foreground">
            {execution.task}
            {execution.filter && execution.filter.length > 0 && (
              <span className="text-muted-foreground font-normal">
                {' '}
                ({execution.filter.length} packages)
              </span>
            )}
          </span>
        </Button>
        <div className="flex items-center gap-2">
          {execution.cached === true && (
            <span className="px-1.5 py-0.5 text-[10px] bg-green-500/20 text-green-400 rounded">
              CACHED
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {execution.status === 'running'
              ? 'Running...'
              : execution.exitCode !== undefined
              ? `Exit: ${execution.exitCode}`
              : execution.status}
          </span>
          {/* View output button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onViewOutput(execution);
            }}
            className="h-auto w-auto p-1"
            title="View output"
          >
            <Terminal className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
      {expanded && execution.output && (
        <pre className="px-3 py-2 text-xs text-muted-foreground bg-card border-t border-border overflow-x-auto max-h-48 overflow-y-auto font-mono">
          {execution.output}
        </pre>
      )}
    </div>
  );
}

/**
 * Batch execution result item
 */
function BatchResultItem({ execution }: { execution: BatchExecution }) {
  const [expanded, setExpanded] = useState(false);

  const successCount = execution.results.filter((r) => r.success).length;
  const failureCount = execution.results.filter((r) => !r.success).length;

  const statusIcon = {
    running: <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />,
    completed: <CheckCircle2 className="w-4 h-4 text-green-400" />,
    failed: <XCircle className="w-4 h-4 text-red-400" />,
  }[execution.status];

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <Button
        variant="ghost"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 h-auto justify-start"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
        {statusIcon}
        <span className="flex-1 text-sm font-medium text-foreground">
          {execution.script}
          <span className="text-muted-foreground font-normal ml-2">
            ({execution.packages.length} packages)
          </span>
        </span>
        <div className="flex items-center gap-2 text-xs">
          {execution.status === 'running' ? (
            <span className="text-muted-foreground">
              {execution.progress.completed}/{execution.progress.total}
            </span>
          ) : (
            <>
              {successCount > 0 && (
                <span className="text-green-400">{successCount} passed</span>
              )}
              {failureCount > 0 && (
                <span className="text-red-400">{failureCount} failed</span>
              )}
            </>
          )}
        </div>
      </Button>

      {expanded && (
        <div className="px-3 py-2 bg-card border-t border-border">
          {execution.status === 'running' && (
            <div className="mb-3">
              <div className="h-1.5 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{
                    width: `${(execution.progress.completed / execution.progress.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}
          {execution.results.length > 0 && (
            <div className="space-y-1">
              {execution.results.map((result) => (
                <div key={result.packageName} className="flex items-center gap-2 text-xs">
                  {result.success ? (
                    <CheckCircle2 className="w-3 h-3 text-green-400" />
                  ) : (
                    <XCircle className="w-3 h-3 text-red-400" />
                  )}
                  <span className="text-foreground/90">{result.packageName}</span>
                  {result.cached && (
                    <span className="px-1 py-0.5 text-[9px] bg-green-500/20 text-green-400 rounded">
                      cached
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Inline cache status display
 */
function CacheStatusInline({ projectPath }: { projectPath: string }) {
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<TurboCacheStatusType | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!projectPath) return;
    setLoading(true);
    setError(null);

    try {
      const response = await monorepoAPI.getTurboCacheStatus(projectPath);
      if (response.success && response.status) {
        setStatus(response.status);
      } else {
        setError(response.error || 'Failed to get cache status');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [projectPath]);

  const clearCache = useCallback(async () => {
    if (!projectPath) return;
    setClearing(true);
    setError(null);

    try {
      const response = await monorepoAPI.clearTurboCache(projectPath);
      if (response.success) {
        await fetchStatus();
      } else {
        setError(response.error || 'Failed to clear cache');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setClearing(false);
    }
  }, [projectPath, fetchStatus]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  if (loading && !status) {
    return (
      <div className="px-4 py-3 flex items-center justify-center text-muted-foreground text-sm">
        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
        Loading cache status...
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4">
        <div className="p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400 flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </div>
      </div>
    );
  }

  if (!status) return null;

  return (
    <div className="px-4 space-y-3">
      {/* Stats row */}
      <div className="flex items-center gap-6 text-sm">
        <div>
          <span className="text-muted-foreground">Size: </span>
          <span className="text-foreground font-medium">{status.totalSize}</span>
        </div>
        {status.entries !== undefined && status.entries !== null && (
          <div>
            <span className="text-muted-foreground">Entries: </span>
            <span className="text-foreground font-medium">{status.entries.toLocaleString()}</span>
          </div>
        )}
        {status.hitRate !== undefined && status.hitRate > 0 && (
          <div>
            <span className="text-muted-foreground">Hit Rate: </span>
            <span className="text-foreground font-medium">{(status.hitRate * 100).toFixed(1)}%</span>
          </div>
        )}
      </div>

      {/* Actions row */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline-destructive"
          size="sm"
          onClick={clearCache}
          disabled={clearing || (status.entries !== undefined && status.entries === 0)}
          className="flex items-center gap-1.5"
        >
          {clearing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Clearing...
            </>
          ) : (
            <>
              <Trash2 className="w-3.5 h-3.5" />
              Clear Cache
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={fetchStatus}
          disabled={loading}
          className="h-auto w-auto p-1.5"
          title="Refresh"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
        </Button>
      </div>
    </div>
  );
}

export function TurboPanelUnified({
  projectPath,
  packages,
  availableScripts,
  className,
}: TurboPanelUnifiedProps) {
  // Turbo commands state
  const {
    loading: turboLoading,
    error: turboError,
    pipelines,
    executions,
    refreshPipelines,
    runTask,
    dryRun,
    clearCompleted,
  } = useTurboCommands(projectPath);

  // Batch execution state
  const {
    loading: batchLoading,
    error: batchError,
    currentExecution,
    executionHistory,
    runBatch,
    clearError: clearBatchError,
    clearHistory,
  } = useBatchExecution(projectPath, 'turbo');

  // Recent tasks (P2)
  const { recentTasks, addRecentTask } = useRecentTasks(projectPath);

  // Quick Switcher (P2)
  const quickSwitcher = useTaskQuickSwitcher();

  // UI state
  const [forceRun, setForceRun] = useState(false);
  const [batchExpanded, setBatchExpanded] = useState(false);
  const [cacheExpanded, setCacheExpanded] = useState(false);
  const [selectedPackages, setSelectedPackages] = useState<Set<string>>(new Set());
  const [selectedScript, setSelectedScript] = useState<string>(availableScripts[0] || '');
  const [outputPanelExecution, setOutputPanelExecution] = useState<TurboCommandExecution | null>(null);

  const runningCount = Array.from(executions.values()).filter(
    (e) => e.status === 'running'
  ).length;

  // Running tasks set for TaskCategoryGroup
  const runningTasks = useMemo(() => {
    const running = new Set<string>();
    for (const [, exec] of executions) {
      if (exec.status === 'running') {
        running.add(exec.task);
      }
    }
    return running;
  }, [executions]);

  // Convert pipelines to TaskItem format
  const taskItems: TaskItem[] = useMemo(() => {
    return pipelines.map((p) => ({
      name: p.name,
      dependsOn: p.dependsOn,
      cache: p.cache,
      outputs: p.outputs,
      inputs: p.inputs,
    }));
  }, [pipelines]);

  // Convert packages for filter bar
  const packageInfos: PackageInfo[] = useMemo(() => {
    return packages.map((pkg) => ({
      name: pkg.name,
      path: pkg.root,
      type: pkg.type,
      scripts: [],
    }));
  }, [packages]);

  // Handle task run with recent tracking
  const handleTaskRun = useCallback(
    (taskName: string) => {
      addRecentTask(taskName);
      runTask(taskName, { force: forceRun });
    },
    [addRecentTask, runTask, forceRun]
  );

  // Handle Quick Switcher task run
  const handleQuickSwitcherRun = useCallback(
    (taskName: string, source: 'turbo' | 'nx') => {
      if (source === 'turbo') {
        handleTaskRun(taskName);
      }
      quickSwitcher.close();
    },
    [handleTaskRun, quickSwitcher]
  );

  const handleRunBatch = async () => {
    if (selectedPackages.size === 0 || !selectedScript) return;
    await runBatch(selectedScript, Array.from(selectedPackages), { parallel: true });
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-purple-400" />
          <h3 className="font-semibold text-foreground">Turbo Tasks</h3>
          {runningCount > 0 && (
            <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded-full">
              {runningCount} running
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Force toggle - clearer semantics */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setForceRun(!forceRun)}
            className={cn(
              'flex items-center gap-1.5',
              forceRun && 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 hover:text-amber-300'
            )}
            title={forceRun ? 'Cache will be ignored' : 'Enable to ignore cache'}
            aria-pressed={forceRun}
          >
            {forceRun ? (
              <ToggleRight className="w-4 h-4" />
            ) : (
              <ToggleLeft className="w-4 h-4" />
            )}
            <span>Ignore Cache</span>
          </Button>

          {/* Refresh */}
          <Button
            variant="ghost"
            size="icon"
            onClick={refreshPipelines}
            disabled={turboLoading}
            className="h-auto w-auto p-1.5"
            title="Refresh pipelines"
          >
            <RefreshCw className={cn('w-4 h-4', turboLoading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-y-auto">
        {/* Error display */}
        {turboError && (
          <div className="px-4 pt-4">
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-sm text-red-400">
              {turboError}
            </div>
          </div>
        )}

        {/* Available Tasks section */}
        <div className="p-4">
          {turboLoading && pipelines.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              Loading pipelines...
            </div>
          ) : pipelines.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Zap className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No Turbo pipelines found</p>
              <p className="text-xs mt-1">Check your turbo.json configuration</p>
            </div>
          ) : (
            <>
              {/* P1: Task Search */}
              <TaskSearchBar
                tasks={taskItems}
                onTaskRun={handleTaskRun}
                onTaskDryRun={dryRun}
                placeholder="Search tasks... (⌘/)"
              />

              {/* P2: Recent Tasks */}
              <RecentTasks
                tasks={taskItems}
                recentTaskNames={recentTasks}
                onTaskRun={handleTaskRun}
                maxItems={3}
              />

              {/* P1: Categorized Tasks */}
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                Available Tasks
              </h4>
              <TaskCategoryGroup
                tasks={taskItems}
                onTaskRun={handleTaskRun}
                onTaskDryRun={dryRun}
                runningTasks={runningTasks}
                forceRun={forceRun}
              />

              {/* Executions */}
              {executions.size > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground">
                      Recent Executions
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearCompleted}
                      className="h-auto text-xs px-2 py-1"
                    >
                      Clear completed
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {Array.from(executions.values())
                      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
                      .slice(0, 5) // Show only last 5
                      .map((execution) => (
                        <ExecutionItem
                          key={execution.executionId}
                          execution={execution}
                          onViewOutput={setOutputPanelExecution}
                        />
                      ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* P2: Quick Switcher */}
        <TaskQuickSwitcher
          isOpen={quickSwitcher.isOpen}
          onClose={quickSwitcher.close}
          turboPipelines={taskItems}
          onRunTask={handleQuickSwitcherRun}
          forceRun={forceRun}
        />

        {/* Run with Filter Section - Collapsible */}
        <CollapsibleSection
          title="Run with Filter"
          icon={Layers}
          iconColor="text-green-400"
          expanded={batchExpanded}
          onToggle={() => setBatchExpanded(!batchExpanded)}
          badge={
            selectedPackages.size > 0 ? (
              <span className="ml-auto px-1.5 py-0.5 text-[10px] bg-green-500/20 text-green-400 rounded">
                {selectedPackages.size} selected
              </span>
            ) : undefined
          }
        >
          <div className="px-4 space-y-4">
            {/* Command hint */}
            <p className="text-xs text-muted-foreground">
              <code className="px-1.5 py-0.5 bg-secondary rounded text-muted-foreground">
                turbo run {'<task>'} --filter=pkg1 --filter=pkg2
              </code>
            </p>

            {batchError && (
              <div className="p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400 flex items-center justify-between">
                <span>{batchError}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearBatchError}
                  className="h-auto w-auto p-0 hover:text-red-300"
                >
                  <XCircle className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}

            {/* Package selection */}
            <div>
              <h5 className="text-xs text-muted-foreground mb-2">Select Packages</h5>
              <PackageFilterBar
                packages={packageInfos}
                selectedPackages={selectedPackages}
                onSelectionChange={setSelectedPackages}
              />
            </div>

            {/* Script selection */}
            <div>
              <h5 className="text-xs text-muted-foreground mb-2">Script</h5>
              <div className="flex flex-wrap gap-2">
                {availableScripts.slice(0, 10).map((script) => (
                  <Button
                    key={script}
                    variant={selectedScript === script ? 'outline-success' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedScript(script)}
                    className={cn(
                      selectedScript === script && 'bg-green-500/20 text-green-400'
                    )}
                  >
                    {script}
                  </Button>
                ))}
              </div>
            </div>

            {/* Run button */}
            <Button
              variant="success"
              onClick={handleRunBatch}
              disabled={batchLoading || selectedPackages.size === 0 || !selectedScript}
              className="w-full flex items-center justify-center gap-2 bg-green-600 text-white hover:bg-green-500"
            >
              {batchLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Run {selectedScript} on {selectedPackages.size} packages
                </>
              )}
            </Button>

            {/* Current & History */}
            {(currentExecution || executionHistory.length > 0) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs text-muted-foreground">Results</h5>
                  {executionHistory.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearHistory}
                      className="h-auto text-xs px-2 py-1"
                    >
                      Clear
                    </Button>
                  )}
                </div>
                {currentExecution && <BatchResultItem execution={currentExecution} />}
                {executionHistory.map((exec) => (
                  <BatchResultItem key={exec.executionId} execution={exec} />
                ))}
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Cache Status Section - Collapsible */}
        <CollapsibleSection
          title="Cache Status"
          icon={HardDrive}
          iconColor="text-purple-400"
          expanded={cacheExpanded}
          onToggle={() => setCacheExpanded(!cacheExpanded)}
        >
          <CacheStatusInline projectPath={projectPath} />
        </CollapsibleSection>
      </div>

      {/* Execution Output Panel */}
      {outputPanelExecution && (
        <ExecutionOutputPanel
          executionId={outputPanelExecution.executionId}
          taskName={outputPanelExecution.task}
          status={outputPanelExecution.status as ExecutionStatus}
          output={outputPanelExecution.output || ''}
          exitCode={outputPanelExecution.exitCode}
          cached={outputPanelExecution.cached}
          onClose={() => setOutputPanelExecution(null)}
        />
      )}
    </div>
  );
}

export default TurboPanelUnified;
