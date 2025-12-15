/**
 * ServerStatusCard Component
 * A compact status card showing MCP server status with enable/disable toggle
 */

import React from 'react';
import { Server, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Toggle } from '../../ui/Toggle';

interface ServerStatusCardProps {
  /** Whether the server is enabled */
  isEnabled: boolean;
  /** Whether the server is available/running */
  isAvailable: boolean;
  /** Server name */
  serverName?: string;
  /** Server version */
  serverVersion?: string;
  /** Binary path (shown on hover) */
  binaryPath?: string;
  /** Called when enable state changes */
  onToggleEnabled: (enabled: boolean) => void;
  /** Whether a save operation is in progress */
  isSaving?: boolean;
  /** Additional class name */
  className?: string;
}

export const ServerStatusCard: React.FC<ServerStatusCardProps> = ({
  isEnabled,
  isAvailable,
  serverName = 'PackageFlow MCP',
  serverVersion,
  binaryPath,
  onToggleEnabled,
  isSaving = false,
  className,
}) => {
  // Format path for display (truncate home directory)
  const formatPath = (path: string): string => {
    const homeMatch = path.match(/^\/Users\/[^/]+/) || path.match(/^\/home\/[^/]+/);
    if (homeMatch) {
      return path.replace(homeMatch[0], '~');
    }
    return path;
  };

  return (
    <div
      className={cn(
        'flex items-center gap-4 p-4 rounded-xl',
        'bg-gradient-to-r from-primary/5 via-primary/3 to-transparent',
        'border border-primary/10',
        'transition-all duration-300',
        isEnabled && isAvailable && 'from-green-500/5 via-green-500/3 border-green-500/10',
        !isEnabled && 'from-muted/50 via-muted/30 border-border',
        className
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
          'transition-all duration-300',
          isEnabled && isAvailable
            ? 'bg-green-500/10 text-green-500'
            : isEnabled
            ? 'bg-amber-500/10 text-amber-500'
            : 'bg-muted text-muted-foreground'
        )}
      >
        <Server className="w-6 h-6" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">{serverName}</span>
          {serverVersion && (
            <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-muted rounded">
              v{serverVersion}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          Allow AI assistants to interact with PackageFlow
        </p>
        {binaryPath && (
          <p
            className="text-xs text-muted-foreground/70 mt-1 truncate font-mono"
            title={binaryPath}
          >
            {formatPath(binaryPath)}
          </p>
        )}
      </div>

      {/* Status & Toggle */}
      <div className="flex items-center gap-4 shrink-0">
        {/* Status badge */}
        <div
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
            'transition-all duration-300',
            isEnabled && isAvailable && 'bg-gradient-to-r from-green-500/70 to-blue-500/70 text-white shadow-sm',
            isEnabled && !isAvailable && 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
            !isEnabled && 'bg-muted text-muted-foreground'
          )}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Saving...</span>
            </>
          ) : isEnabled && isAvailable ? (
            <>
              <CheckCircle2 className="w-3 h-3" />
              <span>Ready</span>
            </>
          ) : isEnabled ? (
            <>
              <XCircle className="w-3 h-3" />
              <span>Unavailable</span>
            </>
          ) : (
            <>
              <XCircle className="w-3 h-3" />
              <span>Disabled</span>
            </>
          )}
        </div>

        {/* Toggle */}
        <Toggle
          checked={isEnabled}
          onChange={onToggleEnabled}
          disabled={isSaving}
          aria-label={isEnabled ? 'Disable MCP Server' : 'Enable MCP Server'}
        />
      </div>
    </div>
  );
};

export default ServerStatusCard;
