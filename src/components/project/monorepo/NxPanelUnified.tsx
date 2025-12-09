/**
 * NxPanelUnified Component
 * Feature: 008-monorepo-support
 *
 * Unified panel for Nx - combines target execution, affected mode,
 * batch operations, and cache management into a single cohesive view.
 *
 * Design improvements (v2):
 * - P1: Task search with Cmd+/ shortcut
 * - P1: Tasks grouped by category (build, test, lint, dev)
 * - P2: Recent tasks quick access
 * - P2: Quick Switcher integration (Cmd+Shift+T)
 * - P3: Cleaner layout with better visual hierarchy
 */

import { useState, useMemo, useCallback, useEffect, memo } from 'react';
import {
  Play,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Box,
  CheckCircle2,
  XCircle,
  Loader2,
  GitBranch,
  HardDrive,
  Layers,
  Trash2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Terminal,
} from 'lucide-react';
import { useNxCommands, type NxCommandExecution } from '../../../hooks/useNxCommands';
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
import type { DependencyNode } from '../../../types/monorepo';
import { ExecutionOutputPanel, type ExecutionStatus } from './ExecutionOutputPanel';
import { cn } from '../../../lib/utils';

interface NxPanelUnifiedProps {
  projectPath: string;
  /** Packages for batch execution */
  packages: DependencyNode[];
  /** Available scripts/targets across all packages */
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
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-accent/50 transition-colors text-left"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
        <Icon className={cn('w-4 h-4', iconColor)} />
        <span className="text-sm font-medium text-foreground">{title}</span>
        {badge}
      </button>
      {expanded && <div className="pb-4">{children}</div>}
    </div>
  );
}

/**
 * Execution item display (Memoized for performance)
 */
const ExecutionItem = memo(function ExecutionItem({
  execution,
  onViewOutput,
}: {
  execution: NxCommandExecution;
  onViewOutput: (execution: NxCommandExecution) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const statusIcon = useMemo(() => ({
    running: <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />,
    completed: <CheckCircle2 className="w-4 h-4 text-green-400" />,
    failed: <XCircle className="w-4 h-4 text-red-400" />,
    cancelled: <AlertCircle className="w-4 h-4 text-muted-foreground" />,
  })[execution.status], [execution.status]);

  const taskName = useMemo(() =>
    execution.project
      ? `${execution.project}:${execution.target}`
      : execution.target,
    [execution.project, execution.target]
  );

  const handleViewOutput = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onViewOutput(execution);
  }, [onViewOutput, execution]);

  const toggleExpanded = useCallback(() => setExpanded(prev => !prev), []);

  // Truncate output display to avoid rendering huge strings
  const displayOutput = useMemo(() => {
    if (!execution.output) return '';
    // Only show last 10KB for inline preview
    if (execution.output.length > 10240) {
      return '... (truncated)\n' + execution.output.slice(-10240);
    }
    return execution.output;
  }, [execution.output]);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 hover:bg-accent/50 transition-colors">
        <button
          onClick={toggleExpanded}
          className="flex items-center gap-2 flex-1 text-left"
        >
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
          {statusIcon}
          <span className="flex-1 text-sm font-medium text-foreground">
            {taskName}
          </span>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {execution.status === 'running'
              ? 'Running...'
              : execution.exitCode !== undefined
              ? `Exit: ${execution.exitCode}`
              : execution.status}
          </span>
          {/* View output button */}
          <button
            onClick={handleViewOutput}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="View output"
          >
            <Terminal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {expanded && displayOutput && (
        <pre className="px-3 py-2 text-xs text-muted-foreground bg-card border-t border-border overflow-x-auto max-h-48 overflow-y-auto font-mono">
          {displayOutput}
        </pre>
      )}
    </div>
  );
});

/**
 * Batch execution result item (Memoized for performance)
 */
const BatchResultItem = memo(function BatchResultItem({ execution }: { execution: BatchExecution }) {
  const [expanded, setExpanded] = useState(false);

  const { successCount, failureCount } = useMemo(() => ({
    successCount: execution.results.filter((r) => r.success).length,
    failureCount: execution.results.filter((r) => !r.success).length,
  }), [execution.results]);

  const statusIcon = useMemo(() => ({
    running: <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />,
    completed: <CheckCircle2 className="w-4 h-4 text-green-400" />,
    failed: <XCircle className="w-4 h-4 text-red-400" />,
  })[execution.status], [execution.status]);

  const toggleExpanded = useCallback(() => setExpanded(prev => !prev), []);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={toggleExpanded}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent/50 transition-colors"
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
      </button>

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
});

/**
 * Inline cache status display for Nx
 */
