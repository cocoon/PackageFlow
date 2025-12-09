/**
 * Keyboard Shortcuts Types
 * Defines types for custom keyboard shortcuts configuration
 */

/**
 * Custom shortcut binding configuration
 */
export interface CustomShortcutBinding {
  /** Shortcut identifier (matches KeyboardShortcut.id) */
  id: string;
  /** Custom key combination (null = use default) */
  customKey: string | null;
  /** Whether this shortcut is enabled */
  enabled: boolean;
}

/**
 * Keyboard shortcuts settings stored in AppSettings
 */
export interface KeyboardShortcutsSettings {
  /** Settings version for migration */
  version: number;
  /** Custom shortcut bindings (keyed by shortcut id) */
  customBindings: Record<string, CustomShortcutBinding>;
  /** Whether global shortcuts are enabled (works when app is not focused) */
  globalShortcutsEnabled: boolean;
  /** Global shortcut for toggling window visibility */
  globalToggleShortcut: string;
}

/**
 * Default keyboard shortcuts settings
 */
export const DEFAULT_KEYBOARD_SHORTCUTS_SETTINGS: KeyboardShortcutsSettings = {
  version: 1,
  customBindings: {},
  globalShortcutsEnabled: true,
  globalToggleShortcut: 'cmd+shift+p',
};

/**
 * Shortcut category definition
 */
export type ShortcutCategory =
  | 'General'
  | 'Navigation'
  | 'Data'
  | 'Execution'
  | 'Editor'
  | 'Help';

/**
 * All available shortcut categories
 */
export const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  'General',
  'Navigation',
  'Data',
  'Execution',
  'Editor',
  'Help',
];

/**
 * System reserved shortcuts that cannot be customized (macOS)
 */
export const SYSTEM_RESERVED_SHORTCUTS = [
  'cmd+q',      // Quit
  'cmd+h',      // Hide
  'cmd+m',      // Minimize
  'cmd+tab',    // App switch
  'cmd+space',  // Spotlight
  'cmd+`',      // Window switch
] as const;

/**
 * Check if a shortcut key is system reserved
 */
export function isSystemReservedShortcut(key: string): boolean {
  const normalized = key.toLowerCase().replace(/\s/g, '');
  return SYSTEM_RESERVED_SHORTCUTS.some(
    reserved => normalized === reserved.toLowerCase()
  );
}
