// Security Badge Component
// Displays security score and insight counts

import { Shield, ShieldAlert, ShieldCheck, AlertTriangle, Info } from 'lucide-react';
import type { InsightSummary } from '../../types/snapshot';
import { cn } from '../../lib/utils';

interface SecurityBadgeProps {
  score?: number | null;
  summary?: InsightSummary | null;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function SecurityBadge({
  score,
  summary,
  size = 'md',
  showLabel = true,
  className,
}: SecurityBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs gap-1',
    md: 'text-sm gap-1.5',
    lg: 'text-base gap-2',
  };

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 20,
  };

  const getScoreColor = (s: number) => {
    if (s >= 80) return 'text-green-500 dark:text-green-400';
    if (s >= 60) return 'text-yellow-500 dark:text-yellow-400';
    if (s >= 40) return 'text-orange-500 dark:text-orange-400';
    return 'text-red-500 dark:text-red-400';
  };

  const getScoreIcon = (s: number) => {
    if (s >= 80) return ShieldCheck;
    if (s >= 60) return Shield;
    return ShieldAlert;
  };

  const renderScore = () => {
    if (score === null || score === undefined) {
      return (
        <span className="text-gray-400 dark:text-gray-500 flex items-center gap-1">
          <Shield size={iconSizes[size]} />
          {showLabel && <span>N/A</span>}
        </span>
      );
    }

    const Icon = getScoreIcon(score);
    const colorClass = getScoreColor(score);

    return (
      <span className={cn('flex items-center', colorClass, sizeClasses[size])}>
        <Icon size={iconSizes[size]} />
        {showLabel && <span>{score}</span>}
      </span>
    );
  };

  const renderSummary = () => {
    if (!summary) return null;

    const { critical, high, medium, low, info } = summary;
    const hasIssues = critical > 0 || high > 0 || medium > 0;

    if (!hasIssues && low === 0 && info === 0) {
      return null;
    }

    return (
      <div className={cn('flex items-center', sizeClasses[size])}>
        {critical > 0 && (
          <span className="flex items-center text-red-500 dark:text-red-400">
            <AlertTriangle size={iconSizes[size]} />
            <span className="ml-0.5">{critical}</span>
          </span>
        )}
        {high > 0 && (
          <span className="flex items-center text-orange-500 dark:text-orange-400 ml-2">
            <ShieldAlert size={iconSizes[size]} />
            <span className="ml-0.5">{high}</span>
          </span>
        )}
        {medium > 0 && (
          <span className="flex items-center text-yellow-500 dark:text-yellow-400 ml-2">
            <Shield size={iconSizes[size]} />
            <span className="ml-0.5">{medium}</span>
          </span>
        )}
        {(low > 0 || info > 0) && (
          <span className="flex items-center text-gray-400 dark:text-gray-500 ml-2">
            <Info size={iconSizes[size]} />
            <span className="ml-0.5">{low + info}</span>
          </span>
        )}
      </div>
    );
  };

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {renderScore()}
      {renderSummary()}
    </div>
  );
}

// Severity badge for individual insights
interface SeverityBadgeProps {
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  className?: string;
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const colors = {
    info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium uppercase',
        colors[severity],
        className
      )}
    >
      {severity}
    </span>
  );
}
