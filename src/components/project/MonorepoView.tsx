/**
 * Monorepo workspace package view component
 * @see specs/002-frontend-project-manager/spec.md - US1
 * @see specs/008-monorepo-support - Monorepo tool integration
 *
 * Performance optimizations:
 * - Tool detection is fast (no version checks on initial load)
 * - Version is lazily loaded after UI is rendered
 * - Dependency graph is only loaded when tool panel is opened
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { Package, Folder, ShieldCheck, ShieldAlert, Layers, Zap, Box, Network } from 'lucide-react';
import type { WorkspacePackage, PackageManager, UIFramework } from '../../types/project';
import type { WorkspaceVulnSummary } from '../../types/security';
import type { DependencyNode } from '../../types/monorepo';
import { ScriptCards } from './ScriptCards';
import { MonorepoToolPanel } from './monorepo/MonorepoToolPanel';
import { useMonorepoTool } from '../../hooks/useMonorepoTool';
import { useDependencyGraph } from '../../hooks/useDependencyGraph';
import { cn } from '../../lib/utils';
import { UI_FRAMEWORK_CONFIG } from '../../lib/framework-detector';

/** Main view tabs */
type MainViewTab = 'packages' | 'tools';

/**
 * Security badge for workspace items
 */
function WorkspaceSecurityBadge({ summary }: { summary: WorkspaceVulnSummary | undefined }) {
  if (!summary) {
    return null;
  }

  const { total, critical, high } = summary.summary;

  if (total === 0) {
    return (
      <div className="flex items-center" title="No vulnerabilities">
        <ShieldCheck className="w-4 h-4 text-green-400" />
      </div>
    );
  }

  const hasCritical = critical > 0;
  const hasHigh = high > 0;

  return (
    <div
      className={cn(
        'px-1.5 py-0.5 text-xs rounded flex items-center gap-1',
        hasCritical
          ? 'bg-red-500/20 text-red-400'
          : hasHigh
          ? 'bg-orange-500/20 text-orange-400'
          : 'bg-yellow-500/20 text-yellow-400'
      )}
      title={`${total} vulnerabilities (${critical} critical, ${high} high)`}
    >
      <ShieldAlert className="w-3 h-3" />
      <span>{total}</span>
    </div>
  );
}

/**
 * UI Framework badge for workspace items
 */
function WorkspaceFrameworkBadge({ uiFramework }: { uiFramework: UIFramework | undefined }) {
  if (!uiFramework || !UI_FRAMEWORK_CONFIG[uiFramework]) {
    return null;
  }

  const config = UI_FRAMEWORK_CONFIG[uiFramework];
  const Icon = config.icon;

  return (
    <span
      className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded', config.color)}
      title={config.label}
    >
      <Icon className="w-3 h-3" />
    </span>
  );
}

interface MonorepoViewProps {
  workspaces: WorkspacePackage[];
  /** Map of running scripts for tracking state per workspace */
  runningScriptsMap: Map<string, { scriptName: string; projectPath: string; status: string }>;
  runningCommands: Set<string>;
  packageManager: PackageManager;
  /** Security summaries per workspace (optional) */
  workspaceSummaries?: WorkspaceVulnSummary[];
  /** Project path for monorepo tool detection */
  projectPath?: string;
  onExecuteScript: (scriptName: string, cwd?: string) => void;
  onCancelScript: (scriptName: string, cwd?: string) => void;
  onExecuteCommand: (command: string) => void;
  onCancelCommand: (commandId: string) => void;
  /** Callback to show dependency graph (optional) */
  onShowDependencyGraph?: () => void;
}

