/**
 * Save As Template Dialog
 * Dialog for saving a workflow node as a reusable template
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Star, Terminal, FolderOpen } from 'lucide-react';
import type { WorkflowNode } from '../../types/workflow';
import { isScriptNodeConfig } from '../../types/workflow';

interface SaveAsTemplateDialogProps {
  isOpen: boolean;
  node: WorkflowNode | null;
  onClose: () => void;
  onSave: (name: string) => void;
}

/**
 * Save As Template Dialog Component
 */
export function SaveAsTemplateDialog({
  isOpen,
  node,
  onClose,
  onSave,
}: SaveAsTemplateDialogProps) {
  const [name, setName] = useState('');

  // Reset form when dialog opens with a new node
  useEffect(() => {
    if (isOpen && node) {
      setName(node.name);
    }
  }, [isOpen, node]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name.trim());
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
  };

  // Only allow script nodes to be saved as templates
  if (!node || !isScriptNodeConfig(node.config)) return null;

  const scriptConfig = node.config;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-yellow-600 flex items-center justify-center">
              <Star className="w-4 h-4 text-white" />
            </div>
            Save as Template
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4" onKeyDown={handleKeyDown}>
          {/* Template Name */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Star className="w-4 h-4" />
              Template Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., My Custom Build"
              autoFocus
              className="bg-background border-border text-foreground"
            />
          </div>

          {/* Command Preview (read-only) */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Terminal className="w-4 h-4" />
              Command
            </label>
            <div className="bg-muted rounded-lg p-3 font-mono text-xs text-muted-foreground break-all">
              {scriptConfig.command}
            </div>
          </div>

          {/* Working Directory Preview (if present) */}
          {scriptConfig.cwd && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <FolderOpen className="w-4 h-4" />
                Working Directory
              </label>
              <div className="bg-muted rounded-lg p-3 font-mono text-xs text-muted-foreground">
                {scriptConfig.cwd}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim()}
            className="bg-yellow-600 hover:bg-yellow-500 text-white"
          >
            <Star className="w-4 h-4 mr-1.5" />
            Save Template
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
