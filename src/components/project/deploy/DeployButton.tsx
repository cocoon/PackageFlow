// DeployButton Component
// One-Click Deploy feature (015-one-click-deploy)
// Extended: GitHub Pages uses workflow generation instead of direct deploy
// Enhanced: Rocket animation on hover and during deployment

import { Rocket, FileCode } from 'lucide-react';
import { Button } from '../../ui/Button';
import { cn } from '../../../lib/utils';
import type { PlatformType, DeploymentConfig } from '../../../types/deploy';

interface DeployButtonProps {
  projectId: string;
  projectPath: string;
  projectName?: string; // Optional - for display purposes
  deploymentConfig: DeploymentConfig | null;
  isDeploying: boolean;
  isGeneratingWorkflow?: boolean;
  isPlatformConnected: (platform: PlatformType) => boolean;
  onDeploy: (projectId: string, projectPath: string, config: DeploymentConfig) => Promise<void>;
  onGenerateWorkflow?: (projectPath: string, config: DeploymentConfig) => Promise<void>;
  onOpenSettings: () => void;
}

export function DeployButton({
  projectId,
  projectPath,
  projectName: _projectName, // Reserved for future use
  deploymentConfig,
  isDeploying,
  isGeneratingWorkflow,
  isPlatformConnected,
  onDeploy,
  onGenerateWorkflow,
  onOpenSettings,
}: DeployButtonProps) {
  const canDeploy = deploymentConfig && isPlatformConnected(deploymentConfig.platform);

  const isGitHubPages = deploymentConfig?.platform === 'github_pages';
  const isLoading = isDeploying || isGeneratingWorkflow;

  const handleClick = async () => {
    if (!deploymentConfig) {
      onOpenSettings();
      return;
    }

    // GitHub Pages: Generate workflow file instead of direct deploy
    if (isGitHubPages && onGenerateWorkflow) {
      await onGenerateWorkflow(projectPath, deploymentConfig);
    } else {
      await onDeploy(projectId, projectPath, deploymentConfig);
    }
  };

  // Determine button text
  const getButtonText = () => {
    if (isGeneratingWorkflow) return 'Generating...';
    if (isDeploying) return 'Deploying...';
    if (isGitHubPages) return 'Generate Workflow';
    return 'Deploy';
  };

  return (
    <Button
      onClick={handleClick}
      disabled={isLoading}
      variant={canDeploy ? 'default' : 'ghost'}
      className={cn(
        'group relative gap-2 overflow-visible',
        !canDeploy && 'bg-muted text-muted-foreground hover:bg-muted/80'
      )}
    >
      {/* Rocket Icon with animations */}
      <span className="relative">
        {isGitHubPages ? (
          <FileCode className="h-4 w-4" />
        ) : (
          <>
            <Rocket
              className={cn(
                'h-4 w-4 transition-transform duration-200',
                // Hover: gentle lift
                !isLoading &&
                  'group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:scale-110',
                // Deploying: vibrate + fly animation
                isLoading && 'animate-rocket-vibrate'
              )}
            />
            {/* Flame effect when deploying */}
            {isLoading && (
              <span className="absolute -bottom-1 -left-0.5 flex flex-col items-center">
                <span className="w-2 h-2 bg-gradient-to-t from-orange-500 to-yellow-400 rounded-full animate-flame-flicker blur-[1px]" />
                <span
                  className="w-1.5 h-1.5 bg-gradient-to-t from-red-500 to-orange-400 rounded-full animate-flame-flicker blur-[0.5px] -mt-1"
                  style={{ animationDelay: '75ms' }}
                />
              </span>
            )}
          </>
        )}
      </span>
      <span>{getButtonText()}</span>
    </Button>
  );
}
