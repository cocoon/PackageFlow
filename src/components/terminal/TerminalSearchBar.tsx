/**
 * Terminal Search Bar Component
 * Provides search functionality within the terminal
 */

import React from 'react';
import { Search, ChevronUp, ChevronDown, X } from 'lucide-react';
import { Button } from '../ui/Button';

interface TerminalSearchBarProps {
  searchQuery: string;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  onSearchChange: (value: string) => void;
  onSearchPrev: () => void;
  onSearchNext: () => void;
  onClose: () => void;
}

export const TerminalSearchBar = React.memo(function TerminalSearchBar({
  searchQuery,
  searchInputRef,
  onSearchChange,
  onSearchPrev,
  onSearchNext,
  onClose,
}: TerminalSearchBarProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-secondary border-b border-border">
      <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <input
        ref={searchInputRef}
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) {
              onSearchPrev();
            } else {
              onSearchNext();
            }
          } else if (e.key === 'Escape') {
            onClose();
          }
        }}
        placeholder="Search in terminal..."
        className="flex-1 bg-transparent text-sm text-foreground placeholder-muted-foreground outline-none min-w-0"
      />
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onSearchPrev}
          disabled={!searchQuery}
          className="h-auto p-1"
          title="Previous match (Shift+Enter)"
        >
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onSearchNext}
          disabled={!searchQuery}
          className="h-auto p-1"
          title="Next match (Enter)"
        >
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </Button>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="h-auto p-1 flex-shrink-0"
        title="Close (Esc)"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </Button>
    </div>
  );
});

export default TerminalSearchBar;
