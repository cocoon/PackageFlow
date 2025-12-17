/**
 * Storage Settings Panel
 * Display SQLite database storage location and information
 *
 * Features:
 * - Storage location with quick access
 * - Database information card
 * - WAL mode status indicator
 * - Export/Import guidance
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  HardDrive,
  FolderOpen,
  Database,
  CheckCircle2,
  Shield,
  Info,
  Copy,
  Check,
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { settingsAPI } from '../../../lib/tauri-api';
import { SettingSection } from '../ui/SettingSection';
import { SettingInfoBox } from '../ui/SettingInfoBox';
import { Skeleton } from '../../ui/Skeleton';
import { cn } from '../../../lib/utils';
import type { StorePathInfo } from '../../../types/tauri';

export const StorageSettingsPanel: React.FC = () => {
  const [storePathInfo, setStorePathInfo] = useState<StorePathInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Formatted storage path for display (replace home dir with ~)
  const displayPath = useMemo(() => {
    if (!storePathInfo?.currentPath) return null;
    const path = storePathInfo.currentPath;
    const homeMatch = path.match(/^\/Users\/[^/]+/) || path.match(/^\/home\/[^/]+/);
    if (homeMatch) {
      return path.replace(homeMatch[0], '~');
    }
    return path;
  }, [storePathInfo?.currentPath]);

  // Extract just the filename from the path
  const fileName = useMemo(() => {
    if (!storePathInfo?.currentPath) return null;
    const parts = storePathInfo.currentPath.split('/');
    return parts[parts.length - 1];
  }, [storePathInfo?.currentPath]);

  // Load store path info on mount
  useEffect(() => {
    const loadPathInfo = async () => {
      try {
        setIsLoading(true);
        const info = await settingsAPI.getStorePath();
        setStorePathInfo(info);
      } catch (error) {
        console.error('Failed to load store path info:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadPathInfo();
  }, []);

  // Handle open store location in file explorer
  const handleOpenLocation = useCallback(async () => {
    try {
      await settingsAPI.openStoreLocation();
    } catch (error) {
      console.error('Failed to open store location:', error);
    }
  }, []);

  // Handle copy path to clipboard
  const handleCopyPath = useCallback(async () => {
    if (!storePathInfo?.currentPath) return;
    try {
      await navigator.clipboard.writeText(storePathInfo.currentPath);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy path:', error);
    }
  }, [storePathInfo?.currentPath]);

  return (
    <div className="flex flex-col h-full">
      {/* Fixed Header */}
      <div className="flex-shrink-0 pb-4 border-b border-border bg-background">
        <h2 className="text-xl font-semibold text-foreground flex items-center">
          <HardDrive className="w-5 h-5 pr-1" />
          Storage
        </h2>
        <p className="text-sm text-muted-foreground mt-1">View where PackageFlow stores its data</p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pt-4 space-y-6">
        {/* Storage Location Section */}
        <SettingSection
          title="Database Location"
          description="Your data is stored in a local SQLite database"
          icon={<Database className="w-4 h-4" />}
        >
          {isLoading ? (
            <StorageLocationSkeleton />
          ) : (
            <div className="space-y-3">
              {/* Path Display Card */}
              <div
                className={cn(
                  'group relative p-4 rounded-lg',
                  'bg-gradient-to-r from-blue-500/5 via-transparent to-transparent',
                  'border border-blue-500/20',
                  'transition-colors hover:border-blue-500/40'
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Database Icon */}
                  <div
                    className={cn('flex-shrink-0 p-2.5 rounded-lg', 'bg-blue-500/10 text-blue-500')}
                  >
                    <Database className="w-5 h-5" />
                  </div>

                  {/* Path Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {fileName || 'packageflow.db'}
                      </span>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium',
                          'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20'
                        )}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        WAL Mode
                      </span>
                    </div>
                    <code
                      className="block mt-1 text-xs text-muted-foreground font-mono truncate"
                      title={storePathInfo?.currentPath}
                    >
                      {displayPath || 'Not configured'}
                    </code>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleCopyPath}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      title="Copy full path"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleOpenLocation}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      title="Open in Finder"
                    >
                      <FolderOpen className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Open in Finder Button */}
              <Button variant="outline" onClick={handleOpenLocation} className="w-full">
                <FolderOpen className="w-4 h-4 pr-1" />
                Reveal in Finder
              </Button>
            </div>
          )}
        </SettingSection>

        {/* Database Features Section */}
        <SettingSection
          title="Database Features"
          description="SQLite provides reliable, high-performance local storage"
          icon={<Shield className="w-4 h-4" />}
        >
          <div className="grid gap-3">
            <FeatureCard
              icon={<CheckCircle2 className="w-4 h-4" />}
              title="Write-Ahead Logging (WAL)"
              description="Enables concurrent reads while writing, preventing data corruption"
              variant="success"
            />
            <FeatureCard
              icon={<Shield className="w-4 h-4" />}
              title="ACID Compliance"
              description="Atomic transactions ensure data integrity even during crashes"
              variant="info"
            />
            <FeatureCard
              icon={<Database className="w-4 h-4" />}
              title="Local Storage"
              description="All data stays on your device - no cloud sync or external servers"
              variant="default"
            />
          </div>
        </SettingSection>

        {/* Data Management Tips */}
        <SettingInfoBox title="Data Management" variant="info">
          <ul className="space-y-1.5">
            <li className="flex items-start gap-2">
              <Info className="w-3.5 h-3.5 pr-1 mt-0.5 flex-shrink-0 text-blue-500" />
              <span>The database location is fixed for WAL mode compatibility</span>
            </li>
            <li className="flex items-start gap-2">
              <Info className="w-3.5 h-3.5 pr-1 mt-0.5 flex-shrink-0 text-blue-500" />
              <span>
                Use <strong>Import/Export</strong> in the Data section to backup or transfer your
                data between devices
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Info className="w-3.5 h-3.5 pr-1 mt-0.5 flex-shrink-0 text-blue-500" />
              <span>
                <code className="px-1 py-0.5 rounded bg-muted text-foreground text-xs">
                  .db-wal
                </code>{' '}
                and{' '}
                <code className="px-1 py-0.5 rounded bg-muted text-foreground text-xs">
                  .db-shm
                </code>{' '}
                files are part of WAL mode - do not delete them separately
              </span>
            </li>
          </ul>
        </SettingInfoBox>
      </div>
    </div>
  );
};

