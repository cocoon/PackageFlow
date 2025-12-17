/**
 * DeployTargetCard Component
 * Displays deployment target information with platform icon badge
 * Follows AccountCard design pattern from AccountManager
 */

import React from 'react';
import { MoreHorizontal, Settings, ExternalLink, Globe, Unlink } from 'lucide-react';
import { open as shellOpen } from '@tauri-apps/plugin-shell';
import { Dropdown, DropdownItem, DropdownSeparator } from '../../ui/Dropdown';
import { NetlifyIcon, CloudflareIcon, GithubIcon } from '../../ui/icons';
import { cn } from '../../../lib/utils';
import type { PlatformType, DeploymentEnvironment } from '../../../types/deploy';

interface PlatformDisplayConfig {
  name: string;
  icon: React.ReactNode;
  bgClass: string;
  borderAccent: string;
  dashboardUrl: string;
}

const PLATFORM_CONFIGS: Record<PlatformType, PlatformDisplayConfig> = {
  netlify: {
    name: 'Netlify',
    icon: <NetlifyIcon className="h-4 w-4" />,
    bgClass: 'bg-[#0e1e25]',
    borderAccent: 'border-l-teal-500',
    dashboardUrl: 'https://app.netlify.com',
  },
  cloudflare_pages: {
    name: 'Cloudflare Pages',
    icon: <CloudflareIcon className="h-4 w-4" />,
    bgClass: 'bg-[#f38020]',
    borderAccent: 'border-l-orange-500',
    dashboardUrl: 'https://dash.cloudflare.com',
  },
  github_pages: {
    name: 'GitHub Pages',
    icon: <GithubIcon className="h-4 w-4" />,
    bgClass: 'bg-[#24292e] dark:bg-[#1b1f23]',
    borderAccent: 'border-l-gray-500',
    dashboardUrl: 'https://github.com',
  },
};

interface DeployTargetCardProps {
  platform: PlatformType;
  environment: DeploymentEnvironment;
  accountName?: string;
  siteName?: string;
  projectName?: string;
  onEdit?: () => void;
  onUnbind?: () => void;
}

export function DeployTargetCard({
  platform,
  environment,
  accountName,
  siteName,
  projectName,
  onEdit,
  onUnbind,
}: DeployTargetCardProps) {
  const config = PLATFORM_CONFIGS[platform];

  const handleOpenDashboard = () => {
    shellOpen(config.dashboardUrl);
  };

  // Get display name for site/project
  const displaySiteName = siteName || projectName;

  return (
    <div
      className={cn(
        'relative rounded-lg border bg-card p-4 transition-all',
        'border-l-4',
        config.borderAccent
      )}
    >
      <div className="flex items-center gap-3">
        {/* Platform Icon Badge */}
        <div
          className={cn('flex h-10 w-10 items-center justify-center rounded-lg', config.bgClass)}
        >
          <span className="text-white">{config.icon}</span>
        </div>

        {/* Platform Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{config.name}</span>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs font-medium',
                environment === 'production'
                  ? 'bg-green-500/20 text-green-500 dark:text-green-400'
                  : 'bg-blue-500/20 text-blue-500 dark:text-blue-400'
              )}
            >
              {environment === 'production' ? 'Production' : 'Preview'}
            </span>
          </div>
          <div className="space-y-0.5 mt-1">
            {accountName && (
              <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground/70">Account:</span>
                <span>{accountName}</span>
              </div>
            )}
            {displaySiteName && (
              <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Globe className="h-3 w-3 text-muted-foreground/70" />
                <span>{displaySiteName}</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions Dropdown */}
        <Dropdown
          trigger={
            <button
              className={cn(
                'rounded-md p-2 transition-colors',
                'text-muted-foreground hover:bg-accent hover:text-foreground',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              )}
              aria-label="Configuration actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          }
          align="right"
        >
          {onEdit && (
            <DropdownItem icon={<Settings className="h-4 w-4" />} onClick={onEdit}>
              Edit settings
            </DropdownItem>
          )}
          <DropdownItem icon={<ExternalLink className="h-4 w-4" />} onClick={handleOpenDashboard}>
            Open dashboard
          </DropdownItem>
          {onUnbind && (
            <>
              <DropdownSeparator />
              <DropdownItem icon={<Unlink className="h-4 w-4" />} onClick={onUnbind} destructive>
                Remove configuration
              </DropdownItem>
            </>
          )}
        </Dropdown>
      </div>
    </div>
  );
}
