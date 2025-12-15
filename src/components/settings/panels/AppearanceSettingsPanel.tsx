/**
 * Appearance Settings Panel
 * Configure visual settings like theme and path display format
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Palette, Sun, Moon, FolderTree } from 'lucide-react';
import { useSettings } from '../../../contexts/SettingsContext';
import { Toggle } from '../../ui/Toggle';
import { cn } from '../../../lib/utils';

export const AppearanceSettingsPanel: React.FC = () => {
  const { pathDisplayFormat, setPathDisplayFormat } = useSettings();

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return 'dark';
  });

  // Theme: apply changes to DOM and localStorage
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Theme: load from localStorage or system preference on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
  }, []);

  // Toggle path display format
  const togglePathFormat = useCallback(async () => {
    try {
      await setPathDisplayFormat(pathDisplayFormat === 'short' ? 'full' : 'short');
    } catch (error) {
      console.error('Failed to change path format:', error);
    }
  }, [pathDisplayFormat, setPathDisplayFormat]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Palette className="w-5 h-5" />
          Appearance
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Customize the look and feel of PackageFlow
        </p>
      </div>

      {/* Theme */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-foreground">Theme</h3>

        <div className="grid grid-cols-2 gap-3">
          <ThemeCard
            label="Light"
            icon={<Sun className="w-5 h-5" />}
            isActive={theme === 'light'}
            onClick={() => setTheme('light')}
          />
          <ThemeCard
            label="Dark"
            icon={<Moon className="w-5 h-5" />}
            isActive={theme === 'dark'}
            onClick={() => setTheme('dark')}
          />
        </div>
      </div>

      {/* Path Display */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-foreground">Display</h3>

        <SettingRow
          icon={<FolderTree className="w-4 h-4" />}
          label="Compact Paths"
          description="Show ~/... instead of full paths like /Users/name/..."
        >
          <Toggle
            checked={pathDisplayFormat === 'short'}
            onChange={togglePathFormat}
            aria-label="Compact paths"
          />
        </SettingRow>
      </div>
    </div>
  );
};

interface ThemeCardProps {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}

const ThemeCard: React.FC<ThemeCardProps> = ({ label, icon, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
      isActive
        ? 'border-primary bg-primary/10'
        : 'border-border hover:border-primary/50 hover:bg-accent/50'
    )}
  >
    <div
      className={cn(
        'p-3 rounded-full',
        isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
      )}
    >
      {icon}
    </div>
    <span
      className={cn(
        'text-sm font-medium',
        isActive ? 'text-foreground' : 'text-muted-foreground'
      )}
    >
      {label}
    </span>
  </button>
);

interface SettingRowProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  children: React.ReactNode;
}

const SettingRow: React.FC<SettingRowProps> = ({ icon, label, description, children }) => (
  <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
    <div className="flex items-start gap-3">
      <span className="text-muted-foreground mt-0.5">{icon}</span>
      <div>
        <div className="text-sm font-medium text-foreground">{label}</div>
        {description && (
          <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
        )}
      </div>
    </div>
    {children}
  </div>
);
