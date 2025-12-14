import { useEffect, useState } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { ask, message } from '@tauri-apps/plugin-dialog';
import { relaunch } from '@tauri-apps/plugin-process';

// Set to true to preview the update dialog (for testing only)
const DEBUG_SHOW_DIALOG = false;

export interface UpdateProgress {
  downloaded: number;
  total: number;
  percent: number;
}

export function useUpdater() {
  const [checking, setChecking] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [progress, setProgress] = useState<UpdateProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkForUpdates = async () => {
      setChecking(true);
      setError(null);

      try {
        // Debug mode: show dialog without checking for updates
        if (DEBUG_SHOW_DIALOG) {
          const confirmed = await ask(
            `A new version (vX.X.X) is available!\n\nWould you like to download and install it now?`,
            {
              title: 'Update Available',
              kind: 'info',
              okLabel: 'Update',
              cancelLabel: 'Later',
            }
          );
          console.log('User chose:', confirmed ? 'Update' : 'Later');
          setChecking(false);
          return;
        }

        const update = await check();

        if (update) {
          const confirmed = await ask(
            `A new version (${update.version}) is available!\n\nWould you like to download and install it now?`,
            {
              title: 'Update Available',
              kind: 'info',
              okLabel: 'Update',
              cancelLabel: 'Later',
            }
          );

          if (confirmed) {
            setUpdating(true);
            setProgress({ downloaded: 0, total: 0, percent: 0 });

            let downloaded = 0;
            let contentLength = 0;

            await update.downloadAndInstall((event) => {
              switch (event.event) {
                case 'Started':
                  contentLength = event.data.contentLength ?? 0;
                  console.log(`[Updater] Started downloading ${contentLength} bytes`);
                  break;
                case 'Progress':
                  downloaded += event.data.chunkLength;
                  const percent = contentLength > 0 ? Math.round((downloaded / contentLength) * 100) : 0;
                  setProgress({ downloaded, total: contentLength, percent });
                  console.log(`[Updater] Progress: ${percent}%`);
                  break;
                case 'Finished':
                  console.log('[Updater] Download finished, installing...');
                  setProgress({ downloaded: contentLength, total: contentLength, percent: 100 });
                  break;
              }
            });

            console.log('[Updater] Update installed successfully');

            // Show completion message and then relaunch
            await message('Update installed successfully! Click OK to restart the app.', {
              title: 'Update Complete',
              kind: 'info',
            });

            console.log('[Updater] User confirmed, attempting relaunch...');

            try {
              await relaunch();
              console.log('[Updater] Relaunch called');
            } catch (relaunchError) {
              console.error('[Updater] Relaunch failed:', relaunchError);
              // Fallback: inform user to restart manually
              await message(
                'The app could not restart automatically. Please close and reopen the app to complete the update.',
                {
                  title: 'Manual Restart Required',
                  kind: 'warning',
                }
              );
            }
          }
        }
      } catch (err) {
        console.error('Failed to check for updates:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setUpdating(false);
        setProgress(null);
      } finally {
        setChecking(false);
      }
    };

    // Check for updates on app start (with a small delay)
    const timer = setTimeout(checkForUpdates, 3000);

    return () => clearTimeout(timer);
  }, []);

  return { checking, updating, progress, error };
}
