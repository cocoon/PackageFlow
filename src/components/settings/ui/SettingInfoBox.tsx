/**
 * Setting Info Box Component
 * An informational box for tips, notes, or additional context
 *
 * Text sizes follow project convention:
 * - Title: text-sm font-medium
 * - Content: text-sm text-muted-foreground
 */

import React from 'react';
import { cn } from '../../../lib/utils';

interface SettingInfoBoxProps {
  /** Optional title */
  title?: string;
  /** Content - can be string or ReactNode for lists */
  children: React.ReactNode;
  /** Visual variant */
  variant?: 'default' | 'info' | 'warning';
  /** Additional CSS classes */
  className?: string;
}

const VARIANT_STYLES = {
  default: 'bg-muted/30 border-border',
  info: 'bg-blue-500/5 border-blue-500/20',
  warning: 'bg-yellow-500/5 border-yellow-500/20',
};

export const SettingInfoBox: React.FC<SettingInfoBoxProps> = ({
  title,
  children,
  variant = 'default',
  className,
}) => {
  return (
    <div
      className={cn('p-4 rounded-lg border', VARIANT_STYLES[variant], className)}
    >
      {title && (
        <h3 className="text-sm font-medium text-foreground mb-2">{title}</h3>
      )}
      <div className="text-sm text-muted-foreground">{children}</div>
    </div>
  );
};
