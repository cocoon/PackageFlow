/**
 * Keyboard Shortcuts Hook
 * Manages global keyboard shortcut bindings and execution
 */

import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcut {
  /** Unique shortcut identifier */
  id: string;
  /** Key combination (e.g., 'cmd+s', 'ctrl+shift+r') */
  key: string;
  /** Shortcut description */
  description: string;
  /** Shortcut category */
  category?: string;
  /** Action to execute */
  action: () => void;
  /** Whether shortcut is enabled */
  enabled?: boolean;
  /** Whether shortcut works in input fields */
  enabledInInput?: boolean;
}

interface UseKeyboardShortcutsOptions {
  /** Whether shortcuts are enabled */
  enabled?: boolean;
}

/**
 * Parse shortcut key string
 * @param key Shortcut key string (e.g., 'cmd+s', 'ctrl+shift+r')
 */
function parseKey(key: string): {
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  key: string;
} {
  const parts = key.toLowerCase().split('+');
  const mainKey = parts[parts.length - 1];

  return {
    ctrlKey: parts.includes('ctrl'),
    metaKey: parts.includes('cmd') || parts.includes('meta'),
    shiftKey: parts.includes('shift'),
    altKey: parts.includes('alt') || parts.includes('option'),
    key: mainKey,
  };
}

/**
 * Map special key names from keyboard event to normalized names
 */
const KEY_MAP: Record<string, string> = {
  arrowup: 'up',
  arrowdown: 'down',
  arrowleft: 'left',
  arrowright: 'right',
  ' ': 'space',
  escape: 'esc',
};

/**
 * Check if keyboard event matches shortcut
 */
function matchesShortcut(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
  const parsed = parseKey(shortcut.key);

  // On macOS, cmd maps to metaKey; on Windows/Linux, ctrl maps to ctrlKey
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  // For cmd+key, check metaKey on Mac, ctrlKey on other platforms
  const cmdOrCtrl = isMac ? event.metaKey : event.ctrlKey;
  const expectedCmdOrCtrl = parsed.metaKey || parsed.ctrlKey;

  if (expectedCmdOrCtrl && !cmdOrCtrl) return false;
  if (!expectedCmdOrCtrl && cmdOrCtrl) return false;

  if (parsed.shiftKey !== event.shiftKey) return false;
  if (parsed.altKey !== event.altKey) return false;

  // Compare key - normalize event key using KEY_MAP
  const rawEventKey = event.key.toLowerCase();
  const eventKey = KEY_MAP[rawEventKey] || rawEventKey;
  const targetKey = parsed.key;

  return eventKey === targetKey;
}

/**
 * Check if element is an input element
 */
function isInputElement(element: EventTarget | null): boolean {
  if (!element || !(element instanceof HTMLElement)) return false;

  const tagName = element.tagName.toLowerCase();
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    return true;
  }

  // Check contenteditable
  if (element.getAttribute('contenteditable') === 'true') {
    return true;
  }

  return false;
}

/**
 * Keyboard Shortcuts Management Hook
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = {}
) {
  const { enabled = true } = options;
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const isInInput = isInputElement(event.target);

      for (const shortcut of shortcutsRef.current) {
        // Check if shortcut is enabled
        if (shortcut.enabled === false) continue;

        // Check if in input field
        if (isInInput && !shortcut.enabledInInput) continue;

        // Check if matches
        if (matchesShortcut(event, shortcut)) {
          event.preventDefault();
          event.stopPropagation();
          shortcut.action();
          return;
        }
      }
    },
    [enabled]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [handleKeyDown]);
}

/**
 * Format shortcut key for display
 * @param key Shortcut key string
 * @returns Formatted display text
 */
export function formatShortcutKey(key: string): string {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  const parts = key.toLowerCase().split('+');
  const symbols: string[] = [];

  for (const part of parts) {
    switch (part) {
      case 'cmd':
      case 'meta':
        symbols.push(isMac ? '⌘' : 'Ctrl');
        break;
      case 'ctrl':
        symbols.push(isMac ? '⌃' : 'Ctrl');
        break;
      case 'shift':
        symbols.push(isMac ? '⇧' : 'Shift');
        break;
      case 'alt':
      case 'option':
        symbols.push(isMac ? '⌥' : 'Alt');
        break;
      default:
        // Main key
        symbols.push(part.toUpperCase());
    }
  }

  return isMac ? symbols.join('') : symbols.join('+');
}

/**
 * Default shortcut definitions
 */
export const DEFAULT_SHORTCUTS = {
  SAVE: 'cmd+s',
  REFRESH: 'cmd+r',
  QUICK_SWITCHER: 'cmd+k',
  CLOSE: 'cmd+w',
  NEW: 'cmd+n',
  SETTINGS: 'cmd+,',
  HELP: 'cmd+/',
  SEARCH: 'cmd+f',
  UNDO: 'cmd+z',
  REDO: 'cmd+shift+z',
} as const;
