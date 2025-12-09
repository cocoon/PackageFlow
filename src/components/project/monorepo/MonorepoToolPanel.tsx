/**
 * MonorepoToolPanel Component
 * Feature: 008-monorepo-support
 *
 * Unified panel for Nx/Turbo tool execution.
 * Displays the appropriate tool panel based on selected monorepo tool.
 *
 * Refactored: Removed redundant inner tabs (Turbo | Batch).
 * Now uses TurboPanelUnified which integrates all Turbo features.
 */

import { useMemo } from 'react';
import { Layers, Box } from 'lucide-react';
import { NxPanelUnified } from './NxPanelUnified';
import { TurboPanelUnified } from './TurboPanelUnified';
import type { MonorepoToolType, DependencyNode } from '../../../types/monorepo';
import { cn } from '../../../lib/utils';

interface MonorepoToolPanelProps {
  projectPath: string;
  selectedTool: MonorepoToolType | null;
  /** Packages for batch execution */
  packages: DependencyNode[];
  /** Available scripts across all packages */
  availableScripts: string[];
  className?: string;
}

export function MonorepoToolPanel({
  projectPath,
  selectedTool,
  packages,
  availableScripts,
  className,
}: MonorepoToolPanelProps) {
  // Determine which tool panel to show
  const toolPanelContent = useMemo(() => {
    if (!selectedTool || selectedTool === 'unknown' || selectedTool === 'workspaces') {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Layers className="w-10 h-10 mb-3 opacity-50" />
          <p className="text-sm">No tool-specific panel available</p>
          <p className="text-xs mt-1 text-muted-foreground/70">
            Select Nx or Turborepo to see tool commands
          </p>
        </div>
      );
    }

    if (selectedTool === 'nx') {
      return (
        <NxPanelUnified
          projectPath={projectPath}
          packages={packages}
          availableScripts={availableScripts}
        />
      );
    }

    if (selectedTool === 'turbo') {
      return (
        <TurboPanelUnified
          projectPath={projectPath}
          packages={packages}
          availableScripts={availableScripts}
        />
      );
    }

    // Lerna fallback
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Box className="w-10 h-10 mb-3 opacity-50" />
        <p className="text-sm">Lerna support coming soon</p>
      </div>
    );
  }, [selectedTool, projectPath, packages, availableScripts]);

  return (
    <div className={cn('flex flex-col h-full bg-card rounded-lg border border-border overflow-hidden', className)}>
      {toolPanelContent}
    </div>
  );
}

export default MonorepoToolPanel;
