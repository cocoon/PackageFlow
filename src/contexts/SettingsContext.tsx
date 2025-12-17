/**
 * Settings Context
 * Provides app-wide settings like path display format and reduce motion
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { settingsAPI } from '../lib/tauri-api';
import type { AppSettings, PathDisplayFormat } from '../types/tauri';
import { formatPath as formatPathShort } from '../lib/utils';

interface SettingsContextValue {
  // State
  settings: AppSettings | null;
  isLoading: boolean;
  error: string | null;

  // Path display format
  pathDisplayFormat: PathDisplayFormat;
  setPathDisplayFormat: (format: PathDisplayFormat) => Promise<void>;

  // Terminal height
  terminalHeight: number;
  setTerminalHeight: (height: number) => Promise<void>;

  // Reduce motion preference
  reduceMotion: boolean;
  setReduceMotion: (reduce: boolean) => Promise<void>;

  // Helper function
  formatPath: (path: string) => string;

  // Reload settings
  reloadSettings: () => Promise<void>;
}

const DEFAULT_SETTINGS: Partial<AppSettings> = {
  pathDisplayFormat: 'short',
  terminalHeight: 200,
  reduceMotion: false,
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const loaded = await settingsAPI.loadSettings();
      setSettings(loaded);
      setError(null);
    } catch (e) {
      console.error('[SettingsContext] Failed to load settings:', e);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const pathDisplayFormat = useMemo<PathDisplayFormat>(() => {
    return settings?.pathDisplayFormat ?? DEFAULT_SETTINGS.pathDisplayFormat ?? 'short';
  }, [settings?.pathDisplayFormat]);

  const setPathDisplayFormat = useCallback(
    async (format: PathDisplayFormat) => {
      if (!settings) return;

      const newSettings: AppSettings = {
        ...settings,
        pathDisplayFormat: format,
      };

      try {
        await settingsAPI.saveSettings(newSettings);
        setSettings(newSettings);
        setError(null);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        throw e;
      }
    },
    [settings]
  );

  const terminalHeight = useMemo<number>(() => {
    return settings?.terminalHeight ?? DEFAULT_SETTINGS.terminalHeight ?? 200;
  }, [settings?.terminalHeight]);

  const setTerminalHeight = useCallback(
    async (height: number) => {
      if (!settings) return;

      const newSettings: AppSettings = {
        ...settings,
        terminalHeight: height,
      };

      try {
        await settingsAPI.saveSettings(newSettings);
        setSettings(newSettings);
        setError(null);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        throw e;
      }
    },
    [settings]
  );

  // Reduce motion - respects system preference as default
  const reduceMotion = useMemo<boolean>(() => {
    // If user has explicitly set a preference, use it
    if (settings?.reduceMotion !== undefined) {
      return settings.reduceMotion;
    }
    // Otherwise, respect system preference
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return DEFAULT_SETTINGS.reduceMotion ?? false;
  }, [settings?.reduceMotion]);

  const setReduceMotion = useCallback(
    async (reduce: boolean) => {
      if (!settings) return;

      const newSettings: AppSettings = {
        ...settings,
        reduceMotion: reduce,
      };

      try {
        await settingsAPI.saveSettings(newSettings);
        setSettings(newSettings);
        setError(null);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        throw e;
      }
    },
    [settings]
  );

  // Apply reduce motion class to document
  useEffect(() => {
    const root = window.document.documentElement;
    if (reduceMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }
  }, [reduceMotion]);

  // Path formatting function that respects the setting
  const formatPath = useCallback(
    (path: string): string => {
      if (pathDisplayFormat === 'full') {
        return path;
      }
      return formatPathShort(path);
    },
    [pathDisplayFormat]
  );

  const value: SettingsContextValue = {
    settings,
    isLoading,
    error,
    pathDisplayFormat,
    setPathDisplayFormat,
    terminalHeight,
    setTerminalHeight,
    reduceMotion,
    setReduceMotion,
    formatPath,
    reloadSettings: loadSettings,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
