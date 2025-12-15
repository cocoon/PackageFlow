// DeployPanel Component
// One-Click Deploy feature (015-one-click-deploy)
// Main panel integrating deployment and history
// Extended: GitHub Pages workflow generation (016-multi-deploy-accounts)
// Enhanced: Deploy UI Enhancement (018-deploy-ui-enhancement)
// Refactored: Left-right layout matching Git Panel style
// Note: Deploy Accounts management moved to app Settings

import { useState, useEffect, useMemo } from 'react';
import { Rocket, LayoutDashboard, History, Settings, AlertCircle, FolderCode, Variable } from 'lucide-react';
import { useDeploy } from '../../../hooks/useDeploy';
import { useDeployAccounts } from '../../../hooks/useDeployAccounts';
import { deployAPI } from '../../../lib/tauri-api';
import { DeployButton } from './DeployButton';
import { DeploymentSettingsDialog } from './DeploymentSettingsDialog';
import { DeploymentHistory } from './DeploymentHistory';
import { GitHubPagesSetupDialog } from './GitHubPagesSetupDialog';
import { DeploymentStatsCard } from './DeploymentStatsCard';
import { DeploymentProgress } from './DeploymentProgress';
import { DeployTargetCard } from './DeployTargetCard';
import { BuildConfigCard } from './BuildConfigCard';
import { EnvVariablesPreview } from './EnvVariablesPreview';
import { ConfigSection } from '../../ui/ConfigSection';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { Button } from '../../ui/Button';
import { cn } from '../../../lib/utils';
import type { DeploymentConfig, PlatformType, GitHubWorkflowResult } from '../../../types/deploy';

// Format platform name for display
const formatPlatformName = (platform: PlatformType): string => {
  switch (platform) {
    case 'github_pages':
      return 'GitHub Pages';
    case 'netlify':
      return 'Netlify';
    case 'cloudflare_pages':
      return 'Cloudflare Pages';
    default:
      return platform;
  }
};

type DeployTab = 'overview' | 'history' | 'settings';

// ============================================================================
// SettingsTabContent Component
// ============================================================================

interface SettingsTabContentProps {
  deploymentConfig: DeploymentConfig | null;
  accounts: import('../../../types/deploy').DeployAccount[];
  onOpenSettings: () => void;
  onUnbind: () => void;
}

function SettingsTabContent({
  deploymentConfig,
  accounts,
  onOpenSettings,
  onUnbind,
}: SettingsTabContentProps) {
  // Get account display name for the bound account
  const accountDisplayName = useMemo(() => {
    if (!deploymentConfig?.accountId) return undefined;
    const account = accounts.find((a) => a.id === deploymentConfig.accountId);
    return account?.displayName || account?.username;
  }, [deploymentConfig?.accountId, accounts]);

  // Get site/project name based on platform
  const getSiteName = () => {
    if (!deploymentConfig) return undefined;
    switch (deploymentConfig.platform) {
      case 'netlify':
        return deploymentConfig.netlifySiteName;
      case 'cloudflare_pages':
        return deploymentConfig.cloudflareProjectName;
      default:
        return undefined;
    }
  };

  // Check if build config has any values
  const hasBuildConfig =
    deploymentConfig &&
    (deploymentConfig.frameworkPreset ||
      deploymentConfig.buildCommand ||
      deploymentConfig.outputDirectory ||
      deploymentConfig.installCommand);

  if (!deploymentConfig) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <Settings className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <h3 className="mt-4 font-medium">No Configuration</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Set up your deployment configuration to get started.
          </p>
          <Button onClick={onOpenSettings} className="mt-4">
            Configure Deploy
          </Button>
        </div>

        {/* Deploy Accounts Info */}
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <h4 className="text-sm font-medium mb-2">Deploy Accounts</h4>
          <p className="text-sm text-muted-foreground">
            Manage your connected deployment accounts in the app settings.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Go to <span className="font-medium">Settings → Deploy Accounts</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section 1: Deployment Target */}
      <ConfigSection
        icon={<Rocket className="h-4 w-4" />}
        iconBgClass="bg-blue-500/10"
        iconColorClass="text-blue-500 dark:text-blue-400"
        title="Deployment Target"
        description="Where your project will be deployed"
        action={
          <Button variant="outline" size="sm" onClick={onOpenSettings}>
            <Settings className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
        }
      >
        <DeployTargetCard
          platform={deploymentConfig.platform}
          environment={deploymentConfig.environment}
          accountName={accountDisplayName}
          siteName={getSiteName()}
          onEdit={onOpenSettings}
          onUnbind={onUnbind}
        />
      </ConfigSection>

      {/* Section 2: Build Configuration */}
      {hasBuildConfig && (
        <ConfigSection
          icon={<FolderCode className="h-4 w-4" />}
          iconBgClass="bg-emerald-500/10"
          iconColorClass="text-emerald-500 dark:text-emerald-400"
          title="Build Configuration"
          description="How your project is built"
        >
          <BuildConfigCard config={deploymentConfig} />
        </ConfigSection>
      )}

      {/* Section 3: Environment Variables */}
      {deploymentConfig.envVariables.length > 0 && (
        <ConfigSection
          icon={<Variable className="h-4 w-4" />}
          iconBgClass="bg-amber-500/10"
          iconColorClass="text-amber-500 dark:text-amber-400"
          title="Environment Variables"
          description={`${deploymentConfig.envVariables.length} variable${deploymentConfig.envVariables.length !== 1 ? 's' : ''} configured`}
        >
          <EnvVariablesPreview variables={deploymentConfig.envVariables} />
        </ConfigSection>
      )}

      {/* Deploy Accounts Info */}
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <h4 className="text-sm font-medium mb-2">Deploy Accounts</h4>
        <p className="text-sm text-muted-foreground">
          Manage your connected deployment accounts in the app settings.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Go to <span className="font-medium">Settings → Deploy Accounts</span>
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// DeployPanel Component
// ============================================================================

