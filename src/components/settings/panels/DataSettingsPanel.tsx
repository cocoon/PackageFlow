/**
 * Data Settings Panel
 * Import and export PackageFlow data
 */

import React from 'react';
import { Download, Upload, ArrowLeftRight } from 'lucide-react';
import { cn } from '../../../lib/utils';

// Keyboard shortcut display helper
const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
const modKey = isMac ? 'Cmd' : 'Ctrl';

interface DataSettingsPanelProps {
  onExport?: () => void;
  onImport?: () => void;
}

export const DataSettingsPanel: React.FC<DataSettingsPanelProps> = ({
  onExport,
  onImport,
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <ArrowLeftRight className="w-5 h-5" />
          Import / Export
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Backup and restore your PackageFlow data
        </p>
      </div>

      {/* Export Section */}
      <div className="p-4 rounded-lg border border-border bg-card space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
            <Download className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-foreground">Export Data</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Download all your projects, workflows, templates, and settings as a JSON file.
              Use this for backup or to transfer data to another device.
            </p>
          </div>
        </div>

        <button
          onClick={onExport}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-4 py-2.5',
            'text-sm font-medium rounded-lg',
            'bg-green-500/10 text-green-500 border border-green-500/20',
            'hover:bg-green-500/20 transition-colors'
          )}
        >
          <Download className="w-4 h-4" />
          Export Data
          <kbd className="ml-2 px-1.5 py-0.5 text-xs font-mono bg-green-500/10 rounded">
            {modKey}+E
          </kbd>
        </button>
      </div>

      {/* Import Section */}
      <div className="p-4 rounded-lg border border-border bg-card space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
            <Upload className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-foreground">Import Data</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Restore data from a previously exported JSON file. You can choose to merge
              with existing data or replace it entirely.
            </p>
          </div>
        </div>

        <button
          onClick={onImport}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-4 py-2.5',
            'text-sm font-medium rounded-lg',
            'bg-blue-500/10 text-blue-500 border border-blue-500/20',
            'hover:bg-blue-500/20 transition-colors'
          )}
        >
          <Upload className="w-4 h-4" />
          Import Data
          <kbd className="ml-2 px-1.5 py-0.5 text-xs font-mono bg-blue-500/10 rounded">
            {modKey}+I
          </kbd>
        </button>
      </div>

      {/* Info */}
      <div className="p-4 bg-muted/30 rounded-lg border border-border">
        <h3 className="text-sm font-medium text-foreground mb-2">What's included</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>- Projects and their configurations</li>
          <li>- Workflows and step templates</li>
          <li>- AI service settings (API keys are NOT exported)</li>
          <li>- Prompt templates</li>
          <li>- MCP server configurations</li>
          <li>- Keyboard shortcuts</li>
        </ul>
      </div>
    </div>
  );
};
