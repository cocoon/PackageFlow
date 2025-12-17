/**
 * Setting Row Component
 * A single setting item row with label, optional description, and action
 *
 * Icon sizes follow project convention:
 * - Row icon: w-4 h-4 (standard for list items)
 *
 * Text sizes follow project convention:
 * - Label: text-sm font-medium
 * - Description: text-xs text-muted-foreground
 */

import React from 'react';
import { cn } from '../../../lib/utils';

interface SettingRowProps {
  /** Row label */
  label: string;
  /** Optional description below label */
  description?: string;
  /** Optional icon (should be w-4 h-4) */
  icon?: React.ReactNode;
  /** Action element (e.g., Toggle, Button) placed on the right */
  action?: React.ReactNode;
  /** Additional content below label/description */
  children?: React.ReactNode;
  /** Click handler - makes the row interactive */
  onClick?: () => void;
  /** Disabled state */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export const SettingRow: React.FC<SettingRowProps> = ({
  label,
  description,
  icon,
  action,
  children,
  onClick,
  disabled,
  className,
}) => {
  const isInteractive = !!onClick && !disabled;
  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full flex items-center justify-between gap-4 p-3 rounded-lg',
        'border border-border bg-card',
        'transition-colors',
        isInteractive && 'cursor-pointer hover:bg-accent/50',
        onClick && 'text-left',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        {icon && <span className="text-muted-foreground mt-0.5 flex-shrink-0">{icon}</span>}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-foreground">{label}</div>
          {description && <div className="text-xs text-muted-foreground mt-0.5">{description}</div>}
          {children && <div className="mt-2">{children}</div>}
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </Wrapper>
  );
};
