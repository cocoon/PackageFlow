/**
 * Terminal output stream hook
 * @see specs/001-expo-workflow-automation/spec.md - US1
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { OutputLine } from '../components/terminal/TerminalOutput';
import type { OutputEvent } from '../types/workflow';
import {
  tauriEvents,
  type NodeStartedPayload,
  type ExecutionOutputPayload,
  type NodeCompletedPayload,
} from '../lib/tauri-api';

interface UseTerminalOptions {
  maxLines?: number;
}

interface UseTerminalReturn {
  lines: OutputLine[];
  addLine: (line: OutputLine) => void;
  addOutput: (event: OutputEvent) => void;
  addSystemMessage: (message: string, nodeId?: string) => void;
  clear: () => void;
  /** Restore lines from history (e.g., when switching workflows) */
  setLines: (lines: OutputLine[]) => void;
}

export function useTerminal(options: UseTerminalOptions = {}): UseTerminalReturn {
  const { maxLines = 10000 } = options;
  const [lines, setLines] = useState<OutputLine[]>([]);

  const addLine = useCallback(
    (line: OutputLine) => {
      setLines((prev) => {
        const newLines = [...prev, line];
        if (newLines.length > maxLines) {
          return newLines.slice(-maxLines);
        }
        return newLines;
      });
    },
    [maxLines]
  );

  const addOutput = useCallback(
    (event: OutputEvent) => {
      addLine({
        type: event.type,
        content: event.data,
        timestamp: event.timestamp,
        nodeId: event.nodeId,
      });
    },
    [addLine]
  );

  const addSystemMessage = useCallback(
    (message: string, nodeId?: string) => {
      addLine({
        type: 'system',
        content: message,
        timestamp: new Date().toISOString(),
        nodeId,
      });
    },
    [addLine]
  );

  const clear = useCallback(() => {
    setLines([]);
  }, []);

  return {
    lines,
    addLine,
    addOutput,
    addSystemMessage,
    clear,
    setLines,
  };
}

/**
 * Workflow execution event listener hook
 * Listens to execution events and updates terminal output
 * @param terminal - Terminal hook instance
 * @param workflowId - Current workflow ID to filter events (only show events for this workflow)
 */
export function useExecutionListener(terminal: UseTerminalReturn, workflowId: string | null) {
  const terminalRef = useRef(terminal);
  terminalRef.current = terminal;

  const workflowIdRef = useRef(workflowId);
  workflowIdRef.current = workflowId;

  const isSubscribedRef = useRef(false);

  useEffect(() => {
    if (isSubscribedRef.current) {
      return;
    }

    let isMounted = true;
    const unsubscribers: (() => void)[] = [];

    const handleNodeStarted = (event: NodeStartedPayload) => {
      if (!isMounted) return;
      // Filter by workflowId - only show events for the current workflow
      if (workflowIdRef.current && event.workflowId !== workflowIdRef.current) return;
      // Feature 013: Different message for trigger-workflow nodes
      // Use target workflow name if available
      const displayName =
        event.nodeType === 'trigger-workflow' && event.targetWorkflowName
          ? event.targetWorkflowName
          : event.nodeName;
      const message =
        event.nodeType === 'trigger-workflow'
          ? `\n>> Triggering workflow: ${displayName}`
          : `\n> Starting: ${event.nodeName}`;
      terminalRef.current.addSystemMessage(message, event.nodeId);
    };

    const handleOutput = (data: ExecutionOutputPayload) => {
      if (!isMounted) return;
      // Filter by workflowId - only show events for the current workflow
      if (workflowIdRef.current && data.workflowId !== workflowIdRef.current) return;
      const event: OutputEvent = {
        executionId: data.executionId,
        nodeId: data.nodeId,
        type: data.stream,
        data: data.output,
        timestamp: data.timestamp,
      };
      terminalRef.current.addOutput(event);
    };

    const handleNodeCompleted = (event: NodeCompletedPayload) => {
      if (!isMounted) return;
      // Filter by workflowId - only show events for the current workflow
      if (workflowIdRef.current && event.workflowId !== workflowIdRef.current) return;
      if (event.status === 'completed') {
        terminalRef.current.addSystemMessage(
          `✓ Node completed (exit code: ${event.exitCode})`,
          event.nodeId
        );
      } else {
        terminalRef.current.addSystemMessage(
          `✗ Node failed (exit code: ${event.exitCode})${event.errorMessage ? `: ${event.errorMessage}` : ''}`,
          event.nodeId
        );
      }
    };

    const setupListeners = async () => {
      isSubscribedRef.current = true;

      const unsub1 = await tauriEvents.onWorkflowNodeStarted(handleNodeStarted);
      if (isMounted) unsubscribers.push(unsub1);
      else unsub1();

      const unsub2 = await tauriEvents.onWorkflowOutput(handleOutput);
      if (isMounted) unsubscribers.push(unsub2);
      else unsub2();

      const unsub3 = await tauriEvents.onWorkflowNodeCompleted(handleNodeCompleted);
      if (isMounted) unsubscribers.push(unsub3);
      else unsub3();
    };

    setupListeners();

    return () => {
      isMounted = false;
      unsubscribers.forEach((unsub) => unsub());
      isSubscribedRef.current = false;
    };
  }, []);
}
