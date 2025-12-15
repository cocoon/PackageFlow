/**
 * ToolPermissionMatrix Component
 * A beautiful table/matrix view for per-tool permission settings
 * Displays all MCP tools with R/E/W permission pills
 */

import React, { useMemo } from 'react';
import { Eye, Pencil, Play } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { PermissionToggleGroup } from '../../ui/PermissionCheckbox';
import { Collapsible } from '../../ui/Collapsible';
import type {
  ToolPermissionEntry,
  ToolCategory,
  PermissionType,
} from '../../../types/mcp';

interface ToolPermissionMatrixProps {
  /** Tool permission entries to display */
  entries: ToolPermissionEntry[];
  /** Called when a permission changes */
  onPermissionChange: (toolName: string, permissionType: PermissionType, value: boolean) => void;
  /** Whether the matrix is disabled */
  disabled?: boolean;
  /** Whether to show in compact mode */
  compact?: boolean;
  /** Additional class name */
  className?: string;
}

/** Category configuration */
const CATEGORY_CONFIG: Record<
  ToolCategory,
  { name: string; icon: React.ReactNode; colorClass: string; bgClass: string }
> = {
  read: {
    name: 'Read',
    icon: <Eye className="w-3.5 h-3.5" />,
    colorClass: 'text-blue-500',
    bgClass: 'bg-blue-500/10',
  },
  execute: {
    name: 'Execute',
    icon: <Play className="w-3.5 h-3.5" />,
    colorClass: 'text-amber-500',
    bgClass: 'bg-amber-500/10',
  },
  write: {
    name: 'Write',
    icon: <Pencil className="w-3.5 h-3.5" />,
    colorClass: 'text-rose-500',
    bgClass: 'bg-rose-500/10',
  },
};

/** Single tool row */
interface ToolRowProps {
  entry: ToolPermissionEntry;
  onPermissionChange: (permissionType: PermissionType, value: boolean) => void;
  disabled?: boolean;
  compact?: boolean;
}

const ToolRow: React.FC<ToolRowProps> = ({ entry, onPermissionChange, disabled, compact }) => {
  const categoryConfig = CATEGORY_CONFIG[entry.category];

  return (
    <div
      className={cn(
        'flex items-center gap-3 py-2 px-3 rounded-lg',
        'transition-colors duration-150',
        'hover:bg-muted/50',
        disabled && 'opacity-50'
      )}
    >
      {/* Tool info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <code className="text-sm font-mono font-medium text-foreground">{entry.name}</code>
          <span
            className={cn(
              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium',
              categoryConfig.bgClass,
              categoryConfig.colorClass
            )}
          >
            {categoryConfig.icon}
            {!compact && categoryConfig.name}
          </span>
        </div>
        {!compact && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{entry.description}</p>
        )}
      </div>

      {/* Permission toggles */}
      <PermissionToggleGroup
        toolName={entry.name}
        permissions={entry.permissions}
        applicablePermissions={entry.applicablePermissions}
        onChange={onPermissionChange}
        disabled={disabled}
        size={compact ? 'sm' : 'md'}
      />
    </div>
  );
};

/** Category group with collapsible */
interface CategoryGroupProps {
  category: ToolCategory;
  entries: ToolPermissionEntry[];
  onPermissionChange: (toolName: string, permissionType: PermissionType, value: boolean) => void;
  disabled?: boolean;
  compact?: boolean;
  defaultOpen?: boolean;
}

const CategoryGroup: React.FC<CategoryGroupProps> = ({
  category,
  entries,
  onPermissionChange,
  disabled,
  compact,
  defaultOpen = true,
}) => {
  const config = CATEGORY_CONFIG[category];

  // Count enabled tools in this category
  const enabledCount = entries.filter(
    (e) => e.permissions.read || e.permissions.execute || e.permissions.write
  ).length;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <Collapsible
        defaultOpen={defaultOpen}
        trigger={
          <div className="flex items-center gap-3 py-2.5 px-3 w-full">
            <span className={cn('p-1.5 rounded-md', config.bgClass, config.colorClass)}>
              {config.icon}
            </span>
            <span className="flex-1 text-left">
              <span className="font-medium text-foreground">{config.name} Tools</span>
              <span className="ml-2 text-xs text-muted-foreground">
                ({enabledCount}/{entries.length} enabled)
              </span>
            </span>
          </div>
        }
        triggerClassName="hover:bg-muted/30 transition-colors"
        contentClassName="border-t border-border bg-muted/20"
      >
        <div className="p-2 space-y-1">
          {entries.map((entry) => (
            <ToolRow
              key={entry.name}
              entry={entry}
              onPermissionChange={(type, value) => onPermissionChange(entry.name, type, value)}
              disabled={disabled}
              compact={compact}
            />
          ))}
        </div>
      </Collapsible>
    </div>
  );
};

export const ToolPermissionMatrix: React.FC<ToolPermissionMatrixProps> = ({
  entries,
  onPermissionChange,
  disabled = false,
  compact = false,
  className,
}) => {
  // Group entries by category
  const groupedEntries = useMemo(() => {
    const groups: Record<ToolCategory, ToolPermissionEntry[]> = {
      read: [],
      execute: [],
      write: [],
    };

    entries.forEach((entry) => {
      groups[entry.category].push(entry);
    });

    return groups;
  }, [entries]);

  // Calculate overall stats
  const totalTools = entries.length;
  const enabledTools = entries.filter(
    (e) => e.permissions.read || e.permissions.execute || e.permissions.write
  ).length;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header with legend */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium">{enabledTools}/{totalTools} tools enabled</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-5 h-5 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-[10px] font-semibold text-blue-600 dark:text-blue-400">
              R
            </span>
            <span className="text-muted-foreground">Read</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-5 h-5 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-[10px] font-semibold text-amber-600 dark:text-amber-400">
              E
            </span>
            <span className="text-muted-foreground">Execute</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-5 h-5 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-[10px] font-semibold text-rose-600 dark:text-rose-400">
              W
            </span>
            <span className="text-muted-foreground">Write</span>
          </span>
        </div>
      </div>

      {/* Category groups */}
      <div className="space-y-2">
        {groupedEntries.read.length > 0 && (
          <CategoryGroup
            category="read"
            entries={groupedEntries.read}
            onPermissionChange={onPermissionChange}
            disabled={disabled}
            compact={compact}
            defaultOpen={true}
          />
        )}
        {groupedEntries.execute.length > 0 && (
          <CategoryGroup
            category="execute"
            entries={groupedEntries.execute}
            onPermissionChange={onPermissionChange}
            disabled={disabled}
            compact={compact}
            defaultOpen={true}
          />
        )}
        {groupedEntries.write.length > 0 && (
          <CategoryGroup
            category="write"
            entries={groupedEntries.write}
            onPermissionChange={onPermissionChange}
            disabled={disabled}
            compact={compact}
            defaultOpen={true}
          />
        )}
      </div>
    </div>
  );
};

export default ToolPermissionMatrix;
