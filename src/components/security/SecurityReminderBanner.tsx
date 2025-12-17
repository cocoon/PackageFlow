/**
 * Security Reminder Banner Component
 * Displays a non-blocking reminder when security scan is overdue
 * @see specs/005-package-security-audit/
 */

import { ShieldAlert, RefreshCw, Clock } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

interface SecurityReminderBannerProps {
  /** Project name for display */
  projectName: string;
  /** Days since last scan (null if never scanned) */
  daysSinceLastScan: number | null;
  /** Configured reminder interval in days */
  reminderIntervalDays: number;
  /** Whether a scan is currently in progress */
  isScanning: boolean;
  /** Callback to trigger immediate scan */
  onScanNow: () => void;
  /** Callback to snooze reminder (e.g., 24 hours) */
  onSnoozeLater: () => void;
  /** Callback to dismiss banner */
  onDismiss: () => void;
  /** Whether snooze/dismiss is in progress */
  isUpdating?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function SecurityReminderBanner({
  projectName,
  daysSinceLastScan,
  reminderIntervalDays,
  isScanning,
  onScanNow,
  onSnoozeLater,
  onDismiss: _onDismiss,
  isUpdating = false,
  className,
}: SecurityReminderBannerProps) {
  // Generate appropriate message based on scan history
  const message =
    daysSinceLastScan === null
      ? `Project "${projectName}" has not been scanned yet. Run a security scan to check for vulnerabilities.`
      : `Project "${projectName}" was last scanned ${daysSinceLastScan} day${daysSinceLastScan !== 1 ? 's' : ''} ago (recommended: every ${reminderIntervalDays} days).`;

  return (
    <div
      className={cn('flex flex-col items-center justify-center py-12 text-center', className)}
      role="alert"
      aria-live="polite"
    >
      {/* Icon */}
      <div className="p-4 bg-amber-500/20 rounded-full mb-4">
        <ShieldAlert className="w-12 h-12 text-amber-400" aria-hidden="true" />
      </div>

      {/* Title */}
      <h3 className="text-lg font-medium text-foreground mb-2">Security Scan Reminder</h3>

      {/* Message */}
      <p className="text-sm text-muted-foreground max-w-md mb-6">{message}</p>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button
          onClick={onScanNow}
          disabled={isScanning || isUpdating}
          className="bg-amber-600 hover:bg-amber-500 text-white border-transparent"
        >
          <RefreshCw
            className={cn('w-4 h-4 mr-2', isScanning && 'animate-spin')}
            aria-hidden="true"
          />
          {isScanning ? 'Scanning...' : 'Scan Now'}
        </Button>

        <Button
          variant="outline"
          onClick={onSnoozeLater}
          disabled={isScanning || isUpdating}
          className="text-muted-foreground border-border hover:bg-accent"
        >
          <Clock className="w-4 h-4 mr-2" aria-hidden="true" />
          Remind Later
        </Button>
      </div>
    </div>
  );
}

export default SecurityReminderBanner;
