/**
 * Worktree Script Execution Hook
 * Manages script execution within specific worktree contexts
 * @see specs/001-worktree-enhancements/tasks.md - T017
 */

import { useCallback } from 'react';
import { useScriptExecutionContext } from '../contexts/ScriptExecutionContext';
import type { CategorizedScript, ScriptCategory, PackageManager } from '../types';

interface UseWorktreeScriptsReturn {
  /**
   * Execute a script in the specified worktree directory
   * @param worktreePath - Absolute path to the worktree
   * @param scriptName - Name of the script to run
   * @param packageManager - Package manager to use (npm, yarn, pnpm, bun)
   * @param projectName - Optional project name for display
   * @returns executionId if successful, null otherwise
   */
  executeScriptInWorktree: (
    worktreePath: string,
    scriptName: string,
    packageManager: string,
    projectName?: string
  ) => Promise<string | null>;

  /**
   * Get categorized scripts from a project
   * Categorizes scripts into development, build, test, lint, and other
   * @param scripts - Record of script names to commands
   * @returns Array of categorized scripts
   */
  getCategorizedScripts: (scripts: Record<string, string>) => CategorizedScript[];

  /**
   * Check if a worktree has running processes
   * @param worktreePath - Absolute path to the worktree
   * @returns true if the worktree has running processes
   */
  isWorktreeRunning: (worktreePath: string) => boolean;
}

/**
 * Categorize a script based on its name and command
 */
function categorizeScript(name: string, command: string): ScriptCategory {
  const lowerName = name.toLowerCase();
  const lowerCommand = command.toLowerCase();

  // Development scripts
  if (
    lowerName === 'dev' ||
    lowerName === 'start' ||
    lowerName === 'serve' ||
    lowerName.includes('dev') ||
    lowerCommand.includes('vite') ||
    lowerCommand.includes('next dev') ||
    lowerCommand.includes('webpack-dev')
  ) {
    return 'development';
  }

  // Build scripts
  if (
    lowerName === 'build' ||
    lowerName.includes('build') ||
    lowerName === 'compile' ||
    lowerCommand.includes('tsc') ||
    lowerCommand.includes('webpack') ||
    lowerCommand.includes('rollup')
  ) {
    return 'build';
  }

  // Test scripts
  if (
    lowerName === 'test' ||
    lowerName.includes('test') ||
    lowerName === 'spec' ||
    lowerCommand.includes('jest') ||
    lowerCommand.includes('vitest') ||
    lowerCommand.includes('mocha')
  ) {
    return 'test';
  }

  // Lint scripts
  if (
    lowerName === 'lint' ||
    lowerName.includes('lint') ||
    lowerName === 'format' ||
    lowerCommand.includes('eslint') ||
    lowerCommand.includes('prettier') ||
    lowerCommand.includes('biome')
  ) {
    return 'lint';
  }

  return 'other';
}

export function useWorktreeScripts(): UseWorktreeScriptsReturn {
  const { runningScripts, executeScript } = useScriptExecutionContext();

  /**
   * Execute a script in the specified worktree
   * Uses the existing executeScript with cwd set to the worktree path
   */
  const executeScriptInWorktree = useCallback(
    async (
      worktreePath: string,
      scriptName: string,
      packageManager: string,
      projectName?: string
    ): Promise<string | null> => {
      try {
        // Use the existing executeScript with worktree path as cwd
        // The worktree folder name is used to make the script name more descriptive
        const worktreeName = worktreePath.split('/').pop() || 'worktree';

        const executionId = await executeScript({
          projectPath: worktreePath,
          scriptName,
          packageManager: packageManager as PackageManager,
          cwd: worktreePath,
          projectName: projectName ? `${projectName} - ${worktreeName}` : worktreeName,
        });

        return executionId;
      } catch (err) {
        console.error('Error executing script in worktree:', err);
        return null;
      }
    },
    [executeScript]
  );

  /**
   * Get categorized scripts from a project's scripts record
   */
  const getCategorizedScripts = useCallback(
    (scripts: Record<string, string>): CategorizedScript[] => {
      return Object.entries(scripts).map(([name, command]) => ({
        name,
        command,
        category: categorizeScript(name, command),
      }));
    },
    []
  );

  /**
   * Check if a worktree has running processes
   */
  const isWorktreeRunning = useCallback(
    (worktreePath: string): boolean => {
      for (const script of runningScripts.values()) {
        if (script.status === 'running' && script.projectPath === worktreePath) {
          return true;
        }
      }
      return false;
    },
    [runningScripts]
  );

  return {
    executeScriptInWorktree,
    getCategorizedScripts,
    isWorktreeRunning,
  };
}
