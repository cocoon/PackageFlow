/**
 * Security Audit Panel
 * Displays security audit logs with filtering and statistics
 */

import React, { useCallback, useState } from 'react';
import {
  Shield,
  RefreshCw,
  Download,
  Filter,
  Search,
  Calendar,
  Loader2,
  ChevronDown,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { SettingSection } from '../ui/SettingSection';
import { SettingInfoBox } from '../ui/SettingInfoBox';
import { AuditStatsCard } from '../security/AuditStatsCard';
import { AuditEventRow } from '../security/AuditEventRow';
import { useAuditLog } from '../../../hooks/useAuditLog';
import type { AuditEventType, AuditActorType, AuditOutcome, AuditTimeRange } from '../../../types/audit';

// Filter options
const TIME_RANGE_OPTIONS = [
  { value: 'last_24h', label: 'Last 24 hours' },
  { value: 'last_7d', label: 'Last 7 days' },
  { value: 'last_30d', label: 'Last 30 days' },
];

const EVENT_TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'webhook_trigger', label: 'Webhook' },
  { value: 'authentication', label: 'Authentication' },
  { value: 'tool_execution', label: 'Tool Execution' },
  { value: 'security_alert', label: 'Security Alert' },
  { value: 'data_access', label: 'Data Access' },
  { value: 'config_change', label: 'Config Change' },
];

const ACTOR_TYPE_OPTIONS = [
  { value: 'all', label: 'All Actors' },
  { value: 'user', label: 'User' },
  { value: 'ai_assistant', label: 'AI Assistant' },
  { value: 'webhook', label: 'Webhook' },
  { value: 'system', label: 'System' },
];

const OUTCOME_OPTIONS = [
  { value: 'all', label: 'All Outcomes' },
  { value: 'success', label: 'Success' },
  { value: 'failure', label: 'Failure' },
  { value: 'denied', label: 'Denied' },
];

