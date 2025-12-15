/**
 * Output Node Group Component
 * Displays grouped output lines for a single workflow node
 * Feature: Workflow output UI improvement
 */

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Terminal, Workflow, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import type { OutputLine } from '../../hooks/useWorkflowExecution';

/** Grouped output for a single node */
export interface NodeOutputGroup {
  nodeId: string;
  nodeName: string;
  nodeType: 'script' | 'trigger-workflow';
  status: 'running' | 'completed' | 'failed';
  startTime?: Date;
  endTime?: Date;
  lines: OutputLine[];
}

interface OutputNodeGroupProps {
  group: NodeOutputGroup;
  isLatest?: boolean;
  defaultExpanded?: boolean;
}

/**
 * Groups output lines by nodeId, maintaining order of appearance
 */
export function groupOutputByNode(output: OutputLine[]): NodeOutputGroup[] {
  const groups: NodeOutputGroup[] = [];
  const nodeMap = new Map<string, NodeOutputGroup>();

  for (const line of output) {
    const nodeId = line.nodeId;
    let group = nodeMap.get(nodeId);

    if (!group) {
      // Create new group when we see a node for the first time
      group = {
        nodeId,
        nodeName: line.nodeName || nodeId,
        nodeType: line.nodeType || 'script',
        status: 'running',
        startTime: line.timestamp,
        lines: [],
      };
      nodeMap.set(nodeId, group);
      groups.push(group);
    }

    // Update group metadata
    if (line.nodeName && !group.nodeName) {
      group.nodeName = line.nodeName;
    }
    if (line.nodeType && group.nodeType === 'script') {
      group.nodeType = line.nodeType;
    }

    // Check for completion status from system messages
    if (line.stream === 'system') {
      if (line.content.startsWith('[OK]')) {
        group.status = 'completed';
        group.endTime = line.timestamp;
      } else if (line.content.startsWith('[FAIL]')) {
        group.status = 'failed';
        group.endTime = line.timestamp;
      }
    }

    group.lines.push(line);
  }

  return groups;
}

/**
 * Single node output group with collapsible content
 */
export function OutputNodeGroup({ group, isLatest = false, defaultExpanded = true }: OutputNodeGroupProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const isTriggerWorkflow = group.nodeType === 'trigger-workflow';
  const isRunning = group.status === 'running';
  const isCompleted = group.status === 'completed';
  const isFailed = group.status === 'failed';

  // Calculate duration
  const duration = useMemo(() => {
    if (!group.startTime) return null;
    const end = group.endTime || new Date();
    const ms = end.getTime() - group.startTime.getTime();
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }, [group.startTime, group.endTime]);

  // Filter out system messages for display (they're shown in header)
  const outputLines = useMemo(() => {
    return group.lines.filter((line) => line.stream !== 'system');
  }, [group.lines]);

  const hasOutput = outputLines.length > 0;

  return (
    <div
      className={cn(
        'rounded-lg border overflow-hidden transition-colors',
        // Base styles by node type
        isTriggerWorkflow
          ? 'border-purple-500/30 bg-purple-950/20'
          : 'border-blue-500/30 bg-blue-950/20',
        // Status-based border highlight
        isRunning && isLatest && 'border-l-2',
        isRunning && isLatest && (isTriggerWorkflow ? 'border-l-purple-400' : 'border-l-blue-400'),
        isCompleted && 'border-green-500/30',
        isFailed && 'border-red-500/30'
      )}
    >
      {/* Header */}
      <Button
        variant="ghost"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full justify-start h-auto gap-2 px-3 py-2 rounded-none',
          'hover:bg-white/5',
          isTriggerWorkflow ? 'bg-purple-950/30' : 'bg-blue-950/30'
        )}
      >
        {/* Expand/Collapse indicator */}
        <span className="text-muted-foreground shrink-0">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </span>

        {/* Node type icon */}
        <span
          className={cn(
            'shrink-0',
            isTriggerWorkflow ? 'text-purple-400' : 'text-blue-400'
          )}
        >
          {isTriggerWorkflow ? (
            <Workflow className="w-4 h-4" />
          ) : (
            <Terminal className="w-4 h-4" />
          )}
        </span>

        {/* Node name */}
        <span
          className={cn(
            'flex-1 font-medium text-sm truncate',
            isTriggerWorkflow ? 'text-purple-200' : 'text-blue-200'
          )}
        >
          {group.nodeName}
        </span>

        {/* Status badge */}
        <span className="shrink-0 flex items-center gap-1.5">
          {isRunning && (
            <>
              <Clock className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
              <span className="text-xs text-yellow-400">Running</span>
            </>
          )}
          {isCompleted && (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
              <span className="text-xs text-green-400">OK</span>
            </>
          )}
          {isFailed && (
            <>
              <XCircle className="w-3.5 h-3.5 text-red-400" />
              <span className="text-xs text-red-400">Failed</span>
            </>
          )}
        </span>

        {/* Duration */}
        {duration && (
          <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
            {duration}
          </span>
        )}

        {/* Line count */}
        {hasOutput && (
          <span className="text-xs text-muted-foreground shrink-0">
            {outputLines.length} {outputLines.length === 1 ? 'line' : 'lines'}
          </span>
        )}
      </Button>

      {/* Content */}
      {isExpanded && hasOutput && (
        <div className="px-3 py-2 border-t border-border bg-card">
          <div className="font-mono text-xs space-y-0.5">
            {outputLines.map((line) => (
              <OutputLineItem key={line.id} line={line} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state when expanded but no output */}
      {isExpanded && !hasOutput && isRunning && (
        <div className="px-3 py-2 border-t border-border bg-card">
          <span className="text-xs text-muted-foreground italic">Waiting for output...</span>
        </div>
      )}
    </div>
  );
}

/**
 * Single output line with stream-based styling
 */
interface OutputLineItemProps {
  line: OutputLine;
}

function OutputLineItem({ line }: OutputLineItemProps) {
  const { content, stream } = line;

  return (
    <div
      className={cn(
        'whitespace-pre-wrap break-all leading-relaxed',
        stream === 'stderr' && 'text-red-400',
        stream === 'stdout' && 'text-foreground',
        stream === 'system' && 'text-blue-400'
      )}
    >
      {content}
    </div>
  );
}

export default OutputNodeGroup;