function NxCacheStatusInline({ projectPath }: { projectPath: string }) {
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<{ totalSize: string; entries?: number } | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!projectPath) return;
    setLoading(true);
    setError(null);

    try {
      const response = await monorepoAPI.getNxCacheStatus(projectPath);
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
      const response = await monorepoAPI.clearNxCache(projectPath);
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
      </div>

      {/* Actions row */}
      <div className="flex items-center gap-2">
        <button
          onClick={clearCache}
          disabled={clearing || (status.entries !== undefined && status.entries === 0)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded
                     border border-red-500/30 text-red-400
                     hover:bg-red-500/10 transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
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
        </button>
        <button
          onClick={fetchStatus}
          disabled={loading}
          className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Refresh"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
        </button>
      </div>
    </div>
  );
}

export function NxPanelUnified({
  projectPath,
  packages,
  availableScripts,
  className,
}: NxPanelUnifiedProps) {
  // Nx commands state
  const {
    loading: nxLoading,
    error: nxError,
    targets,
    executions,
    refreshTargets,
    runTarget,
    runAffected,
    runMany,
    clearCompleted,
  } = useNxCommands(projectPath);

  // Batch execution state (for history display)
  const {
    loading: batchLoading,
    error: batchError,
    currentExecution,
    executionHistory,
    clearError: clearBatchError,
    clearHistory,
  } = useBatchExecution(projectPath, 'nx');

  // Recent tasks (P2)
  const { recentTasks, addRecentTask } = useRecentTasks(projectPath);

  // Quick Switcher (P2)
  const quickSwitcher = useTaskQuickSwitcher();

  // UI state
  const [skipCache, setSkipCache] = useState(false);
  const [affectedExpanded, setAffectedExpanded] = useState(false);
  const [affectedBase, setAffectedBase] = useState('main');
  const [batchExpanded, setBatchExpanded] = useState(false);
  const [cacheExpanded, setCacheExpanded] = useState(false);
  const [selectedPackages, setSelectedPackages] = useState<Set<string>>(new Set());
  const [selectedScript, setSelectedScript] = useState<string>(availableScripts[0] || '');
  const [outputPanelExecution, setOutputPanelExecution] = useState<NxCommandExecution | null>(null);

  const runningCount = Array.from(executions.values()).filter(
    (e) => e.status === 'running'
  ).length;

  // Running tasks set for TaskCategoryGroup
  const runningTasks = useMemo(() => {
    const running = new Set<string>();
    for (const [, exec] of executions) {
      if (exec.status === 'running') {
        running.add(exec.target);
      }
    }
    return running;
  }, [executions]);

  // Convert targets to TaskItem format
  const taskItems: TaskItem[] = useMemo(() => {
    return targets.map((t) => ({
      name: t.name,
      cache: t.cached,
    }));
  }, [targets]);

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
      runTarget(taskName);
    },
    [addRecentTask, runTarget]
  );

  // Handle Quick Switcher task run
  const handleQuickSwitcherRun = useCallback(
    (taskName: string, source: 'turbo' | 'nx') => {
      if (source === 'nx') {
        handleTaskRun(taskName);
      }
      quickSwitcher.close();
    },
    [handleTaskRun, quickSwitcher]
  );

  const handleRunMany = async (target: string) => {
    if (selectedPackages.size === 0) return;
    await runMany(target, Array.from(selectedPackages));
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Box className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold text-foreground">Nx Targets</h3>
          {runningCount > 0 && (
            <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded-full">
              {runningCount} running
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Skip cache toggle */}
          <button
            onClick={() => setSkipCache(!skipCache)}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors',
              skipCache
                ? 'bg-amber-500/20 text-amber-400'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            )}
            title={skipCache ? 'Cache will be skipped' : 'Enable to skip cache'}
            aria-pressed={skipCache}
          >
            {skipCache ? (
              <ToggleRight className="w-4 h-4" />
            ) : (
              <ToggleLeft className="w-4 h-4" />
            )}
            <span>Skip Cache</span>
          </button>

          {/* Refresh */}
          <button
            onClick={refreshTargets}
            disabled={nxLoading}
            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Refresh targets"
          >
            <RefreshCw className={cn('w-4 h-4', nxLoading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-y-auto">
        {/* Error display */}
        {nxError && (
          <div className="px-4 pt-4">
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-sm text-red-400">
              {nxError}
            </div>
          </div>
        )}

        {/* Available Targets section */}
        <div className="p-4">
          {nxLoading && targets.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              Loading targets...
            </div>
          ) : targets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Box className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No Nx targets found</p>
              <p className="text-xs mt-1">Check your nx.json configuration</p>
            </div>
          ) : (
            <>
              {/* P1: Task Search */}
              <TaskSearchBar
                tasks={taskItems}
                onTaskRun={handleTaskRun}
                placeholder="Search targets... (⌘/)"
              />

              {/* P2: Recent Tasks */}
              <RecentTasks
                tasks={taskItems}
                recentTaskNames={recentTasks}
                onTaskRun={handleTaskRun}
                maxItems={3}
              />

              {/* P1: Categorized Targets */}
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                Available Targets
              </h4>
              <TaskCategoryGroup
                tasks={taskItems}
                onTaskRun={handleTaskRun}
                runningTasks={runningTasks}
                forceRun={skipCache}
              />

              {/* Executions */}
              {executions.size > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground">
                      Recent Executions
                    </h4>
                    <button
                      onClick={clearCompleted}
                      className="text-xs text-muted-foreground hover:text-foreground/80 transition-colors"
                    >
                      Clear completed
                    </button>
                  </div>
                  <div className="space-y-2">
                    {Array.from(executions.values())
                      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
                      .slice(0, 5)
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
          nxTargets={taskItems}
          onRunTask={handleQuickSwitcherRun}
          forceRun={skipCache}
        />

        {/* Affected Section - Collapsible */}
        <CollapsibleSection
          title="Affected"
          icon={GitBranch}
          iconColor="text-purple-400"
          expanded={affectedExpanded}
          onToggle={() => setAffectedExpanded(!affectedExpanded)}
        >
          <div className="px-4 space-y-3">
            {/* Command hint */}
            <p className="text-xs text-muted-foreground">
              <code className="px-1.5 py-0.5 bg-secondary rounded text-muted-foreground">
                nx affected -t {'<target>'} --base=main
              </code>
            </p>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Base branch:</label>
              <input
                type="text"
                value={affectedBase}
                onChange={(e) => setAffectedBase(e.target.value)}
                className="flex-1 px-2 py-1 text-sm bg-secondary border border-border rounded
                           text-foreground focus:outline-none focus:border-purple-500"
                placeholder="main"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {targets.map((target) => (
                <button
                  key={`affected-${target.name}`}
                  onClick={() => runAffected(target.name, affectedBase)}
                  className="flex items-center gap-1.5 px-2 py-1 text-xs rounded
                             bg-purple-500/20 text-purple-400 border border-purple-500/30
                             hover:bg-purple-500/30 transition-colors"
                >
                  <Play className="w-3 h-3" />
                  {target.name}
                </button>
              ))}
            </div>
          </div>
        </CollapsibleSection>

        {/* Batch Execution Section - Collapsible */}
        <CollapsibleSection
          title="Run Many"
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
                nx run-many -t {'<target>'} -p proj1,proj2
              </code>
            </p>

            {batchError && (
              <div className="p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400 flex items-center justify-between">
                <span>{batchError}</span>
                <button onClick={clearBatchError} className="hover:text-red-300">
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Package selection */}
            <div>
              <h5 className="text-xs text-muted-foreground mb-2">Select Projects</h5>
              <PackageFilterBar
                packages={packageInfos}
                selectedPackages={selectedPackages}
                onSelectionChange={setSelectedPackages}
              />
            </div>

            {/* Target selection from Nx targets */}
            <div>
              <h5 className="text-xs text-muted-foreground mb-2">Target</h5>
              <div className="flex flex-wrap gap-2">
                {targets.slice(0, 10).map((target) => (
                  <button
                    key={target.name}
                    onClick={() => setSelectedScript(target.name)}
                    className={cn(
                      'px-2 py-1 rounded text-xs border transition-colors',
                      selectedScript === target.name
                        ? 'bg-green-500/20 text-green-400 border-green-500/30'
                        : 'bg-secondary text-muted-foreground border-border hover:border-muted-foreground'
                    )}
                  >
                    {target.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Run button */}
            <button
              onClick={() => handleRunMany(selectedScript)}
              disabled={batchLoading || selectedPackages.size === 0 || !selectedScript}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded
                         bg-green-600 text-white text-sm font-medium
                         hover:bg-green-500 transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {batchLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Run {selectedScript} on {selectedPackages.size} projects
                </>
              )}
            </button>

            {/* Current & History */}
            {(currentExecution || executionHistory.length > 0) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs text-muted-foreground">Results</h5>
                  {executionHistory.length > 0 && (
                    <button
                      onClick={clearHistory}
                      className="text-xs text-muted-foreground hover:text-foreground/80"
                    >
                      Clear
                    </button>
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
          iconColor="text-blue-400"
          expanded={cacheExpanded}
          onToggle={() => setCacheExpanded(!cacheExpanded)}
        >
          <NxCacheStatusInline projectPath={projectPath} />
        </CollapsibleSection>
      </div>

      {/* Execution Output Panel */}
      {outputPanelExecution && (
        <ExecutionOutputPanel
          executionId={outputPanelExecution.executionId}
          taskName={
            outputPanelExecution.project
              ? `${outputPanelExecution.project}:${outputPanelExecution.target}`
              : outputPanelExecution.target
          }
          status={outputPanelExecution.status as ExecutionStatus}
          output={outputPanelExecution.output || ''}
          exitCode={outputPanelExecution.exitCode}
          onClose={() => setOutputPanelExecution(null)}
        />
      )}
    </div>
  );
}

export default NxPanelUnified;
