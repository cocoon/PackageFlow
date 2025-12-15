/**
 * Theme Context
 * Provides app-wide theme management (light/dark/system mode).
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

/** User's theme preference setting */
export type ThemeMode = 'light' | 'dark' | 'system';

/** Actual resolved theme applied to the UI */
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  /** User's theme preference (light/dark/system) */
  themeMode: ThemeMode;
  /** Actual theme applied to the UI (resolved from themeMode) */
  resolvedTheme: ResolvedTheme;
  /** Set the theme mode preference */
  setThemeMode: (mode: ThemeMode) => void;
  /** Legacy: Get current resolved theme (for backward compatibility) */
  theme: ResolvedTheme;
  /** Legacy: Set theme directly (maps to setThemeMode) */
  setTheme: (theme: ResolvedTheme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_STORAGE_KEY = 'theme-mode';

/**
 * Get the system's preferred color scheme
 */
function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Resolve theme mode to actual theme
 */
function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'system') {
    return getSystemTheme();
  }
  return mode;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Load saved theme mode or default to 'system'
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    if (saved && ['light', 'dark', 'system'].includes(saved)) {
      return saved;
    }
    // Legacy support: check old 'theme' key
    const legacyTheme = localStorage.getItem('theme') as ResolvedTheme | null;
    if (legacyTheme && ['light', 'dark'].includes(legacyTheme)) {
      return legacyTheme;
    }
    return 'system';
  });

  // Resolved theme based on mode
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveTheme(themeMode)
  );

  // Listen for system theme changes when in 'system' mode
  useEffect(() => {
    if (themeMode !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      setResolvedTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themeMode]);

  // Update resolved theme when mode changes
  useEffect(() => {
    setResolvedTheme(resolveTheme(themeMode));
  }, [themeMode]);

  // Apply theme to document
  useEffect(() => {
    const root = window.document.documentElement;
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [resolvedTheme]);

  // Persist theme mode
  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    // Clean up legacy key
    localStorage.removeItem('theme');
  }, [themeMode]);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
  }, []);

  // Legacy setTheme for backward compatibility
  const setTheme = useCallback((theme: ResolvedTheme) => {
    setThemeModeState(theme);
  }, []);

  const value = useMemo<ThemeContextValue>(() => ({
    themeMode,
    resolvedTheme,
    setThemeMode,
    // Legacy API for backward compatibility
    theme: resolvedTheme,
    setTheme,
  }), [themeMode, resolvedTheme, setThemeMode, setTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
