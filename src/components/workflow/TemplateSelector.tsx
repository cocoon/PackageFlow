/**
 * Template Selector Component
 * Browse and select workflow step templates
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Search,
  X,
  Package,
  GitBranch,
  Container,
  Terminal,
  TestTube,
  CheckCircle,
  Download,
  Upload,
  Star,
  Trash2,
} from 'lucide-react';
import { save, open } from '@tauri-apps/plugin-dialog';
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs';
import { cn } from '../../lib/utils';
import { Input } from '../ui/Input';
import {
  TEMPLATE_CATEGORIES,
  groupTemplatesByCategory,
  filterTemplatesWithCustom,
  exportTemplatesToJson,
  parseImportedTemplates,
  loadCustomTemplates,
  deleteCustomTemplate,
  importTemplatesAsCustom,
} from '../../data/step-templates';
import type { StepTemplate, TemplateCategoryInfo, CustomTemplate } from '../../types/step-template';

/** Map category icon names to components */
const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Package,
  GitBranch,
  Container,
  Terminal,
  TestTube,
  CheckCircle,
  Star,
};

interface TemplateSelectorProps {
  selectedTemplateId?: string | null;
  onSelectTemplate: (template: StepTemplate) => void;
  className?: string;
}

/**
 * Category Group Component
 * Shows category header and all templates
 */
function CategoryGroup({
  category,
  templates,
  selectedTemplateId,
  onSelectTemplate,
  onDeleteTemplate,
}: {
  category: TemplateCategoryInfo;
  templates: (StepTemplate | CustomTemplate)[];
  selectedTemplateId?: string | null;
  onSelectTemplate: (template: StepTemplate) => void;
  onDeleteTemplate?: (templateId: string) => void;
}) {
  const IconComponent = CATEGORY_ICONS[category.icon] || Package;

  return (
    <div>
      {/* Category Header - Sticky */}
      <div className="sticky top-0 z-10 flex items-center gap-2 px-3 py-2 bg-secondary border border-border rounded-lg mb-1 -mx-0.5">
        <IconComponent className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">{category.name}</span>
        <span className="text-xs text-muted-foreground">({templates.length})</span>
      </div>

      {/* Templates List */}
      <div className="flex flex-col gap-1 mb-3">
        {templates.map((template) => (
          <TemplateItem
            key={template.id}
            template={template}
            isSelected={selectedTemplateId === template.id}
            onClick={() => onSelectTemplate(template)}
            onDelete={onDeleteTemplate}
          />
        ))}
      </div>
    </div>
  );
}

/** Type guard to check if template is custom */
function isCustomTemplate(template: StepTemplate | CustomTemplate): template is CustomTemplate {
  return 'isCustom' in template && template.isCustom === true;
}

/**
 * Template Item Component
 * Individual template in the list
 */
function TemplateItem({
  template,
  isSelected,
  onClick,
  onDelete,
}: {
  template: StepTemplate | CustomTemplate;
  isSelected: boolean;
  onClick: () => void;
  onDelete?: (templateId: string) => void;
}) {
  const isCustom = isCustomTemplate(template);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(template.id);
    }
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex flex-col gap-0.5 px-3 py-2.5 text-left transition-all duration-150 rounded-md group relative',
        isSelected
          ? 'bg-blue-600/20 ring-1 ring-blue-500'
          : 'hover:bg-accent'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cn('text-sm font-medium flex items-center gap-1.5', isSelected ? 'text-blue-300' : 'text-foreground')}>
          {isCustom && <Star className="w-3 h-3 text-yellow-500" />}
          {template.name}
        </span>
        {isCustom && onDelete && (
          <span
            onClick={handleDelete}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-all"
            title="Delete template"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </span>
        )}
      </div>
      <code className="text-xs text-muted-foreground font-mono truncate">{template.command}</code>
      {template.description && (
        <span className="text-xs text-muted-foreground truncate">{template.description}</span>
      )}
    </button>
  );
}

