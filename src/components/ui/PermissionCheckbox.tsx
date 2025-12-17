/**
 * PermissionCheckbox Component
 * A modern, beautiful checkbox designed for permission settings
 * Features pill-shaped design with smooth animations and clear visual states
 */

import React, { useCallback, useId } from 'react';
import { Check, Minus } from 'lucide-react';
import { cn } from '../../lib/utils';

export type PermissionCheckboxState = 'checked' | 'unchecked' | 'disabled';

interface PermissionCheckboxProps {
  /** Current checked state */
  checked: boolean;
  /** Called when state changes */
  onChange: (checked: boolean) => void;
  /** Whether this checkbox is disabled (not applicable) */
  disabled?: boolean;
  /** Visual variant for different permission types */
  variant?: 'read' | 'execute' | 'write' | 'default';
  /** Size variant */
  size?: 'sm' | 'md';
  /** Label text */
  label?: string;
  /** Hide the label visually (still accessible) */
  hideLabel?: boolean;
  /** Additional class name */
  className?: string;
  /** Aria label for accessibility */
  'aria-label'?: string;
}

/** Color schemes for different variants */
const variantStyles = {
  read: {
    checked: 'bg-blue-500 border-blue-500 shadow-blue-500/25',
    unchecked:
      'border-blue-300 dark:border-blue-700 hover:border-blue-400 dark:hover:border-blue-500',
    disabled: 'bg-muted border-muted-foreground/20',
    label: 'text-blue-600 dark:text-blue-400',
  },
  execute: {
    checked: 'bg-amber-500 border-amber-500 shadow-amber-500/25',
    unchecked:
      'border-amber-300 dark:border-amber-700 hover:border-amber-400 dark:hover:border-amber-500',
    disabled: 'bg-muted border-muted-foreground/20',
    label: 'text-amber-600 dark:text-amber-400',
  },
  write: {
    checked: 'bg-rose-500 border-rose-500 shadow-rose-500/25',
    unchecked:
      'border-rose-300 dark:border-rose-700 hover:border-rose-400 dark:hover:border-rose-500',
    disabled: 'bg-muted border-muted-foreground/20',
    label: 'text-rose-600 dark:text-rose-400',
  },
  default: {
    checked: 'bg-primary border-primary shadow-primary/25',
    unchecked: 'border-border hover:border-muted-foreground',
    disabled: 'bg-muted border-muted-foreground/20',
    label: 'text-foreground',
  },
};

const sizeStyles = {
  sm: {
    box: 'w-4 h-4',
    icon: 'w-2.5 h-2.5',
    label: 'text-xs',
    gap: 'gap-1.5',
  },
  md: {
    box: 'w-5 h-5',
    icon: 'w-3 h-3',
    label: 'text-sm',
    gap: 'gap-2',
  },
};

export const PermissionCheckbox: React.FC<PermissionCheckboxProps> = ({
  checked,
  onChange,
  disabled = false,
  variant = 'default',
  size = 'md',
  label,
  hideLabel = false,
  className,
  'aria-label': ariaLabel,
}) => {
  const id = useId();
  const styles = variantStyles[variant];
  const sizes = sizeStyles[size];

  const handleClick = useCallback(() => {
    if (!disabled) {
      onChange(!checked);
    }
  }, [disabled, checked, onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick]
  );

  const state: PermissionCheckboxState = disabled ? 'disabled' : checked ? 'checked' : 'unchecked';

  return (
    <label
      htmlFor={id}
      className={cn(
        'inline-flex items-center select-none',
        sizes.gap,
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        className
      )}
    >
      {/* Custom checkbox */}
      <span
        role="checkbox"
        aria-checked={disabled ? 'mixed' : checked}
        aria-disabled={disabled}
        aria-label={ariaLabel || label}
        tabIndex={disabled ? -1 : 0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          'relative inline-flex items-center justify-center shrink-0',
          'rounded-md border-2 transition-all duration-200 ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          sizes.box,
          state === 'checked' && cn(styles.checked, 'shadow-sm'),
          state === 'unchecked' && cn(styles.unchecked, 'bg-background/50'),
          state === 'disabled' && styles.disabled
        )}
      >
        {/* Hidden native input for form submission */}
        <input
          type="checkbox"
          id={id}
          checked={checked}
          disabled={disabled}
          onChange={() => {}} // Controlled by parent
          className="sr-only"
          tabIndex={-1}
        />

        {/* Check icon */}
        <span
          className={cn(
            'flex items-center justify-center transition-all duration-200',
            state === 'checked' ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
          )}
        >
          <Check className={cn(sizes.icon, 'text-white stroke-[3]')} />
        </span>

        {/* Disabled indicator (horizontal line) */}
        {state === 'disabled' && (
          <span className="flex items-center justify-center">
            <Minus className={cn(sizes.icon, 'text-muted-foreground/50 stroke-[2]')} />
          </span>
        )}
      </span>

      {/* Label */}
      {label && (
        <span
          className={cn(
            sizes.label,
            'font-medium transition-colors duration-200',
            hideLabel && 'sr-only',
            state === 'checked' ? styles.label : 'text-muted-foreground',
            state === 'disabled' && 'text-muted-foreground/50'
          )}
        >
          {label}
        </span>
      )}
    </label>
  );
};

