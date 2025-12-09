/**
 * Script category cards component
 * @see specs/002-frontend-project-manager/spec.md - US2
 * @see specs/006-node-package-manager/spec.md - US2 (version check before execution)
 */

import { useState, useCallback } from 'react';
import { Play, Square } from 'lucide-react';
import type { ScriptCategory, PackageManager } from '../../types/project';
import type { Worktree, WorktreeStatus, EditorDefinition } from '../../lib/tauri-api';
import type { VersionCompatibility } from '../../types/version';
import { PackageManagerCommands } from './PackageManagerCommands';
import { WorkingDirectorySelector } from './WorkingDirectorySelector';
import { VersionWarningDialog } from './VersionWarningDialog';
import { useVersionCheck } from '../../hooks/useVersionCheck';

interface ScriptCardsProps {
  scripts: Record<string, string>;
  /** Map of running scripts, keyed by executionId */
  runningScriptsMap: Map<string, { scriptName: string; projectPath: string; status: string }>;
  runningCommands: Set<string>;
  packageManager: PackageManager;
  /** Current project path (main worktree) */
  projectPath: string;
  /** Available worktrees for this project */
  worktrees?: Worktree[];
  /** Currently selected worktree path */
  selectedWorktreePath?: string;
  /** Map of worktree statuses keyed by path */
  worktreeStatuses?: Record<string, WorktreeStatus>;
  /** Whether worktree statuses are loading */
  isLoadingStatuses?: boolean;
  /** Available editors for "Open in" action */
  availableEditors?: EditorDefinition[];
  /** Callback when worktree selection changes */
  onWorktreeChange?: (worktreePath: string) => void;
  onExecute: (scriptName: string, cwd?: string) => void;
  onCancel: (scriptName: string, cwd?: string) => void;
  onExecuteCommand: (command: string) => void;
  onCancelCommand: (commandId: string) => void;
}

interface CategorizedScript {
  name: string;
  command: string;
  category: ScriptCategory;
}

// Script categorization logic
function categorizeScript(name: string): ScriptCategory {
  const lowerName = name.toLowerCase();

  if (/^(dev|start|serve|watch)/.test(lowerName)) {
    return 'development';
  }
  if (/^(build|compile|bundle|dist)/.test(lowerName)) {
    return 'build';
  }
  if (/^(test|e2e|spec|coverage|jest|vitest|mocha)/.test(lowerName)) {
    return 'test';
  }
  if (/^(lint|format|prettier|eslint|stylelint|check|typecheck|tsc)/.test(lowerName)) {
    return 'lint';
  }
  return 'other';
}

// Category configuration
const categoryConfig: Record<ScriptCategory, { label: string; color: string; bgColor: string }> = {
  development: {
    label: 'Development',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10 border-green-500/30',
  },
  build: {
    label: 'Build',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/30',
  },
  test: {
    label: 'Test',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10 border-purple-500/30',
  },
  lint: {
    label: 'Lint & Format',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10 border-yellow-500/30',
  },
  other: {
    label: 'Other',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/10 border-border',
  },
};

// Category display order
const categoryOrder: ScriptCategory[] = ['development', 'build', 'test', 'lint', 'other'];

