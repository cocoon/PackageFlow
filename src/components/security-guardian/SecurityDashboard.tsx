// Security Dashboard
// Main dashboard component for security insights and risk analysis

import { useEffect, useState } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Package,
  AlertCircle,
  TrendingUp,
  Clock,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import type {
  ProjectSecurityOverview,
  OverallRiskLevel,
  DependencyHealth,
  FrequentUpdater,
  TyposquattingAlertInfo,
} from '../../types/snapshot';
import { useSecurityInsights } from '../../hooks/useSecurityInsights';

interface Props {
  projectPath: string;
  onNavigateToSnapshot?: (snapshotId: string) => void;
}

const RISK_LEVEL_CONFIG: Record<
  OverallRiskLevel,
  { color: string; bgColor: string; borderColor: string; label: string }
> = {
  low: {
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    label: 'Low Risk',
  },
  medium: {
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    label: 'Medium Risk',
  },
  high: {
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    label: 'High Risk',
  },
  critical: {
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    label: 'Critical Risk',
  },
};

export function SecurityDashboard({ projectPath, onNavigateToSnapshot }: Props) {
  const { isLoading, overview, error, loadOverview, refresh } = useSecurityInsights();

  useEffect(() => {
    if (projectPath) {
      loadOverview(projectPath);
    }
  }, [projectPath, loadOverview]);

  if (isLoading && !overview) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-cyan-400 animate-spin mb-4" />
        <p className="text-zinc-400">Loading security insights...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-red-400" />
          <div>
            <p className="font-medium text-red-300">Failed to Load Security Insights</p>
            <p className="text-sm text-zinc-400 mt-1">{error}</p>
          </div>
        </div>
        <button
          onClick={() => refresh(projectPath)}
          className="mt-4 px-4 py-2 text-sm bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="text-center py-12 text-zinc-400">
        <Shield className="h-12 w-12 mx-auto mb-4 text-zinc-600" />
        <p>No security data available.</p>
        <p className="text-sm text-zinc-500 mt-1">
          Run a workflow to capture security snapshots.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
          <Shield className="h-5 w-5 text-cyan-400" />
          Security Dashboard
        </h2>
        <button
          onClick={() => refresh(projectPath)}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Risk Score Card */}
      <RiskScoreCard overview={overview} />

      {/* Insight Summary */}
      <InsightSummaryCard overview={overview} />

      {/* Typosquatting Alerts */}
      {overview.typosquattingAlerts.length > 0 && (
        <TyposquattingAlertsList
          alerts={overview.typosquattingAlerts}
          onNavigateToSnapshot={onNavigateToSnapshot}
        />
      )}

      {/* Frequent Updaters */}
      {overview.frequentUpdaters.length > 0 && (
        <FrequentUpdatersList updaters={overview.frequentUpdaters} />
      )}

      {/* Dependency Health */}
      {overview.dependencyHealth.length > 0 && (
        <DependencyHealthList dependencies={overview.dependencyHealth} />
      )}
    </div>
  );
}

// Sub-components

