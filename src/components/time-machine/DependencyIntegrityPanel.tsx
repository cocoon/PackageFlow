// Dependency Integrity Panel
// Displays results of dependency integrity checks against reference snapshot

import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Package,
  Plus,
  Minus,
  RefreshCw,
  Clock,
  Hash,
  FileCode,
} from 'lucide-react';
import type {
  IntegrityCheckResult,
  DependencyChange,
  PostinstallAlert,
  PatternAlert,
  RiskLevel,
} from '../../types/snapshot';

interface Props {
  result: IntegrityCheckResult;
  onClose?: () => void;
}

const RISK_LEVEL_CONFIG: Record<
  RiskLevel,
  { color: string; bgColor: string; borderColor: string; icon: React.ComponentType<{ className?: string }> }
> = {
  none: {
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    icon: ShieldCheck,
  },
  low: {
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    icon: ShieldCheck,
  },
  medium: {
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    icon: AlertTriangle,
  },
  high: {
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    icon: ShieldAlert,
  },
  critical: {
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    icon: ShieldAlert,
  },
};

export function DependencyIntegrityPanel({ result, onClose }: Props) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['summary', 'typosquatting', 'postinstall'])
  );

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const riskConfig = RISK_LEVEL_CONFIG[result.summary.riskLevel];
  const RiskIcon = riskConfig.icon;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString();
  };

  const truncateHash = (hash?: string) => {
    if (!hash) return 'N/A';
    return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
  };

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <div
        className={`rounded-lg border ${riskConfig.borderColor} ${riskConfig.bgColor} p-4`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <RiskIcon className={`h-6 w-6 ${riskConfig.color}`} />
            <div>
              <h3 className={`font-semibold ${riskConfig.color}`}>
                {result.hasDrift ? 'Dependency Drift Detected' : 'No Drift Detected'}
              </h3>
              <p className="text-sm text-zinc-400">
                Risk Level: <span className={`font-medium ${riskConfig.color}`}>{result.summary.riskLevel.toUpperCase()}</span>
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              &times;
            </button>
          )}
        </div>
      </div>

      {/* Reference Info */}
      {result.referenceSnapshotId && (
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-zinc-400" />
            <span className="text-sm font-medium text-zinc-300">Reference Snapshot</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-zinc-500">Snapshot ID:</span>
              <span className="ml-2 text-zinc-300 font-mono">{result.referenceSnapshotId.slice(0, 8)}</span>
            </div>
            <div>
              <span className="text-zinc-500">Date:</span>
              <span className="ml-2 text-zinc-300">{formatDate(result.referenceSnapshotDate)}</span>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-zinc-400" />
              <span className="text-zinc-500">Lockfile:</span>
              <span className={result.lockfileMatches ? 'text-green-400' : 'text-orange-400'}>
                {result.lockfileMatches ? 'Matches' : 'Changed'}
              </span>
            </div>
            {!result.lockfileMatches && (
              <span className="text-zinc-500 text-xs font-mono">
                {truncateHash(result.referenceLockfileHash)} → {truncateHash(result.currentLockfileHash)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <SectionHeader
        title="Change Summary"
        expanded={expandedSections.has('summary')}
        onToggle={() => toggleSection('summary')}
        badge={String(result.summary.totalChanges)}
        badgeColor={result.summary.totalChanges > 0 ? 'bg-blue-500' : 'bg-zinc-600'}
      />
      {expandedSections.has('summary') && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            icon={Plus}
            label="Added"
            value={result.summary.addedCount}
            color="text-green-400"
          />
          <StatCard
            icon={Minus}
            label="Removed"
            value={result.summary.removedCount}
            color="text-red-400"
          />
          <StatCard
            icon={RefreshCw}
            label="Updated"
            value={result.summary.updatedCount}
            color="text-blue-400"
          />
        </div>
      )}

      {/* Typosquatting Alerts */}
      {result.typosquattingAlerts.length > 0 && (
        <>
          <SectionHeader
            title="Typosquatting Suspects"
            expanded={expandedSections.has('typosquatting')}
            onToggle={() => toggleSection('typosquatting')}
            badge={String(result.typosquattingAlerts.length)}
            badgeColor="bg-red-500"
          />
          {expandedSections.has('typosquatting') && (
            <div className="space-y-2">
              {result.typosquattingAlerts.map((alert, idx) => (
                <TyposquattingAlertCard key={idx} alert={alert} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Postinstall Alerts */}
      {result.postinstallAlerts.length > 0 && (
        <>
          <SectionHeader
            title="Postinstall Script Changes"
            expanded={expandedSections.has('postinstall')}
            onToggle={() => toggleSection('postinstall')}
            badge={String(result.postinstallAlerts.length)}
            badgeColor="bg-orange-500"
          />
          {expandedSections.has('postinstall') && (
            <div className="space-y-2">
              {result.postinstallAlerts.map((alert, idx) => (
                <PostinstallAlertCard key={idx} alert={alert} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Dependency Changes */}
      {result.dependencyChanges.length > 0 && (
        <>
          <SectionHeader
            title="Dependency Changes"
            expanded={expandedSections.has('changes')}
            onToggle={() => toggleSection('changes')}
            badge={String(result.dependencyChanges.length)}
            badgeColor="bg-zinc-500"
          />
          {expandedSections.has('changes') && (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {result.dependencyChanges.map((change, idx) => (
                <DependencyChangeRow key={idx} change={change} />
              ))}
            </div>
          )}
        </>
      )}

      {/* No changes message */}
      {!result.hasDrift && result.typosquattingAlerts.length === 0 && (
        <div className="text-center py-8 text-zinc-400">
          <ShieldCheck className="h-12 w-12 mx-auto mb-3 text-green-400" />
          <p>All dependencies match the reference snapshot.</p>
          <p className="text-sm text-zinc-500 mt-1">No drift detected.</p>
        </div>
      )}
    </div>
  );
}

// Sub-components

interface SectionHeaderProps {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  badge?: string;
  badgeColor?: string;
}

function SectionHeader({ title, expanded, onToggle, badge, badgeColor = 'bg-zinc-600' }: SectionHeaderProps) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between py-2 text-left hover:bg-zinc-800/50 rounded transition-colors"
    >
      <div className="flex items-center gap-2">
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-zinc-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-zinc-400" />
        )}
        <span className="font-medium text-zinc-200">{title}</span>
        {badge && (
          <span className={`text-xs px-2 py-0.5 rounded-full text-white ${badgeColor}`}>
            {badge}
          </span>
        )}
      </div>
    </button>
  );
}

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: string;
}

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-3 text-center">
      <Icon className={`h-5 w-5 mx-auto mb-1 ${color}`} />
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-xs text-zinc-400">{label}</div>
    </div>
  );
}

function TyposquattingAlertCard({ alert }: { alert: PatternAlert }) {
  return (
    <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
      <div className="flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-red-300">{alert.title}</div>
          <p className="text-sm text-zinc-400 mt-1">{alert.description}</p>
          {alert.recommendation && (
            <p className="text-xs text-zinc-500 mt-2 italic">{alert.recommendation}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function PostinstallAlertCard({ alert }: { alert: PostinstallAlert }) {
  const [showScript, setShowScript] = useState(false);

  const changeTypeConfig = {
    added: { color: 'text-green-400', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/30', label: 'Added' },
    removed: { color: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30', label: 'Removed' },
    changed: { color: 'text-orange-400', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30', label: 'Changed' },
    unchanged: { color: 'text-zinc-400', bgColor: 'bg-zinc-500/10', borderColor: 'border-zinc-500/30', label: 'Unchanged' },
  };

  const config = changeTypeConfig[alert.changeType];

  return (
    <div className={`rounded-lg border ${config.borderColor} ${config.bgColor} p-3`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileCode className={`h-4 w-4 ${config.color}`} />
          <span className="font-medium text-zinc-200">{alert.packageName}</span>
          <span className="text-xs text-zinc-500">v{alert.version}</span>
          <span className={`text-xs px-2 py-0.5 rounded ${config.bgColor} ${config.color}`}>
            {config.label}
          </span>
        </div>
        {(alert.newScript || alert.oldScript) && (
          <button
            onClick={() => setShowScript(!showScript)}
            className="text-xs text-zinc-400 hover:text-zinc-200"
          >
            {showScript ? 'Hide' : 'Show'} Script
          </button>
        )}
      </div>
      {showScript && (
        <div className="mt-2 space-y-2">
          {alert.oldScript && (
            <div>
              <span className="text-xs text-zinc-500">Old:</span>
              <pre className="mt-1 text-xs bg-zinc-900 p-2 rounded overflow-x-auto text-red-300 line-through">
                {alert.oldScript}
              </pre>
            </div>
          )}
          {alert.newScript && (
            <div>
              <span className="text-xs text-zinc-500">New:</span>
              <pre className="mt-1 text-xs bg-zinc-900 p-2 rounded overflow-x-auto text-green-300">
                {alert.newScript}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DependencyChangeRow({ change }: { change: DependencyChange }) {
  const changeTypeConfig = {
    added: { icon: Plus, color: 'text-green-400', label: 'Added' },
    removed: { icon: Minus, color: 'text-red-400', label: 'Removed' },
    updated: { icon: RefreshCw, color: 'text-blue-400', label: 'Updated' },
    unchanged: { icon: Package, color: 'text-zinc-400', label: 'Unchanged' },
  };

  const config = changeTypeConfig[change.changeType];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-3 py-1.5 px-2 hover:bg-zinc-800/50 rounded text-sm">
      <Icon className={`h-4 w-4 ${config.color} flex-shrink-0`} />
      <span className="font-medium text-zinc-200 min-w-0 truncate flex-1">{change.name}</span>
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        {change.isDev && (
          <span className="px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300">dev</span>
        )}
        {change.oldVersion && change.newVersion ? (
          <span>
            <span className="text-red-400">{change.oldVersion}</span>
            <span className="mx-1">→</span>
            <span className="text-green-400">{change.newVersion}</span>
          </span>
        ) : change.newVersion ? (
          <span className="text-green-400">{change.newVersion}</span>
        ) : change.oldVersion ? (
          <span className="text-red-400">{change.oldVersion}</span>
        ) : null}
        {change.postinstallChanged && (
          <span className="text-orange-400" title="Postinstall script changed">
            ⚠️
          </span>
        )}
      </div>
    </div>
  );
}

export default DependencyIntegrityPanel;
