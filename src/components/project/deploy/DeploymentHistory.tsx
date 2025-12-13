// DeploymentHistory Component
// One-Click Deploy feature (015-one-click-deploy)
// Enhanced: Deploy UI Enhancement (018-deploy-ui-enhancement)

import { useState, useMemo } from 'react';
import {
  Clock,
  Check,
  X,
  Loader2,
  ExternalLink,
  GitCommit,
  AlertCircle,
  RefreshCw,
  Trash2,
  Settings,
  GitBranch,
  Globe,
  Timer,
  Filter,
  ArrowUpDown,
} from 'lucide-react';
import type { Deployment, DeploymentStatus, PlatformType } from '../../../types/deploy';
import { deployAPI } from '../../../lib/tauri-api';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { NetlifyIcon } from '../../ui/icons/NetlifyIcon';
import { CloudflareIcon } from '../../ui/icons/CloudflareIcon';
import { GithubIcon } from '../../ui/icons/GithubIcon';

// Filter and sort types
type FilterStatus = DeploymentStatus | 'all';
type FilterPlatform = PlatformType | 'all';
type SortBy = 'date' | 'status' | 'deployTime';
type SortOrder = 'asc' | 'desc';

interface DeploymentHistoryProps {
  deployments: Deployment[];
  projectId: string;
  isLoading: boolean;
  onRefresh: () => void;
}

// Get platform icon
const getPlatformIcon = (platform: PlatformType, className = 'h-4 w-4') => {
  switch (platform) {
    case 'netlify':
      return <NetlifyIcon className={className} />;
    case 'cloudflare_pages':
      return <CloudflareIcon className={className} />;
    case 'github_pages':
      return <GithubIcon className={className} />;
  }
};

// Get platform name
const getPlatformName = (platform: PlatformType): string => {
  switch (platform) {
    case 'netlify': return 'Netlify';
    case 'cloudflare_pages': return 'Cloudflare';
    case 'github_pages': return 'GitHub';
  }
};

