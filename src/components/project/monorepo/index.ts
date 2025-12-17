/**
 * Monorepo Components Index
 * Feature: 008-monorepo-support
 *
 * Re-exports all monorepo-related components for easier importing.
 */

export { MonorepoToolPanel } from './MonorepoToolPanel';
export { NxPanelUnified } from './NxPanelUnified';
export { TurboPanelUnified } from './TurboPanelUnified';
export { PackageFilterBar, type PackageInfo } from './PackageFilterBar';
export { DependencyGraphView } from './DependencyGraphView';
export {
  ExecutionOutputPanel,
  type ExecutionStatus,
  type ExecutionOutputPanelProps,
} from './ExecutionOutputPanel';

// Task UI Components (P1 improvements)
export {
  TaskSearchBar,
  TaskButton,
  TaskCategoryGroup,
  RecentTasks,
  useRecentTasks,
  categorizeTask,
  groupTasksByCategory,
  CATEGORY_CONFIG,
  type TaskItem,
  type TaskSearchBarProps,
  type TaskButtonProps,
  type TaskCategoryGroupProps,
  type RecentTasksProps,
} from './TaskComponents';

// Task Quick Switcher (P2 improvements)
export { TaskQuickSwitcher, useTaskQuickSwitcher } from './TaskQuickSwitcher';
