/**
 * UpdateDialog - Custom update dialog component
 * Provides a polished UI for displaying app update information and progress
 */

import * as React from 'react';
import { Download, Package, CheckCircle, AlertTriangle, X, RotateCcw } from 'lucide-react';
import { cn } from '../../lib/utils';
import { isTopModal, registerModal, unregisterModal } from './modalStack';
import { Progress } from './Progress';
import { Button } from './Button';

export type UpdateState = 'available' | 'downloading' | 'installing' | 'complete' | 'error';

interface UpdateDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Handler for dialog state changes */
  onOpenChange: (open: boolean) => void;
  /** Update state */
  state: UpdateState;
  /** Current app version */
  currentVersion: string;
  /** New version available */
  newVersion: string;
  /** Release notes / changelog (optional) */
  releaseNotes?: string | null;
  /** Download progress (0-100) */
  downloadProgress: number;
  /** Downloaded bytes */
  downloadedBytes: number;
  /** Total bytes */
  totalBytes: number;
  /** Error message if state is 'error' */
  errorMessage?: string | null;
  /** Handler for update action */
  onUpdate: () => void;
  /** Handler for later action */
  onLater: () => void;
  /** Handler for restart action (after complete) */
  onRestart: () => void;
  /** Handler for retry action (after error) */
  onRetry?: () => void;
}

