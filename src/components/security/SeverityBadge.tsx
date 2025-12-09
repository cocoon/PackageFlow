/**
 * Severity Badge Component
 * Visual indicator for vulnerability severity levels
 * @see specs/005-package-security-audit/spec.md
 */

import { AlertTriangle, AlertCircle, Info, AlertOctagon, ShieldAlert } from 'lucide-react';
import type { VulnSeverity } from '../../types/security';
import { cn } from '../../lib/utils';

interface SeverityBadgeProps {
  /** Severity level to display */
  severity: VulnSeverity;
  /** Show icon alongside text */
  showIcon?: boolean;
  /** Compact display mode (icon only) */
  compact?: boolean;
  /** Optional count to display */
  count?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Configuration for each severity level
 */
const severityConfig: Record<
  VulnSeverity,
  {
    label: string;
    bgColor: string;
    textColor: string;
    borderColor: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  critical: {
    label: 'Critical',
    bgColor: 'bg-red-500/20',
    textColor: 'text-red-400',
    borderColor: 'border-red-500/30',
    icon: AlertOctagon,
  },
  high: {
    label: 'High',
    bgColor: 'bg-orange-500/20',
    textColor: 'text-orange-400',
    borderColor: 'border-orange-500/30',
    icon: AlertTriangle,
  },
  moderate: {
    label: 'Moderate',
    bgColor: 'bg-yellow-500/20',
    textColor: 'text-yellow-400',
    borderColor: 'border-yellow-500/30',
    icon: AlertCircle,
  },
  low: {
    label: 'Low',
    bgColor: 'bg-blue-500/20',
    textColor: 'text-blue-400',
    borderColor: 'border-blue-500/30',
    icon: ShieldAlert,
  },
  info: {
    label: 'Info',
    bgColor: 'bg-muted',
    textColor: 'text-muted-foreground',
    borderColor: 'border-muted',
    icon: Info,
  },
};

/**
 * Display a severity badge with configurable appearance
 */
export function SeverityBadge({
  severity,
  showIcon = true,
  compact = false,
  count,
  className,
}: SeverityBadgeProps) {
  const config = severityConfig[severity];
  const Icon = config.icon;

  if (compact) {
    return (
      <span
        className={cn(
          'inline-flex items-center justify-center',
          'w-5 h-5 rounded-full',
          config.bgColor,
          config.textColor,
          className
        )}
        title={config.label}
        role="status"
        aria-label={`Severity: ${config.label}`}
      >
        <Icon className="w-3 h-3" aria-hidden="true" />
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5',
        'rounded text-xs font-medium',
        config.bgColor,
        config.textColor,
        className
      )}
      role="status"
      aria-label={
        count !== undefined
          ? `${count} ${config.label} severity vulnerabilities`
          : `Severity: ${config.label}`
      }
    >
      {showIcon && <Icon className="w-3 h-3" aria-hidden="true" />}
      <span>{config.label}</span>
      {count !== undefined && (
        <span className="ml-0.5 font-bold">({count})</span>
      )}
    </span>
  );
}

/**
 * Inline severity indicator - smaller dot-style indicator
 */
interface SeverityDotProps {
  severity: VulnSeverity;
  className?: string;
}

export function SeverityDot({ severity, className }: SeverityDotProps) {
  const config = severityConfig[severity];

  const dotColorMap: Record<VulnSeverity, string> = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    moderate: 'bg-yellow-500',
    low: 'bg-blue-500',
    info: 'bg-muted-foreground',
  };

  return (
    <span
      className={cn(
        'inline-block w-2 h-2 rounded-full',
        dotColorMap[severity],
        className
      )}
      title={config.label}
      role="status"
      aria-label={`Severity: ${config.label}`}
    />
  );
}

/**
 * Summary bar showing counts for each severity level
 */
interface SeveritySummaryBarProps {
  critical: number;
  high: number;
  moderate: number;
  low: number;
  info?: number;
  /** Show only non-zero counts */
  hideZero?: boolean;
  /** Compact display */
  compact?: boolean;
  className?: string;
}

export function SeveritySummaryBar({
  critical,
  high,
  moderate,
  low,
  info = 0,
  hideZero = false,
  compact = false,
  className,
}: SeveritySummaryBarProps) {
  const items: { severity: VulnSeverity; count: number }[] = [
    { severity: 'critical', count: critical },
    { severity: 'high', count: high },
    { severity: 'moderate', count: moderate },
    { severity: 'low', count: low },
    { severity: 'info', count: info },
  ];

  const visibleItems = hideZero ? items.filter((item) => item.count > 0) : items;

  if (visibleItems.length === 0) {
    return (
      <span className={cn('text-sm text-muted-foreground', className)}>
        No vulnerabilities
      </span>
    );
  }

  if (compact) {
    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        {visibleItems.map(({ severity, count }) => {
          const config = severityConfig[severity];
          return (
            <span
              key={severity}
              className={cn(
                'flex items-center gap-0.5 text-xs',
                config.textColor
              )}
              title={`${count} ${config.label}`}
            >
              <SeverityDot severity={severity} />
              <span>{count}</span>
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={cn('flex flex-wrap items-center gap-2', className)}
      role="group"
      aria-label="Vulnerability summary by severity"
    >
      {visibleItems.map(({ severity, count }) => (
        <SeverityBadge
          key={severity}
          severity={severity}
          count={count}
          showIcon={true}
        />
      ))}
    </div>
  );
}

/**
 * Risk level indicator based on vulnerability counts
 */
interface RiskLevelIndicatorProps {
  critical: number;
  high: number;
  className?: string;
}

export function RiskLevelIndicator({
  critical,
  high,
  className,
}: RiskLevelIndicatorProps) {
  let riskLevel: 'critical' | 'high' | 'moderate' | 'low';
  let label: string;

  if (critical > 0) {
    riskLevel = 'critical';
    label = 'Critical Risk';
  } else if (high > 0) {
    riskLevel = 'high';
    label = 'High Risk';
  } else if (critical === 0 && high === 0) {
    riskLevel = 'low';
    label = 'Low Risk';
  } else {
    riskLevel = 'moderate';
    label = 'Moderate Risk';
  }

  const config = severityConfig[riskLevel];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded',
        config.bgColor,
        config.textColor,
        'border',
        config.borderColor,
        className
      )}
      role="status"
      aria-label={label}
    >
      <Icon className="w-4 h-4" aria-hidden="true" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}
