/**
 * Git File List - Shows staged, modified, and untracked files
 * @see specs/009-git-integration/tasks.md - T016
 */

import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Minus,
  Check,
  FileEdit,
  FileQuestion,
  FilePlus,
  FileX,
  FileSymlink,
  AlertTriangle,
  Undo2,
  Trash2,
} from 'lucide-react';
import { Button } from '../../ui/Button';
import type { GitFile } from '../../../types/git';

interface GitFileListProps {
  /** Staged files */
  stagedFiles: GitFile[];
  /** Unstaged changed files */
  changedFiles: GitFile[];
  /** Untracked files */
  untrackedFiles: GitFile[];
  /** Stage file handler */
  onStageFile: (path: string) => void;
  /** Unstage file handler */
  onUnstageFile: (path: string) => void;
  /** Stage all handler */
  onStageAll: () => void;
  /** Unstage all handler */
  onUnstageAll: () => void;
  /** Discard changes handler */
  onDiscardFile?: (path: string) => void;
  /** Discard all changes handler */
  onDiscardAll?: () => void;
  /** Delete untracked file handler */
  onDeleteUntracked?: (path: string) => void;
  /** Delete all untracked files handler */
  onDeleteAllUntracked?: () => void;
  /** Loading state */
  isLoading?: boolean;
  /** Handler for file click to view diff */
  onFileClick?: (file: GitFile) => void;
}

// File status icons and colors
const FILE_STATUS_CONFIG = {
  modified: { icon: FileEdit, color: 'text-yellow-400', label: 'M' },
  added: { icon: FilePlus, color: 'text-green-400', label: 'A' },
  deleted: { icon: FileX, color: 'text-red-400', label: 'D' },
  renamed: { icon: FileSymlink, color: 'text-blue-400', label: 'R' },
  copied: { icon: FileSymlink, color: 'text-blue-400', label: 'C' },
  untracked: { icon: FilePlus, color: 'text-green-400', label: 'N' }, // N for New
  conflict: { icon: AlertTriangle, color: 'text-red-500', label: 'U' },
  ignored: { icon: FileQuestion, color: 'text-muted-foreground/50', label: '!' },
} as const;

interface FileSectionProps {
  title: string;
  files: GitFile[];
  isExpanded: boolean;
  onToggle: () => void;
  actionButton: {
    label: string;
    onClick: () => void;
  };
  secondaryButton?: {
    label: string;
    onClick: () => void;
  };
  onFileAction: (path: string) => void;
  fileActionIcon: typeof Plus;
  fileActionTitle: string;
  onSecondaryFileAction?: (path: string) => void;
  secondaryFileActionIcon?: typeof Undo2;
  secondaryFileActionTitle?: string;
  isStaged?: boolean;
  /** Handler for file click to view diff */
  onFileClick?: (file: GitFile) => void;
}

