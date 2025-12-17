/**
 * Collapsible Component
 * A progressive disclosure component for showing/hiding content sections
 */

import React, { useState, useCallback, useId } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface CollapsibleProps {
  /** Header content (always visible) */
  trigger: React.ReactNode;
  /** Collapsible content */
  children: React.ReactNode;
  /** Whether the collapsible is open by default */
  defaultOpen?: boolean;
  /** Controlled open state */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Additional class name for the container */
  className?: string;
  /** Additional class name for the trigger button */
  triggerClassName?: string;
  /** Additional class name for the content */
  contentClassName?: string;
  /** Disable the collapsible */
  disabled?: boolean;
}

export function Collapsible({
  trigger,
  children,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  className,
  triggerClassName,
  contentClassName,
  disabled = false,
}: CollapsibleProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const contentId = useId();
  const triggerId = useId();

  // Use controlled or uncontrolled state
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const handleToggle = useCallback(() => {
    if (disabled) return;
    const newOpen = !isOpen;
    setInternalOpen(newOpen);
    onOpenChange?.(newOpen);
  }, [disabled, isOpen, onOpenChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleToggle();
      }
    },
    [disabled, handleToggle]
  );

  return (
    <div className={cn('', className)}>
      <button
        id={triggerId}
        type="button"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-expanded={isOpen}
        aria-controls={contentId}
        className={cn(
          'w-full flex items-center gap-2 text-left',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'focus-visible:ring-offset-background rounded-md',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          triggerClassName
        )}
      >
        <ChevronRight
          className={cn(
            'w-4 h-4 shrink-0 text-muted-foreground transition-transform duration-200',
            isOpen && 'rotate-90'
          )}
          aria-hidden="true"
        />
        <div className="flex-1">{trigger}</div>
      </button>
      <div
        id={contentId}
        role="region"
        aria-labelledby={triggerId}
        hidden={!isOpen}
        className={cn(
          'overflow-hidden transition-all duration-200',
          isOpen ? 'opacity-100' : 'opacity-0',
          contentClassName
        )}
      >
        {isOpen && children}
      </div>
    </div>
  );
}

/**
 * CollapsibleCard - A styled collapsible with card-like appearance
 */
interface CollapsibleCardProps extends Omit<
  CollapsibleProps,
  'trigger' | 'triggerClassName' | 'contentClassName'
> {
  /** Icon to show in the header */
  icon?: React.ReactNode;
  /** Title text */
  title: string;
  /** Subtitle or description */
  subtitle?: string;
  /** Badge or status indicator */
  badge?: React.ReactNode;
}

export function CollapsibleCard({
  icon,
  title,
  subtitle,
  badge,
  children,
  className,
  ...props
}: CollapsibleCardProps) {
  return (
    <Collapsible
      trigger={
        <div className="flex items-center gap-3 flex-1 py-2">
          {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">{title}</span>
              {badge}
            </div>
            {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
          </div>
        </div>
      }
      className={cn('border border-border rounded-lg bg-card/50', className)}
      triggerClassName="px-4 hover:bg-accent/50 rounded-lg transition-colors"
      contentClassName="px-4 pb-4"
      {...props}
    >
      {children}
    </Collapsible>
  );
}
