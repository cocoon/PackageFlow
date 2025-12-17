/**
 * Checkbox Component
 * A beautiful, accessible checkbox with smooth animations
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Check, Minus } from 'lucide-react';
import { cn } from '../../lib/utils';

const checkboxVariants = cva(
  [
    'relative inline-flex items-center justify-center shrink-0',
    'border-2 rounded transition-all duration-200 ease-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'cursor-pointer',
  ],
  {
    variants: {
      variant: {
        default: [
          'border-border bg-background/50',
          'hover:border-muted-foreground hover:bg-muted/50',
          'data-[state=checked]:border-cyan-500 data-[state=checked]:bg-cyan-500',
          'data-[state=indeterminate]:border-cyan-500 data-[state=indeterminate]:bg-cyan-500',
          'focus-visible:ring-cyan-500/50',
        ],
        destructive: [
          'border-border bg-background/50',
          'hover:border-muted-foreground hover:bg-muted/50',
          'data-[state=checked]:border-red-500 data-[state=checked]:bg-red-500',
          'data-[state=indeterminate]:border-red-500 data-[state=indeterminate]:bg-red-500',
          'focus-visible:ring-red-500/50',
        ],
        success: [
          'border-border bg-background/50',
          'hover:border-muted-foreground hover:bg-muted/50',
          'data-[state=checked]:border-green-500 data-[state=checked]:bg-green-500',
          'data-[state=indeterminate]:border-green-500 data-[state=indeterminate]:bg-green-500',
          'focus-visible:ring-green-500/50',
        ],
        warning: [
          'border-border bg-background/50',
          'hover:border-muted-foreground hover:bg-muted/50',
          'data-[state=checked]:border-yellow-500 data-[state=checked]:bg-yellow-500',
          'data-[state=indeterminate]:border-yellow-500 data-[state=indeterminate]:bg-yellow-500',
          'focus-visible:ring-yellow-500/50',
        ],
        purple: [
          'border-border bg-background/50',
          'hover:border-muted-foreground hover:bg-muted/50',
          'data-[state=checked]:border-purple-500 data-[state=checked]:bg-purple-500',
          'data-[state=indeterminate]:border-purple-500 data-[state=indeterminate]:bg-purple-500',
          'focus-visible:ring-purple-500/50',
        ],
      },
      size: {
        sm: 'w-3.5 h-3.5',
        default: 'w-4 h-4',
        lg: 'w-5 h-5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const iconSizeMap = {
  sm: 'w-2.5 h-2.5',
  default: 'w-3 h-3',
  lg: 'w-3.5 h-3.5',
};

export interface CheckboxProps
  extends
    Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof checkboxVariants> {
  /** If true, shows indeterminate state (horizontal line) */
  indeterminate?: boolean;
  /** Label text to display next to checkbox */
  label?: React.ReactNode;
  /** Description text below the label */
  description?: React.ReactNode;
  /** Called when checked state changes */
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      className,
      variant,
      size,
      indeterminate = false,
      label,
      description,
      checked,
      disabled,
      onCheckedChange,
      onChange,
      id: propId,
      ...props
    },
    ref
  ) => {
    const internalRef = React.useRef<HTMLInputElement>(null);
    const resolvedRef = (ref as React.RefObject<HTMLInputElement>) || internalRef;
    const generatedId = React.useId();
    const id = propId || generatedId;

    // Handle indeterminate state
    React.useEffect(() => {
      if (resolvedRef.current) {
        resolvedRef.current.indeterminate = indeterminate;
      }
    }, [indeterminate, resolvedRef]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e);
      onCheckedChange?.(e.target.checked);
    };

    const state = indeterminate ? 'indeterminate' : checked ? 'checked' : 'unchecked';
    const iconSize = iconSizeMap[size || 'default'];

    const checkboxElement = (
      <span className={cn(checkboxVariants({ variant, size }), className)} data-state={state}>
        {/* Hidden input for accessibility */}
        <input
          type="checkbox"
          ref={resolvedRef}
          id={id}
          checked={checked}
          disabled={disabled}
          onChange={handleChange}
          className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
          {...props}
        />
        {/* Check icon with animation */}
        <span
          className={cn(
            'absolute inset-0 flex items-center justify-center',
            'transition-all duration-200',
            state === 'unchecked' ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
          )}
        >
          {indeterminate ? (
            <Minus className={cn(iconSize, 'text-white stroke-[3]')} />
          ) : (
            <Check className={cn(iconSize, 'text-white stroke-[3]')} />
          )}
        </span>
      </span>
    );

    // If no label, return just the checkbox
    if (!label && !description) {
      return checkboxElement;
    }

    // With label/description, wrap in a label element
    return (
      <label
        htmlFor={id}
        className={cn(
          'inline-flex items-start gap-2.5 cursor-pointer select-none',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        {checkboxElement}
        <span className="flex flex-col gap-0.5">
          {label && <span className="text-sm text-foreground leading-tight">{label}</span>}
          {description && (
            <span className="text-xs text-muted-foreground leading-tight">{description}</span>
          )}
        </span>
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export { Checkbox, checkboxVariants };
