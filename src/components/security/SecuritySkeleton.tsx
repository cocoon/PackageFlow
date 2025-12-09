/**
 * Security Skeleton Components
 * Loading placeholder UI for security-related components
 * @see specs/005-package-security-audit/spec.md
 */

import { Skeleton } from '../ui/Skeleton';
import { cn } from '../../lib/utils';

interface SkeletonProps {
  className?: string;
}

/**
 * Skeleton for SeverityBadge
 */
export function SeverityBadgeSkeleton({ className }: SkeletonProps) {
  return <Skeleton className={cn('w-20 h-5 rounded', className)} />;
}

/**
 * Skeleton for SeveritySummaryBar
 */
export function SeveritySummaryBarSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Skeleton className="w-20 h-5 rounded" />
      <Skeleton className="w-16 h-5 rounded" />
      <Skeleton className="w-18 h-5 rounded" />
      <Skeleton className="w-14 h-5 rounded" />
    </div>
  );
}

/**
 * Skeleton for VulnerabilityCard (collapsed state)
 */
export function VulnerabilityCardSkeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'p-3 border border-border rounded-lg bg-card',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Severity badges */}
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="w-16 h-5 rounded" />
            <Skeleton className="w-12 h-5 rounded" />
          </div>
          {/* Title */}
          <Skeleton className="w-3/4 h-4 mb-2" />
          {/* Package info */}
          <Skeleton className="w-40 h-3" />
        </div>
        {/* Expand icon */}
        <Skeleton className="w-5 h-5 shrink-0" />
      </div>
    </div>
  );
}

/**
 * Skeleton for VulnerabilityDetail (expanded state)
 */
export function VulnerabilityDetailSkeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'p-4 bg-card rounded-lg border border-border',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="w-20 h-5 rounded" />
            <Skeleton className="w-24 h-5 rounded" />
          </div>
          <Skeleton className="w-2/3 h-5 mb-1" />
        </div>
        <Skeleton className="w-20 h-8 rounded" />
      </div>

      {/* Package info */}
      <div className="flex items-center gap-4 mb-4">
        <Skeleton className="w-32 h-4" />
        <Skeleton className="w-16 h-4" />
      </div>

      {/* Description */}
      <div className="mb-4">
        <Skeleton className="w-20 h-4 mb-2" />
        <Skeleton className="w-full h-3 mb-1" />
        <Skeleton className="w-4/5 h-3 mb-1" />
        <Skeleton className="w-3/4 h-3" />
      </div>

      {/* CVE/CWE */}
      <div className="mb-4">
        <Skeleton className="w-12 h-4 mb-2" />
        <div className="flex gap-2">
          <Skeleton className="w-28 h-6 rounded" />
          <Skeleton className="w-24 h-6 rounded" />
        </div>
      </div>

      {/* Dependency paths */}
      <div className="mb-4">
        <Skeleton className="w-32 h-4 mb-2" />
        <div className="space-y-1">
          <Skeleton className="w-full h-4" />
          <Skeleton className="w-4/5 h-4" />
        </div>
      </div>

      {/* Fix info */}
      <Skeleton className="w-full h-16 rounded" />
    </div>
  );
}

/**
 * Skeleton for VulnerabilityList
 */
interface VulnerabilityListSkeletonProps extends SkeletonProps {
  count?: number;
}

export function VulnerabilityListSkeleton({
  count = 5,
  className,
}: VulnerabilityListSkeletonProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Summary bar */}
      <div className="flex items-center justify-between">
        <SeveritySummaryBarSkeleton />
        <Skeleton className="w-24 h-4" />
      </div>

      {/* Search and filter bar */}
      <div className="flex items-center gap-2">
        <Skeleton className="flex-1 h-10 rounded-lg" />
        <Skeleton className="w-20 h-10 rounded-lg" />
      </div>

      {/* List controls */}
      <div className="flex items-center justify-end gap-2">
        <Skeleton className="w-20 h-4" />
        <Skeleton className="w-2 h-4" />
        <Skeleton className="w-24 h-4" />
      </div>

      {/* Vulnerability cards */}
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, index) => (
          <VulnerabilityCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for SecurityScanCard
 */
export function SecurityScanCardSkeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'p-4 bg-card rounded-lg border border-border',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3">
          <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
          <div>
            <Skeleton className="w-32 h-5 mb-1" />
            <Skeleton className="w-48 h-3" />
          </div>
        </div>
        <Skeleton className="w-16 h-8 rounded-lg" />
      </div>

      {/* Summary */}
      <div className="space-y-3">
        <Skeleton className="w-28 h-8 rounded" />
        <SeveritySummaryBarSkeleton />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
        <Skeleton className="w-36 h-3" />
        <Skeleton className="w-12 h-3" />
      </div>
    </div>
  );
}

/**
 * Skeleton for SecurityScanGrid
 */
interface SecurityScanGridSkeletonProps extends SkeletonProps {
  count?: number;
}

export function SecurityScanGridSkeleton({
  count = 3,
  className,
}: SecurityScanGridSkeletonProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
        className
      )}
    >
      {Array.from({ length: count }).map((_, index) => (
        <SecurityScanCardSkeleton key={index} />
      ))}
    </div>
  );
}

/**
 * Skeleton for SecurityTab main component
 */
export function SecurityScanSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Summary header skeleton */}
      <div className="p-4 bg-card rounded-lg border border-border">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3">
            <Skeleton className="w-12 h-12 rounded-lg shrink-0" />
            <div>
              <Skeleton className="w-48 h-6 mb-2" />
              <Skeleton className="w-40 h-4" />
            </div>
          </div>
          <Skeleton className="w-20 h-9 rounded-lg" />
        </div>
        <div className="space-y-3">
          <Skeleton className="w-32 h-8 rounded" />
          <SeveritySummaryBarSkeleton />
        </div>
      </div>

      {/* Vulnerability list section */}
      <div>
        <Skeleton className="w-28 h-4 mb-3" />
        <VulnerabilityListSkeleton />
      </div>
    </div>
  );
}

/**
 * Compact skeleton for inline security status
 */
export function SecurityStatusSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <Skeleton className="w-4 h-4 rounded" />
      <Skeleton className="w-16 h-3" />
    </div>
  );
}
