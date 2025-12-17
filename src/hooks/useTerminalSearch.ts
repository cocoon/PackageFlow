/**
 * Terminal search functionality hook
 * Supports regex search, navigation, and highlighting
 */

import { useState, useCallback, useMemo } from 'react';

interface SearchState {
  query: string;
  currentIndex: number;
  isOpen: boolean;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function useTerminalSearch(content: string) {
  const [state, setState] = useState<SearchState>({
    query: '',
    currentIndex: 0,
    isOpen: false,
  });

  const matches = useMemo(() => {
    if (!state.query.trim() || !content) {
      return [];
    }

    try {
      const regex = new RegExp(escapeRegex(state.query), 'gi');
      const result: number[] = [];
      let match;

      while ((match = regex.exec(content)) !== null) {
        result.push(match.index);
      }

      return result;
    } catch {
      return [];
    }
  }, [content, state.query]);

  const search = useCallback((query: string) => {
    setState((prev) => ({
      ...prev,
      query,
      currentIndex: 0,
    }));
  }, []);

  const goToNext = useCallback(() => {
    if (matches.length === 0) return;
    setState((prev) => ({
      ...prev,
      currentIndex: (prev.currentIndex + 1) % matches.length,
    }));
  }, [matches.length]);

  const goToPrev = useCallback(() => {
    if (matches.length === 0) return;
    setState((prev) => ({
      ...prev,
      currentIndex: prev.currentIndex > 0 ? prev.currentIndex - 1 : matches.length - 1,
    }));
  }, [matches.length]);

  const open = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: true }));
  }, []);

  const close = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false, query: '', currentIndex: 0 }));
  }, []);

  const toggle = useCallback(() => {
    setState((prev) => {
      if (prev.isOpen) {
        return { ...prev, isOpen: false, query: '', currentIndex: 0 };
      }
      return { ...prev, isOpen: true };
    });
  }, []);

  return {
    query: state.query,
    currentIndex: state.currentIndex,
    isOpen: state.isOpen,
    matchCount: matches.length,
    matches,
    search,
    goToNext,
    goToPrev,
    open,
    close,
    toggle,
  };
}

/**
 * Apply search highlighting to HTML content
 * Must be called after ANSI conversion
 */
export function highlightSearchMatches(html: string, query: string, currentIndex: number): string {
  if (!query.trim()) return html;

  try {
    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
    let matchIndex = 0;

    return html.replace(regex, (match) => {
      const isCurrent = matchIndex === currentIndex;
      matchIndex++;

      if (isCurrent) {
        return `<mark class="bg-yellow-400 text-black rounded px-0.5" data-current="true">${match}</mark>`;
      }
      return `<mark class="bg-yellow-400/40 text-inherit rounded px-0.5">${match}</mark>`;
    });
  } catch {
    return html;
  }
}
