/**
 * BuildConfigCard Component
 * Displays build configuration details in a structured card format
 * Follows consistent design pattern with icon + label + value rows
 */

import React from 'react';
import { Package, Terminal, FolderOutput, Download } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { DeploymentConfig } from '../../../types/deploy';

interface BuildConfigCardProps {
  config: DeploymentConfig;
  className?: string;
}

export function BuildConfigCard({ config, className }: BuildConfigCardProps) {
  const configItems = [
    config.frameworkPreset && {
      label: 'Framework',
      value: config.frameworkPreset,
      icon: Package,
      mono: false,
    },
    config.buildCommand && {
      label: 'Build Command',
      value: config.buildCommand,
      icon: Terminal,
      mono: true,
    },
    config.outputDirectory && {
      label: 'Output Directory',
      value: config.outputDirectory,
      icon: FolderOutput,
      mono: true,
    },
    config.installCommand && {
      label: 'Install Command',
      value: config.installCommand,
      icon: Download,
      mono: true,
    },
  ].filter(Boolean) as Array<{
    label: string;
    value: string;
    icon: React.ComponentType<{ className?: string }>;
    mono: boolean;
  }>;

  if (configItems.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">No build configuration set</p>
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border border-border bg-card overflow-hidden', className)}>
      {configItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className={cn(
              'flex items-center gap-3 px-4 py-3',
              index !== configItems.length - 1 && 'border-b border-border'
            )}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground">{item.label}</div>
              <div
                className={cn('text-sm text-foreground truncate', item.mono && 'font-mono')}
                title={item.value}
              >
                {item.value}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
