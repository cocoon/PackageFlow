/**
 * AuditEventRow - Single row in the audit event timeline
 * Expandable to show full event details
 */

import React, { useState, useCallback } from 'react';
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  User,
  Bot,
  Globe,
  Cpu,
  Webhook,
  Key,
  Wrench,
  AlertTriangle,
  Database,
  Settings,
  Copy,
  Check,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { AuditEvent, AuditEventType, AuditActorType, AuditOutcome } from '../../../types/audit';

interface AuditEventRowProps {
  event: AuditEvent;
}

// Event type configuration
const EVENT_TYPE_CONFIG: Record<
  AuditEventType,
  { icon: React.ElementType; label: string; color: string; bgColor: string }
> = {
  webhook_trigger: {
    icon: Webhook,
    label: 'Webhook',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
  },
  authentication: {
    icon: Key,
    label: 'Auth',
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
  },
  tool_execution: {
    icon: Wrench,
    label: 'Tool',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  security_alert: {
    icon: AlertTriangle,
    label: 'Alert',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
  data_access: {
    icon: Database,
    label: 'Data',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
  config_change: {
    icon: Settings,
    label: 'Config',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
};

// Outcome configuration
const OUTCOME_CONFIG: Record<
  AuditOutcome,
  { icon: React.ElementType; label: string; dotColor: string; textColor: string; bgColor: string }
> = {
  success: {
    icon: CheckCircle2,
    label: 'Success',
    dotColor: 'bg-emerald-500',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-500/10',
  },
  failure: {
    icon: XCircle,
    label: 'Failed',
    dotColor: 'bg-red-500',
    textColor: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-500/10',
  },
  denied: {
    icon: ShieldAlert,
    label: 'Denied',
    dotColor: 'bg-amber-500',
    textColor: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-500/10',
  },
};

// Actor type icons
const ACTOR_ICONS: Record<AuditActorType, React.ElementType> = {
  user: User,
  ai_assistant: Bot,
  webhook: Globe,
  system: Cpu,
};

/** Format relative time */
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

export const AuditEventRow: React.FC<AuditEventRowProps> = ({ event }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const eventConfig = EVENT_TYPE_CONFIG[event.eventType] || EVENT_TYPE_CONFIG.security_alert;
  const outcomeConfig = OUTCOME_CONFIG[event.outcome];
  const ActorIcon = ACTOR_ICONS[event.actor.type] || User;
  const EventIcon = eventConfig.icon;
  const OutcomeIcon = outcomeConfig.icon;

  const hasDetails =
    event.details ||
    event.outcomeReason ||
    event.resourceType ||
    event.clientIp ||
    event.actor.sessionId ||
    event.actor.sourceIp;

  const handleCopyId = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      await navigator.clipboard.writeText(event.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    },
    [event.id]
  );

  return (
    <div
      className={cn(
        'group border-l-2 pl-4 py-2 relative',
        'hover:bg-muted/30 transition-colors',
        outcomeConfig.dotColor.replace('bg-', 'border-')
      )}
    >
      {/* Timeline dot */}
      <div
        className={cn('absolute -left-[5px] top-3 w-2 h-2 rounded-full', outcomeConfig.dotColor)}
      />

      {/* Main content */}
      <div
        className={cn('flex items-start gap-3', hasDetails && 'cursor-pointer')}
        onClick={() => hasDetails && setIsExpanded(!isExpanded)}
      >
        {/* Expand indicator */}
        <div className="w-4 h-4 flex items-center justify-center shrink-0 mt-0.5">
          {hasDetails ? (
            isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            )
          ) : (
            <div className="w-3.5" />
          )}
        </div>

        {/* Event type badge */}
        <div
          className={cn(
            'flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0',
            eventConfig.bgColor,
            eventConfig.color
          )}
        >
          <EventIcon className="w-3 h-3" />
          <span className="hidden sm:inline">{eventConfig.label}</span>
        </div>

        {/* Actor */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          <ActorIcon className="w-3 h-3" />
        </div>

        {/* Action */}
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-foreground truncate block">{event.action}</span>
          {event.resourceName && (
            <span className="text-xs text-muted-foreground truncate block">
              {event.resourceType}: {event.resourceName}
            </span>
          )}
        </div>

        {/* Outcome badge */}
        <div
          className={cn(
            'flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0',
            outcomeConfig.bgColor,
            outcomeConfig.textColor
          )}
        >
          <OutcomeIcon className="w-3 h-3" />
          <span className="hidden sm:inline">{outcomeConfig.label}</span>
        </div>

        {/* Time */}
        <span className="text-xs text-muted-foreground shrink-0">
          {formatRelativeTime(event.timestamp)}
        </span>
      </div>

      {/* Expanded details */}
      {isExpanded && hasDetails && (
        <div className="mt-3 ml-4 space-y-3 text-xs">
          {/* Event ID */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground font-medium">Event ID:</span>
            <code className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono text-[10px]">
              {event.id.slice(0, 8)}...
            </code>
            <button
              onClick={handleCopyId}
              className="p-1 rounded hover:bg-muted transition-colors"
            >
              {copied ? (
                <Check className="w-3 h-3 text-emerald-500" />
              ) : (
                <Copy className="w-3 h-3 text-muted-foreground" />
              )}
            </button>
          </div>

          {/* Resource info */}
          {event.resourceType && (
            <div>
              <span className="text-muted-foreground font-medium">Resource:</span>
              <span className="ml-2 text-foreground">
                {event.resourceType}
                {event.resourceId && ` (${event.resourceId})`}
              </span>
            </div>
          )}

          {/* Outcome reason */}
          {event.outcomeReason && (
            <div>
              <span className="text-muted-foreground font-medium">Reason:</span>
              <span className="ml-2 text-foreground">{event.outcomeReason}</span>
            </div>
          )}

          {/* Actor details */}
          <div className="p-2 rounded bg-muted/50 space-y-1">
            <div className="text-muted-foreground font-medium">Actor Details</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <div>
                <span className="text-muted-foreground">Type:</span>{' '}
                <span className="text-foreground capitalize">
                  {event.actor.type.replace('_', ' ')}
                </span>
              </div>
              {event.actor.sessionId && (
                <div>
                  <span className="text-muted-foreground">Session:</span>{' '}
                  <code className="text-foreground font-mono text-[10px]">
                    {event.actor.sessionId.slice(0, 8)}...
                  </code>
                </div>
              )}
              {event.actor.sourceIp && (
                <div>
                  <span className="text-muted-foreground">Source IP:</span>{' '}
                  <span className="text-foreground">{event.actor.sourceIp}</span>
                </div>
              )}
              {event.clientIp && (
                <div>
                  <span className="text-muted-foreground">Client IP:</span>{' '}
                  <span className="text-foreground">{event.clientIp}</span>
                </div>
              )}
            </div>
          </div>

          {/* Additional details */}
          {event.details && Object.keys(event.details).length > 0 && (
            <div>
              <span className="text-muted-foreground font-medium">Details:</span>
              <pre className="mt-1 p-2 rounded bg-muted/50 overflow-x-auto max-h-32 text-[11px]">
                {JSON.stringify(event.details, null, 2)}
              </pre>
            </div>
          )}

          {/* Full timestamp */}
          <div className="text-muted-foreground">
            <span className="font-medium">Time:</span>{' '}
            <span>{new Date(event.timestamp).toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
};