const stateConfig = {
  available: {
    icon: Download,
    gradient: 'from-blue-500/20 via-blue-600/10 to-transparent',
    gradientLight: 'from-blue-500/10 via-blue-600/5 to-transparent',
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-500/10 border-blue-500/20',
    accentBorder: 'border-blue-500/30',
    title: 'Update Available',
  },
  downloading: {
    icon: Download,
    gradient: 'from-blue-500/20 via-blue-600/10 to-transparent',
    gradientLight: 'from-blue-500/10 via-blue-600/5 to-transparent',
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-500/10 border-blue-500/20',
    accentBorder: 'border-blue-500/30',
    title: 'Downloading Update',
  },
  installing: {
    icon: Package,
    gradient: 'from-amber-500/20 via-amber-600/10 to-transparent',
    gradientLight: 'from-amber-500/10 via-amber-600/5 to-transparent',
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/10 border-amber-500/20',
    accentBorder: 'border-amber-500/30',
    title: 'Installing Update',
  },
  complete: {
    icon: CheckCircle,
    gradient: 'from-green-500/20 via-green-600/10 to-transparent',
    gradientLight: 'from-green-500/10 via-green-600/5 to-transparent',
    iconColor: 'text-green-400',
    iconBg: 'bg-green-500/10 border-green-500/20',
    accentBorder: 'border-green-500/30',
    title: 'Update Complete',
  },
  error: {
    icon: AlertTriangle,
    gradient: 'from-red-500/20 via-red-600/10 to-transparent',
    gradientLight: 'from-red-500/10 via-red-600/5 to-transparent',
    iconColor: 'text-red-400',
    iconBg: 'bg-red-500/10 border-red-500/20',
    accentBorder: 'border-red-500/30',
    title: 'Update Failed',
  },
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function UpdateDialog({
  open,
  onOpenChange,
  state,
  currentVersion,
  newVersion,
  releaseNotes,
  downloadProgress,
  downloadedBytes,
  totalBytes,
  errorMessage,
  onUpdate,
  onLater,
  onRestart,
  onRetry,
}: UpdateDialogProps) {
  const modalId = React.useId();
  const contentRef = React.useRef<HTMLDivElement>(null);

  const config = stateConfig[state];
  const IconComponent = config.icon;

  // Determine if dialog can be dismissed
  const canDismiss = state === 'available' || state === 'error' || state === 'complete';

  // Register/unregister modal
  React.useEffect(() => {
    if (!open) return;
    registerModal(modalId);
    return () => unregisterModal(modalId);
  }, [modalId, open]);

  // Handle ESC key
  React.useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (!isTopModal(modalId)) return;
      if (!canDismiss) return; // Don't allow ESC during download/install
      e.preventDefault();
      onOpenChange(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [modalId, onOpenChange, open, canDismiss]);

  // Focus trap - focus content area when opened
  React.useEffect(() => {
    if (open && contentRef.current) {
      const timer = setTimeout(() => {
        contentRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && canDismiss) {
      onOpenChange(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className={cn('fixed inset-0 z-50', 'animate-in fade-in-0 duration-200')}
      role="dialog"
      aria-modal="true"
      aria-labelledby="update-dialog-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Dialog container */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div
          className={cn(
            'relative w-full max-w-md',
            'bg-background rounded-2xl',
            'border',
            config.accentBorder,
            'shadow-2xl shadow-black/60',
            'animate-in fade-in-0 zoom-in-95 duration-200',
            'slide-in-from-bottom-4',
            'flex flex-col overflow-hidden'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with gradient */}
          <div
            className={cn(
              'relative px-6 py-5',
              'border-b border-border',
              'bg-gradient-to-r dark:' + config.gradient,
              config.gradientLight
            )}
          >
            {/* Close button - only when dismissable */}
            {canDismiss && (
              <button
                onClick={() => onOpenChange(false)}
                className={cn(
                  'absolute right-4 top-4',
                  'p-2 rounded-lg',
                  'text-muted-foreground hover:text-foreground',
                  'hover:bg-accent/50',
                  'transition-colors duration-150',
                  'focus:outline-none focus:ring-2 focus:ring-ring'
                )}
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Title area with icon badge */}
            <div className="flex items-start gap-4 pr-10">
              <div
                className={cn(
                  'flex-shrink-0',
                  'w-12 h-12 rounded-xl',
                  'flex items-center justify-center',
                  'bg-background/80 dark:bg-background/50 backdrop-blur-sm',
                  'border',
                  config.iconBg,
                  'shadow-lg'
                )}
              >
                <IconComponent
                  className={cn(
                    'w-6 h-6',
                    config.iconColor,
                    state === 'downloading' && 'animate-pulse'
                  )}
                />
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <h2
                  id="update-dialog-title"
                  className="text-lg font-semibold text-foreground leading-tight"
                >
                  {config.title}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {currentVersion} → {newVersion}
                </p>
              </div>
            </div>
          </div>

          {/* Content area */}
          <div
            ref={contentRef}
            className="flex-1 overflow-y-auto min-h-0 focus:outline-none px-6 py-4"
            tabIndex={-1}
          >
            {/* Error message */}
            {state === 'error' && errorMessage && (
              <div
                className={cn(
                  'mb-4 p-3 rounded-lg',
                  'bg-red-500/10 border border-red-500/30',
                  'text-sm text-red-700 dark:text-red-400'
                )}
              >
                {errorMessage}
              </div>
            )}

            {/* Release notes */}
            {releaseNotes && state === 'available' && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-foreground mb-2">What&apos;s New</h3>
                <div
                  className={cn(
                    'p-3 rounded-lg',
                    'bg-muted/50 border border-border',
                    'text-sm text-muted-foreground',
                    'max-h-32 overflow-y-auto',
                    'whitespace-pre-wrap'
                  )}
                >
                  {releaseNotes}
                </div>
              </div>
            )}

            {/* Progress section */}
            {(state === 'downloading' || state === 'installing') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {state === 'downloading' ? 'Downloading...' : 'Installing...'}
                  </span>
                  <span className="text-foreground font-medium">{downloadProgress}%</span>
                </div>
                <Progress
                  value={downloadProgress}
                  max={100}
                  className="h-2"
                  aria-label="Download progress"
                />
                {state === 'downloading' && totalBytes > 0 && (
                  <p className="text-xs text-muted-foreground text-center">
                    {formatBytes(downloadedBytes)} / {formatBytes(totalBytes)}
                  </p>
                )}
              </div>
            )}

            {/* Complete message */}
            {state === 'complete' && (
              <p className="text-sm text-muted-foreground">
                Update installed successfully. Restart the app to apply changes.
              </p>
            )}
          </div>

          {/* Footer with actions */}
          <div
            className={cn(
              'px-6 py-4',
              'border-t border-border',
              'bg-card/50',
              'flex items-center justify-end gap-3',
              'flex-shrink-0'
            )}
          >
            {state === 'available' && (
              <>
                <Button variant="ghost" onClick={onLater}>
                  Later
                </Button>
                <Button variant="default" onClick={onUpdate}>
                  Update Now
                </Button>
              </>
            )}

            {(state === 'downloading' || state === 'installing') && (
              <span className="text-sm text-muted-foreground">
                Please wait...
              </span>
            )}

            {state === 'complete' && (
              <Button variant="success" onClick={onRestart}>
                Restart Now
              </Button>
            )}

            {state === 'error' && (
              <>
                <Button variant="ghost" onClick={() => onOpenChange(false)}>
                  Dismiss
                </Button>
                {onRetry && (
                  <Button variant="default" onClick={onRetry}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Retry
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