export const SecurityAuditPanel: React.FC = () => {
  // Local filter state for Select components
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('last_7d');
  const [selectedEventType, setSelectedEventType] = useState<string>('all');
  const [selectedActorType, setSelectedActorType] = useState<string>('all');
  const [selectedOutcome, setSelectedOutcome] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const {
    events,
    stats,
    total,
    hasMore,
    isLoading,
    isLoadingMore,
    isLoadingStats,
    error,
    loadMore,
    setTimeRange,
    setEventTypes,
    setActorType,
    setOutcome,
    resetFilters,
    refresh,
    exportEvents,
  } = useAuditLog({
    pageSize: 50,
    autoRefreshInterval: 30000, // Refresh every 30 seconds
  });

  // Handle filter changes
  const handleTimeRangeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      setSelectedTimeRange(value);
      setTimeRange(value as AuditTimeRange);
    },
    [setTimeRange]
  );

  const handleEventTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      setSelectedEventType(value);
      if (value === 'all') {
        setEventTypes([]);
      } else {
        setEventTypes([value as AuditEventType]);
      }
    },
    [setEventTypes]
  );

  const handleActorTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      setSelectedActorType(value);
      setActorType(value === 'all' ? undefined : (value as AuditActorType));
    },
    [setActorType]
  );

  const handleOutcomeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      setSelectedOutcome(value);
      setOutcome(value === 'all' ? undefined : (value as AuditOutcome));
    },
    [setOutcome]
  );

  const handleResetFilters = useCallback(() => {
    setSelectedTimeRange('last_7d');
    setSelectedEventType('all');
    setSelectedActorType('all');
    setSelectedOutcome('all');
    setSearchQuery('');
    resetFilters();
  }, [resetFilters]);

  const handleExport = useCallback(async () => {
    const data = await exportEvents();
    if (data) {
      // Create a blob and download
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [exportEvents]);

  // Filter events by search query (client-side)
  const filteredEvents = searchQuery
    ? events.filter(
        (e) =>
          e.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.resourceName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : events;

  const hasActiveFilters =
    selectedTimeRange !== 'last_7d' ||
    selectedEventType !== 'all' ||
    selectedActorType !== 'all' ||
    selectedOutcome !== 'all' ||
    searchQuery !== '';

  return (
    <div className="flex flex-col h-full">
      {/* Fixed Header */}
      <div className="flex-shrink-0 pb-4 border-b border-border bg-background">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              Security Audit
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Monitor and review security events across your application
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={isLoading || events.length === 0}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium',
                'border border-border bg-background hover:bg-muted',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'transition-colors'
              )}
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={refresh}
              disabled={isLoading}
              className={cn(
                'p-1.5 rounded-md',
                'border border-border bg-background hover:bg-muted',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'transition-colors'
              )}
            >
              <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pt-4 space-y-6">
        {/* Error Display */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {/* Statistics */}
        <SettingSection
          title="Overview"
          description="Security events in the selected time period"
          icon={<Calendar className="w-4 h-4" />}
        >
          <AuditStatsCard stats={stats} isLoading={isLoadingStats} />
        </SettingSection>

        {/* Filters */}
        <SettingSection
          title="Filters"
          description="Narrow down events by type, actor, or outcome"
          icon={<Filter className="w-4 h-4" />}
        >
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by action or resource name..."
                className={cn(
                  'w-full pl-10 pr-3 py-2 text-sm rounded-md',
                  'bg-muted/50 border border-border',
                  'text-foreground placeholder:text-muted-foreground',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring'
                )}
              />
            </div>

            {/* Filter dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedTimeRange}
                onChange={handleTimeRangeChange}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-md',
                  'bg-muted/50 border border-border',
                  'text-foreground',
                  'focus:outline-none focus:ring-2 focus:ring-ring'
                )}
              >
                {TIME_RANGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <select
                value={selectedEventType}
                onChange={handleEventTypeChange}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-md',
                  'bg-muted/50 border border-border',
                  'text-foreground',
                  'focus:outline-none focus:ring-2 focus:ring-ring'
                )}
              >
                {EVENT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <select
                value={selectedActorType}
                onChange={handleActorTypeChange}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-md',
                  'bg-muted/50 border border-border',
                  'text-foreground',
                  'focus:outline-none focus:ring-2 focus:ring-ring'
                )}
              >
                {ACTOR_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <select
                value={selectedOutcome}
                onChange={handleOutcomeChange}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-md',
                  'bg-muted/50 border border-border',
                  'text-foreground',
                  'focus:outline-none focus:ring-2 focus:ring-ring'
                )}
              >
                {OUTCOME_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1.5 text-sm rounded-md',
                    'hover:bg-muted transition-colors',
                    'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
              )}
            </div>
          </div>
        </SettingSection>

        {/* Event Timeline */}
        <SettingSection
          title="Event Timeline"
          description={
            isLoading
              ? 'Loading events...'
              : `Showing ${filteredEvents.length} of ${total.toLocaleString()} events`
          }
          icon={<Shield className="w-4 h-4" />}
        >
          <div className="border border-border rounded-lg bg-card/30 overflow-hidden">
            {isLoading && events.length === 0 ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-muted animate-pulse" />
                    <div className="w-16 h-5 rounded bg-muted animate-pulse" />
                    <div className="flex-1 h-5 rounded bg-muted animate-pulse" />
                    <div className="w-16 h-5 rounded bg-muted animate-pulse" />
                    <div className="w-12 h-4 rounded bg-muted animate-pulse" />
                  </div>
                ))}
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="py-12 text-center">
                <Shield className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <h3 className="text-sm font-medium text-foreground mb-1">No Events Found</h3>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  {hasActiveFilters
                    ? 'No events match your current filters. Try adjusting your search criteria.'
                    : 'No security events have been recorded yet. Events will appear here when security-related actions occur.'}
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={handleResetFilters}
                    className={cn(
                      'mt-4 px-3 py-1.5 text-sm rounded-md',
                      'border border-border hover:bg-muted',
                      'transition-colors'
                    )}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="p-3 space-y-0 max-h-[400px] overflow-y-auto">
                  {filteredEvents.map((event) => (
                    <AuditEventRow key={event.id} event={event} />
                  ))}
                </div>

                {/* Load More */}
                {hasMore && (
                  <div className="p-3 border-t border-border">
                    <button
                      onClick={loadMore}
                      disabled={isLoadingMore}
                      className={cn(
                        'w-full flex items-center justify-center gap-2 py-2 text-sm rounded-md',
                        'hover:bg-muted transition-colors',
                        'disabled:opacity-50 disabled:cursor-not-allowed'
                      )}
                    >
                      {isLoadingMore ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                      Load More
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </SettingSection>

        {/* Info Box */}
        <SettingInfoBox title="About Security Audit Logs" variant="info">
          <ul className="space-y-1.5 text-sm">
            <li>Audit logs record security-relevant actions performed in the application</li>
            <li>Events are retained for 90 days by default</li>
            <li>Use filters to investigate specific incidents or patterns</li>
            <li>Export logs for compliance reporting or external analysis</li>
          </ul>
        </SettingInfoBox>
      </div>
    </div>
  );
};

export default SecurityAuditPanel;
