/**
 * Quick Switcher Component
 * A keyboard-driven command palette for quick navigation
 * @see specs/001-worktree-enhancements/tasks.md - T040-T042
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface QuickSwitcherItem {
  id: string;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  category?: string;
  keywords?: string[];
  onSelect?: () => void;
}

interface QuickSwitcherProps {
  items: QuickSwitcherItem[];
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (item: QuickSwitcherItem) => void;
  placeholder?: string;
  emptyMessage?: string;
  title?: string;
}

/**
 * Score a match (higher is better)
 */
function scoreMatch(query: string, text: string): number {
  const lowerQuery = query.toLowerCase();
  const lowerText = text.toLowerCase();

  // Exact match at start
  if (lowerText.startsWith(lowerQuery)) {
    return 100;
  }

  // Exact substring match
  const index = lowerText.indexOf(lowerQuery);
  if (index !== -1) {
    return 80 - index; // Earlier matches score higher
  }

  // Fuzzy match - count consecutive matches
  let score = 0;
  let queryIndex = 0;
  let consecutive = 0;

  for (let i = 0; i < lowerText.length && queryIndex < lowerQuery.length; i++) {
    if (lowerText[i] === lowerQuery[queryIndex]) {
      queryIndex++;
      consecutive++;
      score += consecutive * 2;
    } else {
      consecutive = 0;
    }
  }

  return queryIndex === lowerQuery.length ? score : 0;
}

export function QuickSwitcher({
  items,
  isOpen,
  onClose,
  onSelect,
  placeholder = 'Search...',
  emptyMessage = 'No results found',
  title,
}: QuickSwitcherProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter and sort items based on query
  const filteredItems = useMemo(() => {
    if (!query.trim()) {
      return items;
    }

    return items
      .map((item) => {
        // Check title
        let score = scoreMatch(query, item.title);

        // Check subtitle
        if (item.subtitle) {
          score = Math.max(score, scoreMatch(query, item.subtitle) * 0.8);
        }

        // Check keywords
        if (item.keywords) {
          for (const keyword of item.keywords) {
            score = Math.max(score, scoreMatch(query, keyword) * 0.6);
          }
        }

        return { item, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ item }) => item);
  }, [items, query]);

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, QuickSwitcherItem[]> = {};
    const uncategorized: QuickSwitcherItem[] = [];

    for (const item of filteredItems) {
      if (item.category) {
        if (!groups[item.category]) {
          groups[item.category] = [];
        }
        groups[item.category].push(item);
      } else {
        uncategorized.push(item);
      }
    }

    return { groups, uncategorized };
  }, [filteredItems]);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      // Focus input after a brief delay to ensure the modal is rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Keep selected item in view
  useEffect(() => {
    if (listRef.current && filteredItems.length > 0) {
      const selectedElement = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      selectedElement?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex, filteredItems.length]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, filteredItems.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredItems[selectedIndex]) {
            const item = filteredItems[selectedIndex];
            item.onSelect?.();
            onSelect?.(item);
            onClose();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [filteredItems, selectedIndex, onSelect, onClose]
  );

  // Handle item click
  const handleItemClick = useCallback(
    (item: QuickSwitcherItem) => {
      item.onSelect?.();
      onSelect?.(item);
      onClose();
    },
    [onSelect, onClose]
  );

  // Reset selected index when filtered items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) {
    return null;
  }

  // Flatten items with indices for keyboard navigation
  let flatIndex = 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg bg-background border border-border rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {title && (
          <div className="px-4 py-2 border-b border-border">
            <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
          </div>
        )}

        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-5 h-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-foreground placeholder-muted-foreground outline-none text-base"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-muted-foreground hover:text-foreground rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Results list */}
        <div
          ref={listRef}
          className="max-h-[50vh] overflow-y-auto py-2"
        >
          {filteredItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted-foreground">
              {emptyMessage}
            </div>
          ) : (
            <>
              {/* Uncategorized items first */}
              {groupedItems.uncategorized.map((item) => {
                const index = flatIndex++;
                return (
                  <QuickSwitcherItemRow
                    key={item.id}
                    item={item}
                    isSelected={index === selectedIndex}
                    dataIndex={index}
                    onClick={() => handleItemClick(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  />
                );
              })}

              {/* Grouped items */}
              {Object.entries(groupedItems.groups).map(([category, categoryItems]) => (
                <div key={category}>
                  <div className="px-4 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {category}
                  </div>
                  {categoryItems.map((item) => {
                    const index = flatIndex++;
                    return (
                      <QuickSwitcherItemRow
                        key={item.id}
                        item={item}
                        isSelected={index === selectedIndex}
                        dataIndex={index}
                        onClick={() => handleItemClick(item)}
                        onMouseEnter={() => setSelectedIndex(index)}
                      />
                    );
                  })}
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer with keyboard hints */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-border text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-muted-foreground">↑↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-muted-foreground">↵</kbd>
            select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-muted-foreground">esc</kbd>
            close
          </span>
        </div>
      </div>
    </div>
  );
}

interface QuickSwitcherItemRowProps {
  item: QuickSwitcherItem;
  isSelected: boolean;
  dataIndex: number;
  onClick: () => void;
  onMouseEnter: () => void;
}

function QuickSwitcherItemRow({
  item,
  isSelected,
  dataIndex,
  onClick,
  onMouseEnter,
}: QuickSwitcherItemRowProps) {
  return (
    <div
      data-index={dataIndex}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={cn(
        'flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors',
        isSelected ? 'bg-blue-600/20 text-blue-100' : 'text-foreground hover:bg-accent'
      )}
    >
      {item.icon && (
        <span className="shrink-0 text-muted-foreground">{item.icon}</span>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{item.title}</div>
        {item.subtitle && (
          <div className="text-xs text-muted-foreground truncate">{item.subtitle}</div>
        )}
      </div>
    </div>
  );
}
