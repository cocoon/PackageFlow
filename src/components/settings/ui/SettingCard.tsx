/**
 * Setting Card Component
 * A card-style setting container with icon, title, description, and action area
 *
 * Icon sizes follow project convention:
 * - Card icon: w-5 h-5 (larger for card emphasis, matches Panel headers)
 *
 * Text sizes follow project convention:
 * - Title: text-sm font-medium
 * - Description: text-xs text-muted-foreground
 */

import React from 'react';
import { cn } from '../../../lib/utils';

interface SettingCardProps {
  /** Card title */
  title: string;
  /** Optional description */
  description?: string;
  /** Optional icon (should be w-5 h-5) */
  icon?: React.ReactNode;
  /** Custom icon background color class */
  iconBgColor?: string;
  /** Action element or button */
  action?: React.ReactNode;
  /** Additional content below header */
  children?: React.ReactNode;
  /** Card variant for different visual styles */
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  /** Additional CSS classes */
  className?: string;
}

const VARIANT_STYLES = {
  default: {
    border: 'border-border',
    bg: '',
    iconBg: 'bg-muted text-muted-foreground',
  },
  success: {
    border: 'border-green-500/30',
    bg: '',
    iconBg: 'bg-green-500/10 text-green-500',
  },
  warning: {
    border: 'border-yellow-500/30',
    bg: '',
    iconBg: 'bg-yellow-500/10 text-yellow-500',
  },
  danger: {
    border: 'border-red-500/30',
    bg: '',
    iconBg: 'bg-red-500/10 text-red-500',
  },
  info: {
    border: 'border-blue-500/30',
    bg: '',
    iconBg: 'bg-blue-500/10 text-blue-500',
  },
};

export const SettingCard: React.FC<SettingCardProps> = ({
  title,
  description,
  icon,
  iconBgColor,
  action,
  children,
  variant = 'default',
  className,
}) => {
  const styles = VARIANT_STYLES[variant];

  return (
    <div className={cn('p-4 rounded-lg border bg-card', styles.border, styles.bg, className)}>
      {/* Header */}
      <div className="flex items-start gap-3">
        {icon && (
          <div className={cn('p-2 rounded-lg flex-shrink-0', iconBgColor || styles.iconBg)}>
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-foreground">{title}</h4>
          {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        </div>
      </div>

      {/* Content */}
      {children && <div className="mt-4">{children}</div>}

      {/* Action */}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};
