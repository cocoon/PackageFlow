/**
 * Task UI Components
 * Feature: 008-monorepo-support
 *
 * Shared components for task display and interaction:
 * - TaskSearchBar: Inline search with Cmd+/ shortcut
 * - TaskButton: Visual task card with dependencies
 * - TaskCategoryGroup: Grouped task display
 * - RecentTasks: Quick access to recent tasks
 */

import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import {
  Search,
  X,
  Play,
  Eye,
  Loader2,
  Clock,
  Hammer,
  TestTube,
  Sparkles,
  Rocket,
  Package,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../../../lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface TaskItem {
  name: string;
  dependsOn?: string[];
  cache?: boolean;
  outputs?: string[];
  inputs?: string[];
}

export interface TaskSearchBarProps {
  tasks: TaskItem[];
  onTaskRun: (taskName: string) => void;
  onTaskDryRun?: (taskName: string) => void;
  placeholder?: string;
  shortcutKey?: string;
}

export interface TaskButtonProps {
  task: TaskItem;
  onRun: () => void;
  onDryRun?: () => void;
  isRunning?: boolean;
  forceRun?: boolean;
  compact?: boolean;
}

export interface TaskCategoryGroupProps {
  tasks: TaskItem[];
  onTaskRun: (taskName: string) => void;
  onTaskDryRun?: (taskName: string) => void;
  runningTasks?: Set<string>;
  forceRun?: boolean;
}

export interface RecentTasksProps {
  tasks: TaskItem[];
  recentTaskNames: string[];
  onTaskRun: (taskName: string) => void;
  maxItems?: number;
}

// ============================================================================
// Task Categorization
// ============================================================================

type TaskCategory = 'build' | 'test' | 'lint' | 'dev' | 'other';

const TASK_CATEGORIES: Record<TaskCategory, string[]> = {
  build: ['build', 'compile', 'bundle', 'package', 'dist'],
  test: ['test', 'e2e', 'spec', 'coverage', 'unit'],
  lint: ['lint', 'format', 'check', 'typecheck', 'eslint', 'prettier'],
  dev: ['dev', 'start', 'serve', 'watch', 'preview'],
  other: [],
};

const CATEGORY_CONFIG: Record<
  TaskCategory,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  build: { label: 'Build', icon: Hammer, color: 'text-amber-400' },
  test: { label: 'Test', icon: TestTube, color: 'text-green-400' },
  lint: { label: 'Lint & Format', icon: Sparkles, color: 'text-purple-400' },
  dev: { label: 'Development', icon: Rocket, color: 'text-blue-400' },
  other: { label: 'Other', icon: Package, color: 'text-muted-foreground' },
};

function categorizeTask(taskName: string): TaskCategory {
  const lowerName = taskName.toLowerCase();
  for (const [category, keywords] of Object.entries(TASK_CATEGORIES)) {
    if (category === 'other') continue;
    if (keywords.some((keyword) => lowerName.includes(keyword))) {
      return category as TaskCategory;
    }
  }
  return 'other';
}

function groupTasksByCategory(tasks: TaskItem[]): Map<TaskCategory, TaskItem[]> {
  const groups = new Map<TaskCategory, TaskItem[]>();
  const categoryOrder: TaskCategory[] = ['build', 'test', 'lint', 'dev', 'other'];

  // Initialize groups in order
  for (const cat of categoryOrder) {
    groups.set(cat, []);
  }

  // Group tasks
  for (const task of tasks) {
    const category = categorizeTask(task.name);
    groups.get(category)?.push(task);
  }

  // Remove empty groups
  for (const [cat, items] of groups) {
    if (items.length === 0) {
      groups.delete(cat);
    }
  }

  return groups;
}

// ============================================================================
// TaskSearchBar Component
// ============================================================================

