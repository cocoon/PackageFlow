/**
 * Script terminal output component
 * @see specs/002-frontend-project-manager/spec.md - US2
 */

import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import {
  X,
  Terminal,
  Trash2,
  ChevronUp,
  ChevronDown,
  GripHorizontal,
  Copy,
  Check,
  Search,
} from 'lucide-react';
import { type RunningScript } from '../../hooks/useScriptExecution';
import { useSettings } from '../../contexts/SettingsContext';
import { useTerminalSearch, highlightSearchMatches } from '../../hooks/useTerminalSearch';
import AnsiToHtml from 'ansi-to-html';

const ansiConverter = new AnsiToHtml({
  fg: '#d1d5db', // terminal foreground
  bg: '#030712', // terminal background (keep dark for terminal convention)
  colors: {
    0: '#374151', // black
    1: '#ef4444', // red
    2: '#22c55e', // green
    3: '#eab308', // yellow
    4: '#3b82f6', // blue
    5: '#a855f7', // magenta
    6: '#06b6d4', // cyan
    7: '#d1d5db', // white
    8: '#6b7280', // bright black
    9: '#f87171', // bright red
    10: '#4ade80', // bright green
    11: '#facc15', // bright yellow
    12: '#60a5fa', // bright blue
    13: '#c084fc', // bright magenta
    14: '#22d3ee', // bright cyan
    15: '#f3f4f6', // bright white
  },
});

function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

interface ScriptTerminalProps {
  runningScripts: Map<string, RunningScript>;
  activeExecutionId: string | null;
  isCollapsed: boolean;
  onSelectExecution: (executionId: string) => void;
  onClearOutput: (executionId: string) => void;
  onClearAll: () => void;
  onToggleCollapse: () => void;
  // Feature 008: stdin interaction
  onWriteToStdin?: (executionId: string, input: string) => Promise<boolean>;
  onSendInterrupt?: (executionId: string) => Promise<boolean>;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  running: { label: 'Running', color: 'text-yellow-400' },
  completed: { label: 'Succeeded', color: 'text-green-400' },
  failed: { label: 'Failed', color: 'text-red-400' },
  cancelled: { label: 'Cancelled', color: 'text-muted-foreground' },
};