// ============================================================================
// Internal Components
// ============================================================================

/** Loading skeleton for storage location */
const StorageLocationSkeleton: React.FC = () => (
  <div className="space-y-3">
    <div className="p-4 rounded-lg border border-border">
      <div className="flex items-start gap-3">
        <Skeleton className="w-11 h-11 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="w-32 h-4" />
          <Skeleton className="w-64 h-3" />
        </div>
        <div className="flex gap-1">
          <Skeleton className="w-8 h-8 rounded" />
          <Skeleton className="w-8 h-8 rounded" />
        </div>
      </div>
    </div>
    <Skeleton className="w-full h-9 rounded-md" />
  </div>
);

/** Feature card for database features section */
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  variant?: 'default' | 'success' | 'info';
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
  variant = 'default',
}) => {
  const variantStyles = {
    default: {
      border: 'border-border',
      iconBg: 'bg-muted text-muted-foreground',
    },
    success: {
      border: 'border-green-500/20',
      iconBg: 'bg-green-500/10 text-green-600 dark:text-green-400',
    },
    info: {
      border: 'border-blue-500/20',
      iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className={cn('flex items-start gap-3 p-3 rounded-lg', 'border bg-card', styles.border)}>
      <div className={cn('p-2 rounded-lg flex-shrink-0', styles.iconBg)}>{icon}</div>
      <div className="min-w-0">
        <h4 className="text-sm font-medium text-foreground">{title}</h4>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
};
