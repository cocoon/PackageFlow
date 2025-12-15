/**
 * Storage Settings Panel
 * Manage storage location for PackageFlow data
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FolderOpen, RotateCcw, ExternalLink, HardDrive } from 'lucide-react';
import { settingsAPI, open } from '../../../lib/tauri-api';
import type { StorePathInfo } from '../../../types/tauri';
import { cn } from '../../../lib/utils';

export const StorageSettingsPanel: React.FC = () => {
  const [storePathInfo, setStorePathInfo] = useState<StorePathInfo | null>(null);
  const [isChangingPath, setIsChangingPath] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Formatted storage path for display
  const displayPath = useMemo(() => {
    if (!storePathInfo?.currentPath) return null;
    const path = storePathInfo.currentPath;
    const homeMatch = path.match(/^\/Users\/[^/]+/) || path.match(/^\/home\/[^/]+/);
    if (homeMatch) {
      return path.replace(homeMatch[0], '~');
    }
    return path;
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

  // Handle change storage location
  const handleChangeStorePath = useCallback(async () => {
    if (isChangingPath) return;

    try {
      setIsChangingPath(true);
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Storage Location',
      });

      if (selected && typeof selected === 'string') {
        const newPath = `${selected}/packageflow.json`;
        const result = await settingsAPI.setStorePath(newPath);
        setStorePathInfo(result);
      }
    } catch (error) {
      console.error('Failed to change store path:', error);
      alert(`Failed to change storage location: ${(error as Error).message}`);
    } finally {
      setIsChangingPath(false);
    }
  }, [isChangingPath]);

  // Handle reset to default path
  const handleResetPath = useCallback(async () => {
    if (isChangingPath) return;

    try {
      setIsChangingPath(true);
      const result = await settingsAPI.resetStorePath();
      setStorePathInfo(result);
    } catch (error) {
      console.error('Failed to reset store path:', error);
      alert(`Failed to reset storage location: ${(error as Error).message}`);
    } finally {
      setIsChangingPath(false);
    }
  }, [isChangingPath]);

  // Handle open store location in file explorer
  const handleOpenLocation = useCallback(async () => {
    try {
      await settingsAPI.openStoreLocation();
    } catch (error) {
      console.error('Failed to open store location:', error);
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <HardDrive className="w-5 h-5" />
          Storage
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure where PackageFlow stores its data
        </p>
      </div>

      {/* Current Path */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">
          Current Storage Location
        </label>

        {isLoading ? (
          <div className="h-12 bg-muted/50 rounded-lg animate-pulse" />
        ) : (
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border">
            <code
              className="flex-1 text-sm text-muted-foreground font-mono truncate"
              title={storePathInfo?.currentPath}
            >
              {displayPath || 'Not set'}
            </code>
            <button
              onClick={handleOpenLocation}
              className={cn(
                'p-2 rounded-md',
                'text-muted-foreground hover:text-foreground',
                'hover:bg-accent transition-colors'
              )}
              title="Open in Finder"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        )}

        {storePathInfo?.isCustom && (
          <p className="text-xs text-muted-foreground">
            Using custom storage location
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleChangeStorePath}
          disabled={isChangingPath}
          className={cn(
            'flex items-center gap-2 px-4 py-2',
            'text-sm font-medium rounded-lg',
            'bg-primary text-primary-foreground',
            'hover:bg-primary/90 transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <FolderOpen className="w-4 h-4" />
          {isChangingPath ? 'Changing...' : 'Change Location'}
        </button>

        {storePathInfo?.isCustom && (
          <button
            onClick={handleResetPath}
            disabled={isChangingPath}
            className={cn(
              'flex items-center gap-2 px-4 py-2',
              'text-sm font-medium rounded-lg',
              'border border-border',
              'text-muted-foreground hover:text-foreground',
              'hover:bg-accent transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Default
          </button>
        )}
      </div>

      {/* Info */}
      <div className="p-4 bg-muted/30 rounded-lg border border-border">
        <h3 className="text-sm font-medium text-foreground mb-2">About Storage</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>- All projects, workflows, and settings are stored in a single JSON file</li>
          <li>- Changing the location will migrate your existing data</li>
          <li>- Use cloud storage (iCloud, Dropbox) to sync across devices</li>
        </ul>
      </div>
    </div>
  );
};
