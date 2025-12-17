/**
 * Shortcuts Context
 * Provides keyboard shortcuts settings and global shortcut management
 */

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { shortcutsAPI, shortcutsEvents } from '../lib/tauri-api';
import type { KeyboardShortcutsSettings, CustomShortcutBinding } from '../types/shortcuts';
import { DEFAULT_KEYBOARD_SHORTCUTS_SETTINGS } from '../types/shortcuts';

interface ShortcutsContextValue {
  // State
  settings: KeyboardShortcutsSettings;
  isLoading: boolean;
  error: string | null;

  // Operations
  updateSettings: (settings: KeyboardShortcutsSettings) => Promise<void>;
  updateShortcut: (
    shortcutId: string,
    customKey: string | null,
    enabled?: boolean
  ) => Promise<void>;
  resetShortcut: (shortcutId: string) => Promise<void>;
  resetAllShortcuts: () => Promise<void>;

  // Global shortcuts
  registerGlobalShortcut: () => Promise<void>;
  unregisterGlobalShortcut: () => Promise<void>;
  setGlobalShortcutsEnabled: (enabled: boolean) => Promise<void>;
  setGlobalToggleShortcut: (shortcutKey: string) => Promise<void>;

  // Helpers
  getEffectiveKey: (shortcutId: string, defaultKey: string) => string;
  isShortcutEnabled: (shortcutId: string) => boolean;
}

const ShortcutsContext = createContext<ShortcutsContextValue | null>(null);

export function ShortcutsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<KeyboardShortcutsSettings>(
    DEFAULT_KEYBOARD_SHORTCUTS_SETTINGS
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const loaded = await shortcutsAPI.loadSettings();
        setSettings(loaded);
        setError(null);

        // Register global shortcut if enabled
        if (loaded.globalShortcutsEnabled && loaded.globalToggleShortcut) {
          try {
            await shortcutsAPI.registerGlobalToggle(loaded.globalToggleShortcut);
          } catch (e) {
            console.warn('[ShortcutsContext] Failed to register global shortcut:', e);
          }
        }
      } catch (e) {
        console.error('[ShortcutsContext] Failed to load settings:', e);
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Listen for global shortcut events
  useEffect(() => {
    let unlisten: (() => void) | null = null;

    shortcutsEvents
      .onGlobalShortcutTriggered((action) => {
        console.log('[ShortcutsContext] Global shortcut triggered:', action);
      })
      .then((unlistenFn) => {
        unlisten = unlistenFn;
      });

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shortcutsAPI.unregisterGlobal().catch(console.warn);
    };
  }, []);

  const updateSettings = useCallback(async (newSettings: KeyboardShortcutsSettings) => {
    try {
      await shortcutsAPI.saveSettings(newSettings);
      setSettings(newSettings);
      setError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      throw e;
    }
  }, []);

  const updateShortcut = useCallback(
    async (shortcutId: string, customKey: string | null, enabled = true) => {
      const newBinding: CustomShortcutBinding = {
        id: shortcutId,
        customKey,
        enabled,
      };

      const newSettings: KeyboardShortcutsSettings = {
        ...settings,
        customBindings: {
          ...settings.customBindings,
          [shortcutId]: newBinding,
        },
      };

      await updateSettings(newSettings);
    },
    [settings, updateSettings]
  );

  const resetShortcut = useCallback(
    async (shortcutId: string) => {
      const { [shortcutId]: _, ...restBindings } = settings.customBindings;
      const newSettings: KeyboardShortcutsSettings = {
        ...settings,
        customBindings: restBindings,
      };

      await updateSettings(newSettings);
    },
    [settings, updateSettings]
  );

  const resetAllShortcuts = useCallback(async () => {
    const newSettings: KeyboardShortcutsSettings = {
      ...settings,
      customBindings: {},
    };

    await updateSettings(newSettings);
  }, [settings, updateSettings]);

  const registerGlobalShortcut = useCallback(async () => {
    if (settings.globalToggleShortcut) {
      await shortcutsAPI.registerGlobalToggle(settings.globalToggleShortcut);
    }
  }, [settings.globalToggleShortcut]);

  const unregisterGlobalShortcut = useCallback(async () => {
    await shortcutsAPI.unregisterGlobal();
  }, []);

  const setGlobalShortcutsEnabled = useCallback(
    async (enabled: boolean) => {
      if (enabled && settings.globalToggleShortcut) {
        // Try to register first
        try {
          await shortcutsAPI.registerGlobalToggle(settings.globalToggleShortcut);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (msg.includes('CONFLICT')) {
            setError(msg);
            throw new Error(msg);
          }
          setError(`Failed to register shortcut: ${msg}`);
          throw e;
        }
      } else {
        await shortcutsAPI.unregisterGlobal();
      }

      // Only save if registration succeeded
      const newSettings: KeyboardShortcutsSettings = {
        ...settings,
        globalShortcutsEnabled: enabled,
      };

      await updateSettings(newSettings);
      setError(null);
    },
    [settings, updateSettings]
  );

  const setGlobalToggleShortcut = useCallback(
    async (shortcutKey: string) => {
      // Unregister old shortcut first
      await shortcutsAPI.unregisterGlobal();

      // Try to register new shortcut if enabled
      if (settings.globalShortcutsEnabled) {
        try {
          await shortcutsAPI.registerGlobalToggle(shortcutKey);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          // Check if it's a conflict error
          if (msg.includes('CONFLICT')) {
            setError(msg);
            throw new Error(msg);
          }
          setError(`Failed to register shortcut: ${msg}`);
          throw e;
        }
      }

      // Only save settings if registration succeeded (or wasn't needed)
      const newSettings: KeyboardShortcutsSettings = {
        ...settings,
        globalToggleShortcut: shortcutKey,
      };

      await updateSettings(newSettings);
      setError(null);
    },
    [settings, updateSettings]
  );

  const getEffectiveKey = useCallback(
    (shortcutId: string, defaultKey: string): string => {
      const binding = settings.customBindings[shortcutId];
      if (binding?.customKey) {
        return binding.customKey;
      }
      return defaultKey;
    },
    [settings.customBindings]
  );

  const isShortcutEnabled = useCallback(
    (shortcutId: string): boolean => {
      const binding = settings.customBindings[shortcutId];
      if (binding) {
        return binding.enabled;
      }
      return true; // Default to enabled
    },
    [settings.customBindings]
  );

  const value: ShortcutsContextValue = {
    settings,
    isLoading,
    error,
    updateSettings,
    updateShortcut,
    resetShortcut,
    resetAllShortcuts,
    registerGlobalShortcut,
    unregisterGlobalShortcut,
    setGlobalShortcutsEnabled,
    setGlobalToggleShortcut,
    getEffectiveKey,
    isShortcutEnabled,
  };

  return <ShortcutsContext.Provider value={value}>{children}</ShortcutsContext.Provider>;
}

export function useShortcutsContext(): ShortcutsContextValue {
  const context = useContext(ShortcutsContext);
  if (!context) {
    throw new Error('useShortcutsContext must be used within a ShortcutsProvider');
  }
  return context;
}
