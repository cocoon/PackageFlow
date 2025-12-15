/**
 * useTemplatePreferences Hook
 * Manages template favorites, recent usage, and category collapse state
 * Persists preferences to SQLite database via Tauri commands
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { TemplateCategory } from '../types/step-template';

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
 * Load preferences from backend
 */
async function loadPreferences(): Promise<TemplatePreferences> {
  try {
    const prefs = await invoke<TemplatePreferences>('get_template_preferences');
    return prefs;
  } catch (error) {
    console.error('Failed to load template preferences:', error);
    return DEFAULT_PREFERENCES;
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
    loadPreferences().then((loaded) => {
      setPreferences(loaded);
      setIsLoaded(true);
    });
  }, []);

  // Favorites management
  const isFavorite = useCallback(
    (templateId: string): boolean => {
      return preferences.favorites.includes(templateId);
    },
    [preferences.favorites]
  );

  const toggleFavorite = useCallback(async (templateId: string): Promise<void> => {
    try {
      const newPrefs = await invoke<TemplatePreferences>('toggle_template_favorite', {
        templateId,
      });
      setPreferences(newPrefs);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  }, []);

  const addFavorite = useCallback(async (templateId: string): Promise<void> => {
    try {
      const newPrefs = await invoke<TemplatePreferences>('add_template_favorite', {
        templateId,
      });
      setPreferences(newPrefs);
    } catch (error) {
      console.error('Failed to add favorite:', error);
    }
  }, []);

  const removeFavorite = useCallback(async (templateId: string): Promise<void> => {
    try {
      const newPrefs = await invoke<TemplatePreferences>('remove_template_favorite', {
        templateId,
      });
      setPreferences(newPrefs);
    } catch (error) {
      console.error('Failed to remove favorite:', error);
    }
  }, []);

  // Recent usage tracking
  const recordUsage = useCallback(async (templateId: string): Promise<void> => {
    try {
      const newPrefs = await invoke<TemplatePreferences>('record_template_usage', {
        templateId,
      });
      setPreferences(newPrefs);
    } catch (error) {
      console.error('Failed to record template usage:', error);
    }
  }, []);

  const clearRecentlyUsed = useCallback(async (): Promise<void> => {
    try {
      const newPrefs = await invoke<TemplatePreferences>('clear_recently_used_templates');
      setPreferences(newPrefs);
    } catch (error) {
      console.error('Failed to clear recently used:', error);
    }
  }, []);

  // Category collapse state management
  const isCategoryCollapsed = useCallback(
    (categoryId: TemplateCategory): boolean => {
      return preferences.collapsedCategories.includes(categoryId);
    },
    [preferences.collapsedCategories]
  );

  const toggleCategoryCollapse = useCallback(async (categoryId: TemplateCategory): Promise<void> => {
    try {
      const newPrefs = await invoke<TemplatePreferences>('toggle_template_category_collapse', {
        categoryId,
      });
      setPreferences(newPrefs);
    } catch (error) {
      console.error('Failed to toggle category collapse:', error);
    }
  }, []);

  const expandAllCategories = useCallback(async (): Promise<void> => {
    try {
      const newPrefs = await invoke<TemplatePreferences>('expand_all_template_categories');
      setPreferences(newPrefs);
    } catch (error) {
      console.error('Failed to expand all categories:', error);
    }
  }, []);

  const collapseAllCategories = useCallback(async (categoryIds: TemplateCategory[]): Promise<void> => {
    try {
      const newPrefs = await invoke<TemplatePreferences>('collapse_template_categories', {
        categoryIds,
      });
      setPreferences(newPrefs);
    } catch (error) {
      console.error('Failed to collapse categories:', error);
    }
  }, []);

  // View mode management
  const setPreferredView = useCallback(async (view: TemplateViewMode): Promise<void> => {
    try {
      const newPrefs = await invoke<TemplatePreferences>('set_template_preferred_view', {
        view,
      });
      setPreferences(newPrefs);
    } catch (error) {
      console.error('Failed to set preferred view:', error);
    }
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
