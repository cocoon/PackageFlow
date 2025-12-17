// Snapshot Search Panel Component
// Search and filter snapshots across all projects

import { useState, useCallback } from 'react';
import {
  Search,
  X,
  Package,
  Calendar,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
import { useSnapshotSearch } from '../../hooks/useSnapshotSearch';
import { SecurityBadge } from './SecurityBadge';
import { cn } from '../../lib/utils';
import type { SnapshotSearchCriteria, SnapshotSearchResult } from '../../types/snapshot';

interface SnapshotSearchPanelProps {
  projectPath?: string;
  onSelectSnapshot?: (snapshotId: string) => void;
  className?: string;
}

export function SnapshotSearchPanel({
  projectPath,
  onSelectSnapshot,
  className,
}: SnapshotSearchPanelProps) {
  const {
    searchResults,
    isSearching,
    searchError,
    search,
    clearSearch,
  } = useSnapshotSearch();

  // Search form state
  const [packageName, setPackageName] = useState('');
  const [packageVersion, setPackageVersion] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [hasPostinstall, setHasPostinstall] = useState<boolean | undefined>(undefined);
  const [minSecurityScore, setMinSecurityScore] = useState<number | undefined>(undefined);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());

  // Handle search
  const handleSearch = useCallback(() => {
    const criteria: SnapshotSearchCriteria = {
      projectPath,
      limit: 50,
    };

    if (packageName.trim()) {
      criteria.packageName = packageName.trim();
    }
    if (packageVersion.trim()) {
      criteria.packageVersion = packageVersion.trim();
    }
    if (fromDate) {
      criteria.fromDate = fromDate;
    }
    if (toDate) {
      criteria.toDate = toDate;
    }
    if (hasPostinstall !== undefined) {
      criteria.hasPostinstall = hasPostinstall;
    }
    if (minSecurityScore !== undefined) {
      criteria.minSecurityScore = minSecurityScore;
    }

    search(criteria);
  }, [
    projectPath,
    packageName,
    packageVersion,
    fromDate,
    toDate,
    hasPostinstall,
    minSecurityScore,
    search,
  ]);

  // Handle clear
  const handleClear = useCallback(() => {
    setPackageName('');
    setPackageVersion('');
    setFromDate('');
    setToDate('');
    setHasPostinstall(undefined);
    setMinSecurityScore(undefined);
    clearSearch();
  }, [clearSearch]);

  // Handle key press
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSearch();
      }
    },
    [handleSearch]
  );

  // Toggle result expansion
  const toggleExpand = useCallback((snapshotId: string) => {
    setExpandedResults((prev) => {
      const next = new Set(prev);
      if (next.has(snapshotId)) {
        next.delete(snapshotId);
      } else {
        next.add(snapshotId);
      }
      return next;
    });
  }, []);

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  // Compact path for display
  const compactPath = (path: string) => {
    const parts = path.split('/');
    if (parts.length <= 3) return path;
    return '.../' + parts.slice(-2).join('/');
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Search Header */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
        <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-3 flex items-center gap-2">
          <Search className="w-4 h-4" />
          Search Execution History
        </h3>

        {/* Main Search */}
        <div className="flex gap-2 mb-3">
          <div className="flex-1 relative">
            <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Package name..."
              value={packageName}
              onChange={(e) => setPackageName(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <input
            type="text"
            placeholder="Version"
            value={packageVersion}
            onChange={(e) => setPackageVersion(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-24 px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Advanced Filters Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 flex items-center gap-1 mb-2"
        >
          {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          Advanced Filters
        </button>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="space-y-2 mb-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-neutral-500 block mb-1">From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-neutral-500 block mb-1">To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                />
              </div>
            </div>

            <div className="flex gap-4 items-center">
              <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                <input
                  type="checkbox"
                  checked={hasPostinstall === true}
                  onChange={(e) => setHasPostinstall(e.target.checked ? true : undefined)}
                  className="rounded border-neutral-300 dark:border-neutral-600"
                />
                <AlertTriangle className="w-3 h-3" />
                Has postinstall
              </label>

              <div className="flex items-center gap-2">
                <label className="text-xs text-neutral-500">Min Security Score:</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={minSecurityScore ?? ''}
                  onChange={(e) =>
                    setMinSecurityScore(e.target.value ? parseInt(e.target.value) : undefined)
                  }
                  className="w-16 px-2 py-1 text-sm rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                />
              </div>
            </div>
          </div>
        )}

        {/* Search Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg flex items-center justify-center gap-2"
          >
            {isSearching ? (
              <>
                <span className="animate-spin">
                  <Search className="w-4 h-4" />
                </span>
                Searching...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Search
              </>
            )}
          </button>
          <button
            onClick={handleClear}
            className="px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-lg flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Clear
          </button>
        </div>
      </div>

      {/* Search Results */}
      <div className="flex-1 overflow-y-auto">
        {searchError && (
          <div className="p-4 m-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg">
            {searchError}
          </div>
        )}

        {searchResults && (
          <>
            {/* Summary */}
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                Found <span className="font-medium">{searchResults.summary.totalMatches}</span>{' '}
                matches across{' '}
                <span className="font-medium">{searchResults.summary.totalSnapshots}</span> snapshots
              </div>
              {searchResults.summary.dateRange && (
                <div className="text-xs text-neutral-500 mt-1">
                  <Calendar className="w-3 h-3 inline mr-1" />
                  {formatDate(searchResults.summary.dateRange.earliest)} -{' '}
                  {formatDate(searchResults.summary.dateRange.latest)}
                </div>
              )}
            </div>

            {/* Results List */}
            <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {searchResults.results.map((result) => (
                <SearchResultItem
                  key={result.snapshot.id}
                  result={result}
                  isExpanded={expandedResults.has(result.snapshot.id)}
                  onToggle={() => toggleExpand(result.snapshot.id)}
                  onSelect={() => onSelectSnapshot?.(result.snapshot.id)}
                  compactPath={compactPath}
                  formatDate={formatDate}
                />
              ))}
            </div>

            {searchResults.results.length === 0 && (
              <div className="p-8 text-center text-neutral-500">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No matching snapshots found</p>
              </div>
            )}
          </>
        )}

        {!searchResults && !isSearching && (
          <div className="p-8 text-center text-neutral-500">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Search for packages across all execution snapshots</p>
            <p className="text-xs mt-1">Enter a package name to start</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Search Result Item Component
interface SearchResultItemProps {
  result: SnapshotSearchResult;
  isExpanded: boolean;
  onToggle: () => void;
  onSelect: () => void;
  compactPath: (path: string) => string;
  formatDate: (date: string) => string;
}

function SearchResultItem({
  result,
  isExpanded,
  onToggle,
  onSelect,
  compactPath,
  formatDate,
}: SearchResultItemProps) {
  const { snapshot, matchedDependencies, matchCount } = result;

  return (
    <div className="p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <button
              onClick={onToggle}
              className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
              {compactPath(snapshot.projectPath)}
            </span>
            <span className="text-xs text-neutral-500">
              {matchCount} {matchCount === 1 ? 'match' : 'matches'}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1 ml-7 text-xs text-neutral-500">
            <Calendar className="w-3 h-3" />
            {formatDate(snapshot.createdAt)}
            <span className="text-neutral-300 dark:text-neutral-600">|</span>
            <Package className="w-3 h-3" />
            {snapshot.totalDependencies} deps
          </div>
        </div>

        <div className="flex items-center gap-2">
          {snapshot.securityScore !== null && snapshot.securityScore !== undefined && (
            <SecurityBadge score={snapshot.securityScore} size="sm" />
          )}
          <button
            onClick={onSelect}
            className="p-1.5 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
            title="View snapshot"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded: Show matched dependencies */}
      {isExpanded && matchedDependencies.length > 0 && (
        <div className="mt-2 ml-7 space-y-1">
          {matchedDependencies.map((dep) => (
            <div
              key={dep.name}
              className="flex items-center justify-between text-xs p-2 bg-neutral-100 dark:bg-neutral-700/50 rounded"
            >
              <div className="flex items-center gap-2">
                <Package className="w-3 h-3 text-neutral-400" />
                <span className="font-mono text-neutral-700 dark:text-neutral-300">{dep.name}</span>
                <span className="text-neutral-500">@{dep.version}</span>
              </div>
              <div className="flex items-center gap-2">
                {dep.isDev && (
                  <span className="px-1.5 py-0.5 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded">
                    dev
                  </span>
                )}
                {dep.hasPostinstall && (
                  <span className="px-1.5 py-0.5 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    postinstall
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