function FileSection({
  title,
  files,
  isExpanded,
  onToggle,
  actionButton,
  secondaryButton,
  onFileAction,
  fileActionIcon: FileActionIcon,
  fileActionTitle,
  onSecondaryFileAction,
  secondaryFileActionIcon: SecondaryFileActionIcon,
  secondaryFileActionTitle,
  isStaged = false,
  onFileClick,
}: FileSectionProps) {
  if (files.length === 0) return null;

  return (
    <div className="space-y-1">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onToggle}
          className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
          {title} ({files.length})
        </button>
        <div className="flex items-center gap-1">
          {secondaryButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={secondaryButton.onClick}
              className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/20"
            >
              {secondaryButton.label}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={actionButton.onClick}
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
          >
            {actionButton.label}
          </Button>
        </div>
      </div>

      {/* File List */}
      {isExpanded && (
        <div className="space-y-0.5 pl-2">
          {files.map((file) => {
            const config = FILE_STATUS_CONFIG[file.status] || FILE_STATUS_CONFIG.modified;
            const Icon = config.icon;

            return (
              <div
                key={file.path}
                className="group flex items-center gap-2 py-1 px-2 rounded hover:bg-accent transition-colors cursor-pointer"
                onClick={() => onFileClick?.(file)}
              >
                {/* Status Icon */}
                {isStaged ? (
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                ) : (
                  <Icon className={`w-4 h-4 ${config.color} flex-shrink-0`} />
                )}

                {/* File Path */}
                <span className="flex-1 text-sm text-foreground truncate" title={file.path}>
                  {file.path}
                </span>

                {/* Status Label */}
                {!isStaged && (
                  <span className={`text-xs ${config.color} font-mono`}>
                    {config.label}
                  </span>
                )}

                {/* Secondary Action Button (Discard) */}
                {onSecondaryFileAction && SecondaryFileActionIcon && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSecondaryFileAction(file.path);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 transition-opacity"
                    title={secondaryFileActionTitle}
                  >
                    <SecondaryFileActionIcon className="w-3.5 h-3.5 text-red-400" />
                  </button>
                )}

                {/* Primary Action Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onFileAction(file.path);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-accent transition-opacity"
                  title={fileActionTitle}
                >
                  <FileActionIcon className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function GitFileList({
  stagedFiles,
  changedFiles,
  untrackedFiles,
  onStageFile,
  onUnstageFile,
  onStageAll,
  onUnstageAll,
  onDiscardFile,
  onDiscardAll,
  onDeleteUntracked,
  onDeleteAllUntracked,
  isLoading = false,
  onFileClick,
}: GitFileListProps) {
  const [expandedSections, setExpandedSections] = useState({
    staged: true,
    changes: true,
    untracked: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const totalChanges = stagedFiles.length + changedFiles.length + untrackedFiles.length;

  if (totalChanges === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Check className="w-12 h-12 mx-auto mb-2 text-green-500" />
        <p>Working directory clean</p>
        <p className="text-sm">No changes to commit</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Staged Changes */}
      <FileSection
        title="Staged Changes"
        files={stagedFiles}
        isExpanded={expandedSections.staged}
        onToggle={() => toggleSection('staged')}
        actionButton={{
          label: 'Unstage All',
          onClick: onUnstageAll,
        }}
        onFileAction={onUnstageFile}
        fileActionIcon={Minus}
        fileActionTitle="Unstage file"
        isStaged
        onFileClick={onFileClick}
      />

      {/* Changes (Modified but not staged) */}
      <FileSection
        title="Changes"
        files={changedFiles}
        isExpanded={expandedSections.changes}
        onToggle={() => toggleSection('changes')}
        actionButton={{
          label: 'Stage All',
          onClick: onStageAll,
        }}
        secondaryButton={onDiscardAll ? {
          label: 'Discard All',
          onClick: onDiscardAll,
        } : undefined}
        onFileAction={onStageFile}
        fileActionIcon={Plus}
        fileActionTitle="Stage file"
        onSecondaryFileAction={onDiscardFile}
        secondaryFileActionIcon={Undo2}
        secondaryFileActionTitle="Discard changes"
        onFileClick={onFileClick}
      />

      {/* Untracked Files */}
      <FileSection
        title="Untracked"
        files={untrackedFiles}
        isExpanded={expandedSections.untracked}
        onToggle={() => toggleSection('untracked')}
        actionButton={{
          label: 'Stage All',
          onClick: onStageAll,
        }}
        secondaryButton={onDeleteAllUntracked ? {
          label: 'Delete All',
          onClick: onDeleteAllUntracked,
        } : undefined}
        onFileAction={onStageFile}
        fileActionIcon={Plus}
        fileActionTitle="Stage file"
        onSecondaryFileAction={onDeleteUntracked}
        secondaryFileActionIcon={Trash2}
        secondaryFileActionTitle="Delete file"
        onFileClick={onFileClick}
      />

      {/* Stage All Button */}
      {(changedFiles.length > 0 || untrackedFiles.length > 0) && (
        <Button
          variant="secondary"
          onClick={onStageAll}
          disabled={isLoading}
          className="w-full"
        >
          Stage All Changes
        </Button>
      )}
    </div>
  );
}
