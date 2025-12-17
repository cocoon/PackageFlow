/**
 * useSecurity Hook
 * Provides security audit functionality for projects
 * @see specs/005-package-security-audit/
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  securityAPI,
  securityEvents,
  type VulnScanResult,
  type ScanError,
  type SecurityScanData,
  type PackageManagerType,
  type SecurityScanProgressPayload,
} from '../lib/tauri-api';

export interface UseSecurityOptions {
  /** Auto-save scan results to store */
  autoSave?: boolean;
  /** Load last scan on mount */
  loadOnMount?: boolean;
}

export interface UseSecurityReturn {
  /** Current scan result */
  scanResult: VulnScanResult | null;
  /** Whether a scan is in progress */
  isScanning: boolean;
  /** Current scan progress stage */
  scanProgress: SecurityScanProgressPayload | null;
  /** Scan error if any */
  error: ScanError | null;
  /** Detected package manager */
  packageManager: PackageManagerType | null;
  /** Full security scan data (including history) */
  scanData: SecurityScanData | null;
  /** Run a security audit */
  runScan: (projectPath: string, pm?: PackageManagerType) => Promise<void>;
  /** Clear current error */
  clearError: () => void;
  /** Load saved scan for project */
  loadScan: () => Promise<void>;
}

/**
 * Hook for managing security audit operations
 * @param projectId - The project ID to manage security for
 * @param options - Configuration options
 */
export function useSecurity(
  projectId: string | null,
  options: UseSecurityOptions = {}
): UseSecurityReturn {
  const { autoSave = true, loadOnMount = true } = options;

  const [scanResult, setScanResult] = useState<VulnScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<SecurityScanProgressPayload | null>(null);
  const [error, setError] = useState<ScanError | null>(null);
  const [packageManager, setPackageManager] = useState<PackageManagerType | null>(null);
  const [scanData, setScanData] = useState<SecurityScanData | null>(null);

  // Track previous projectId to detect changes
  const prevProjectIdRef = useRef<string | null>(null);

  // Load saved scan data
  const loadScan = useCallback(async () => {
    if (!projectId) return;

    try {
      const response = await securityAPI.getSecurityScan(projectId);
      if (response.success && response.data) {
        setScanData(response.data);
        setPackageManager(response.data.packageManager);
        if (response.data.lastScan) {
          setScanResult(response.data.lastScan);
        }
      }
    } catch (err) {
      console.error('Failed to load security scan:', err);
    }
  }, [projectId]);

  // Run security audit
  const runScan = useCallback(
    async (projectPath: string, pm?: PackageManagerType) => {
      if (!projectId) {
        return;
      }

      setIsScanning(true);
      setError(null);
      setScanProgress(null);

      try {
        const response = await securityAPI.runSecurityAudit(projectId, projectPath, pm);

        if (response.success && response.result) {
          setScanResult(response.result);
          setPackageManager(response.result.packageManager);

          // Auto-save if enabled
          if (autoSave) {
            await securityAPI.saveSecurityScan(projectId, response.result);
            // Reload to get updated history
            await loadScan();
          }
        } else if (response.error) {
          setError(response.error);
        }
      } catch (err) {
        console.error('Failed to run security scan:', err);
        setError({
          code: 'UNKNOWN',
          message: String(err),
          details: undefined,
          suggestion: 'Please try again later',
        });
      } finally {
        setIsScanning(false);
        setScanProgress(null);
      }
    },
    [projectId, autoSave, loadScan]
  );

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Reset state and load scan when projectId changes
  useEffect(() => {
    // Only reset if projectId actually changed (not on every render)
    if (prevProjectIdRef.current !== projectId) {
      // Reset all state when projectId changes
      setScanResult(null);
      setIsScanning(false);
      setScanProgress(null);
      setError(null);
      setPackageManager(null);
      setScanData(null);

      // Update ref
      prevProjectIdRef.current = projectId;

      // Load saved scan for new project
      if (loadOnMount && projectId) {
        securityAPI
          .getSecurityScan(projectId)
          .then((response) => {
            if (response.success && response.data) {
              setScanData(response.data);
              setPackageManager(response.data.packageManager);
              if (response.data.lastScan) {
                setScanResult(response.data.lastScan);
              }
            }
          })
          .catch((err) => {
            console.error('Failed to load security scan:', err);
          });
      }
    }
  }, [projectId, loadOnMount]);

  // Listen for scan events
  useEffect(() => {
    if (!projectId) return;

    const unsubscribers: (() => void)[] = [];

    // Progress event
    securityEvents
      .onScanProgress((data) => {
        if (data.projectId === projectId) {
          setScanProgress(data);
        }
      })
      .then((unlisten) => {
        unsubscribers.push(unlisten);
      });

    // Completed event (as backup for async response)
    securityEvents
      .onScanCompleted((data) => {
        if (data.projectId === projectId) {
          setIsScanning(false);
          setScanProgress(null);

          if (data.success && data.result) {
            setScanResult(data.result);
            setPackageManager(data.result.packageManager);
          } else if (data.error) {
            setError(data.error);
          }
        }
      })
      .then((unlisten) => {
        unsubscribers.push(unlisten);
      });

    return () => {
      unsubscribers.forEach((unlisten) => unlisten());
    };
  }, [projectId]);

  return {
    scanResult,
    isScanning,
    scanProgress,
    error,
    packageManager,
    scanData,
    runScan,
    clearError,
    loadScan,
  };
}

export default useSecurity;
