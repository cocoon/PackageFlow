/**
 * Task Quick Switcher Component
 * Feature: 008-monorepo-support
 *
 * Provides Cmd+Shift+T shortcut to quickly access and run tasks
 * Integrates with existing QuickSwitcher UI component
 */

import { useMemo, useEffect, useState, useCallback } from 'react';
import { Zap, Box } from 'lucide-react';
import { QuickSwitcher, type QuickSwitcherItem } from '../../ui/QuickSwitcher';
import { type TaskItem } from './TaskComponents';

interface TaskQuickSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  /** Turbo pipelines */
  turboPipelines?: TaskItem[];
  /** Nx targets */
  nxTargets?: TaskItem[];
  /** Callback when task is selected */
  onRunTask: (taskName: string, source: 'turbo' | 'nx') => void;
  /** Optional: Force run (skip cache) */
  forceRun?: boolean;
}

export function TaskQuickSwitcher({
  isOpen,
  onClose,
  turboPipelines = [],
  nxTargets = [],
  onRunTask,
  forceRun = false,
}: TaskQuickSwitcherProps) {
  const items: QuickSwitcherItem[] = useMemo(() => {
    const result: QuickSwitcherItem[] = [];

    // Add Turbo pipelines
    for (const pipeline of turboPipelines) {
      result.push({
        id: `turbo-${pipeline.name}`,
        title: pipeline.name,
        subtitle: pipeline.dependsOn?.length
          ? `depends on: ${pipeline.dependsOn.join(', ')}`
          : pipeline.cache && !forceRun
            ? 'cached'
            : undefined,
        icon: <Zap className="w-4 h-4 text-purple-400" />,
        category: 'Turbo',
        keywords: [pipeline.name, 'turbo', ...(pipeline.dependsOn || [])],
        onSelect: () => onRunTask(pipeline.name, 'turbo'),
      });
    }

    // Add Nx targets
    for (const target of nxTargets) {
      result.push({
        id: `nx-${target.name}`,
        title: target.name,
        subtitle: target.dependsOn?.length
          ? `depends on: ${target.dependsOn.join(', ')}`
          : target.cache && !forceRun
            ? 'cached'
            : undefined,
        icon: <Box className="w-4 h-4 text-blue-400" />,
        category: 'Nx',
        keywords: [target.name, 'nx', ...(target.dependsOn || [])],
        onSelect: () => onRunTask(target.name, 'nx'),
      });
    }

    return result;
  }, [turboPipelines, nxTargets, forceRun, onRunTask]);

  return (
    <QuickSwitcher
      isOpen={isOpen}
      onClose={onClose}
      items={items}
      title="Run Task"
      placeholder="Search tasks..."
      emptyMessage="No tasks found"
    />
  );
}

// ============================================================================
// Hook for Task Quick Switcher keyboard shortcut
// ============================================================================

interface UseTaskQuickSwitcherOptions {
  /** Shortcut key combo: default is Cmd+Shift+T */
  shortcutKey?: string;
  /** Whether the shortcut is enabled */
  enabled?: boolean;
}

export function useTaskQuickSwitcher(options: UseTaskQuickSwitcherOptions = {}) {
  const { shortcutKey = 't', enabled = true } = options;
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  // Global keyboard shortcut: Cmd+Shift+T
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === shortcutKey) {
        e.preventDefault();
        toggle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, shortcutKey, toggle]);

  return {
    isOpen,
    open,
    close,
    toggle,
  };
}

export default TaskQuickSwitcher;