export function ScriptCards({
  scripts,
  runningScriptsMap,
  runningCommands,
  packageManager,
  projectPath,
  worktrees = [],
  selectedWorktreePath,
  worktreeStatuses = {},
  isLoadingStatuses = false,
  availableEditors = [],
  onWorktreeChange,
  onExecute,
  onCancel,
  onExecuteCommand,
  onCancelCommand,
}: ScriptCardsProps) {
  // Current worktree path, defaults to project path
  const currentWorktreePath = selectedWorktreePath || projectPath;

  // Version check state
  const { checkCompatibility } = useVersionCheck();
  const [showVersionWarning, setShowVersionWarning] = useState(false);
  const [pendingScript, setPendingScript] = useState<string | null>(null);
  const [currentCompatibility, setCurrentCompatibility] = useState<VersionCompatibility | null>(null);

  // Check if a script is currently running in the selected worktree
  const isScriptRunningInWorktree = (scriptName: string): boolean => {
    for (const script of runningScriptsMap.values()) {
      if (
        script.scriptName === scriptName &&
        script.projectPath === currentWorktreePath &&
        script.status === 'running'
      ) {
        return true;
      }
    }
    return false;
  };

  // Handle script execution with version check
  const handleExecuteWithVersionCheck = useCallback(async (scriptName: string) => {
    // Check version compatibility before execution
    const compatibility = await checkCompatibility(currentWorktreePath);

    if (compatibility && !compatibility.isCompatible) {
      // Show warning dialog
      setCurrentCompatibility(compatibility);
      setPendingScript(scriptName);
      setShowVersionWarning(true);
    } else {
      // Version compatible or no requirements - execute directly
      onExecute(scriptName, currentWorktreePath);
    }
  }, [checkCompatibility, currentWorktreePath, onExecute]);

  // Handle continue despite version mismatch
  const handleContinueAnyway = useCallback(() => {
    if (pendingScript) {
      onExecute(pendingScript, currentWorktreePath);
      setPendingScript(null);
      setCurrentCompatibility(null);
    }
  }, [pendingScript, currentWorktreePath, onExecute]);

  // Handle cancel execution
  const handleCancelExecution = useCallback(() => {
    setPendingScript(null);
    setCurrentCompatibility(null);
  }, []);

  // Handle use Volta (future implementation)
  const handleUseVolta = useCallback(() => {
    // TODO: Implement Volta version switching
    // For now, just execute the script
    if (pendingScript) {
      onExecute(pendingScript, currentWorktreePath);
      setPendingScript(null);
      setCurrentCompatibility(null);
    }
  }, [pendingScript, currentWorktreePath, onExecute]);

  // Handle use Corepack (future implementation)
  const handleUseCorepack = useCallback(() => {
    // TODO: Implement Corepack version switching
    // For now, just execute the script
    if (pendingScript) {
      onExecute(pendingScript, currentWorktreePath);
      setPendingScript(null);
      setCurrentCompatibility(null);
    }
  }, [pendingScript, currentWorktreePath, onExecute]);

  // Categorize scripts
  const categorizedScripts = Object.entries(scripts).map(([name, command]) => ({
    name,
    command,
    category: categorizeScript(name),
  }));

  // Group by category and sort by name
  const groupedScripts = categoryOrder.reduce((acc, category) => {
    const scripts = categorizedScripts
      .filter(s => s.category === category)
      .sort((a, b) => a.name.localeCompare(b.name));
    if (scripts.length > 0) {
      acc[category] = scripts;
    }
    return acc;
  }, {} as Record<ScriptCategory, CategorizedScript[]>);

  const hasScripts = Object.keys(groupedScripts).length > 0;

  return (
    <div className="space-y-4">
      {/* Worktree selector */}
      <WorkingDirectorySelector
        worktrees={worktrees}
        selectedPath={currentWorktreePath}
        statuses={worktreeStatuses}
        isLoadingStatuses={isLoadingStatuses}
        availableEditors={availableEditors}
        onChange={(path) => onWorktreeChange?.(path)}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-min items-start">
        {/* Package manager commands card */}
        <PackageManagerCommands
          packageManager={packageManager}
          projectPath={currentWorktreePath}
          runningCommands={runningCommands}
          runningScriptsMap={runningScriptsMap}
          onExecute={onExecuteCommand}
          onCancel={onCancelCommand}
        />

        {/* Empty state when no scripts */}
        {!hasScripts && (
          <div className="col-span-full p-8 text-center text-muted-foreground">
            <p>No scripts defined for this project</p>
          </div>
        )}

        {/* Script category cards */}
        {categoryOrder.map(category => {
          const categoryScripts = groupedScripts[category];
          if (!categoryScripts) return null;

          const config = categoryConfig[category];

          return (
            <div
              key={category}
              className={`rounded-lg border ${config.bgColor} p-4`}
            >
              <h3 className={`text-sm font-semibold mb-3 ${config.color}`}>
                {config.label}
              </h3>
              <ul className="space-y-2">
                {categoryScripts.map(script => {
                  const isRunning = isScriptRunningInWorktree(script.name);

                  return (
                    <li key={script.name}>
                      <div className="flex items-center justify-between gap-2 p-2 rounded bg-card/50 hover:bg-card transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">
                            {script.name}
                          </div>
                          <div className="text-xs text-muted-foreground truncate" title={script.command}>
                            {script.command}
                          </div>
                        </div>
                        <button
                          onClick={() => isRunning
                            ? onCancel(script.name, currentWorktreePath)
                            : handleExecuteWithVersionCheck(script.name)
                          }
                          className={`p-1.5 rounded transition-colors flex-shrink-0 ${
                            isRunning
                              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                              : 'bg-muted text-foreground hover:bg-accent'
                          }`}
                          title={isRunning ? 'Stop' : 'Run'}
                        >
                          {isRunning ? (
                            <Square className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Version Warning Dialog */}
      {currentCompatibility && pendingScript && (
        <VersionWarningDialog
          open={showVersionWarning}
          onOpenChange={setShowVersionWarning}
          compatibility={currentCompatibility}
          scriptName={pendingScript}
          onContinue={handleContinueAnyway}
          onCancel={handleCancelExecution}
          onUseVolta={handleUseVolta}
          onUseCorepack={handleUseCorepack}
        />
      )}
    </div>
  );
}
