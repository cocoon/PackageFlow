/**
 * Version check hook for project version requirements
 * Feature: 006-node-package-manager
 *
 * @see specs/006-node-package-manager/spec.md
 */

import { useState, useCallback } from 'react';
import { versionAPI } from '../lib/tauri-api';
import type { VersionRequirement, SystemEnvironment, VersionCompatibility } from '../types/version';

interface UseVersionCheckReturn {
  // State
  versionRequirement: VersionRequirement | null;
  systemEnvironment: SystemEnvironment | null;
  compatibility: VersionCompatibility | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadVersionRequirement: (projectPath: string) => Promise<VersionRequirement | null>;
  loadSystemEnvironment: () => Promise<SystemEnvironment | null>;
  checkCompatibility: (projectPath: string) => Promise<VersionCompatibility | null>;
  clearError: () => void;
}

export function useVersionCheck(): UseVersionCheckReturn {
  const [versionRequirement, setVersionRequirement] = useState<VersionRequirement | null>(null);
  const [systemEnvironment, setSystemEnvironment] = useState<SystemEnvironment | null>(null);
  const [compatibility, setCompatibility] = useState<VersionCompatibility | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load version requirements from project's package.json
   */
  const loadVersionRequirement = useCallback(
    async (projectPath: string): Promise<VersionRequirement | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await versionAPI.getVersionRequirement(projectPath);

        if (response.success && response.data) {
          setVersionRequirement(response.data);
          return response.data;
        } else {
          setError(response.error || 'Failed to load version requirement');
          return null;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        console.error('Failed to load version requirement:', err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Load system environment information
   */
  const loadSystemEnvironment = useCallback(async (): Promise<SystemEnvironment | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await versionAPI.getSystemEnvironment();

      if (response.success && response.data) {
        setSystemEnvironment(response.data);
        return response.data;
      } else {
        setError(response.error || 'Failed to load system environment');
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Failed to load system environment:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Check version compatibility between project requirements and system
   */
  const checkCompatibility = useCallback(
    async (projectPath: string): Promise<VersionCompatibility | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await versionAPI.checkVersionCompatibility(projectPath);

        if (response.success && response.data) {
          setCompatibility(response.data);
          return response.data;
        } else {
          setError(response.error || 'Failed to check version compatibility');
          return null;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        console.error('Failed to check version compatibility:', err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    versionRequirement,
    systemEnvironment,
    compatibility,
    isLoading,
    error,

    // Actions
    loadVersionRequirement,
    loadSystemEnvironment,
    checkCompatibility,
    clearError,
  };
}
