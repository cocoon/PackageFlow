/**
 * Keyboard Shortcut Utilities
 * Helper functions for keyboard shortcut management
 */

import type { KeyboardShortcut } from '../hooks/useKeyboardShortcuts';
import { SYSTEM_RESERVED_SHORTCUTS } from '../types/shortcuts';

export interface ConflictResult {
  hasConflict: boolean;
  conflictsWith?: KeyboardShortcut;
  isSystemReserved?: boolean;
}

/**
 * Normalize a shortcut key string for comparison
 * e.g., "Cmd+Shift+P" -> "cmd+shift+p"
 */
export function normalizeShortcutKey(key: string): string {
  return key
    .toLowerCase()
    .split('+')
    .map((part) => {
      // Normalize modifier names
      switch (part) {
        case 'meta':
        case 'command':
          return 'cmd';
        case 'control':
        case 'ctrl':
          return 'ctrl';
        case 'option':
        case 'alt':
          return 'alt';
        default:
          return part;
      }
    })
    .sort((a, b) => {
      // Sort modifiers first, then key
      const modifiers = ['cmd', 'ctrl', 'alt', 'shift'];
      const aIsModifier = modifiers.includes(a);
      const bIsModifier = modifiers.includes(b);
      if (aIsModifier && !bIsModifier) return -1;
      if (!aIsModifier && bIsModifier) return 1;
      return a.localeCompare(b);
    })
    .join('+');
}

/**
 * Check if a shortcut key is reserved by the system
 */
export function isSystemReserved(key: string): boolean {
  const normalized = normalizeShortcutKey(key);
  return SYSTEM_RESERVED_SHORTCUTS.some(
    (reserved) => normalizeShortcutKey(reserved) === normalized
  );
}

/**
 * Detect conflicts between a new shortcut and existing shortcuts
 */
export function detectConflicts(
  newKey: string,
  existingShortcuts: KeyboardShortcut[],
  excludeId?: string
): ConflictResult {
  // Check system reserved shortcuts
  if (isSystemReserved(newKey)) {
    return {
      hasConflict: true,
      isSystemReserved: true,
    };
  }

  const normalizedNew = normalizeShortcutKey(newKey);

  // Check against existing shortcuts
  for (const shortcut of existingShortcuts) {
    if (excludeId && shortcut.id === excludeId) continue;
    if (shortcut.enabled === false) continue;

    const normalizedExisting = normalizeShortcutKey(shortcut.key);
    if (normalizedNew === normalizedExisting) {
      return {
        hasConflict: true,
        conflictsWith: shortcut,
      };
    }
  }

  return { hasConflict: false };
}

/**
 * Parse a keyboard event into a shortcut string
 */
export function parseKeyboardEvent(e: KeyboardEvent): string {
  const parts: string[] = [];

  // Add modifiers in order
  if (e.metaKey) parts.push('cmd');
  if (e.ctrlKey) parts.push('ctrl');
  if (e.altKey) parts.push('alt');
  if (e.shiftKey) parts.push('shift');

  // Get the key
  const key = e.key.toLowerCase();

  // Ignore standalone modifier keys
  if (['meta', 'control', 'alt', 'shift'].includes(key)) {
    return parts.join('+');
  }

  // Map special keys
  const keyMap: Record<string, string> = {
    arrowup: 'up',
    arrowdown: 'down',
    arrowleft: 'left',
    arrowright: 'right',
    ' ': 'space',
    escape: 'esc',
    backspace: 'backspace',
    enter: 'enter',
    tab: 'tab',
    delete: 'delete',
  };

  parts.push(keyMap[key] || key);

  return parts.join('+');
}

/**
 * Validate if a shortcut key string is valid
 */
export function isValidShortcut(key: string): boolean {
  const parts = key.toLowerCase().split('+');
  if (parts.length === 0) return false;

  // Must have at least one modifier for non-function keys
  const modifiers = ['cmd', 'ctrl', 'alt', 'shift', 'meta', 'control', 'option'];
  const hasModifier = parts.some((p) => modifiers.includes(p));

  // Function keys (F1-F12) don't need modifiers
  const lastPart = parts[parts.length - 1];
  const isFunctionKey = /^f([1-9]|1[0-2])$/.test(lastPart);

  if (!hasModifier && !isFunctionKey) return false;

  // Must have exactly one non-modifier key
  const nonModifiers = parts.filter((p) => !modifiers.includes(p));
  if (nonModifiers.length !== 1) return false;

  return true;
}

/**
 * Format a shortcut key for display
 * e.g., "cmd+shift+p" -> "⌘⇧P"
 */
export function formatShortcutKeySymbol(key: string): string {
  const parts = key.split('+');
  return parts
    .map((part) => {
      const lower = part.toLowerCase();
      switch (lower) {
        case 'cmd':
        case 'meta':
          return '\u2318'; // Command symbol
        case 'ctrl':
        case 'control':
          return '\u2303'; // Control symbol
        case 'alt':
        case 'option':
          return '\u2325'; // Option symbol
        case 'shift':
          return '\u21E7'; // Shift symbol
        case 'enter':
          return '\u21A9'; // Return symbol
        case 'backspace':
          return '\u232B'; // Delete symbol
        case 'delete':
          return '\u2326'; // Forward delete symbol
        case 'esc':
        case 'escape':
          return 'Esc';
        case 'tab':
          return '\u21E5'; // Tab symbol
        case 'space':
          return 'Space';
        case 'up':
          return '\u2191';
        case 'down':
          return '\u2193';
        case 'left':
          return '\u2190';
        case 'right':
          return '\u2192';
        default:
          return part.toUpperCase();
      }
    })
    .join('');
}
