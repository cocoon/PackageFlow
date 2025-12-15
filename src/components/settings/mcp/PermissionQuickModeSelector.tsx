/**
 * PermissionQuickModeSelector Component
 * A beautiful segmented control for selecting permission quick modes
 */

import React from 'react';
import { Eye, Play, Shield, Settings2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { PermissionQuickMode, QuickModeConfig } from '../../../types/mcp';
import { QUICK_MODE_CONFIGS } from '../../../types/mcp';

interface PermissionQuickModeSelectorProps {
  /** Currently selected mode */
  value: PermissionQuickMode;
  /** Called when mode changes */
  onChange: (mode: PermissionQuickMode) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Additional class name */
  className?: string;
}

/** Icon component mapping */
const ICONS: Record<QuickModeConfig['icon'], React.ReactNode> = {
  eye: <Eye className="w-4 h-4" />,
  play: <Play className="w-4 h-4" />,
  shield: <Shield className="w-4 h-4" />,
  settings: <Settings2 className="w-4 h-4" />,
};

/** Color scheme classes */
const COLOR_SCHEMES: Record<
  QuickModeConfig['colorScheme'],
  {
    selected: string;
    unselected: string;
    iconBg: string;
    ring: string;
  }
> = {
  blue: {
    selected: 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400',
    unselected: 'hover:bg-blue-500/5 hover:border-blue-500/20',
    iconBg: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
    ring: 'ring-blue-500/30',
  },
  yellow: {
    selected: 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400',
    unselected: 'hover:bg-amber-500/5 hover:border-amber-500/20',
    iconBg: 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
    ring: 'ring-amber-500/30',
  },
  red: {
    selected: 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400',
    unselected: 'hover:bg-rose-500/5 hover:border-rose-500/20',
    iconBg: 'bg-rose-500/20 text-rose-600 dark:text-rose-400',
    ring: 'ring-rose-500/30',
  },
  gray: {
    selected: 'bg-muted border-border text-foreground',
    unselected: 'hover:bg-muted/50 hover:border-muted-foreground/30',
    iconBg: 'bg-muted-foreground/20 text-muted-foreground',
    ring: 'ring-muted-foreground/30',
  },
};

export const PermissionQuickModeSelector: React.FC<PermissionQuickModeSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  className,
}) => {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">Quick Mode</label>
        {value === 'custom' && (
          <span className="text-xs text-muted-foreground">
            Customize in Permissions tab
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {QUICK_MODE_CONFIGS.map((config) => {
          const isSelected = value === config.id;
          const colorScheme = COLOR_SCHEMES[config.colorScheme];
          const icon = ICONS[config.icon];

          return (
            <button
              key={config.id}
              type="button"
              onClick={() => onChange(config.id)}
              disabled={disabled}
              className={cn(
                'flex flex-col items-center gap-2 p-3 rounded-xl',
                'border-2 transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                isSelected ? colorScheme.selected : 'border-border bg-card/50 text-muted-foreground',
                !isSelected && !disabled && colorScheme.unselected,
                isSelected && colorScheme.ring,
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {/* Icon */}
              <span
                className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  'transition-colors duration-200',
                  isSelected ? colorScheme.iconBg : 'bg-muted text-muted-foreground'
                )}
              >
                {icon}
              </span>

              {/* Label */}
              <span className="text-sm font-medium">{config.name}</span>

              {/* Description - hidden on mobile */}
              <span
                className={cn(
                  'text-[10px] text-center leading-tight hidden sm:block',
                  isSelected ? 'opacity-80' : 'text-muted-foreground'
                )}
              >
                {config.description}
              </span>
            </button>
          );
        })}
      </div>

      {/* Info text for selected mode */}
      <div
        className={cn(
          'p-3 rounded-lg text-sm',
          'bg-muted/50 border border-border',
          value === 'full_access' && 'bg-rose-500/5 border-rose-500/20 text-rose-700 dark:text-rose-300',
          value === 'custom' && 'bg-muted border-muted-foreground/20'
        )}
      >
        {value === 'read_only' && (
          <p>AI assistants can only view project information, worktrees, and workflows. No modifications or executions are allowed.</p>
        )}
        {value === 'standard' && (
          <p>AI assistants can view information and execute existing workflows, but cannot create or modify workflows.</p>
        )}
        {value === 'full_access' && (
          <p className="font-medium">AI assistants have full access including creating and modifying workflows. Use with caution.</p>
        )}
        {value === 'custom' && (
          <p>You have customized the permissions. Use the tool matrix below to fine-tune access for each tool.</p>
        )}
      </div>
    </div>
  );
};

export default PermissionQuickModeSelector;
