/**
 * Toggle Switch Component
 * A macOS-style toggle switch for boolean settings
 *
 * Features:
 * - Three sizes (sm, md, lg) for different contexts
 * - Consistent styling across light/dark themes
 * - Full keyboard accessibility (Enter, Space)
 * - Smooth transitions and animations
 * - Optional label integration
 *
 * @example
 * // Basic usage
 * <Toggle checked={enabled} onChange={setEnabled} />
 *
 * // With label
 * <Toggle
 *   checked={enabled}
 *   onChange={setEnabled}
 *   label="Enable feature"
 * />
 *
 * // Small size in compact layouts
 * <Toggle checked={enabled} onChange={setEnabled} size="sm" />
 */

import React from 'react';
import { cn } from '../../lib/utils';

/** Size variants for the Toggle component */
type ToggleSize = 'sm' | 'md' | 'lg';

interface ToggleProps {
  /** Whether the toggle is checked/on */
  checked: boolean;
  /** Handler called when the toggle state changes */
  onChange: (checked: boolean) => void;
  /** Whether the toggle is disabled */
  disabled?: boolean;
  /** Size variant: sm (compact), md (default), lg (prominent) */
  size?: ToggleSize;
  /** Accessible label for screen readers */
  'aria-label'?: string;
  /** Optional visible label text */
  label?: string;
  /** Label position relative to toggle */
  labelPosition?: 'left' | 'right';
  /** Additional description text */
  description?: string;
  /** Additional CSS classes for the container */
  className?: string;
  /** ID for form association */
  id?: string;
}

/** Size configuration for toggle track and thumb */
const sizeConfig: Record<
  ToggleSize,
  {
    track: string;
    thumb: string;
    thumbOffset: string;
    translateX: string;
  }
> = {
  sm: {
    track: 'w-8 h-[18px]',
    thumb: 'w-3.5 h-3.5',
    thumbOffset: 'top-[2px] left-[2px]',
    translateX: 'translate-x-[14px]',
  },
  md: {
    track: 'w-10 h-[22px]',
    thumb: 'w-[18px] h-[18px]',
    thumbOffset: 'top-[2px] left-[2px]',
    translateX: 'translate-x-[18px]',
  },
  lg: {
    track: 'w-11 h-6',
    thumb: 'w-5 h-5',
    thumbOffset: 'top-0.5 left-0.5',
    translateX: 'translate-x-5',
  },
};

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  'aria-label': ariaLabel,
  label,
  labelPosition = 'right',
  description,
  className,
  id,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!disabled) {
        onChange(!checked);
      }
    }
  };

  const handleClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const sizes = sizeConfig[size];

  const toggleButton = (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={ariaLabel || label}
      disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        // Base styles
        'relative inline-flex shrink-0 cursor-pointer rounded-full',
        // Transitions
        'transition-all duration-200 ease-in-out',
        // Focus styles
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        // Size
        sizes.track,
        // Background color based on state - glassmorphism effect
        'backdrop-blur-sm',
        checked
          ? // Enabled (on) state - transparent blue glass
            'bg-blue-500/70 dark:bg-blue-400/60'
          : // Disabled (off) state - subtle glass
            'bg-muted-foreground/20 dark:bg-muted-foreground/30',
        // Disabled state
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {/* Thumb */}
      <span
        className={cn(
          // Base styles
          'pointer-events-none inline-block rounded-full',
          // Appearance
          'bg-white',
          'shadow-sm',
          // Ring for depth
          'ring-1 ring-black/5 dark:ring-white/10',
          // Position
          'absolute',
          sizes.thumbOffset,
          // Size
          sizes.thumb,
          // Animation
          'transform transition-transform duration-200 ease-in-out',
          // Move when checked
          checked && sizes.translateX
        )}
      />
    </button>
  );

  // If no label, return just the button
  if (!label) {
    return toggleButton;
  }

  // With label, wrap in a container
  const labelContent = (
    <div className={cn('flex flex-col', labelPosition === 'left' ? 'items-end' : 'items-start')}>
      <span
        className={cn(
          'text-sm font-medium',
          disabled ? 'text-muted-foreground' : 'text-foreground',
          'select-none cursor-pointer'
        )}
        onClick={handleClick}
      >
        {label}
      </span>
      {description && (
        <span className="text-xs text-muted-foreground mt-0.5 select-none">{description}</span>
      )}
    </div>
  );

  return (
    <div
      className={cn(
        'inline-flex items-center gap-3',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {labelPosition === 'left' && labelContent}
      {toggleButton}
      {labelPosition === 'right' && labelContent}
    </div>
  );
};

export default Toggle;
