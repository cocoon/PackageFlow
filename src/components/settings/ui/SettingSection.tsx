/**
 * Setting Section Component
 * Container for grouping related settings with optional title and description
 *
 * Icon sizes follow project convention:
 * - Section icon: w-4 h-4 (standard for section-level elements)
 */

import React from 'react';
import { cn } from '../../../lib/utils';

interface SettingSectionProps {
  /** Section title */
  title?: string;
  /** Optional description below title */
  description?: string;
  /** Optional icon (should be w-4 h-4) */
  icon?: React.ReactNode;
  /** Section content */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

export const SettingSection: React.FC<SettingSectionProps> = ({
  title,
  description,
  icon,
  children,
  className,
}) => {
  return (
    <section className={cn('space-y-3', className)}>
      {/* Section Header */}
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
              {icon && (
                <span className="text-muted-foreground flex-shrink-0">
                  {icon}
                </span>
              )}
              {title}
            </h3>
          )}
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      )}

      {/* Section Content */}
      <div className="space-y-2">{children}</div>
    </section>
  );
};
