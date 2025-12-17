/**
 * Version Badge Component
 * Displays Node.js and package manager version requirements with compatibility status
 * Feature: 006-node-package-manager - US5
 */

import { useEffect, useState } from 'react';
import { Zap, Package, CheckCircle2, AlertTriangle } from 'lucide-react';
import type {
  VersionRequirement,
  VersionCompatibility,
  VersionSource,
  SystemEnvironment,
} from '../../types/version';
import { useVersionCheck } from '../../hooks/useVersionCheck';
import { VoltaInstallPrompt } from './VoltaInstallPrompt';

interface VersionBadgeProps {
  projectPath: string;
  compact?: boolean;
  /** Show Volta install prompt if needed */
  showVoltaPrompt?: boolean;
  /** Key to trigger refresh when changed */
  refreshKey?: number;
}

// Source label mapping
const sourceLabels: Record<VersionSource, string> = {
  volta: 'Volta',
  packageManager: 'packageManager',
  engines: 'engines',
  none: '',
};

export function VersionBadge({
  projectPath,
  compact = false,
  showVoltaPrompt = false,
  refreshKey = 0,
}: VersionBadgeProps) {
  const { loadVersionRequirement, checkCompatibility, loadSystemEnvironment } = useVersionCheck();
  const [requirement, setRequirement] = useState<VersionRequirement | null>(null);
  const [compatibility, setCompatibility] = useState<VersionCompatibility | null>(null);
  const [systemEnv, setSystemEnv] = useState<SystemEnvironment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [voltaPromptDismissed, setVoltaPromptDismissed] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const [req, compat, env] = await Promise.all([
          loadVersionRequirement(projectPath),
          checkCompatibility(projectPath),
          loadSystemEnvironment(),
        ]);

        if (mounted) {
          setRequirement(req);
          setCompatibility(compat);
          setSystemEnv(env);
        }
      } catch (err) {
        console.error('Failed to load version info:', err);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [projectPath, refreshKey, loadVersionRequirement, checkCompatibility, loadSystemEnvironment]);

  // Reset dismissed state when project changes
  useEffect(() => {
    setVoltaPromptDismissed(false);
  }, [projectPath]);

  // Don't show anything while loading or if no requirements
  if (isLoading) {
    return null;
  }

  // No version requirements defined
  if (!requirement || requirement.source === 'none') {
    return null;
  }

  // Check if we should show Volta install prompt
  const needsVoltaPrompt =
    showVoltaPrompt &&
    !voltaPromptDismissed &&
    requirement.source === 'volta' &&
    systemEnv &&
    !systemEnv.volta.available;

  // Show Volta install prompt if needed (before other content)
  if (needsVoltaPrompt) {
    return <VoltaInstallPrompt onDismiss={() => setVoltaPromptDismissed(true)} />;
  }

  const hasNodeRequirement = requirement.node !== null;
  const hasPmRequirement =
    requirement.packageManagerName !== null && requirement.packageManagerVersion !== null;

  // If no actual requirements, don't show anything
  if (!hasNodeRequirement && !hasPmRequirement) {
    return null;
  }

  const nodeCompatible = compatibility?.node.isCompatible ?? true;
  const pmCompatible = compatibility?.packageManager.isCompatible ?? true;
  const isFullyCompatible = nodeCompatible && pmCompatible;

  if (compact) {
    // Compact mode: single badge with overall status
    return (
      <div
        className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${
          isFullyCompatible ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'
        }`}
        title={getTooltipText(requirement, compatibility)}
      >
        {isFullyCompatible ? (
          <CheckCircle2 className="w-3 h-3" />
        ) : (
          <AlertTriangle className="w-3 h-3" />
        )}
        <span>{sourceLabels[requirement.source]}</span>
      </div>
    );
  }

  // Get source label for each badge
  const nodeSource = requirement.nodeSource || requirement.source;
  const pmSource = requirement.packageManagerSource || requirement.source;

  // Full mode: detailed badges with individual source indicators
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Node.js badge */}
      {hasNodeRequirement && (
        <div
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs ${
            nodeCompatible
              ? 'bg-green-500/10 border border-green-500/20 text-green-400'
              : 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400'
          }`}
          title={
            nodeCompatible
              ? `Node.js ${requirement.node} (compatible, via ${sourceLabels[nodeSource]})`
              : `Node.js ${requirement.node} required (via ${sourceLabels[nodeSource]}), current: ${compatibility?.node.current || 'unknown'}`
          }
        >
          <Zap className="w-3 h-3" />
          <span>Node {requirement.node}</span>
          <span className="text-[10px] opacity-60">({sourceLabels[nodeSource]})</span>
          {nodeCompatible ? (
            <CheckCircle2 className="w-3 h-3" />
          ) : (
            <AlertTriangle className="w-3 h-3" />
          )}
        </div>
      )}

      {/* Package manager badge */}
      {hasPmRequirement && (
        <div
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs ${
            pmCompatible
              ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
              : 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400'
          }`}
          title={
            pmCompatible
              ? `${requirement.packageManagerName} ${requirement.packageManagerVersion} (compatible, via ${sourceLabels[pmSource]})`
              : `${requirement.packageManagerName} ${requirement.packageManagerVersion} required (via ${sourceLabels[pmSource]}), current: ${compatibility?.packageManager.current || 'unknown'}`
          }
        >
          <Package className="w-3 h-3" />
          <span>
            {requirement.packageManagerName} {requirement.packageManagerVersion}
          </span>
          <span className="text-[10px] opacity-60">({sourceLabels[pmSource]})</span>
          {pmCompatible ? (
            <CheckCircle2 className="w-3 h-3" />
          ) : (
            <AlertTriangle className="w-3 h-3" />
          )}
        </div>
      )}
    </div>
  );
}

function getTooltipText(
  requirement: VersionRequirement,
  compatibility: VersionCompatibility | null
): string {
  const parts: string[] = [];

  if (requirement.node) {
    const nodeCompat = compatibility?.node;
    if (nodeCompat?.isCompatible) {
      parts.push(`Node ${requirement.node} ✓`);
    } else {
      parts.push(`Node ${requirement.node} (current: ${nodeCompat?.current || '?'})`);
    }
  }

  if (requirement.packageManagerName && requirement.packageManagerVersion) {
    const pmCompat = compatibility?.packageManager;
    if (pmCompat?.isCompatible) {
      parts.push(`${requirement.packageManagerName} ${requirement.packageManagerVersion} ✓`);
    } else {
      parts.push(
        `${requirement.packageManagerName} ${requirement.packageManagerVersion} (current: ${pmCompat?.current || '?'})`
      );
    }
  }

  return parts.join('\n');
}
