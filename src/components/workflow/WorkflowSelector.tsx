/**
 * Workflow Selector Component
 * Dropdown for selecting a target workflow to trigger
 * Feature 013: Workflow Trigger Workflow
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ChevronDown,
  Search,
  Workflow,
  Clock,
  Layers,
  FolderGit2,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import {
  workflowAPI,
  type AvailableWorkflowInfo,
  type CycleDetectionResult,
} from '../../lib/tauri-api';

interface WorkflowSelectorProps {
  /** Currently selected workflow ID */
  value: string | null;
  /** Current workflow ID (to exclude from list) */
  currentWorkflowId: string;
  /** Called when a workflow is selected */
  onChange: (workflowId: string, workflowName: string) => void;
  /** Disabled state */
  disabled?: boolean;
}

/**
 * Format relative time for display
 */
function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

/**
 * Workflow Selector Component
 */
export function WorkflowSelector({
  value,
  currentWorkflowId,
  onChange,
  disabled = false,
}: WorkflowSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [workflows, setWorkflows] = useState<AvailableWorkflowInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // Feature 013 T040-T042: Cycle detection state
  const [cycleWarnings, setCycleWarnings] = useState<Map<string, CycleDetectionResult>>(new Map());

  // Feature 013 T040: Check for cycles when selecting a workflow
  const checkCycle = useCallback(
    async (targetWorkflowId: string): Promise<CycleDetectionResult | null> => {
      // Skip if already cached
      if (cycleWarnings.has(targetWorkflowId)) {
        return cycleWarnings.get(targetWorkflowId) || null;
      }

      try {
        const result = await workflowAPI.detectWorkflowCycle(currentWorkflowId, targetWorkflowId);
        setCycleWarnings((prev) => new Map(prev).set(targetWorkflowId, result));
        return result;
      } catch (error) {
        console.error('Failed to check cycle:', error);
        return null;
      }
    },
    [currentWorkflowId, cycleWarnings]
  );

  // Load available workflows
  useEffect(() => {
    if (!currentWorkflowId) return;

    const loadWorkflows = async () => {
      setIsLoading(true);
      try {
        const available = await workflowAPI.getAvailableWorkflows(currentWorkflowId);
        setWorkflows(available);
        // Clear cycle warnings when workflows reload
        setCycleWarnings(new Map());
      } catch (error) {
        console.error('Failed to load available workflows:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkflows();
  }, [currentWorkflowId]);

  // Filter workflows by search query
  const filteredWorkflows = useMemo(() => {
    if (!searchQuery) return workflows;
    const query = searchQuery.toLowerCase();
    return workflows.filter(
      (w) =>
        w.name.toLowerCase().includes(query) ||
        w.description?.toLowerCase().includes(query) ||
        w.projectName?.toLowerCase().includes(query)
    );
  }, [workflows, searchQuery]);

  // Get selected workflow info
  const selectedWorkflow = useMemo(() => {
    return workflows.find((w) => w.id === value);
  }, [workflows, value]);

  // Feature 013 T040-T041: Handle workflow selection with cycle detection
  const handleSelect = async (workflow: AvailableWorkflowInfo) => {
    // Check for cycles before allowing selection
    const cycleResult = await checkCycle(workflow.id);

    if (cycleResult?.hasCycle) {
      // Don't close dropdown, let user see the warning
      return;
    }

    onChange(workflow.id, workflow.name);
    setIsOpen(false);
    setSearchQuery('');
  };

  // Feature 013 T042: Check if workflow would create a cycle
  const wouldCreateCycle = useCallback(
    (workflowId: string): CycleDetectionResult | null => {
      return cycleWarnings.get(workflowId) || null;
    },
    [cycleWarnings]
  );

  return (
    <div className="relative">
      {/* Trigger Button */}
      <Button
        variant="outline"
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'w-full justify-between h-auto px-3 py-2.5',
          !disabled && 'hover:border-accent focus:ring-purple-500'
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Workflow className="w-4 h-4 text-purple-400 shrink-0" />
          {selectedWorkflow ? (
            <div className="truncate">
              <span className="text-foreground">{selectedWorkflow.name}</span>
              {selectedWorkflow.projectName && (
                <span className="text-muted-foreground text-sm ml-2">
                  ({selectedWorkflow.projectName})
                </span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">Select a workflow...</span>
          )}
        </div>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-muted-foreground shrink-0 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </Button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Dropdown Menu */}
          <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-xl overflow-hidden">
            {/* Search Input */}
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search workflows..."
                  autoFocus
                  className={cn(
                    'w-full pl-8 pr-3 py-2 bg-background border border-border rounded-md',
                    'text-sm text-foreground placeholder-muted-foreground',
                    'focus:outline-none focus:ring-1 focus:ring-purple-500'
                  )}
                />
              </div>
            </div>

            {/* Workflow List */}
            <div className="max-h-64 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground">Loading workflows...</div>
              ) : filteredWorkflows.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  {searchQuery ? 'No workflows match your search' : 'No other workflows available'}
                </div>
              ) : (
                <div className="py-1">
                  {filteredWorkflows.map((workflow) => {
                    const cycleWarning = wouldCreateCycle(workflow.id);
                    const hasCycle = cycleWarning?.hasCycle;

                    return (
                      <Button
                        key={workflow.id}
                        variant="ghost"
                        type="button"
                        onClick={() => handleSelect(workflow)}
                        disabled={hasCycle}
                        className={cn(
                          'w-full flex-col gap-1 px-3 py-2.5 justify-start h-auto rounded-none',
                          hasCycle ? 'bg-red-500/10 cursor-not-allowed' : 'hover:bg-accent/50',
                          workflow.id === value && !hasCycle && 'bg-purple-500/10'
                        )}
                      >
                        {/* Name and Project */}
                        <div className="flex items-center gap-2">
                          {hasCycle ? (
                            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                          ) : (
                            <Workflow className="w-4 h-4 text-purple-400 shrink-0" />
                          )}
                          <span
                            className={cn(
                              'font-medium truncate',
                              hasCycle ? 'text-red-300' : 'text-foreground'
                            )}
                          >
                            {workflow.name}
                          </span>
                          {hasCycle && (
                            <span className="text-xs text-red-400 ml-auto">
                              Circular dependency
                            </span>
                          )}
                          {workflow.id === value && !hasCycle && (
                            <span className="text-xs text-purple-400 ml-auto">Selected</span>
                          )}
                        </div>

                        {/* Feature 013 T041: Cycle Warning Message */}
                        {hasCycle && cycleWarning?.cycleDescription && (
                          <div className="ml-6 px-2 py-1.5 mt-1 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-300">
                            {cycleWarning.cycleDescription}
                          </div>
                        )}

                        {/* Meta Info */}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground ml-6">
                          <span className="flex items-center gap-1">
                            <Layers className="w-3 h-3" />
                            {workflow.stepCount} steps
                          </span>
                          {workflow.projectName && (
                            <span className="flex items-center gap-1">
                              <FolderGit2 className="w-3 h-3" />
                              {workflow.projectName}
                            </span>
                          )}
                          {workflow.lastExecutedAt && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatRelativeTime(workflow.lastExecutedAt)}
                            </span>
                          )}
                        </div>

                        {/* Description */}
                        {workflow.description && !hasCycle && (
                          <p className="text-xs text-muted-foreground truncate ml-6">
                            {workflow.description}
                          </p>
                        )}
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
