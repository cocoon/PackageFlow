/**
 * Volta Installation Prompt
 * Shows when project has volta config but Volta is not installed
 * Feature: 006-node-package-manager
 */

import { useState } from 'react';
import { Zap, Terminal, X, ExternalLink, Copy, Check } from 'lucide-react';

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
              <button
                onClick={handleCopy}
                className="p-1.5 rounded hover:bg-muted transition-colors"
                title="Copy command"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            </div>

            {/* Actions */}
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={handleOpenDocs}
                className="flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                View on Homebrew
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="p-1 rounded hover:bg-muted transition-colors flex-shrink-0"
          title="Dismiss"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