interface DeployPanelProps {
  projectId: string;
  projectName: string;
  projectPath: string;
}

export function DeployPanel({ projectId, projectName, projectPath }: DeployPanelProps) {
  const [activeTab, setActiveTab] = useState<DeployTab>('overview');
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  // GitHub Pages workflow generation state
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [isGeneratingWorkflow, setIsGeneratingWorkflow] = useState(false);
  const [workflowResult, setWorkflowResult] = useState<GitHubWorkflowResult | null>(null);
  const [workflowError, setWorkflowError] = useState<string | undefined>(undefined);
  // Quick deploy confirmation dialog
  const [showDeployConfirm, setShowDeployConfirm] = useState(false);
  // Unbind configuration confirmation dialog
  const [showUnbindConfirm, setShowUnbindConfirm] = useState(false);

  const {
    // State
    currentDeployment,
    deploymentHistory,
    isDeploying,
    isLoadingHistory,
    deploymentConfig,
    detectedFramework,
    error,

    // Actions
    deploy,
    loadHistory,
    loadConfig,
    saveConfig,
    deleteConfig,
    detectFramework,
    clearError,
    isPlatformConnected,
  } = useDeploy();

  // Check for connected accounts (016-multi-deploy-accounts)
  const { accounts } = useDeployAccounts();

  // Load config and history on mount
  useEffect(() => {
    loadConfig(projectId);
    loadHistory(projectId);
  }, [projectId, loadConfig, loadHistory]);

  // Listen for keyboard shortcut deploy event
  useEffect(() => {
    const handleShortcutDeploy = () => {
      if (deploymentConfig && !isDeploying && !isGeneratingWorkflow) {
        // Show confirmation dialog before deploying
        setShowDeployConfirm(true);
      }
    };

    window.addEventListener('shortcut-deploy', handleShortcutDeploy);
    return () => window.removeEventListener('shortcut-deploy', handleShortcutDeploy);
  }, [deploymentConfig, isDeploying, isGeneratingWorkflow]);

  // Handle confirmed quick deploy
  const handleConfirmDeploy = () => {
    setShowDeployConfirm(false);
    if (deploymentConfig) {
      if (deploymentConfig.platform === 'github_pages') {
        handleGenerateWorkflow(projectPath, deploymentConfig);
      } else {
        handleDeploy(projectId, projectPath, deploymentConfig);
      }
    }
  };

  // Handle confirmed unbind (remove configuration)
  const handleConfirmUnbind = async () => {
    setShowUnbindConfirm(false);
    await deleteConfig(projectId);
  };

  const handleDeploy = async (_projectId: string, _projectPath: string, config: DeploymentConfig) => {
    await deploy(_projectId, _projectPath, config);
  };

  // Handle GitHub Pages workflow generation
  const handleGenerateWorkflow = async (_projectPath: string, config: DeploymentConfig) => {
    setIsGeneratingWorkflow(true);
    setWorkflowError(undefined);
    setWorkflowResult(null);
    setShowSetupDialog(true);

    try {
      const result = await deployAPI.generateGitHubActionsWorkflow(_projectPath, config);
      setWorkflowResult(result);
    } catch (err) {
      setWorkflowError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsGeneratingWorkflow(false);
    }
  };

  // GitHub Pages is always available, Netlify requires an account
  const hasConnectedPlatform = accounts.length > 0 || true; // GitHub Pages is always available

  // Tab configuration - sidebar navigation items
  const tabs: { id: DeployTab; label: string; description: string; icon: typeof LayoutDashboard; badge?: number }[] = [
    { id: 'overview', label: 'Overview', description: 'Stats & status', icon: LayoutDashboard },
    { id: 'history', label: 'History', description: 'Past deployments', icon: History, badge: deploymentHistory.length || undefined },
    { id: 'settings', label: 'Settings', description: 'Configuration', icon: Settings },
  ];

  return (
    <div className="flex h-full -m-4 -mb-4">
      {/* Left Sidebar Navigation */}
      <div className="w-56 flex-shrink-0 bg-card rounded-lg overflow-hidden m-4 mr-0 self-start">
        <div className="p-3 border-b border-border">
          <h3 className="text-sm font-semibold text-muted-foreground">Deploy</h3>
        </div>
        <ul>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <li key={tab.id}>
                <Button
                  variant="ghost"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'w-full h-auto justify-start gap-2 px-3 py-2.5 rounded-none border-l-2',
                    isActive
                      ? 'bg-blue-600/20 text-blue-400 border-blue-400'
                      : 'text-muted-foreground border-transparent'
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-sm font-medium">{tab.label}</div>
                    <div className="text-xs text-muted-foreground">{tab.description}</div>
                  </div>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                      {tab.badge}
                    </span>
                  )}
                </Button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Right Content Area */}
      <div className="flex-1 min-w-0 overflow-auto p-4">
        {/* Error Alert */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="flex-1">{error}</span>
            <Button
              variant="link"
              onClick={clearError}
              className="h-auto p-0 text-xs"
            >
              Dismiss
            </Button>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Deploy Button */}
            {hasConnectedPlatform && (
              <div className="flex justify-end">
                <DeployButton
                  projectId={projectId}
                  projectPath={projectPath}
                  projectName={projectName}
                  deploymentConfig={deploymentConfig}
                  isDeploying={isDeploying}
                  isGeneratingWorkflow={isGeneratingWorkflow}
                  isPlatformConnected={isPlatformConnected}
                  onDeploy={handleDeploy}
                  onGenerateWorkflow={handleGenerateWorkflow}
                  onOpenSettings={() => setShowSettingsDialog(true)}
                />
              </div>
            )}
            {!hasConnectedPlatform ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center">
                <Rocket className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 font-medium">Get Started with One-Click Deploy</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Connect a deployment platform to get started.
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Go to <span className="font-medium">Settings → Deploy Accounts</span> to add an account.
                </p>
              </div>
            ) : (
              <>
                {/* Deployment Progress - show current or last deployment for THIS project only */}
                {currentDeployment && currentDeployment.projectId === projectId ? (
                  <DeploymentProgress
                    deployment={currentDeployment}
                    onComplete={() => loadHistory(projectId)}
                  />
                ) : deploymentHistory.length > 0 ? (
                  <DeploymentProgress
                    deployment={deploymentHistory[0]}
                    key={deploymentHistory[0].id}
                  />
                ) : null}

                {/* Deployment Statistics Overview */}
                <DeploymentStatsCard projectId={projectId} refreshTrigger={deploymentHistory.length} />
              </>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <DeploymentHistory
            deployments={deploymentHistory}
            projectId={projectId}
            isLoading={isLoadingHistory}
            onRefresh={() => loadHistory(projectId)}
          />
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <SettingsTabContent
            deploymentConfig={deploymentConfig}
            accounts={accounts}
            onOpenSettings={() => setShowSettingsDialog(true)}
            onUnbind={() => setShowUnbindConfirm(true)}
          />
        )}
      </div>

      {/* Settings Dialog */}
      <DeploymentSettingsDialog
        isOpen={showSettingsDialog}
        onClose={() => setShowSettingsDialog(false)}
        projectId={projectId}
        projectPath={projectPath}
        initialConfig={deploymentConfig}
        detectedFramework={detectedFramework}
        onSave={saveConfig}
        onDetectFramework={detectFramework}
      />

      {/* GitHub Pages Setup Dialog */}
      <GitHubPagesSetupDialog
        isOpen={showSetupDialog}
        onClose={() => {
          setShowSetupDialog(false);
          // Clear state after closing
          setWorkflowResult(null);
          setWorkflowError(undefined);
        }}
        result={workflowResult}
        error={workflowError}
        isGenerating={isGeneratingWorkflow}
      />

      {/* Quick Deploy Confirmation Dialog */}
      <ConfirmDialog
        open={showDeployConfirm}
        onOpenChange={setShowDeployConfirm}
        variant="info"
        title="Quick Deploy"
        description={deploymentConfig ? `Deploy to ${formatPlatformName(deploymentConfig.platform)}?` : 'Deploy this project?'}
        confirmText="Deploy"
        cancelText="Cancel"
        onConfirm={handleConfirmDeploy}
      />

      {/* Unbind Configuration Confirmation Dialog */}
      <ConfirmDialog
        open={showUnbindConfirm}
        onOpenChange={setShowUnbindConfirm}
        variant="destructive"
        title="Remove Configuration"
        description="Are you sure you want to remove this deployment configuration? This will not delete any deployed sites, only the local configuration."
        confirmText="Remove"
        cancelText="Cancel"
        onConfirm={handleConfirmUnbind}
      />
    </div>
  );
}
