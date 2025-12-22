/**
 * AuditStatsCard - Displays aggregated audit statistics
 * Shows event counts by type, outcome, and actor
 */

import React from 'react';
import {
  Shield,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  User,
  Bot,
  Globe,
  Cpu,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { AuditStats } from '../../../types/audit';

interface AuditStatsCardProps {
  stats: AuditStats | null;
  isLoading: boolean;
  className?: string;
}

const OUTCOME_CONFIG = {
  success: {
    icon: CheckCircle2,
    label: 'Success',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
  failure: {
    icon: XCircle,
    label: 'Failure',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
  denied: {
    icon: ShieldAlert,
    label: 'Denied',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
} as const;

const ACTOR_CONFIG = {
  user: { icon: User, label: 'User' },
  ai_assistant: { icon: Bot, label: 'AI Assistant' },
  webhook: { icon: Globe, label: 'Webhook' },
  system: { icon: Cpu, label: 'System' },
} as const;

export const AuditStatsCard: React.FC<AuditStatsCardProps> = ({
  stats,
  isLoading,
  className,
}) => {
  if (isLoading) {
    return (
      <div className={cn('grid grid-cols-2 gap-3', className)}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 rounded-lg bg-muted/50 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Total Events */}
      <div
        className={cn(
          'p-4 rounded-lg border',
          'bg-gradient-to-r from-blue-500/5 via-transparent to-transparent',
          'border-blue-500/20'
        )}
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-500/10">
            <Shield className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground tabular-nums">
              {stats.totalEvents.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Total Events</div>
          </div>
        </div>
      </div>

      {/* Outcome Breakdown */}
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(OUTCOME_CONFIG) as Array<keyof typeof OUTCOME_CONFIG>).map((outcome) => {
          const config = OUTCOME_CONFIG[outcome];
          const count = stats.byOutcome[outcome] || 0;
          const Icon = config.icon;

          return (
            <div
              key={outcome}
              className={cn('p-3 rounded-lg border border-border', 'bg-card/50')}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={cn('p-1.5 rounded', config.bgColor)}>
                  <Icon className={cn('w-3.5 h-3.5', config.color)} />
                </div>
                <span className="text-xs text-muted-foreground">{config.label}</span>
              </div>
              <div className="text-lg font-semibold text-foreground tabular-nums">
                {count.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Actor Breakdown */}
      <div className="p-3 rounded-lg border border-border bg-card/30">
        <div className="text-xs font-medium text-muted-foreground mb-2">By Actor</div>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(ACTOR_CONFIG) as Array<keyof typeof ACTOR_CONFIG>).map((actor) => {
            const config = ACTOR_CONFIG[actor];
            const count = stats.byActor[actor] || 0;
            const Icon = config.icon;

            return (
              <div key={actor} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-foreground">{config.label}</span>
                </div>
                <span className="text-xs font-medium text-muted-foreground tabular-nums">
                  {count.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