export function MonorepoView({
  workspaces,
  runningScriptsMap,
  runningCommands,
  packageManager,
  workspaceSummaries,
  projectPath,
  onExecuteScript,
  onCancelScript,
  onExecuteCommand,
  onCancelCommand,
  onShowDependencyGraph,
}: MonorepoViewProps) {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(
    workspaces.length > 0 ? workspaces[0].name : null
  );
  const [mainViewTab, setMainViewTab] = useState<MainViewTab>('packages');

  // Track if dependency graph has been requested
  const graphRequested = useRef(false);

  // Monorepo tool detection (008-monorepo-support) - fast, no version checks
  const monorepoTool = useMonorepoTool(projectPath || null);

  // Check if tool panel should be available
  const toolPanelAvailable =
    monorepoTool.selectedTool === 'nx' || monorepoTool.selectedTool === 'turbo';

  // Dependency graph - LAZY LOADING: only load when tools tab is shown
  // This avoids the performance hit of loading the graph on initial render
  const shouldLoadGraph = mainViewTab === 'tools';

  // Mark graph as requested when panel is shown (for caching)
  useEffect(() => {
    if (shouldLoadGraph) {
      graphRequested.current = true;
    }
  }, [shouldLoadGraph]);

  const dependencyGraph = useDependencyGraph(
    shouldLoadGraph ? (projectPath || null) : null,
    shouldLoadGraph ? monorepoTool.selectedTool : null
  );

  const activePackage = workspaces.find(w => w.name === selectedPackage);

  const summaryMap = useMemo(() => {
    if (!workspaceSummaries) return new Map<string, WorkspaceVulnSummary>();
    return new Map(workspaceSummaries.map(s => [s.packageName, s]));
  }, [workspaceSummaries]);

  // Convert dependency graph nodes for tool panel
  const dependencyNodes: DependencyNode[] = useMemo(() => {
    if (!dependencyGraph.graph?.nodes) return [];
    return dependencyGraph.graph.nodes;
  }, [dependencyGraph.graph?.nodes]);

  // Collect all available scripts across workspaces
  const availableScripts = useMemo(() => {
    const scriptSet = new Set<string>();
    workspaces.forEach((ws) => {
      Object.keys(ws.scripts).forEach((script) => scriptSet.add(script));
    });
    return Array.from(scriptSet).sort();
  }, [workspaces]);

  // Get tool display name and version
  const toolDisplayInfo = useMemo(() => {
    const tool = monorepoTool.selectedTool;
    const version = tool ? monorepoTool.toolVersions.get(tool) : null;

    if (tool === 'nx') {
      return { name: 'Nx', version, icon: Box };
    }
    if (tool === 'turbo') {
      return { name: 'Turbo', version, icon: Zap };
    }
    return { name: 'Tools', version: null, icon: Layers };
  }, [monorepoTool.selectedTool, monorepoTool.toolVersions]);

  // Keyboard shortcuts (Phase 9 - Polish)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+G or Ctrl+G: Show dependency graph
      if ((e.metaKey || e.ctrlKey) && e.key === 'g' && !e.shiftKey) {
        e.preventDefault();
        if (onShowDependencyGraph && monorepoTool.hasMonorepoTool) {
          onShowDependencyGraph();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onShowDependencyGraph, monorepoTool.hasMonorepoTool]);

  if (workspaces.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No workspace packages found</p>
      </div>
    );
  }

  const ToolIcon = toolDisplayInfo.icon;

  return (
    <div className="flex flex-col h-full">
      {/* Tab Navigation */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background/50">
        <div className="flex gap-1" role="tablist" aria-label="Workspace views">
          {/* Packages Tab */}
          <button
            role="tab"
            aria-selected={mainViewTab === 'packages'}
            onClick={() => setMainViewTab('packages')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition-colors',
              mainViewTab === 'packages'
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            )}
          >
            <Package className="w-4 h-4" />
            Packages
          </button>

          {/* Tool Tab - Only show when Nx or Turbo is detected */}
          {toolPanelAvailable && (
            <button
              role="tab"
              aria-selected={mainViewTab === 'tools'}
              onClick={() => setMainViewTab('tools')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition-colors',
                mainViewTab === 'tools'
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <ToolIcon className="w-4 h-4" />
              {toolDisplayInfo.name}
              {toolDisplayInfo.version && (
                <span className="text-xs text-muted-foreground">v{toolDisplayInfo.version}</span>
              )}
            </button>
          )}
        </div>

        {/* Dependency Graph Button */}
        {onShowDependencyGraph && monorepoTool.hasMonorepoTool && (
          <button
            onClick={onShowDependencyGraph}
            className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground
                       hover:text-foreground hover:bg-accent rounded transition-colors"
            title="View dependency graph (Cmd+G)"
          >
            <Network className="w-3.5 h-3.5" />
            Dependency Graph
          </button>
        )}
      </div>

      {/* Main Content Area */}
      {mainViewTab === 'packages' ? (
        <div className="flex gap-4 flex-1 min-h-0 p-4">
          {/* Left side package list */}
          <div className="w-64 flex-shrink-0 bg-card/50 rounded-lg overflow-hidden self-start">
            <div className="p-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Workspaces</h3>
            </div>
            <ul className="overflow-y-auto max-h-[calc(100vh-300px)]">
              {workspaces.map(workspace => {
                const isSelected = selectedPackage === workspace.name;
                const hasScripts = Object.keys(workspace.scripts).length > 0;

                return (
                  <li key={workspace.name}>
                    <button
                      onClick={() => setSelectedPackage(workspace.name)}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 text-left transition-colors border-l-2',
                        isSelected
                          ? 'bg-blue-600/20 text-blue-400 border-blue-400'
                          : 'hover:bg-accent text-foreground border-transparent'
                      )}
                    >
                      <Package className="w-4 h-4 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{workspace.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{workspace.relativePath}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <WorkspaceFrameworkBadge uiFramework={workspace.uiFramework} />
                        <WorkspaceSecurityBadge summary={summaryMap.get(workspace.name)} />
                        {hasScripts && (
                          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {Object.keys(workspace.scripts).length}
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Scripts content */}
          <div className="flex-1 min-w-0">
            {activePackage ? (
              <div>
                <div className="mb-4 p-3 bg-card/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-blue-400" />
                    <h2 className="text-lg font-semibold text-foreground">{activePackage.name}</h2>
                    <span className="text-sm text-muted-foreground">v{activePackage.version}</span>
                    {activePackage.uiFramework && UI_FRAMEWORK_CONFIG[activePackage.uiFramework] && (
                      (() => {
                        const config = UI_FRAMEWORK_CONFIG[activePackage.uiFramework!];
                        const Icon = config.icon;
                        return (
                          <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded', config.color)}>
                            <Icon className="w-3 h-3" />
                            {config.label}
                          </span>
                        );
                      })()
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground">
                    <Folder className="w-4 h-4" />
                    <span>{activePackage.relativePath}</span>
                  </div>
                </div>

                <ScriptCards
                  scripts={activePackage.scripts}
                  runningScriptsMap={runningScriptsMap}
                  runningCommands={runningCommands}
                  packageManager={packageManager}
                  projectPath={activePackage.absolutePath}
                  onExecute={(scriptName, cwd) => onExecuteScript(scriptName, cwd || activePackage.absolutePath)}
                  onCancel={(scriptName, cwd) => onCancelScript(scriptName, cwd || activePackage.absolutePath)}
                  onExecuteCommand={onExecuteCommand}
                  onCancelCommand={onCancelCommand}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>Select a package to view its scripts</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Tools Tab - Full width tool panel */
        <div className="flex-1 min-h-0 p-4">
          {projectPath && (
            <MonorepoToolPanel
              projectPath={projectPath}
              selectedTool={monorepoTool.selectedTool}
              packages={dependencyNodes}
              availableScripts={availableScripts}
              className="h-full"
            />
          )}
        </div>
      )}
    </div>
  );
}