/**
 * Empty State Component
 * Shown when no templates match the search
 */
function EmptyState({ searchQuery }: { searchQuery: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Search className="w-10 h-10 text-muted-foreground mb-3" />
      <p className="text-sm text-muted-foreground">
        No templates found for "<span className="text-foreground">{searchQuery}</span>"
      </p>
      <p className="text-xs text-muted-foreground mt-1">Try a different search term</p>
    </div>
  );
}

/**
 * Template Selector Component
 * Main component for browsing and selecting templates
 */
export function TemplateSelector({
  selectedTemplateId,
  onSelectTemplate,
  className,
}: TemplateSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
  const [isLoadingCustom, setIsLoadingCustom] = useState(true);

  // Load custom templates on mount
  useEffect(() => {
    const load = async () => {
      try {
        const templates = await loadCustomTemplates();
        setCustomTemplates(templates);
      } catch (error) {
        console.error('Failed to load custom templates:', error);
      } finally {
        setIsLoadingCustom(false);
      }
    };
    load();
  }, []);

  // Filter templates based on search (including custom)
  const filteredTemplates = useMemo(() => {
    return filterTemplatesWithCustom(searchQuery, customTemplates);
  }, [searchQuery, customTemplates]);

  // Group filtered templates by category
  const groupedTemplates = useMemo(() => {
    if (!searchQuery.trim()) {
      // Build groups with custom templates first
      const groups = groupTemplatesByCategory();

      if (customTemplates.length > 0) {
        // Add "My Templates" category at the beginning
        const customCategory: TemplateCategoryInfo = {
          id: 'custom' as any,
          name: 'My Templates',
          icon: 'Star',
        };
        groups.unshift({
          category: customCategory,
          templates: customTemplates,
        });
      }

      return groups;
    }

    // Group filtered templates by category
    const groups = new Map<string, (StepTemplate | CustomTemplate)[]>();

    // Separate custom templates
    const filteredCustom = filteredTemplates.filter((t) => isCustomTemplate(t));
    const filteredBuiltIn = filteredTemplates.filter((t) => !isCustomTemplate(t));

    // Add custom templates to "My Templates" group
    if (filteredCustom.length > 0) {
      groups.set('custom', filteredCustom);
    }

    // Group built-in templates by category
    for (const template of filteredBuiltIn) {
      const existing = groups.get(template.category) || [];
      groups.set(template.category, [...existing, template]);
    }

    // Build result with custom templates first
    const result: { category: TemplateCategoryInfo; templates: (StepTemplate | CustomTemplate)[] }[] = [];

    if (groups.has('custom')) {
      result.push({
        category: { id: 'custom' as any, name: 'My Templates', icon: 'Star' },
        templates: groups.get('custom') || [],
      });
    }

    // Add built-in categories
    for (const cat of TEMPLATE_CATEGORIES) {
      if (groups.has(cat.id)) {
        result.push({
          category: cat,
          templates: groups.get(cat.id) || [],
        });
      }
    }

    return result;
  }, [filteredTemplates, searchQuery, customTemplates]);

  // Handle delete custom template
  const handleDeleteTemplate = useCallback(async (templateId: string) => {
    const success = await deleteCustomTemplate(templateId);
    if (success) {
      setCustomTemplates((prev) => prev.filter((t) => t.id !== templateId));
      setImportStatus({ type: 'success', message: 'Template deleted' });
      setTimeout(() => setImportStatus(null), 2000);
    } else {
      setImportStatus({ type: 'error', message: 'Failed to delete template' });
      setTimeout(() => setImportStatus(null), 3000);
    }
  }, []);

  // Clear search
  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  // Export custom templates only (My Templates)
  const handleExport = useCallback(async () => {
    if (customTemplates.length === 0) {
      setImportStatus({ type: 'error', message: 'No custom templates to export' });
      setTimeout(() => setImportStatus(null), 3000);
      return;
    }

    try {
      const filePath = await save({
        defaultPath: 'my-templates.node.json',
        filters: [{ name: 'Node Templates', extensions: ['node.json'] }],
      });

      if (filePath) {
        const jsonContent = exportTemplatesToJson(customTemplates);
        await writeTextFile(filePath, jsonContent);
        setImportStatus({ type: 'success', message: `Exported ${customTemplates.length} custom template${customTemplates.length !== 1 ? 's' : ''}` });
        setTimeout(() => setImportStatus(null), 3000);
      }
    } catch (error) {
      console.error('Export failed:', error);
      setImportStatus({ type: 'error', message: 'Export failed' });
      setTimeout(() => setImportStatus(null), 3000);
    }
  }, [customTemplates]);

  // Import templates and add to custom templates
  const handleImport = useCallback(async () => {
    try {
      const filePath = await open({
        filters: [{ name: 'Node Templates', extensions: ['node.json', 'json'] }],
        multiple: false,
      });

      if (filePath && typeof filePath === 'string') {
        const content = await readTextFile(filePath);
        const result = parseImportedTemplates(content);

        if (result.success && result.templates && result.templates.length > 0) {
          // Import templates as custom templates
          const imported = await importTemplatesAsCustom(result.templates);

          if (imported.length > 0) {
            // Update the custom templates list immediately
            setCustomTemplates((prev) => [...imported, ...prev]);
            setImportStatus({
              type: 'success',
              message: `Imported ${imported.length} template${imported.length !== 1 ? 's' : ''}`,
            });
          } else {
            setImportStatus({ type: 'error', message: 'Failed to import templates' });
          }
        } else {
          setImportStatus({ type: 'error', message: result.error || 'No valid templates found' });
        }
        setTimeout(() => setImportStatus(null), 3000);
      }
    } catch (error) {
      console.error('Import failed:', error);
      setImportStatus({ type: 'error', message: 'Import failed' });
      setTimeout(() => setImportStatus(null), 3000);
    }
  }, []);

  const hasResults = groupedTemplates.length > 0;

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Search and Actions Row */}
      <div className="flex gap-2">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="pl-9 pr-8 bg-background border-border text-foreground"
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-accent transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Export/Import Buttons */}
        <button
          onClick={handleExport}
          className="p-2 rounded-md border border-border hover:bg-accent transition-colors"
          title="Export templates"
        >
          <Download className="w-4 h-4 text-muted-foreground" />
        </button>
        <button
          onClick={handleImport}
          className="p-2 rounded-md border border-border hover:bg-accent transition-colors"
          title="Import templates"
        >
          <Upload className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Import Status Message */}
      {importStatus && (
        <div
          className={cn(
            'text-xs px-3 py-1.5 rounded-md',
            importStatus.type === 'success'
              ? 'bg-green-900/30 text-green-400 border border-green-700/50'
              : 'bg-red-900/30 text-red-400 border border-red-700/50'
          )}
        >
          {importStatus.message}
        </div>
      )}

      {/* Templates List */}
      <div className="flex flex-col gap-2 h-[320px] overflow-y-auto px-1">
        {isLoadingCustom ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
            Loading templates...
          </div>
        ) : hasResults ? (
          groupedTemplates.map(({ category, templates }) => (
            <CategoryGroup
              key={category.id}
              category={category}
              templates={templates}
              selectedTemplateId={selectedTemplateId}
              onSelectTemplate={onSelectTemplate}
              onDeleteTemplate={handleDeleteTemplate}
            />
          ))
        ) : (
          <EmptyState searchQuery={searchQuery} />
        )}
      </div>

      {/* Template Count */}
      {hasResults && (
        <div className="text-xs text-muted-foreground text-center">
          {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} available
        </div>
      )}
    </div>
  );
}
