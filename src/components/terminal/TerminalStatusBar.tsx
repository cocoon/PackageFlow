/**
 * Terminal Status Bar Component
 * Shows session status, exit code, and project path
 */

import React from 'react';
import type { PtySession } from '../../hooks/usePtySessions';

interface TerminalStatusBarProps {
  session: PtySession;
  formatPath: (path: string) => string;
}

// Status configuration for display
const statusConfig: Record<PtySession['status'], { label: string; color: string }> = {
  running: { label: 'Running', color: 'text-yellow-400' },
  completed: { label: 'Completed', color: 'text-green-400' },
  failed: { label: 'Failed', color: 'text-red-400' },
};

export const TerminalStatusBar = React.memo(function TerminalStatusBar({
  session,
  formatPath,
}: TerminalStatusBarProps) {
  return (
    <div className="h-6 flex items-center px-3 text-xs border-t border-border bg-card">
      <span className={statusConfig[session.status].color}>
        {statusConfig[session.status].label}
      </span>
      {session.exitCode !== undefined && (
        <span className="ml-2 text-muted-foreground">Exit code: {session.exitCode}</span>
      )}
      <span className="ml-auto text-muted-foreground" title={formatPath(session.projectPath)}>
        {formatPath(session.projectPath)}
      </span>
    </div>
  );
});

export default TerminalStatusBar;
