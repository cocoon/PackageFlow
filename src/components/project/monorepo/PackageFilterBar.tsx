/**
 * PackageFilterBar Component
 * Feature: 008-monorepo-support
 *
 * Filter bar for searching and filtering packages.
 */

import { useState, useMemo, useCallback } from 'react';
import { Search, X, Filter, Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '../../ui/Button';
import { cn } from '../../../lib/utils';

export interface PackageInfo {
  name: string;
  path: string;
  type?: string;
  scripts?: string[];
}

interface PackageFilterBarProps {
  packages: PackageInfo[];
  selectedPackages: Set<string>;
  onSelectionChange: (selected: Set<string>) => void;
  className?: string;
}

export function PackageFilterBar({
  packages,
  selectedPackages,
  onSelectionChange,
  className,
}: PackageFilterBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  // Filter packages based on search and type
  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      const matchesSearch =
        searchQuery === '' ||
        pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkg.path.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = typeFilter === null || pkg.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [packages, searchQuery, typeFilter]);

  // Get unique types
  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    packages.forEach((pkg) => {
      if (pkg.type) {
        types.add(pkg.type);
      }
    });
    return Array.from(types).sort();
  }, [packages]);

  // Toggle package selection
  const togglePackage = useCallback(
    (packageName: string) => {
      const newSelection = new Set(selectedPackages);
      if (newSelection.has(packageName)) {
        newSelection.delete(packageName);
      } else {
        newSelection.add(packageName);
      }
      onSelectionChange(newSelection);
    },
    [selectedPackages, onSelectionChange]
  );

  // Select all visible packages
  const selectAll = useCallback(() => {
    const newSelection = new Set(selectedPackages);
    filteredPackages.forEach((pkg) => {
      newSelection.add(pkg.name);
    });
    onSelectionChange(newSelection);
  }, [filteredPackages, selectedPackages, onSelectionChange]);

  // Deselect all visible packages
  const deselectAll = useCallback(() => {
    const newSelection = new Set(selectedPackages);
    filteredPackages.forEach((pkg) => {
      newSelection.delete(pkg.name);
    });
    onSelectionChange(newSelection);
  }, [filteredPackages, selectedPackages, onSelectionChange]);

  // Check if all visible are selected
  const allSelected = useMemo(() => {
    return (
      filteredPackages.length > 0 &&
      filteredPackages.every((pkg) => selectedPackages.has(pkg.name))
    );
  }, [filteredPackages, selectedPackages]);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Search and filter row */}
      <div className="flex items-center gap-2">
        {/* Search input */}
        <div className="flex-1 relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search packages..."
            className="w-full pl-8 pr-8 py-1.5 text-sm bg-secondary border border-border rounded
                       text-foreground placeholder:text-muted-foreground
                       focus:outline-none focus:border-blue-500"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-auto w-auto p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Type filter dropdown */}
        {availableTypes.length > 0 && (
          <div className="relative">
            <Button
              variant={typeFilter ? 'outline-info' : 'outline'}
              size="sm"
              onClick={() => setShowTypeDropdown(!showTypeDropdown)}
              className={cn(
                'flex items-center gap-1.5',
                typeFilter && 'bg-blue-500/20 text-blue-400'
              )}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{typeFilter || 'All types'}</span>
              <ChevronsUpDown className="w-3 h-3" />
            </Button>

            {showTypeDropdown && (
              <div className="absolute right-0 top-full mt-1 z-10 min-w-[120px] bg-secondary border border-border rounded shadow-lg">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setTypeFilter(null);
                    setShowTypeDropdown(false);
                  }}
                  className="w-full px-3 py-1.5 h-auto justify-start rounded-none text-sm"
                >
                  All types
                </Button>
                {availableTypes.map((type) => (
                  <Button
                    key={type}
                    variant="ghost"
                    onClick={() => {
                      setTypeFilter(type);
                      setShowTypeDropdown(false);
                    }}
                    className="w-full px-3 py-1.5 h-auto justify-start rounded-none text-sm"
                  >
                    {type}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selection controls */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={allSelected ? deselectAll : selectAll}
            className="flex items-center gap-1 h-auto px-2 py-1"
          >
            <Check className="w-3 h-3" />
            {allSelected ? 'Deselect all' : 'Select all'}
          </Button>
          <span className="text-muted-foreground/70">|</span>
          <span className="text-muted-foreground">
            {selectedPackages.size} of {packages.length} selected
          </span>
        </div>
        <span className="text-muted-foreground">
          {filteredPackages.length} packages shown
        </span>
      </div>

      {/* Package list */}
      <div className="max-h-48 overflow-y-auto space-y-1">
        {filteredPackages.map((pkg) => (
          <Button
            key={pkg.name}
            variant="ghost"
            onClick={() => togglePackage(pkg.name)}
            className={cn(
              'w-full flex items-center gap-2 px-2 py-1.5 h-auto justify-start',
              selectedPackages.has(pkg.name)
                ? 'bg-blue-500/10 border border-blue-500/30'
                : 'bg-secondary/50 border border-transparent hover:border-border'
            )}
          >
            <div
              className={cn(
                'w-4 h-4 rounded border flex items-center justify-center',
                selectedPackages.has(pkg.name)
                  ? 'bg-blue-500 border-blue-500'
                  : 'border-muted-foreground'
              )}
            >
              {selectedPackages.has(pkg.name) && <Check className="w-3 h-3 text-white" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-foreground truncate">{pkg.name}</div>
              <div className="text-[10px] text-muted-foreground truncate">{pkg.path}</div>
            </div>
            {pkg.type && (
              <span className="px-1.5 py-0.5 text-[10px] bg-border text-muted-foreground rounded">
                {pkg.type}
              </span>
            )}
          </Button>
        ))}

        {filteredPackages.length === 0 && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            No packages match your filter
          </div>
        )}
      </div>
    </div>
  );
}

export default PackageFilterBar;