export function ScriptTerminal({
  runningScripts,
  activeExecutionId,
  isCollapsed,
  onSelectExecution,
  onClearOutput,
  onClearAll: _onClearAll,
  onToggleCollapse,
  onWriteToStdin,
  onSendInterrupt,
}: ScriptTerminalProps) {
  const outputRef = useRef<HTMLPreElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const stdinInputRef = useRef<HTMLInputElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isResizing, setIsResizing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [stdinInput, setStdinInput] = useState('');
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  const { terminalHeight: height, setTerminalHeight } = useSettings();
  const MIN_HEIGHT = 100;
  const MAX_HEIGHT = 600;

  // Debounce height updates to avoid excessive DB writes
  const updateHeightTimeoutRef = useRef<number | undefined>(undefined);
  const updateHeight = useCallback((newHeight: number) => {
    if (updateHeightTimeoutRef.current) {
      clearTimeout(updateHeightTimeoutRef.current);
    }
    updateHeightTimeoutRef.current = window.setTimeout(() => {
      setTerminalHeight(newHeight);
    }, 500);
  }, [setTerminalHeight]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (updateHeightTimeoutRef.current) {
        clearTimeout(updateHeightTimeoutRef.current);
      }
    };
  }, []);

  const activeScript = activeExecutionId ? runningScripts.get(activeExecutionId) : null;

  const plainTextOutput = useMemo(() => {
    return activeScript?.output ? stripAnsi(activeScript.output) : '';
  }, [activeScript?.output]);

  const search = useTerminalSearch(plainTextOutput);

  // Handle resize drag
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      startYRef.current = e.clientY;
      startHeightRef.current = height;
    },
    [height]
  );

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Dragging up increases height (negative delta)
      const delta = startYRef.current - e.clientY;
      const newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startHeightRef.current + delta));
      updateHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, MIN_HEIGHT, MAX_HEIGHT, updateHeight]);

  const handleCopy = useCallback(async () => {
    if (!activeScript?.output) return;

    const plainText = stripAnsi(activeScript.output);

    try {
      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [activeScript?.output]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        !containerRef.current?.contains(document.activeElement) &&
        document.activeElement !== document.body
      ) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        search.open();
        setTimeout(() => searchInputRef.current?.focus(), 0);
      }

      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'c') {
        e.preventDefault();
        handleCopy();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [search, handleCopy]);

  useEffect(() => {
    if (!search.isOpen || search.matchCount === 0 || !outputRef.current) return;

    const currentMark = outputRef.current.querySelector('mark[data-current="true"]');
    if (currentMark) {
      currentMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setAutoScroll(false);
    }
  }, [search.isOpen, search.currentIndex, search.matchCount]);

  const outputHtml = useMemo(() => {
    if (!activeScript?.output) return '';
    let html = ansiConverter.toHtml(activeScript.output);

    if (search.isOpen && search.query) {
      html = highlightSearchMatches(html, search.query, search.currentIndex);
    }

    return html;
  }, [activeScript?.output, search.isOpen, search.query, search.currentIndex]);

  useEffect(() => {
    if (autoScroll && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [activeScript?.output, autoScroll]);

  const handleScroll = () => {
    if (!outputRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = outputRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setAutoScroll(isAtBottom);
  };

  const formatTabLabel = (script: RunningScript) => {
    const projectLabel =
      script.projectName || script.projectPath.split(/[\\/]/).filter(Boolean).pop();
    return projectLabel ? `${projectLabel}: ${script.scriptName}` : script.scriptName;
  };

  if (runningScripts.size === 0) {
    return null;
  }

  if (isCollapsed) {
    return (
      <div className="h-10 bg-background border-t border-border flex items-center px-3 justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Terminal output</span>
          <span className="text-xs text-muted-foreground">({runningScripts.size})</span>
        </div>
        <button onClick={onToggleCollapse} className="p-1 rounded hover:bg-accent">
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="bg-background border-t border-border flex flex-col"
      style={{ height: `${height}px` }}
    >
      {/* Resize handle */}
      <div
        onMouseDown={handleMouseDown}
        className={`h-2 flex items-center justify-center cursor-ns-resize hover:bg-muted/50 transition-colors ${
          isResizing ? 'bg-blue-500/30' : ''
        }`}
      >
        <GripHorizontal className="w-4 h-3 text-muted-foreground" />
      </div>

      {/* Header */}
      <div className="h-9 flex items-center justify-between px-2 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto">
          {Array.from(runningScripts.entries()).map(([id, script]) => {
            const isActive = id === activeExecutionId;

            return (
              <button
                key={id}
                onClick={() => onSelectExecution(id)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded text-sm whitespace-nowrap ${
                  isActive
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:bg-secondary/50'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    script.status === 'running'
                      ? 'bg-yellow-400 animate-pulse'
                      : script.status === 'completed'
                        ? 'bg-green-400'
                        : script.status === 'failed'
                          ? 'bg-red-400'
                          : 'bg-muted-foreground'
                  }`}
                />
                <span className="max-w-[180px] truncate">{formatTabLabel(script)}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClearOutput(id);
                  }}
                  className="ml-1 p-0.5 rounded hover:bg-muted"
                >
                  <X className="w-3 h-3" />
                </button>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Search button */}
          <button
            onClick={() => {
              search.toggle();
              if (!search.isOpen) {
                setTimeout(() => searchInputRef.current?.focus(), 0);
              }
            }}
            className={`p-1.5 rounded hover:bg-accent ${search.isOpen ? 'bg-accent' : ''}`}
            title="Search (Cmd+F)"
          >
            <Search className="w-4 h-4 text-muted-foreground" />
          </button>
          {/* Copy button */}
          <button
            onClick={handleCopy}
            disabled={!activeScript?.output}
            className="p-1.5 rounded hover:bg-accent disabled:opacity-50"
            title="Copy output (Cmd+Shift+C)"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          <button
            onClick={() => {
              if (activeExecutionId) {
                onClearOutput(activeExecutionId);
              }
            }}
            className="p-1.5 rounded hover:bg-accent"
            title="Close tab"
          >
            <Trash2 className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded hover:bg-accent"
            title="Collapse"
          >
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Search bar */}
      {search.isOpen && (
        <div className="flex items-center gap-2 px-3 py-2 bg-secondary border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            value={search.query}
            onChange={(e) => search.search(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (e.shiftKey) {
                  search.goToPrev();
                } else {
                  search.goToNext();
                }
              } else if (e.key === 'Escape') {
                search.close();
              }
            }}
            placeholder="Search in output..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder-muted-foreground outline-none min-w-0"
          />
          {search.matchCount > 0 && (
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {search.currentIndex + 1}/{search.matchCount}
            </span>
          )}
          {search.query && search.matchCount === 0 && (
            <span className="text-xs text-muted-foreground flex-shrink-0">No matches</span>
          )}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              onClick={search.goToPrev}
              disabled={search.matchCount === 0}
              className="p-1 hover:bg-muted rounded disabled:opacity-50"
              title="Previous match (Shift+Enter)"
            >
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              onClick={search.goToNext}
              disabled={search.matchCount === 0}
              className="p-1 hover:bg-muted rounded disabled:opacity-50"
              title="Next match (Enter)"
            >
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <button
            onClick={search.close}
            className="p-1 hover:bg-muted rounded flex-shrink-0"
            title="Close (Esc)"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Output content */}
      {outputHtml ? (
        <pre
          ref={outputRef}
          onScroll={handleScroll}
          className="flex-1 overflow-auto p-3 text-sm font-mono text-foreground/90 bg-card whitespace-pre-wrap break-all"
          dangerouslySetInnerHTML={{ __html: outputHtml }}
        />
      ) : (
        <pre
          ref={outputRef}
          className="flex-1 overflow-auto p-3 text-sm font-mono text-foreground/90 bg-card whitespace-pre-wrap break-all"
        >
          <span className="text-muted-foreground">Waiting for output...</span>
        </pre>
      )}

      {/* Feature 008: stdin input row */}
      {activeScript && activeScript.status === 'running' && onWriteToStdin && (
        <div className="h-8 flex items-center px-3 gap-2 border-t border-border bg-background">
          <span className="text-muted-foreground text-xs font-mono">$</span>
          <input
            ref={stdinInputRef}
            type="text"
            value={stdinInput}
            onChange={(e) => setStdinInput(e.target.value)}
            onKeyDown={async (e) => {
              // Arrow keys for interactive menus (send ANSI escape sequences)
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                await onWriteToStdin(activeExecutionId!, '\x1b[A');
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                await onWriteToStdin(activeExecutionId!, '\x1b[B');
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                await onWriteToStdin(activeExecutionId!, '\x1b[D');
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                await onWriteToStdin(activeExecutionId!, '\x1b[C');
              } else if (e.key === ' ' && !stdinInput) {
                // Space key for toggle/selection (only when input is empty)
                e.preventDefault();
                await onWriteToStdin(activeExecutionId!, ' ');
              } else if (e.key === 'Tab') {
                e.preventDefault();
                await onWriteToStdin(activeExecutionId!, '\t');
              } else if (e.key === 'Enter') {
                e.preventDefault();
                // Send input text + newline, or just newline for selection confirmation
                const success = await onWriteToStdin(activeExecutionId!, stdinInput + '\n');
                if (success) {
                  setStdinInput('');
                }
              } else if (e.key === 'c' && e.ctrlKey) {
                e.preventDefault();
                await onSendInterrupt?.(activeExecutionId!);
              }
            }}
            placeholder="↑↓←→ navigate, Space toggle, Enter confirm, Ctrl+C cancel"
            className="flex-1 bg-transparent text-sm font-mono text-foreground placeholder-muted-foreground outline-none"
          />
          <button
            onClick={() => onWriteToStdin(activeExecutionId!, '\x1b[A')}
            className="px-1.5 py-0.5 text-xs bg-secondary hover:bg-muted rounded"
            title="Move up (Arrow Up)"
          >
            ↑
          </button>
          <button
            onClick={() => onWriteToStdin(activeExecutionId!, '\x1b[B')}
            className="px-1.5 py-0.5 text-xs bg-secondary hover:bg-muted rounded"
            title="Move down (Arrow Down)"
          >
            ↓
          </button>
          <button
            onClick={() => onWriteToStdin(activeExecutionId!, ' ')}
            className="px-1.5 py-0.5 text-xs bg-secondary hover:bg-muted rounded"
            title="Toggle selection (Space)"
          >
            ␣
          </button>
          <button
            onClick={async () => {
              const success = await onWriteToStdin(activeExecutionId!, stdinInput + '\n');
              if (success) {
                setStdinInput('');
              }
            }}
            className="px-1.5 py-0.5 text-xs bg-secondary hover:bg-muted rounded"
            title="Confirm selection (Enter)"
          >
            ⏎
          </button>
          {onSendInterrupt && (
            <button
              onClick={() => onSendInterrupt(activeExecutionId!)}
              className="px-1.5 py-0.5 text-xs text-red-400 bg-secondary hover:bg-muted rounded"
              title="Send Ctrl+C (SIGINT)"
            >
              ^C
            </button>
          )}
        </div>
      )}

      {/* Status bar */}
      {activeScript && (
        <div className="h-6 flex items-center px-3 text-xs border-t border-border bg-background">
          <span className={statusConfig[activeScript.status].color}>
            {statusConfig[activeScript.status].label}
          </span>
          {activeScript.exitCode !== undefined && (
            <span className="ml-2 text-muted-foreground">Exit code: {activeScript.exitCode}</span>
          )}
          {!autoScroll && (
            <button
              onClick={() => {
                setAutoScroll(true);
                if (outputRef.current) {
                  outputRef.current.scrollTop = outputRef.current.scrollHeight;
                }
              }}
              className="ml-auto text-blue-400 hover:text-blue-300"
            >
              Scroll to bottom
            </button>
          )}
        </div>
      )}
    </div>
  );
}
