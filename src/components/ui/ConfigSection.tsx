/**
 * ConfigSection Component
 * Reusable section component with icon badge, title, and description
 * Consistent with DeployAccountsPanel design language
 */

import React from 'react';
import { cn } from '../../lib/utils';

interface ConfigSectionProps {
  icon: React.ReactNode;
  iconBgClass?: string;
  iconColorClass?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
  /** Add left margin to content to align with title */
  indentContent?: boolean;
}

export function ConfigSection({
  icon,
  iconBgClass = 'bg-primary/10',
  iconColorClass = 'text-primary',
  title,
  description,
  children,
  className,
  action,
  indentContent = true,
}: ConfigSectionProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Icon badge */}
          <div
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-lg',
              'border border-border/50 shadow-sm',
              iconBgClass
            )}
          >
            <span className={iconColorClass}>{icon}</span>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
        </div>

        {action}
      </div>

      <div className={cn(indentContent && 'ml-12')}>{children}</div>
    </div>
  );
}
