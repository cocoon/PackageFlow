// Snapshot Detail Component
// Displays detailed information about a snapshot

import { useState } from 'react';
import {
  Package,
  Clock,
  HardDrive,
  Hash,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Search,
  Filter,
} from 'lucide-react';
import type { ExecutionSnapshot, SnapshotDependency } from '../../types/snapshot';
import { SecurityBadge } from './SecurityBadge';
import { cn } from '../../lib/utils';

interface SnapshotDetailProps {
  snapshot: ExecutionSnapshot;
  dependencies?: SnapshotDependency[];
  loading?: boolean;
  className?: string;
}

export function SnapshotDetail({
  snapshot,
  dependencies = [],
  loading = false,
  className,
}: SnapshotDetailProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDirect, setShowDirect] = useState(true);
  const [showDev, setShowDev] = useState(true);
  const [showPostinstall, setShowPostinstall] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overview: true,
    dependencies: true,
    hashes: false,
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const formatDuration = (ms?: number | null) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  const formatSize = (bytes?: number | null) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const filteredDependencies = dependencies.filter((dep) => {
    // Search filter
    if (searchQuery && !dep.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    // Type filters
    if (!showDirect && dep.isDirect) return false;
    if (!showDev && dep.isDev) return false;
    if (showPostinstall && !dep.hasPostinstall) return false;
    return true;
  });

  const directDeps = filteredDependencies.filter((d) => d.isDirect && !d.isDev);
  const devDeps = filteredDependencies.filter((d) => d.isDev);
  const transitiveDeps = filteredDependencies.filter((d) => !d.isDirect && !d.isDev);

  const SectionHeader = ({
    title,
    section,
    count,
  }: {
    title: string;
    section: string;
    count?: number;
  }) => (
    <button
      onClick={() => toggleSection(section)}
      className="flex items-center gap-2 w-full py-2 text-left font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
    >
      {expandedSections[section] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      <span>{title}</span>
      {count !== undefined && (
        <span className="text-xs text-gray-400 dark:text-gray-500">({count})</span>
      )}
    </button>
  );

  return (
    <div className={cn('space-y-4', className)}>
      {/* Overview Section */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <SectionHeader title="Overview" section="overview" />
        {expandedSections.overview && (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Clock size={16} className="text-gray-400" />
                <span className="text-gray-500">Created:</span>
                <span className="text-gray-900 dark:text-gray-100">
                  {formatDate(snapshot.createdAt)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock size={16} className="text-gray-400" />
                <span className="text-gray-500">Duration:</span>
                <span className="text-gray-900 dark:text-gray-100">
                  {formatDuration(snapshot.executionDurationMs)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Package size={16} className="text-gray-400" />
                <span className="text-gray-500">Package Manager:</span>
                <span className="text-gray-900 dark:text-gray-100 uppercase">
                  {snapshot.lockfileType || 'Unknown'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <HardDrive size={16} className="text-gray-400" />
                <span className="text-gray-500">Storage:</span>
                <span className="text-gray-900 dark:text-gray-100">
                  {formatSize(snapshot.compressedSize)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 pt-2 border-t border-gray-100 dark:border-gray-800">
              <div className="text-sm">
                <span className="text-gray-500">Security Score:</span>
                <SecurityBadge score={snapshot.securityScore} size="md" className="ml-2 inline-flex" />
              </div>
              {snapshot.postinstallCount > 0 && (
                <div className="flex items-center gap-1 text-sm text-amber-500">
                  <AlertTriangle size={14} />
                  <span>{snapshot.postinstallCount} postinstall scripts</span>
                </div>
              )}
            </div>

            <div className="flex gap-4 text-sm">
              <span>
                <strong className="text-gray-900 dark:text-gray-100">
                  {snapshot.totalDependencies}
                </strong>{' '}
                <span className="text-gray-500">total</span>
              </span>
              <span>
                <strong className="text-gray-900 dark:text-gray-100">
                  {snapshot.directDependencies}
                </strong>{' '}
                <span className="text-gray-500">direct</span>
              </span>
              <span>
                <strong className="text-gray-900 dark:text-gray-100">
                  {snapshot.devDependencies}
                </strong>{' '}
                <span className="text-gray-500">dev</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Dependencies Section */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <SectionHeader title="Dependencies" section="dependencies" count={dependencies.length} />
        {expandedSections.dependencies && (
          <div className="mt-3 space-y-3">
            {/* Search and filters */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search dependencies..."
                  className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-gray-400" />
                <label className="flex items-center gap-1 text-xs text-gray-500">
                  <input
                    type="checkbox"
                    checked={showDirect}
                    onChange={(e) => setShowDirect(e.target.checked)}
                    className="rounded"
                  />
                  Direct
                </label>
                <label className="flex items-center gap-1 text-xs text-gray-500">
                  <input
                    type="checkbox"
                    checked={showDev}
                    onChange={(e) => setShowDev(e.target.checked)}
                    className="rounded"
                  />
                  Dev
                </label>
                <label className="flex items-center gap-1 text-xs text-gray-500">
                  <input
                    type="checkbox"
                    checked={showPostinstall}
                    onChange={(e) => setShowPostinstall(e.target.checked)}
                    className="rounded"
                  />
                  Postinstall only
                </label>
              </div>
            </div>

            {/* Dependencies list */}
            {loading ? (
              <div className="text-center py-4 text-gray-500">Loading dependencies...</div>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-4">
                {directDeps.length > 0 && (
                  <DependencyGroup title="Direct Dependencies" deps={directDeps} />
                )}
                {devDeps.length > 0 && <DependencyGroup title="Dev Dependencies" deps={devDeps} />}
                {transitiveDeps.length > 0 && (
                  <DependencyGroup title="Transitive Dependencies" deps={transitiveDeps} />
                )}
                {filteredDependencies.length === 0 && (
                  <div className="text-center py-4 text-gray-500">No dependencies match filters</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hashes Section */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <SectionHeader title="Integrity Hashes" section="hashes" />
        {expandedSections.hashes && (
          <div className="mt-3 space-y-2 text-sm">
            {snapshot.lockfileHash && (
              <HashRow label="Lockfile Hash" hash={snapshot.lockfileHash} />
            )}
            {snapshot.packageJsonHash && (
              <HashRow label="package.json Hash" hash={snapshot.packageJsonHash} />
            )}
            {snapshot.dependencyTreeHash && (
              <HashRow label="Dependency Tree Hash" hash={snapshot.dependencyTreeHash} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DependencyGroup({ title, deps }: { title: string; deps: SnapshotDependency[] }) {
  return (
    <div>
      <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">
        {title} ({deps.length})
      </h4>
      <div className="space-y-1">
        {deps.map((dep) => (
          <div
            key={`${dep.name}@${dep.version}`}
            className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-gray-900 dark:text-gray-100">{dep.name}</span>
              <span className="text-xs text-gray-400">@{dep.version}</span>
              {dep.hasPostinstall && (
                <span className="text-amber-500" title="Has postinstall script">
                  <AlertTriangle size={12} />
                </span>
              )}
            </div>
            {dep.integrityHash && (
              <span
                className="text-xs text-gray-400 font-mono truncate max-w-[150px]"
                title={dep.integrityHash}
              >
                {dep.integrityHash.slice(0, 20)}...
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function HashRow({ label, hash }: { label: string; hash: string }) {
  return (
    <div className="flex items-start gap-2">
      <Hash size={14} className="text-gray-400 mt-0.5" />
      <div className="flex-1 min-w-0">
        <span className="text-gray-500">{label}:</span>
        <code className="block text-xs font-mono text-gray-700 dark:text-gray-300 truncate mt-0.5">
          {hash}
        </code>
      </div>
    </div>
  );
}