/**
 * PermissionPill Component
 * A compact pill-style permission indicator with checkbox functionality
 * Perfect for inline permission displays in tables or lists
 */
interface PermissionPillProps {
  /** Current checked state */
  checked: boolean;
  /** Called when state changes */
  onChange: (checked: boolean) => void;
  /** Whether this permission is disabled (not applicable) */
  disabled?: boolean;
  /** Visual variant */
  variant?: 'read' | 'execute' | 'write';
  /** Label text (R/E/W or full word) */
  label: string;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Additional class name */
  className?: string;
}

const pillVariantStyles = {
  read: {
    checked: 'bg-blue-500/15 border-blue-500/30 text-blue-600 dark:text-blue-400',
    unchecked:
      'bg-transparent border-border text-muted-foreground hover:border-blue-300 dark:hover:border-blue-600',
    disabled: 'bg-muted/50 border-transparent text-muted-foreground/40',
  },
  execute: {
    checked: 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400',
    unchecked:
      'bg-transparent border-border text-muted-foreground hover:border-amber-300 dark:hover:border-amber-600',
    disabled: 'bg-muted/50 border-transparent text-muted-foreground/40',
  },
  write: {
    checked: 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400',
    unchecked:
      'bg-transparent border-border text-muted-foreground hover:border-rose-300 dark:hover:border-rose-600',
    disabled: 'bg-muted/50 border-transparent text-muted-foreground/40',
  },
};

const pillSizeStyles = {
  sm: 'px-2 py-0.5 text-[10px] min-w-[28px]',
  md: 'px-2.5 py-1 text-xs min-w-[36px]',
};

export const PermissionPill: React.FC<PermissionPillProps> = ({
  checked,
  onChange,
  disabled = false,
  variant = 'read',
  label,
  size = 'sm',
  className,
}) => {
  const styles = pillVariantStyles[variant];
  const state: PermissionCheckboxState = disabled ? 'disabled' : checked ? 'checked' : 'unchecked';

  const handleClick = useCallback(() => {
    if (!disabled) {
      onChange(!checked);
    }
  }, [disabled, checked, onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick]
  );

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={disabled ? 'mixed' : checked}
      aria-disabled={disabled}
      aria-label={`${label} permission`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center',
        'font-semibold uppercase tracking-wider',
        'border rounded-full',
        'transition-all duration-200 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        pillSizeStyles[size],
        state === 'checked' && styles.checked,
        state === 'unchecked' && styles.unchecked,
        state === 'disabled' && styles.disabled,
        disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        className
      )}
    >
      {label}
    </button>
  );
};

/**
 * PermissionToggleGroup Component
 * A group of three permission pills (R/E/W) for a single tool
 */
interface PermissionToggleGroupProps {
  /** Tool name for accessibility */
  toolName: string;
  /** Current permission values */
  permissions: {
    read: boolean;
    execute: boolean;
    write: boolean;
  };
  /** Which permissions are applicable (others will be disabled) */
  applicablePermissions: ('read' | 'execute' | 'write')[];
  /** Called when any permission changes */
  onChange: (type: 'read' | 'execute' | 'write', value: boolean) => void;
  /** Whether the entire group is disabled */
  disabled?: boolean;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Additional class name */
  className?: string;
}

export const PermissionToggleGroup: React.FC<PermissionToggleGroupProps> = ({
  toolName,
  permissions,
  applicablePermissions,
  onChange,
  disabled = false,
  size = 'sm',
  className,
}) => {
  return (
    <div
      className={cn('inline-flex items-center gap-1', className)}
      role="group"
      aria-label={`Permissions for ${toolName}`}
    >
      <PermissionPill
        label="R"
        variant="read"
        checked={permissions.read}
        onChange={(v) => onChange('read', v)}
        disabled={disabled || !applicablePermissions.includes('read')}
        size={size}
      />
      <PermissionPill
        label="E"
        variant="execute"
        checked={permissions.execute}
        onChange={(v) => onChange('execute', v)}
        disabled={disabled || !applicablePermissions.includes('execute')}
        size={size}
      />
      <PermissionPill
        label="W"
        variant="write"
        checked={permissions.write}
        onChange={(v) => onChange('write', v)}
        disabled={disabled || !applicablePermissions.includes('write')}
        size={size}
      />
    </div>
  );
};

export default PermissionCheckbox;
