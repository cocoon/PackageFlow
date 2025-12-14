/**
 * useTemplatePreferences Hook
 * Manages template favorites, recent usage, and category collapse state
 * Persists preferences to localStorage for cross-session memory
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { TemplateCategory } from '../types/step-template';

/** Maximum number of recent templates to track */
const MAX_RECENT_TEMPLATES = 8;

/** Storage keys */
const STORAGE_KEYS = {
  favorites: 'packageflow:template-favorites',
  recentlyUsed: 'packageflow:template-recently-used',
  collapsedCategories: 'packageflow:template-collapsed-categories',
  preferredView: 'packageflow:template-preferred-view',
} as const;

/** View mode for template display */
export type TemplateViewMode = 'categories' | 'all' | 'favorites';

/** Recently used template entry with timestamp */
export interface RecentTemplateEntry {
  templateId: string;
  usedAt: string; // ISO 8601
}

/** Persisted preferences structure */
export interface TemplatePreferences {
  favorites: string[]; // Template IDs
  recentlyUsed: RecentTemplateEntry[];
  collapsedCategories: TemplateCategory[];
  preferredView: TemplateViewMode;
}

/** Default preferences */
const DEFAULT_PREFERENCES: TemplatePreferences = {
  favorites: [],
  recentlyUsed: [],
  collapsedCategories: [],
  preferredView: 'categories',
};

/**
 * Load preferences from localStorage
 */
function loadPreferences(): TemplatePreferences {
  try {
    const favorites = localStorage.getItem(STORAGE_KEYS.favorites);
    const recentlyUsed = localStorage.getItem(STORAGE_KEYS.recentlyUsed);
    const collapsedCategories = localStorage.getItem(STORAGE_KEYS.collapsedCategories);
    const preferredView = localStorage.getItem(STORAGE_KEYS.preferredView);

    return {
      favorites: favorites ? JSON.parse(favorites) : [],
      recentlyUsed: recentlyUsed ? JSON.parse(recentlyUsed) : [],
      collapsedCategories: collapsedCategories ? JSON.parse(collapsedCategories) : [],
      preferredView: (preferredView as TemplateViewMode) || 'categories',
    };
  } catch (error) {
    console.error('Failed to load template preferences:', error);
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Save a specific preference to localStorage
 */
function savePreference<K extends keyof TemplatePreferences>(
  key: K,
  value: TemplatePreferences[K]
): void {
  try {
    localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to save template preference "${key}":`, error);
  }
}

/**
 * Hook for managing template preferences
 */
export function useTemplatePreferences() {
  const [preferences, setPreferences] = useState<TemplatePreferences>(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load preferences on mount
  useEffect(() => {
    const loaded = loadPreferences();
    setPreferences(loaded);
    setIsLoaded(true);
  }, []);

  // Favorites management
  const isFavorite = useCallback(
    (templateId: string): boolean => {
      return preferences.favorites.includes(templateId);
    },
    [preferences.favorites]
  );

  const toggleFavorite = useCallback((templateId: string): void => {
    setPreferences((prev) => {
      const isFav = prev.favorites.includes(templateId);
      const newFavorites = isFav
        ? prev.favorites.filter((id) => id !== templateId)
        : [...prev.favorites, templateId];

      savePreference('favorites', newFavorites);
      return { ...prev, favorites: newFavorites };
    });
  }, []);

  const addFavorite = useCallback((templateId: string): void => {
    setPreferences((prev) => {
      if (prev.favorites.includes(templateId)) {
        return prev;
      }
      const newFavorites = [...prev.favorites, templateId];
      savePreference('favorites', newFavorites);
      return { ...prev, favorites: newFavorites };
    });
  }, []);

  const removeFavorite = useCallback((templateId: string): void => {
    setPreferences((prev) => {
      const newFavorites = prev.favorites.filter((id) => id !== templateId);
      savePreference('favorites', newFavorites);
      return { ...prev, favorites: newFavorites };
    });
  }, []);

  // Recent usage tracking
  const recordUsage = useCallback((templateId: string): void => {
    setPreferences((prev) => {
      // Remove existing entry if present
      const filtered = prev.recentlyUsed.filter((entry) => entry.templateId !== templateId);

      // Add new entry at the beginning
      const newEntry: RecentTemplateEntry = {
        templateId,
        usedAt: new Date().toISOString(),
      };

      // Keep only MAX_RECENT_TEMPLATES entries
      const newRecentlyUsed = [newEntry, ...filtered].slice(0, MAX_RECENT_TEMPLATES);

      savePreference('recentlyUsed', newRecentlyUsed);
      return { ...prev, recentlyUsed: newRecentlyUsed };
    });
  }, []);

  const clearRecentlyUsed = useCallback((): void => {
    setPreferences((prev) => {
      savePreference('recentlyUsed', []);
      return { ...prev, recentlyUsed: [] };
    });
  }, []);

  // Category collapse state management
  const isCategoryCollapsed = useCallback(
    (categoryId: TemplateCategory): boolean => {
      return preferences.collapsedCategories.includes(categoryId);
    },
    [preferences.collapsedCategories]
  );

  const toggleCategoryCollapse = useCallback((categoryId: TemplateCategory): void => {
    setPreferences((prev) => {
      const isCollapsed = prev.collapsedCategories.includes(categoryId);
      const newCollapsed = isCollapsed
        ? prev.collapsedCategories.filter((id) => id !== categoryId)
        : [...prev.collapsedCategories, categoryId];

      savePreference('collapsedCategories', newCollapsed);
      return { ...prev, collapsedCategories: newCollapsed };
    });
  }, []);

  const expandAllCategories = useCallback((): void => {
    setPreferences((prev) => {
      savePreference('collapsedCategories', []);
      return { ...prev, collapsedCategories: [] };
    });
  }, []);

  const collapseAllCategories = useCallback((categoryIds: TemplateCategory[]): void => {
    setPreferences((prev) => {
      savePreference('collapsedCategories', categoryIds);
      return { ...prev, collapsedCategories: categoryIds };
    });
  }, []);

  // View mode management
  const setPreferredView = useCallback((view: TemplateViewMode): void => {
    setPreferences((prev) => {
      savePreference('preferredView', view);
      return { ...prev, preferredView: view };
    });
  }, []);

  // Derived data
  const recentTemplateIds = useMemo(() => {
    return preferences.recentlyUsed.map((entry) => entry.templateId);
  }, [preferences.recentlyUsed]);

  const favoriteCount = preferences.favorites.length;
  const recentCount = preferences.recentlyUsed.length;

  return {
    // State
    isLoaded,
    preferences,

    // Favorites
    favorites: preferences.favorites,
    favoriteCount,
    isFavorite,
    toggleFavorite,
    addFavorite,
    removeFavorite,

    // Recent usage
    recentlyUsed: preferences.recentlyUsed,
    recentTemplateIds,
    recentCount,
    recordUsage,
    clearRecentlyUsed,

    // Category collapse
    collapsedCategories: preferences.collapsedCategories,
    isCategoryCollapsed,
    toggleCategoryCollapse,
    expandAllCategories,
    collapseAllCategories,

    // View mode
    preferredView: preferences.preferredView,
    setPreferredView,
  };
}

export type UseTemplatePreferencesReturn = ReturnType<typeof useTemplatePreferences>;
