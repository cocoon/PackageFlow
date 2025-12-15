/**
 * Settings Button Component
 * Simple button that opens the Settings page
 * Replaces the complex SettingsDropdown
 */

import React from 'react';
import { Settings } from 'lucide-react';
import { Button } from '../ui/Button';
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
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className={cn('h-8 w-8', className)}
      aria-label={`Settings (${modKey}+,)`}
      title={`Settings (${modKey}+,)`}
    >
      <Settings className="w-4 h-4" />
    </Button>
  );
};