export function TaskSearchBar({
  tasks,
  onTaskRun,
  onTaskDryRun,
  placeholder = 'Search tasks...',
  shortcutKey = '/',
}: TaskSearchBarProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredTasks = useMemo(() => {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase();
    return tasks
      .filter((t) => t.name.toLowerCase().includes(lowerQuery))
      .slice(0, 8);
  }, [tasks, query]);

  // Global shortcut: Cmd+/
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === shortcutKey) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcutKey]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || filteredTasks.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, filteredTasks.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredTasks[selectedIndex]) {
            onTaskRun(filteredTasks[selectedIndex].name);
            setQuery('');
            setIsOpen(false);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          inputRef.current?.blur();
          break;
      }
    },
    [isOpen, filteredTasks, selectedIndex, onTaskRun]
  );

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative mb-4">
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 bg-secondary/50 border rounded-lg transition-colors',
          isOpen ? 'border-muted-foreground' : 'border-border'
        )}
      >
        <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none min-w-0"
        />
        <kbd className="hidden sm:inline-flex px-1.5 py-0.5 text-[10px] text-muted-foreground bg-accent rounded">
          ⌘{shortcutKey}
        </kbd>
        {query && (
          <button
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="p-0.5 text-muted-foreground hover:text-foreground/90 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && filteredTasks.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-20 w-full mt-1 bg-secondary border border-border rounded-lg shadow-xl overflow-hidden"
        >
          {filteredTasks.map((task, index) => {
            const category = categorizeTask(task.name);
            const config = CATEGORY_CONFIG[category];
            const Icon = config.icon;

            return (
              <div
                key={task.name}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors group',
                  index === selectedIndex ? 'bg-accent' : 'hover:bg-accent/50'
                )}
                onClick={() => {
                  onTaskRun(task.name);
                  setQuery('');
                  setIsOpen(false);
                }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <Icon className={cn('w-4 h-4 flex-shrink-0', config.color)} />
                <span className="flex-1 text-sm text-foreground truncate">{task.name}</span>
                {task.dependsOn && task.dependsOn.length > 0 && (
                  <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                    → {task.dependsOn.join(', ')}
                  </span>
                )}
                {onTaskDryRun && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTaskDryRun(task.name);
                      setQuery('');
                      setIsOpen(false);
                    }}
                    className="p-1 rounded text-muted-foreground hover:text-amber-400 hover:bg-accent
                               opacity-0 group-hover:opacity-100 transition-all"
                    title="Dry Run - Preview what will run without executing"
                  >
                    <Eye className="w-3 h-3" />
                  </button>
                )}
                <Play className="w-3.5 h-3.5 text-muted-foreground group-hover:text-green-400 transition-colors" />
              </div>
            );
          })}
          <div className="px-3 py-1.5 text-[10px] text-muted-foreground border-t border-border flex items-center gap-3">
            <span>
              <kbd className="px-1 py-0.5 bg-accent rounded">↑↓</kbd> navigate
            </span>
            <span>
              <kbd className="px-1 py-0.5 bg-accent rounded">↵</kbd> run
            </span>
            <span>
              <kbd className="px-1 py-0.5 bg-accent rounded">esc</kbd> close
            </span>
          </div>
        </div>
      )}

      {/* No results message */}
      {isOpen && query && filteredTasks.length === 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-20 w-full mt-1 bg-secondary border border-border rounded-lg shadow-xl p-3"
        >
          <p className="text-sm text-muted-foreground text-center">No tasks found for "{query}"</p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TaskButton Component (Memoized for performance)
// ============================================================================

export const TaskButton = memo(function TaskButton({
  task,
  onRun,
  onDryRun,
  isRunning = false,
  forceRun = false,
  compact = false,
}: TaskButtonProps) {
  const category = categorizeTask(task.name);
  const config = CATEGORY_CONFIG[category];
  const Icon = config.icon;

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={onRun}
          disabled={isRunning}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors',
            'bg-secondary text-foreground/90 border border-border',
            'hover:bg-accent hover:border-muted-foreground',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isRunning ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
          <span className="text-sm">{task.name}</span>
          {task.cache && !forceRun && (
            <span className="text-[10px] text-muted-foreground">(cached)</span>
          )}
        </button>
        {onDryRun && (
          <button
            onClick={onDryRun}
            className="p-1.5 rounded text-muted-foreground hover:text-amber-400 hover:bg-secondary transition-colors"
            title="Dry Run - Preview what will run without executing"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group relative rounded-lg border bg-secondary/50 transition-all',
        isRunning ? 'border-blue-500/50' : 'border-border hover:border-muted-foreground hover:bg-secondary'
      )}
    >
      <button
        onClick={onRun}
        disabled={isRunning}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left disabled:cursor-not-allowed"
      >
        <div
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
            isRunning ? 'bg-blue-500/20' : 'bg-accent'
          )}
        >
          {isRunning ? (
            <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
          ) : (
            <Icon className={cn('w-4 h-4', config.color)} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground truncate">{task.name}</div>
          {task.dependsOn && task.dependsOn.length > 0 && (
            <div className="text-[10px] text-muted-foreground truncate">
              depends on: {task.dependsOn.join(', ')}
            </div>
          )}
        </div>
        {task.cache && !forceRun && (
          <span className="px-1.5 py-0.5 text-[10px] bg-green-500/10 text-green-400 rounded flex-shrink-0">
            cached
          </span>
        )}
      </button>

      {/* Hover actions */}
      {onDryRun && !isRunning && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDryRun();
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded
                     text-muted-foreground hover:text-amber-400 hover:bg-accent
                     opacity-0 group-hover:opacity-100 transition-all"
          title="Dry Run - Preview what will run without executing"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
});

// ============================================================================
// TaskCategoryGroup Component
// ============================================================================

// Memoized task item to prevent unnecessary callback recreation
const MemoizedTaskItem = memo(function MemoizedTaskItem({
  task,
  taskName,
  onTaskRun,
  onTaskDryRun,
  isRunning,
  forceRun,
}: {
  task: TaskItem;
  taskName: string;
  onTaskRun: (taskName: string) => void;
  onTaskDryRun?: (taskName: string) => void;
  isRunning: boolean;
  forceRun: boolean;
}) {
  const handleRun = useCallback(() => onTaskRun(taskName), [onTaskRun, taskName]);
  const handleDryRun = useMemo(
    () => (onTaskDryRun ? () => onTaskDryRun(taskName) : undefined),
    [onTaskDryRun, taskName]
  );

  return (
    <TaskButton
      task={task}
      onRun={handleRun}
      onDryRun={handleDryRun}
      isRunning={isRunning}
      forceRun={forceRun}
    />
  );
});

export function TaskCategoryGroup({
  tasks,
  onTaskRun,
  onTaskDryRun,
  runningTasks = new Set(),
  forceRun = false,
}: TaskCategoryGroupProps) {
  const groupedTasks = useMemo(() => groupTasksByCategory(tasks), [tasks]);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = useCallback((category: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  if (groupedTasks.size === 0) {
    return null;
  }

  // If only one category, don't show category headers
  if (groupedTasks.size === 1) {
    const [, categoryTasks] = Array.from(groupedTasks)[0];
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {categoryTasks.map((task) => (
          <MemoizedTaskItem
            key={task.name}
            task={task}
            taskName={task.name}
            onTaskRun={onTaskRun}
            onTaskDryRun={onTaskDryRun}
            isRunning={runningTasks.has(task.name)}
            forceRun={forceRun}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Array.from(groupedTasks).map(([category, categoryTasks]) => {
        const config = CATEGORY_CONFIG[category];
        const Icon = config.icon;
        const isCollapsed = collapsedCategories.has(category);

        return (
          <div key={category}>
            <button
              onClick={() => toggleCategory(category)}
              className="flex items-center gap-2 mb-2 text-xs uppercase tracking-wider text-muted-foreground
                         hover:text-muted-foreground transition-colors w-full text-left"
            >
              {isCollapsed ? (
                <ChevronRight className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
              <Icon className={cn('w-3.5 h-3.5', config.color)} />
              <span>{config.label}</span>
              <span className="text-muted-foreground/70">({categoryTasks.length})</span>
            </button>
            {!isCollapsed && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {categoryTasks.map((task) => (
                  <MemoizedTaskItem
                    key={task.name}
                    task={task}
                    taskName={task.name}
                    onTaskRun={onTaskRun}
                    onTaskDryRun={onTaskDryRun}
                    isRunning={runningTasks.has(task.name)}
                    forceRun={forceRun}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// RecentTasks Component
// ============================================================================

const RECENT_TASKS_STORAGE_KEY = 'packageflow:recent-tasks';

export function useRecentTasks(projectPath: string) {
  const [recentTasks, setRecentTasks] = useState<string[]>([]);
  const storageKey = `${RECENT_TASKS_STORAGE_KEY}:${projectPath}`;

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setRecentTasks(JSON.parse(stored));
      }
    } catch {
      // Ignore errors
    }
  }, [storageKey]);

  // Add task to recent
  const addRecentTask = useCallback(
    (taskName: string) => {
      setRecentTasks((prev) => {
        const filtered = prev.filter((t) => t !== taskName);
        const updated = [taskName, ...filtered].slice(0, 10);
        try {
          localStorage.setItem(storageKey, JSON.stringify(updated));
        } catch {
          // Ignore errors
        }
        return updated;
      });
    },
    [storageKey]
  );

  return { recentTasks, addRecentTask };
}

export function RecentTasks({ tasks, recentTaskNames, onTaskRun, maxItems = 3 }: RecentTasksProps) {
  const recentTasks = useMemo(() => {
    return recentTaskNames
      .slice(0, maxItems)
      .map((name) => tasks.find((t) => t.name === name))
      .filter((t): t is TaskItem => t !== undefined);
  }, [tasks, recentTaskNames, maxItems]);

  if (recentTasks.length === 0) {
    return null;
  }

  return (
    <div className="mb-4 pb-4 border-b border-border">
      <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
        <Clock className="w-3 h-3" />
        Recent
      </h4>
      <div className="flex flex-wrap gap-2">
        {recentTasks.map((task) => (
          <button
            key={task.name}
            onClick={() => onTaskRun(task.name)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full
                       bg-blue-500/10 text-blue-400 border border-blue-500/20
                       hover:bg-blue-500/20 transition-colors text-sm"
          >
            <Play className="w-3 h-3" />
            {task.name}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Export all
// ============================================================================

export { categorizeTask, groupTasksByCategory, CATEGORY_CONFIG };
