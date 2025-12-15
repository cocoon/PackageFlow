/**
 * Settings Button Component
 * Simple button that opens the Settings page
 * Replaces the complex SettingsDropdown
 */

import React from 'react';
import { Settings } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SettingsButtonProps {
  onClick: () => void;
  className?: string;
}

// Keyboard shortcut display helper
const isMac =
  typeof navigator !== 'undefined' &&
  navigator.platform.toUpperCase().indexOf('MAC') >= 0;
const modKey = isMac ? 'Cmd' : 'Ctrl';

export const SettingsButton: React.FC<SettingsButtonProps> = ({
  onClick,
  className,
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        'p-1.5 rounded-md transition-all duration-150',
        'text-muted-foreground hover:text-foreground',
        'hover:bg-accent',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        className
      )}
      aria-label={`Settings (${modKey}+,)`}
      title={`Settings (${modKey}+,)`}
    >
      <Settings className="w-4 h-4" />
    </button>
  );
};
