/**
 * Terminal standalone window page
 * @see specs/002-frontend-project-manager/tasks.md - T2.5
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Terminal, Square } from 'lucide-react';
import { scriptAPI, tauriEvents, type ScriptOutputPayload, type ScriptCompletedPayload } from '../../lib/tauri-api';
import { Button } from '../ui/Button';

interface TerminalWindowPageProps {
  executionId: string;
}

export function TerminalWindowPage({ executionId }: TerminalWindowPageProps) {
  const [output, setOutput] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(true);
  const [exitCode, setExitCode] = useState<number | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  const handleOutput = useCallback((data: ScriptOutputPayload) => {
    if (data.executionId === executionId) {
      setOutput(prev => [...prev, data.output]);
    }
  }, [executionId]);

  const handleCompleted = useCallback((data: ScriptCompletedPayload) => {
    if (data.executionId === executionId) {
      setIsRunning(false);
      setExitCode(data.exitCode);
    }
  }, [executionId]);

  useEffect(() => {
    let unsubOutput: (() => void) | undefined;
    let unsubCompleted: (() => void) | undefined;

    tauriEvents.onScriptOutput(handleOutput).then(unsub => {
      unsubOutput = unsub;
    });
    tauriEvents.onScriptCompleted(handleCompleted).then(unsub => {
      unsubCompleted = unsub;
    });

    return () => {
      unsubOutput?.();
      unsubCompleted?.();
    };
  }, [handleOutput, handleCompleted]);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const handleCancel = async () => {
    try {
      await scriptAPI.cancelScript(executionId);
    } catch (error) {
      console.error('Failed to cancel script:', error);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="px-4 py-2 border-b border-border flex items-center justify-between bg-background">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            Terminal Output
          </span>
          {isRunning && (
            <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded animate-pulse">
              Running
            </span>
          )}
          {!isRunning && exitCode !== null && (
            <span className={`px-2 py-0.5 text-xs rounded ${
              exitCode === 0
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
            }`}>
              Exit code: {exitCode}
            </span>
          )}
        </div>
        {isRunning && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="gap-1.5 text-red-400 hover:bg-red-500/10 h-auto px-2 py-1"
          >
            <Square className="w-3 h-3" />
            Stop
          </Button>
        )}
      </div>

      <div
        ref={outputRef}
        className="flex-1 overflow-auto p-4 font-mono text-sm"
      >
        {output.length === 0 ? (
          <div className="text-muted-foreground">Waiting for output...</div>
        ) : (
          output.map((line, index) => (
            <div
              key={index}
              className="whitespace-pre-wrap text-foreground/90 leading-relaxed"
            >
              {line}
            </div>
          ))
        )}
        {!isRunning && (
          <div className="mt-4 pt-4 border-t border-border text-muted-foreground">
            --- Process finished ---
          </div>
        )}
      </div>
    </div>
  );
}
