/**
 * Node Panel - Side Panel for Node Configuration
 * A slide-out panel for editing node properties with n8n-like styling
 */

import { useState, useEffect, useCallback } from 'react';
import { X, Terminal, Play, FolderOpen, Clock, Save, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { WorkflowNode, ScriptNodeConfig, NodeStatus } from '../../types/workflow';
import { isScriptNodeConfig } from '../../types/workflow';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface NodePanelProps {
  node: WorkflowNode | null;
  status?: NodeStatus;
  isOpen: boolean;
  onClose: () => void;
  onSave: (nodeId: string, updates: { name: string; config: ScriptNodeConfig }) => void;
  onDelete: (nodeId: string) => void;
  disabled?: boolean;
}

/**
 * Get status badge configuration
 */
// Check if command contains rm
function containsRmCommand(cmd: string): boolean {
  const trimmed = cmd.trim();
  return trimmed.startsWith('rm ') || trimmed === 'rm' || /\|\s*rm(\s|$)/.test(trimmed);
}

function getStatusBadge(status?: NodeStatus) {
  switch (status) {
    case 'running':
      return { label: 'Running', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
    case 'completed':
      return { label: 'Completed', className: 'bg-green-500/20 text-green-400 border-green-500/30' };
    case 'failed':
      return { label: 'Failed', className: 'bg-red-500/20 text-red-400 border-red-500/30' };
    case 'skipped':
      return { label: 'Skipped', className: 'bg-muted text-muted-foreground border-muted' };
    case 'pending':
      return { label: 'Pending', className: 'bg-muted text-muted-foreground border-muted' };
    default:
      return null;
  }
}

/**
 * Node Panel Component
 * Slide-out panel for editing node configuration
 */
export function NodePanel({
  node,
  status,
  isOpen,
  onClose,
  onSave,
  onDelete,
  disabled = false,
}: NodePanelProps) {
  const [name, setName] = useState('');
  const [command, setCommand] = useState('');
  const [cwd, setCwd] = useState('');
  const [timeout, setTimeout] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Sync form state with node prop
  useEffect(() => {
    if (node) {
      setName(node.name);
      // Only script nodes have command/cwd/timeout
      if (isScriptNodeConfig(node.config)) {
        setCommand(node.config.command);
        setCwd(node.config.cwd || '');
        setTimeout(node.config.timeout ? String(node.config.timeout / 1000) : '');
      } else {
        // For trigger-workflow nodes, clear the script-specific fields
        setCommand('');
        setCwd('');
        setTimeout('');
      }
      setHasChanges(false);
    }
  }, [node]);

  // Track changes
  useEffect(() => {
    if (!node) return;

    const nameChanged = name !== node.name;

    // Only track script-specific changes for script nodes
    if (isScriptNodeConfig(node.config)) {
      const commandChanged = command !== node.config.command;
      const cwdChanged = cwd !== (node.config.cwd || '');
      const timeoutChanged = timeout !== (node.config.timeout ? String(node.config.timeout / 1000) : '');
      setHasChanges(nameChanged || commandChanged || cwdChanged || timeoutChanged);
    } else {
      // For trigger-workflow nodes, only track name changes
      setHasChanges(nameChanged);
    }
  }, [name, command, cwd, timeout, node]);

  // Check if command contains rm
  const hasRmCommand = containsRmCommand(command);

  // Handle save
  const handleSave = useCallback(() => {
    if (!node || !name.trim() || !command.trim()) return;

    const config: ScriptNodeConfig = {
      command: command.trim(),
      cwd: cwd.trim() || undefined,
      timeout: timeout ? parseInt(timeout) * 1000 : undefined,
    };

    onSave(node.id, { name: name.trim(), config });
    setHasChanges(false);
  }, [node, name, command, cwd, timeout, onSave]);

  // Handle delete
  const handleDelete = useCallback(() => {
    if (!node) return;
    onDelete(node.id);
    onClose();
  }, [node, onDelete, onClose]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (hasChanges && !disabled) {
          handleSave();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasChanges, disabled, handleSave, onClose]);

  const statusBadge = getStatusBadge(status);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={cn(
          'fixed right-0 top-0 h-full w-full max-w-md bg-card border-l border-border z-50',
          'transform transition-transform duration-300 ease-in-out',
          'flex flex-col',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
              <Terminal className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {node ? 'Edit Step' : 'Node Details'}
              </h2>
              {node && (
                <span className="text-xs text-muted-foreground">#{node.order + 1}</span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        {node ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Status Badge */}
            {statusBadge && (
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'px-2.5 py-1 text-xs font-medium rounded-full border',
                    statusBadge.className
                  )}
                >
                  {statusBadge.label}
                </span>
              </div>
            )}

            {/* Name Input */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Terminal className="w-4 h-4" />
                Step Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Build Project"
                disabled={disabled}
                className="bg-background border-border text-foreground"
              />
            </div>

            {/* Command Input */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Play className="w-4 h-4" />
                Shell Command
              </label>
              <textarea
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="e.g., npm run build"
                disabled={disabled}
                rows={4}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-form-type="other"
                className={cn(
                  'w-full px-3 py-2 rounded-md border bg-background border-border',
                  'text-foreground placeholder-muted-foreground font-mono text-sm',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'resize-none'
                )}
              />
              {/* rm command warning */}
              {hasRmCommand && (
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-900/30 border border-amber-700/50">
                  <Trash2 className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-300">
                    <span className="font-medium">Safe Delete:</span> Files will be moved to Trash instead of being permanently deleted.
                  </p>
                </div>
              )}
              {!hasRmCommand && (
                <p className="text-xs text-muted-foreground">
                  Enter the shell command to execute. Supports multi-line commands.
                </p>
              )}
            </div>

            {/* Working Directory */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <FolderOpen className="w-4 h-4" />
                Working Directory
                <span className="text-muted-foreground font-normal">(Optional)</span>
              </label>
              <Input
                value={cwd}
                onChange={(e) => setCwd(e.target.value)}
                placeholder="e.g., ~/Developer/project"
                disabled={disabled}
                className="bg-background border-border text-foreground font-mono text-sm"
              />
            </div>

            {/* Timeout */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Clock className="w-4 h-4" />
                Timeout
                <span className="text-muted-foreground font-normal">(seconds)</span>
              </label>
              <Input
                type="number"
                value={timeout}
                onChange={(e) => setTimeout(e.target.value)}
                placeholder="600 (default: 10 minutes)"
                disabled={disabled}
                min={1}
                className="bg-background border-border text-foreground"
              />
            </div>

            {/* Info Box */}
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <h4 className="text-sm font-medium text-foreground mb-2">Tips</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>- Press Cmd/Ctrl + S to save changes</li>
                <li>- Press Escape to close the panel</li>
                <li>- Double-click a node to edit it</li>
                <li>- Press Delete/Backspace to remove selected node</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a node to edit
          </div>
        )}

        {/* Footer */}
        {node && (
          <div className="p-4 border-t border-border space-y-3">
            {/* Save Button */}
            <Button
              onClick={handleSave}
              disabled={disabled || !hasChanges || !name.trim() || !command.trim()}
              className={cn(
                'w-full',
                hasChanges
                  ? 'bg-blue-600 hover:bg-blue-500 text-white'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              <Save className="w-4 h-4 mr-2" />
              {hasChanges ? 'Save Changes' : 'Saved'}
            </Button>

            {/* Delete Button */}
            <Button
              onClick={handleDelete}
              disabled={disabled}
              variant="ghost"
              className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Step
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
