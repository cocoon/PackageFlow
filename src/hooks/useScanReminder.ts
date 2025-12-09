/**
 * useScanReminder Hook
 * Provides scan reminder logic for security audit feature
 * @see specs/005-package-security-audit/
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { securityAPI, type SecurityScanData } from '../lib/tauri-api';

/** Default reminder interval in days */
const DEFAULT_REMINDER_INTERVAL_DAYS = 7;

/** Default snooze duration in hours */
const DEFAULT_SNOOZE_HOURS = 24;

export interface UseScanReminderOptions {
  /** Reminder interval in days (default: 7) */
  reminderIntervalDays?: number;
  /** Snooze duration in hours (default: 24) */
  snoozeDurationHours?: number;
}

export interface UseScanReminderReturn {
  /** Whether the reminder should be shown */
  shouldShowReminder: boolean;
  /** Number of days since last scan (null if never scanned) */
  daysSinceLastScan: number | null;
  /** Configured reminder interval in days */
  reminderIntervalDays: number;
  /** Snooze the reminder for the configured duration */
  snoozeReminder: () => Promise<void>;
  /** Dismiss the reminder (clears snooze state) */
  dismissReminder: () => Promise<void>;
  /** Whether snooze/dismiss operations are in progress */
  isUpdating: boolean;
}

/**
 * Calculate the number of days since a given ISO timestamp
 */
function daysSinceTimestamp(isoTimestamp: string): number {
  const date = new Date(isoTimestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Check if a snooze period has expired
 */
function isSnoozeExpired(snoozeUntil: string | undefined): boolean {
  if (!snoozeUntil) return true;
  const snoozeDate = new Date(snoozeUntil);
  const now = new Date();
  return now >= snoozeDate;
}

/**
 * Hook for managing security scan reminders
 * @param projectId - The project ID to check reminders for
 * @param scanData - Security scan data for the project
 * @param options - Configuration options
 */
export function useScanReminder(
  projectId: string | null,
  scanData: SecurityScanData | null,
  options: UseScanReminderOptions = {}
): UseScanReminderReturn {
  const {
    reminderIntervalDays = DEFAULT_REMINDER_INTERVAL_DAYS,
    snoozeDurationHours = DEFAULT_SNOOZE_HOURS,
  } = options;

  const [isUpdating, setIsUpdating] = useState(false);
  // Local state to track if reminder was dismissed in this session
  const [localDismissed, setLocalDismissed] = useState(false);

  // Reset local dismissed state when project changes
  useEffect(() => {
    setLocalDismissed(false);
  }, [projectId]);

  // Calculate reminder state
  const reminderState = useMemo(() => {
    // No project ID - don't show reminder
    if (!projectId) {
      return {
        shouldShowReminder: false,
        daysSinceLastScan: null,
      };
    }

    // If locally dismissed this session, don't show
    if (localDismissed) {
      return {
        shouldShowReminder: false,
        daysSinceLastScan: scanData?.lastScan
          ? daysSinceTimestamp(scanData.lastScan.scannedAt)
          : null,
      };
    }

    // Check snooze status
    if (scanData?.snoozeUntil && !isSnoozeExpired(scanData.snoozeUntil)) {
      return {
        shouldShowReminder: false,
        daysSinceLastScan: scanData.lastScan
          ? daysSinceTimestamp(scanData.lastScan.scannedAt)
          : null,
      };
    }

    // Never scanned - show reminder
    if (!scanData?.lastScan) {
      return {
        shouldShowReminder: true,
        daysSinceLastScan: null,
      };
    }

    // Calculate days since last scan
    const daysSince = daysSinceTimestamp(scanData.lastScan.scannedAt);

    return {
      shouldShowReminder: daysSince >= reminderIntervalDays,
      daysSinceLastScan: daysSince,
    };
  }, [projectId, scanData, reminderIntervalDays, localDismissed]);

  // Snooze reminder handler
  const snoozeReminder = useCallback(async () => {
    if (!projectId) return;

    setIsUpdating(true);
    try {
      await securityAPI.snoozeScanReminder(projectId, snoozeDurationHours);
      // Also set local dismissed to immediately hide the banner
      setLocalDismissed(true);
    } catch (err) {
      console.error('Failed to snooze scan reminder:', err);
    } finally {
      setIsUpdating(false);
    }
  }, [projectId, snoozeDurationHours]);

  // Dismiss reminder handler (just hides for this session)
  const dismissReminder = useCallback(async () => {
    if (!projectId) return;

    setIsUpdating(true);
    try {
      // Just set local state to hide immediately
      // We don't call the API here - dismiss is session-only
      setLocalDismissed(true);
    } finally {
      setIsUpdating(false);
    }
  }, [projectId]);

  return {
    shouldShowReminder: reminderState.shouldShowReminder,
    daysSinceLastScan: reminderState.daysSinceLastScan,
    reminderIntervalDays,
    snoozeReminder,
    dismissReminder,
    isUpdating,
  };
}

export default useScanReminder;