function RiskScoreCard({ overview }: { overview: ProjectSecurityOverview }) {
  const riskConfig = RISK_LEVEL_CONFIG[overview.riskLevel];
  const RiskIcon = overview.riskScore < 50 ? ShieldCheck : ShieldAlert;

  return (
    <div className={`rounded-xl border ${riskConfig.borderColor} ${riskConfig.bgColor} p-6`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-full ${riskConfig.bgColor}`}>
            <RiskIcon className={`h-8 w-8 ${riskConfig.color}`} />
          </div>
          <div>
            <div className="flex items-baseline gap-3">
              <span className={`text-4xl font-bold ${riskConfig.color}`}>
                {overview.riskScore}
              </span>
              <span className="text-zinc-400">/100</span>
            </div>
            <p className={`text-sm font-medium ${riskConfig.color}`}>{riskConfig.label}</p>
          </div>
        </div>
        <div className="text-right text-sm text-zinc-400">
          <p>{overview.totalSnapshots} snapshots analyzed</p>
          {overview.latestSnapshotDate && (
            <p className="flex items-center justify-end gap-1 mt-1">
              <Clock className="h-3 w-3" />
              {new Date(overview.latestSnapshotDate).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {/* Risk Gauge */}
      <div className="mt-6">
        <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              overview.riskScore < 26
                ? 'bg-green-500'
                : overview.riskScore < 51
                ? 'bg-yellow-500'
                : overview.riskScore < 76
                ? 'bg-orange-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${overview.riskScore}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-zinc-500">
          <span>Low</span>
          <span>Medium</span>
          <span>High</span>
          <span>Critical</span>
        </div>
      </div>
    </div>
  );
}

function InsightSummaryCard({ overview }: { overview: ProjectSecurityOverview }) {
  const { insightSummary } = overview;

  const items = [
    { label: 'Critical', count: insightSummary.critical, color: 'text-red-400', bgColor: 'bg-red-500/10' },
    { label: 'High', count: insightSummary.high, color: 'text-orange-400', bgColor: 'bg-orange-500/10' },
    { label: 'Medium', count: insightSummary.medium, color: 'text-yellow-400', bgColor: 'bg-yellow-500/10' },
    { label: 'Low', count: insightSummary.low, color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
    { label: 'Info', count: insightSummary.info, color: 'text-zinc-400', bgColor: 'bg-zinc-500/10' },
  ];

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
      <h3 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-zinc-400" />
        Insight Summary ({insightSummary.total} total)
      </h3>
      <div className="grid grid-cols-5 gap-2">
        {items.map((item) => (
          <div key={item.label} className={`rounded-lg ${item.bgColor} p-3 text-center`}>
            <div className={`text-2xl font-bold ${item.color}`}>{item.count}</div>
            <div className="text-xs text-zinc-400">{item.label}</div>
          </div>
        ))}
      </div>
      {insightSummary.dismissed > 0 && (
        <p className="text-xs text-zinc-500 mt-2">
          {insightSummary.dismissed} dismissed
        </p>
      )}
    </div>
  );
}

function TyposquattingAlertsList({
  alerts,
  onNavigateToSnapshot,
}: {
  alerts: TyposquattingAlertInfo[];
  onNavigateToSnapshot?: (snapshotId: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-lg border border-red-500/30 bg-red-500/5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-red-500/10 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-red-400" />
          <span className="font-medium text-red-300">
            Typosquatting Alerts ({alerts.length})
          </span>
        </div>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-zinc-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-zinc-400" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-red-500/20 divide-y divide-red-500/10">
          {alerts.map((alert, idx) => (
            <div key={idx} className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-zinc-200">{alert.packageName}</p>
                <p className="text-sm text-zinc-400">
                  Similar to:{' '}
                  <span className="text-red-300 font-medium">{alert.similarTo}</span>
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  First seen: {new Date(alert.firstSeen).toLocaleDateString()}
                </p>
              </div>
              {onNavigateToSnapshot && (
                <button
                  onClick={() => onNavigateToSnapshot(alert.snapshotId)}
                  className="text-xs text-zinc-400 hover:text-cyan-400 flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  View
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FrequentUpdatersList({ updaters }: { updaters: FrequentUpdater[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-yellow-400" />
          <span className="font-medium text-zinc-300">
            Frequent Updaters ({updaters.length})
          </span>
        </div>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-zinc-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-zinc-400" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-zinc-700 px-4 py-3 space-y-3">
          {updaters.map((updater, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-zinc-200">{updater.packageName}</p>
                <p className="text-xs text-zinc-500">
                  {updater.updateCount} versions in {updater.timeSpanDays} days
                </p>
              </div>
              <div className="flex flex-wrap gap-1 max-w-xs">
                {updater.versions.slice(0, 3).map((v, i) => (
                  <span
                    key={i}
                    className="text-xs px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300"
                  >
                    {v}
                  </span>
                ))}
                {updater.versions.length > 3 && (
                  <span className="text-xs text-zinc-500">
                    +{updater.versions.length - 3}
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

function DependencyHealthList({ dependencies }: { dependencies: DependencyHealth[] }) {
  const [expanded, setExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const displayDeps = showAll ? dependencies : dependencies.slice(0, 10);

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-cyan-400" />
          <span className="font-medium text-zinc-300">
            Dependency Health ({dependencies.length})
          </span>
        </div>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-zinc-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-zinc-400" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-zinc-700">
          <div className="divide-y divide-zinc-700/50">
            {displayDeps.map((dep, idx) => (
              <DependencyHealthRow key={idx} dependency={dep} />
            ))}
          </div>
          {dependencies.length > 10 && (
            <div className="px-4 py-2 border-t border-zinc-700">
              <button
                onClick={() => setShowAll(!showAll)}
                className="text-sm text-cyan-400 hover:text-cyan-300"
              >
                {showAll ? 'Show less' : `Show all ${dependencies.length} dependencies`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DependencyHealthRow({ dependency }: { dependency: DependencyHealth }) {
  const [showFactors, setShowFactors] = useState(false);

  const scoreColor =
    dependency.healthScore >= 80
      ? 'text-green-400'
      : dependency.healthScore >= 60
      ? 'text-yellow-400'
      : dependency.healthScore >= 40
      ? 'text-orange-400'
      : 'text-red-400';

  return (
    <div className="px-4 py-2">
      <button
        onClick={() => setShowFactors(!showFactors)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <div className={`text-sm font-bold ${scoreColor}`}>
            {dependency.healthScore}
          </div>
          <div>
            <p className="text-sm text-zinc-200">{dependency.packageName}</p>
            <p className="text-xs text-zinc-500">v{dependency.version}</p>
          </div>
        </div>
        {showFactors ? (
          <ChevronDown className="h-3 w-3 text-zinc-500" />
        ) : (
          <ChevronRight className="h-3 w-3 text-zinc-500" />
        )}
      </button>

      {showFactors && (
        <div className="mt-2 ml-10 space-y-1">
          {dependency.factors.map((factor, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">{factor.name}</span>
              <div className="flex items-center gap-2">
                <div className="w-20 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      factor.score === factor.maxScore ? 'bg-green-500' : 'bg-orange-500'
                    }`}
                    style={{ width: `${(factor.score / factor.maxScore) * 100}%` }}
                  />
                </div>
                <span className="text-zinc-500">
                  {factor.score}/{factor.maxScore}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SecurityDashboard;
