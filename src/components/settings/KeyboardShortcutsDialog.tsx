/**
 * Keyboard Shortcuts Settings Dialog
 * Full UI editor for customizing keyboard shortcuts
 */

import { useState, useMemo, useEffect } from 'react';
import {
  Keyboard,
  X,
  Search,
  RotateCcw,
  Globe,
  AlertCircle,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  Dialog,
  DialogContent,
  DialogClose,
} from '../ui/Dialog';
import { ShortcutEditor } from './ShortcutEditor';
import { useShortcutsContext } from '../../contexts/ShortcutsContext';
import { formatShortcutKey, type KeyboardShortcut } from '../../hooks/useKeyboardShortcuts';

interface KeyboardShortcutsDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** All shortcuts available in the application */
  shortcuts: KeyboardShortcut[];
}

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
  shortcuts,
}: KeyboardShortcutsDialogProps) {
  const {
    settings,
    isLoading,
    error,
    updateShortcut,
    resetShortcut,
    resetAllShortcuts,
    setGlobalShortcutsEnabled,
    setGlobalToggleShortcut,
  } = useShortcutsContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isRecordingGlobal, setIsRecordingGlobal] = useState(false);
  const [recordedGlobalKey, setRecordedGlobalKey] = useState<string | null>(null);

  // Get unique categories
  const categories = useMemo(() => {
    const categorySet = new Set<string>();
    for (const shortcut of shortcuts) {
      if (shortcut.category) {
        categorySet.add(shortcut.category);
      }
    }
    return Array.from(categorySet).sort();
  }, [shortcuts]);

  // Filter shortcuts
  const filteredShortcuts = useMemo(() => {
    return shortcuts.filter((shortcut) => {
      if (selectedCategory && shortcut.category !== selectedCategory) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesDescription = shortcut.description.toLowerCase().includes(query);
        const matchesKey = shortcut.key.toLowerCase().includes(query);
        const matchesCategory = shortcut.category?.toLowerCase().includes(query);
        if (!matchesDescription && !matchesKey && !matchesCategory) return false;
      }

      return true;
    });
  }, [shortcuts, searchQuery, selectedCategory]);

  // Group filtered shortcuts by category
  const groupedShortcuts = useMemo(() => {
    const groups: Record<string, KeyboardShortcut[]> = {};
    const uncategorized: KeyboardShortcut[] = [];

    for (const shortcut of filteredShortcuts) {
      if (shortcut.category) {
        if (!groups[shortcut.category]) {
          groups[shortcut.category] = [];
        }
        groups[shortcut.category].push(shortcut);
      } else {
        uncategorized.push(shortcut);
      }
    }

    return { groups, uncategorized };
  }, [filteredShortcuts]);

  // Get custom binding for a shortcut
  const getCustomBinding = (shortcutId: string) => {
    return settings.customBindings[shortcutId];
  };

  // Create effective shortcuts array with current custom keys for conflict detection
  const effectiveShortcutsForConflict = useMemo(() => {
    return shortcuts.map(shortcut => {
      const binding = settings.customBindings[shortcut.id];
      return {
        ...shortcut,
        key: binding?.customKey || shortcut.key,
        enabled: binding?.enabled ?? true,
      };
    });
  }, [shortcuts, settings.customBindings]);

  // Handle global shortcut recording
  useEffect(() => {
    if (!isRecordingGlobal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'Escape') {
        setIsRecordingGlobal(false);
        setRecordedGlobalKey(null);
        return;
      }

      const parts: string[] = [];
      if (e.metaKey) parts.push('cmd');
      if (e.ctrlKey) parts.push('ctrl');
      if (e.altKey) parts.push('alt');
      if (e.shiftKey) parts.push('shift');

      const key = e.key.toLowerCase();
      if (!['meta', 'control', 'alt', 'shift'].includes(key)) {
        parts.push(key);
        setRecordedGlobalKey(parts.join('+'));
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isRecordingGlobal]);

  const handleSaveGlobalShortcut = async () => {
    if (recordedGlobalKey) {
      try {
        await setGlobalToggleShortcut(recordedGlobalKey);
        setIsRecordingGlobal(false);
        setRecordedGlobalKey(null);
      } catch {
        // Error is already set in context, keep recording state for retry
      }
    }
  };

  const handleUpdateShortcut = async (
    shortcutId: string,
    customKey: string | null,
    enabled: boolean
  ) => {
    await updateShortcut(shortcutId, customKey, enabled);
  };

  const handleResetShortcut = async (shortcutId: string) => {
    await resetShortcut(shortcutId);
  };

  const handleResetAll = async () => {
    if (
      confirm(
        'Are you sure you want to reset all keyboard shortcuts to their defaults?'
      )
    ) {
      await resetAllShortcuts();
    }
  };

  // Count customized shortcuts
  const customizedCount = Object.keys(settings.customBindings).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[80vh] flex flex-col p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-medium text-foreground">Keyboard Shortcuts</h2>
          </div>
          <DialogClose
            onClick={() => onOpenChange(false)}
            className="relative right-auto top-auto"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Error display */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-900/30 border border-red-500/30 rounded-lg text-xs text-red-300">
              <AlertCircle className="w-3.5 h-3.5" />
              {error}
            </div>
          )}

          {/* Global shortcut section */}
          <div className="px-3 py-3 bg-card rounded-lg border border-border">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-blue-500/20 flex items-center justify-center">
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <div>
                  <span className="text-xs font-medium text-foreground">
                    Global Toggle Shortcut
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Show/hide from anywhere (use ⌘⇧⌥ to avoid conflicts)
                  </p>
                </div>
              </div>
            {/* Toggle switch */}
            <button
              onClick={() => setGlobalShortcutsEnabled(!settings.globalShortcutsEnabled)}
              className={cn(
                'relative w-9 h-5 rounded-full transition-colors duration-200',
                settings.globalShortcutsEnabled ? 'bg-blue-500' : 'bg-muted'
              )}
              title={settings.globalShortcutsEnabled ? 'Disable' : 'Enable'}
            >
              <span
                className={cn(
                  'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200',
                  settings.globalShortcutsEnabled ? 'translate-x-4' : 'translate-x-0'
                )}
              />
            </button>
          </div>
          <div className="flex items-center gap-2">
            {isRecordingGlobal ? (
              <>
                <div
                  className={cn(
                    'flex-1 px-3 py-1.5 bg-background border rounded text-xs font-mono text-center',
                    recordedGlobalKey
                      ? 'border-green-500 text-green-400'
                      : 'border-blue-500 text-blue-400 animate-pulse'
                  )}
                >
                  {recordedGlobalKey
                    ? formatShortcutKey(recordedGlobalKey)
                    : 'Press keys...'}
                </div>
                <button
                  onClick={handleSaveGlobalShortcut}
                  disabled={!recordedGlobalKey}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-500 disabled:bg-muted disabled:text-muted-foreground text-white rounded text-xs font-medium transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsRecordingGlobal(false);
                    setRecordedGlobalKey(null);
                  }}
                  className="px-3 py-1.5 bg-muted hover:bg-accent text-foreground rounded text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsRecordingGlobal(true)}
                disabled={!settings.globalShortcutsEnabled}
                className={cn(
                  'flex-1 px-3 py-1.5 bg-background border border-border rounded text-xs font-mono transition-colors',
                  settings.globalShortcutsEnabled
                    ? 'text-foreground hover:bg-accent hover:border-border cursor-pointer'
                    : 'text-muted-foreground cursor-not-allowed'
                )}
              >
                {settings.globalToggleShortcut
                  ? formatShortcutKey(settings.globalToggleShortcut)
                  : 'Click to set shortcut'}
              </button>
            )}
          </div>
        </div>

        {/* Search and filter */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search shortcuts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 bg-card border border-border rounded text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-blue-500 transition-colors"
              autoComplete="off"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          {customizedCount > 0 && (
            <button
              onClick={handleResetAll}
              className="px-2.5 py-1.5 bg-card hover:bg-accent border border-border rounded text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              title="Reset all shortcuts to defaults"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>

        {/* Category tabs */}
        {categories.length > 1 && (
          <div className="flex gap-1 overflow-x-auto py-1">
            <CategoryTab
              label="All"
              count={shortcuts.length}
              isActive={selectedCategory === null}
              onClick={() => setSelectedCategory(null)}
            />
            {categories.map((category) => {
              const count = shortcuts.filter(
                (s) => s.category === category
              ).length;
              return (
                <CategoryTab
                  key={category}
                  label={category}
                  count={count}
                  isActive={selectedCategory === category}
                  onClick={() => setSelectedCategory(category)}
                />
              );
            })}
          </div>
        )}

        {/* Shortcuts list */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredShortcuts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No shortcuts found for "{searchQuery}"
            </div>
          ) : (
            <>
              {/* Uncategorized */}
              {groupedShortcuts.uncategorized.length > 0 && (
                <div className="space-y-0.5">
                  {groupedShortcuts.uncategorized.map((shortcut) => {
                    const binding = getCustomBinding(shortcut.id);
                    return (
                      <ShortcutEditor
                        key={shortcut.id}
                        shortcut={shortcut}
                        customKey={binding?.customKey ?? null}
                        enabled={binding?.enabled ?? true}
                        allShortcuts={effectiveShortcutsForConflict}
                        onUpdate={(key, enabled) =>
                          handleUpdateShortcut(shortcut.id, key, enabled)
                        }
                        onReset={() => handleResetShortcut(shortcut.id)}
                      />
                    );
                  })}
                </div>
              )}

              {/* Categorized */}
              {Object.entries(groupedShortcuts.groups).map(
                ([category, categoryShortcuts]) => (
                  <div key={category}>
                    <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-4">
                      {category}
                    </h3>
                    <div className="space-y-0.5">
                      {categoryShortcuts.map((shortcut) => {
                        const binding = getCustomBinding(shortcut.id);
                        return (
                          <ShortcutEditor
                            key={shortcut.id}
                            shortcut={shortcut}
                            customKey={binding?.customKey ?? null}
                            enabled={binding?.enabled ?? true}
                            allShortcuts={effectiveShortcutsForConflict}
                            onUpdate={(key, enabled) =>
                              handleUpdateShortcut(shortcut.id, key, enabled)
                            }
                            onReset={() => handleResetShortcut(shortcut.id)}
                          />
                        );
                      })}
                    </div>
                  </div>
                )
              )}
            </>
          )}
        </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border text-[11px] text-muted-foreground flex items-center justify-between">
          <span>
            {customizedCount > 0
              ? `${customizedCount} customized`
              : 'Using defaults'}
          </span>
          <span>{filteredShortcuts.length} shortcuts</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface CategoryTabProps {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}

function CategoryTab({ label, count, isActive, onClick }: CategoryTabProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-2 py-0.5 text-[11px] font-medium rounded transition-colors whitespace-nowrap flex items-center gap-0.5',
        isActive
          ? 'bg-blue-500/20 text-blue-400'
          : 'bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
      )}
    >
      {label}
      <span className={cn('text-[10px] tabular-nums', isActive ? 'text-blue-400/70' : 'text-muted-foreground')}>
        {count}
      </span>
    </button>
  );
}
