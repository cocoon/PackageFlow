/**
 * Settings Sidebar Navigation Component
 * Provides navigation between different settings sections
 * Desktop-optimized with keyboard navigation support
 */

import React, { useEffect, useCallback } from 'react';
import {
  HardDrive,
  Users,
  Palette,
  Keyboard,
  Bot,
  FileText,
  Server,
  ArrowLeftRight,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { SettingsSection, SettingsSidebarSection } from '../../types/settings';
import { SETTINGS_SECTIONS } from '../../types/settings';

// Icon mapping
const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  HardDrive,
  Users,
  Palette,
  Keyboard,
  Bot,
  FileText,
  Server,
  ArrowLeftRight,
};

interface SettingsSidebarProps {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
  className?: string;
}

export const SettingsSidebar: React.FC<SettingsSidebarProps> = ({
  activeSection,
  onSectionChange,
  className,
}) => {
  // Get flat list of sections for keyboard navigation
  const flatSections = SETTINGS_SECTIONS.flatMap((group) =>
    group.items.map((item) => item.id)
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const currentIndex = flatSections.indexOf(activeSection);

      switch (e.key) {
        case 'ArrowUp':
        case 'ArrowLeft':
          e.preventDefault();
          const prevIndex =
            currentIndex > 0 ? currentIndex - 1 : flatSections.length - 1;
          onSectionChange(flatSections[prevIndex]);
          break;
        case 'ArrowDown':
        case 'ArrowRight':
          e.preventDefault();
          const nextIndex =
            currentIndex < flatSections.length - 1 ? currentIndex + 1 : 0;
          onSectionChange(flatSections[nextIndex]);
          break;
      }
    },
    [activeSection, flatSections, onSectionChange]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <nav
      className={cn(
        'w-60 shrink-0 border-r border-border bg-card/50',
        'overflow-y-auto',
        className
      )}
      aria-label="Settings navigation"
    >
      <div className="py-4">
        {SETTINGS_SECTIONS.map((group) => (
          <SidebarGroup
            key={group.id}
            group={group}
            activeSection={activeSection}
            onSectionChange={onSectionChange}
          />
        ))}
      </div>
    </nav>
  );
};

interface SidebarGroupProps {
  group: SettingsSidebarSection;
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
}

const SidebarGroup: React.FC<SidebarGroupProps> = ({
  group,
  activeSection,
  onSectionChange,
}) => {
  return (
    <div className="mb-4">
      <div className="px-4 mb-1">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {group.label}
        </span>
      </div>
      <div className="px-2 space-y-0.5">
        {group.items.map((item) => {
          const IconComponent = ICON_MAP[item.icon];
          const isActive = activeSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-lg',
                'text-sm text-left transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                isActive
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              {IconComponent && (
                <IconComponent
                  className={cn(
                    'w-4 h-4 shrink-0',
                    isActive ? 'text-accent-foreground' : 'text-muted-foreground'
                  )}
                />
              )}
              <span className="truncate">{item.label}</span>
              {item.badge && (
                <span className="ml-auto text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