export function DeploymentHistory({
  deployments,
  projectId,
  isLoading,
  onRefresh,
}: DeploymentHistoryProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Filter and sort state
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterPlatform, setFilterPlatform] = useState<FilterPlatform>('all');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showFilters, setShowFilters] = useState(false);

  // Get unique platforms from deployments
  const availablePlatforms = useMemo(() => {
    const platforms = new Set(deployments.map(d => d.platform));
    return Array.from(platforms);
  }, [deployments]);

  // Filter and sort deployments
  const filteredDeployments = useMemo(() => {
    let result = [...deployments];

    // Apply status filter
    if (filterStatus !== 'all') {
      result = result.filter(d => d.status === filterStatus);
    }

    // Apply platform filter
    if (filterPlatform !== 'all') {
      result = result.filter(d => d.platform === filterPlatform);
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'status':
          const statusOrder = { ready: 0, building: 1, deploying: 2, queued: 3, failed: 4, cancelled: 5 };
          comparison = (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
          break;
        case 'deployTime':
          comparison = (a.deployTime || 0) - (b.deployTime || 0);
          break;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return result;
  }, [deployments, filterStatus, filterPlatform, sortBy, sortOrder]);

  // Check if any filters are active
  const hasActiveFilters = filterStatus !== 'all' || filterPlatform !== 'all';

  const handleDeleteItem = async (deploymentId: string) => {
    setDeletingId(deploymentId);
    try {
      await deployAPI.deleteDeploymentHistoryItem(projectId, deploymentId);
      onRefresh();
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = () => {
    setShowClearConfirm(true);
  };

  const handleConfirmClearAll = async () => {
    setClearing(true);
    try {
      await deployAPI.clearDeploymentHistory(projectId);
      onRefresh();
    } finally {
      setClearing(false);
      setShowClearConfirm(false); // Close the dialog
    }
  };

  const getStatusIcon = (status: DeploymentStatus) => {
    switch (status) {
      case 'queued':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'building':
      case 'deploying':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'ready':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <X className="h-4 w-4 text-red-500" />;
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: DeploymentStatus) => {
    switch (status) {
      case 'queued':
        return 'Queued';
      case 'building':
        return 'Building';
      case 'deploying':
        return 'Deploying';
      case 'ready':
        return 'Ready';
      case 'failed':
        return 'Failed';
      case 'cancelled':
        return 'Cancelled';
    }
  };

  const formatDuration = (start: string, end?: string) => {
    if (!end) return 'In progress';
    const startDate = new Date(start);
    const endDate = new Date(end);
    const durationMs = endDate.getTime() - startDate.getTime();
    const seconds = Math.floor(durationMs / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format deploy time from seconds
  const formatDeployTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Get display duration - prefer deployTime if available
  const getDisplayDuration = (deployment: Deployment) => {
    if (deployment.deployTime) {
      return formatDeployTime(deployment.deployTime);
    }
    return formatDuration(deployment.createdAt, deployment.completedAt);
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground text-white">
          <Clock className="h-4 w-4" />
          <span>Deployment History</span>
          {deployments.length > 0 && (
            <span className="rounded-full bg-muted px-1.5 text-xs">
              {filteredDeployments.length}
              {hasActiveFilters && ` / ${deployments.length}`}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {deployments.length > 0 && (
            <>
              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1 text-xs transition-colors ${
                  hasActiveFilters
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Toggle filters"
              >
                <Filter className="h-3 w-3" />
                <span>Filter</span>
                {hasActiveFilters && (
                  <span className="rounded-full bg-primary px-1 text-[10px] text-primary-foreground">
                    !
                  </span>
                )}
              </button>

              {/* Clear All */}
              <button
                onClick={handleClearAll}
                disabled={clearing}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive disabled:opacity-50"
                title="Clear all history"
              >
                {clearing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
                <span>Clear</span>
              </button>
            </>
          )}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && deployments.length > 0 && (
        <div className="rounded-md border border-border bg-muted/30 p-3">
          <div className="flex flex-wrap items-center gap-4">
            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Status:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                className="h-7 rounded-md border border-border bg-background px-2 text-xs"
              >
                <option value="all">All</option>
                <option value="ready">Ready</option>
                <option value="failed">Failed</option>
                <option value="building">Building</option>
                <option value="deploying">Deploying</option>
                <option value="queued">Queued</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Platform Filter */}
            {availablePlatforms.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Platform:</span>
                <select
                  value={filterPlatform}
                  onChange={(e) => setFilterPlatform(e.target.value as FilterPlatform)}
                  className="h-7 rounded-md border border-border bg-background px-2 text-xs"
                >
                  <option value="all">All</option>
                  {availablePlatforms.map((p) => (
                    <option key={p} value={p}>
                      {getPlatformName(p)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Sort */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="h-7 rounded-md border border-border bg-background px-2 text-xs"
              >
                <option value="date">Date</option>
                <option value="status">Status</option>
                <option value="deployTime">Deploy Time</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                className="flex h-7 items-center gap-1 rounded-md border border-border bg-background px-2 text-xs hover:bg-accent"
                title={sortOrder === 'desc' ? 'Descending' : 'Ascending'}
              >
                <ArrowUpDown className="h-3 w-3" />
                {sortOrder === 'desc' ? 'Desc' : 'Asc'}
              </button>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={() => {
                  setFilterStatus('all');
                  setFilterPlatform('all');
                }}
                className="text-xs text-primary hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {isLoading && deployments.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          <span>Loading...</span>
        </div>
      ) : deployments.length === 0 ? (
        <div className="rounded-md border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          <p>No deployments yet</p>
          <p className="mt-1 text-xs">Your deployments will appear here</p>
        </div>
      ) : filteredDeployments.length === 0 ? (
        <div className="rounded-md border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          <Filter className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2">No deployments match the current filters</p>
          <button
            onClick={() => {
              setFilterStatus('all');
              setFilterPlatform('all');
            }}
            className="mt-2 text-xs text-primary hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredDeployments.map((deployment, index) => {
            const isLatest = index === 0 && sortBy === 'date' && sortOrder === 'desc';

            return (
              <div
                key={deployment.id}
                className={`rounded-md border p-3 transition-colors ${
                  isLatest
                    ? 'border-primary/30 bg-accent/30'
                    : deployment.status === 'failed'
                    ? 'border-destructive/30 bg-destructive/5'
                    : 'border-border bg-card'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  {/* Platform Icon + Status & Info */}
                  <div className="flex items-start gap-3">
                    {/* Platform Icon */}
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                      {getPlatformIcon(deployment.platform)}
                    </div>

                    {/* Status & Details */}
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium">
                        {getStatusIcon(deployment.status)}
                        <span>{getStatusText(deployment.status)}</span>
                        {isLatest && deployment.status === 'ready' && (
                          <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-600 dark:text-green-400">
                            Latest
                          </span>
                        )}
                        {deployment.status === 'ready' && (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                            production
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                        <span>{formatDate(deployment.createdAt)}</span>
                        {deployment.siteName && (
                          <>
                            <span>-</span>
                            <span className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {deployment.siteName}
                            </span>
                          </>
                        )}
                        {deployment.branch && (
                          <>
                            <span>-</span>
                            <span className="flex items-center gap-1">
                              <GitBranch className="h-3 w-3" />
                              {deployment.branch}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Duration & Actions */}
                  <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                    {/* Deploy Time with visual bar */}
                    <div className="flex items-center gap-1" title="Build time">
                      <Timer className="h-3 w-3" />
                      <span className="font-mono">{getDisplayDuration(deployment)}</span>
                    </div>

                    {/* Links */}
                    {deployment.url && (
                      <a
                        href={deployment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-6 w-6 items-center justify-center rounded hover:bg-accent"
                        title="Open deployed site"
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-primary" />
                      </a>
                    )}
                    {deployment.adminUrl && (
                      <a
                        href={deployment.adminUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-6 w-6 items-center justify-center rounded hover:bg-accent"
                        title="Open Dashboard"
                      >
                        <Settings className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <button
                      onClick={() => handleDeleteItem(deployment.id)}
                      disabled={deletingId === deployment.id}
                      className="flex h-6 w-6 items-center justify-center rounded hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                      title="Delete this record"
                    >
                      {deletingId === deployment.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Commit Info */}
                {(deployment.commitHash || deployment.commitMessage) && (
                  <div className="mt-2 flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
                    <GitCommit className="h-3 w-3 shrink-0" />
                    {deployment.commitHash && (
                      <code className="rounded bg-background px-1 font-mono">
                        {deployment.commitHash.substring(0, 7)}
                      </code>
                    )}
                    {deployment.commitMessage && (
                      <span className="truncate">{deployment.commitMessage}</span>
                    )}
                  </div>
                )}

                {/* Preview URL (if different from main URL) */}
                {deployment.previewUrl && deployment.previewUrl !== deployment.url && (
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Preview:</span>
                    <a
                      href={deployment.previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-primary hover:underline"
                    >
                      {deployment.previewUrl}
                    </a>
                  </div>
                )}

                {/* Error Message */}
                {deployment.errorMessage && (
                  <div className="mt-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                      <span>{deployment.errorMessage}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={showClearConfirm}
        onOpenChange={setShowClearConfirm}
        title="Clear All History"
        description="Are you sure you want to clear all deployment history for this project? This action cannot be undone."
        confirmText="Yes, Clear History"
        variant="destructive"
        onConfirm={handleConfirmClearAll}
      />
    </div>
  );
}
