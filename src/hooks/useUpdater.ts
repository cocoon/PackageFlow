import { useCallback, useEffect, useRef, useState } from 'react';
import { check, Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { getVersion } from '@tauri-apps/api/app';
import type { UpdateState } from '../components/ui/UpdateDialog';

// Set to true to preview the update dialog (for testing only)
const DEBUG_SHOW_DIALOG = false;

export interface UseUpdaterReturn {
  // Dialog state
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;

  // Update state
  state: UpdateState | 'idle' | 'checking';

  // Update info
  currentVersion: string;
  newVersion: string | null;
  releaseNotes: string | null;

  // Progress
  downloadProgress: number;
  downloadedBytes: number;
  totalBytes: number;

  // Error
  error: string | null;

  // Actions
  startUpdate: () => void;
  dismissUpdate: () => void;
  restartApp: () => void;
  retryUpdate: () => void;
  checkForUpdates: () => void;
}

export function useUpdater(): UseUpdaterReturn {
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);

  // Update state
  const [state, setState] = useState<UpdateState | 'idle' | 'checking'>('idle');
  const [currentVersion, setCurrentVersion] = useState('');
  const [newVersion, setNewVersion] = useState<string | null>(null);
  const [releaseNotes, setReleaseNotes] = useState<string | null>(null);

  // Progress
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadedBytes, setDownloadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);

  // Error
  const [error, setError] = useState<string | null>(null);

  // Store update object for later use
  const updateRef = useRef<Update | null>(null);

  // Fetch current version on mount
  useEffect(() => {
    getVersion().then(setCurrentVersion).catch(console.error);
  }, []);

  // Check for updates
  const checkForUpdates = useCallback(async () => {
    setState('checking');
    setError(null);

    try {
      // Debug mode: show dialog with fake data
      if (DEBUG_SHOW_DIALOG) {
        setNewVersion('X.X.X');
        setReleaseNotes('- New feature 1\n- Bug fix for XYZ\n- Performance improvements');
        setState('available');
        setDialogOpen(true);
        return;
      }

      const update = await check();

      if (update) {
        updateRef.current = update;
        setNewVersion(update.version);
        setReleaseNotes(update.body ?? null);
        setState('available');
        setDialogOpen(true);
        console.log(`[Updater] Update available: ${update.version}`);
      } else {
        setState('idle');
        console.log('[Updater] No updates available');
      }
    } catch (err) {
      console.error('Failed to check for updates:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setState('error');
      setDialogOpen(true);
    }
  }, []);

  // Debug simulation of update process
  const simulateUpdate = useCallback(async () => {
    const TOTAL_SIZE = 28_500_000; // ~28.5 MB
    const CHUNK_SIZE = 950_000; // ~950 KB per tick
    const TICK_INTERVAL = 100; // ms

    setState('downloading');
    setDownloadProgress(0);
    setDownloadedBytes(0);
    setTotalBytes(TOTAL_SIZE);
    setError(null);

    console.log('[Updater Debug] Simulating download...');

    return new Promise<void>((resolve) => {
      let downloaded = 0;
      const interval = setInterval(() => {
        downloaded += CHUNK_SIZE;
        if (downloaded >= TOTAL_SIZE) {
          downloaded = TOTAL_SIZE;
          clearInterval(interval);
          setDownloadedBytes(downloaded);
          setDownloadProgress(100);
          console.log('[Updater Debug] Download complete, installing...');
          setState('installing');

          // Simulate install delay
          setTimeout(() => {
            console.log('[Updater Debug] Install complete');
            setState('complete');
            resolve();
          }, 1500);
        } else {
          const percent = Math.round((downloaded / TOTAL_SIZE) * 100);
          setDownloadedBytes(downloaded);
          setDownloadProgress(percent);
          console.log(`[Updater Debug] Progress: ${percent}%`);
        }
      }, TICK_INTERVAL);
    });
  }, []);

  // Start update download and install
  const startUpdate = useCallback(async () => {
    // Debug mode: simulate download and install
    if (DEBUG_SHOW_DIALOG) {
      await simulateUpdate();
      return;
    }

    const update = updateRef.current;
    if (!update) return;

    setState('downloading');
    setDownloadProgress(0);
    setDownloadedBytes(0);
    setTotalBytes(0);
    setError(null);

    try {
      let downloaded = 0;
      let contentLength = 0;

      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            contentLength = event.data.contentLength ?? 0;
            setTotalBytes(contentLength);
            console.log(`[Updater] Started downloading ${contentLength} bytes`);
            break;
          case 'Progress':
            downloaded += event.data.chunkLength;
            const percent = contentLength > 0 ? Math.round((downloaded / contentLength) * 100) : 0;
            setDownloadedBytes(downloaded);
            setDownloadProgress(percent);
            console.log(`[Updater] Progress: ${percent}%`);
            break;
          case 'Finished':
            console.log('[Updater] Download finished, installing...');
            setDownloadedBytes(contentLength);
            setDownloadProgress(100);
            setState('installing');
            break;
        }
      });

      console.log('[Updater] Update installed successfully');
      setState('complete');
    } catch (err) {
      console.error('[Updater] Update failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setState('error');
    }
  }, [simulateUpdate]);

  // Dismiss update dialog
  const dismissUpdate = useCallback(() => {
    setDialogOpen(false);
    // Don't reset state so user can be reminded later
  }, []);

  // Restart the app
  const restartApp = useCallback(async () => {
    try {
      console.log('[Updater] Attempting relaunch...');
      await relaunch();
    } catch (err) {
      console.error('[Updater] Relaunch failed:', err);
      setError('Failed to restart. Please close and reopen the app manually.');
      setState('error');
    }
  }, []);

  // Retry update
  const retryUpdate = useCallback(() => {
    setError(null);
    if (updateRef.current) {
      startUpdate();
    } else {
      checkForUpdates();
    }
  }, [startUpdate, checkForUpdates]);

  // Check for updates on app start (with a small delay)
  useEffect(() => {
    const timer = setTimeout(checkForUpdates, 3000);
    return () => clearTimeout(timer);
  }, [checkForUpdates]);

  return {
    dialogOpen,
    setDialogOpen,
    state,
    currentVersion,
    newVersion,
    releaseNotes,
    downloadProgress,
    downloadedBytes,
    totalBytes,
    error,
    startUpdate,
    dismissUpdate,
    restartApp,
    retryUpdate,
    checkForUpdates,
  };
}
