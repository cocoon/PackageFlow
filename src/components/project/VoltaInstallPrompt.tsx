/**
 * Volta Installation Prompt
 * Shows when project has volta config but Volta is not installed
 * Feature: 006-node-package-manager
 */

import { useState } from 'react';
import { Zap, Terminal, X, ExternalLink, Copy, Check } from 'lucide-react';
import { Button } from '../ui/Button';

interface VoltaInstallPromptProps {
  onDismiss: () => void;
}

export function VoltaInstallPrompt({ onDismiss }: VoltaInstallPromptProps) {
  const [copied, setCopied] = useState(false);
  const installCommand = 'brew install volta';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(installCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleOpenDocs = () => {
    // Open Homebrew Volta formula page
    window.open('https://formulae.brew.sh/formula/volta', '_blank');
  };

  return (
    <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-orange-500/20">
            <Zap className="w-4 h-4 text-orange-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-orange-300">
              Volta recommended
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              This project uses Volta for version management, but Volta is not installed on your system.
              Install Volta to automatically use the correct Node.js and package manager versions.
            </p>

            {/* Install command */}
            <div className="mt-3 flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-secondary border border-border">
                <Terminal className="w-3.5 h-3.5 text-muted-foreground" />
                <code className="text-xs text-foreground font-mono">{installCommand}</code>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopy}
                className="h-auto"
                title="Copy command"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-muted-foreground" />
                )}
              </Button>
            </div>

            {/* Actions */}
            <div className="mt-3 flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpenDocs}
                className="gap-1.5 text-orange-400 hover:text-orange-300 h-auto px-0"
              >
                <ExternalLink className="w-3 h-3" />
                View on Homebrew
              </Button>
            </div>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onDismiss}
          className="h-auto flex-shrink-0"
          title="Dismiss"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </Button>
      </div>
    </div>
  );
}
