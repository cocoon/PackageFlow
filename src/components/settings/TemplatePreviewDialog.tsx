/**
 * TemplatePreviewDialog - Professional dialog for viewing prompt template details
 * Follows the UI design specification pattern
 */

import * as React from 'react';
import {
  X,
  Copy,
  Check,
  GitCommit,
  GitPullRequest,
  Code,
  BookOpen,
  FileCode,
  ShieldAlert,
  Sparkles,
  Star,
  Layers,
} from 'lucide-react';
import type { PromptTemplate, TemplateCategory } from '../../types/ai';
import { getCategoryInfo } from '../../types/ai';
import { cn } from '../../lib/utils';
import { isTopModal, registerModal, unregisterModal } from '../ui/modalStack';

// Category icons
const CATEGORY_ICONS: Record<TemplateCategory, React.ReactNode> = {
  git_commit: <GitCommit className="w-6 h-6" />,
  pull_request: <GitPullRequest className="w-6 h-6" />,
  code_review: <Code className="w-6 h-6" />,
  documentation: <BookOpen className="w-6 h-6" />,
  release_notes: <FileCode className="w-6 h-6" />,
  security_advisory: <ShieldAlert className="w-6 h-6" />,
  custom: <Sparkles className="w-6 h-6" />,
};

// Category color configurations for dialog variants
const CATEGORY_DIALOG_CONFIG: Record<TemplateCategory, {
  gradient: string;
  gradientLight: string;
  iconColor: string;
  iconBg: string;
  accentBorder: string;
  badge: string;
}> = {
  git_commit: {
    gradient: 'from-orange-500/20 via-orange-600/10 to-transparent',
    gradientLight: 'from-orange-500/10 via-orange-600/5 to-transparent',
    iconColor: 'text-orange-400',
    iconBg: 'bg-orange-500/10 border-orange-500/20',
    accentBorder: 'border-orange-500/30',
    badge: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  },
  pull_request: {
    gradient: 'from-purple-500/20 via-purple-600/10 to-transparent',
    gradientLight: 'from-purple-500/10 via-purple-600/5 to-transparent',
    iconColor: 'text-purple-400',
    iconBg: 'bg-purple-500/10 border-purple-500/20',
    accentBorder: 'border-purple-500/30',
    badge: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  },
  code_review: {
    gradient: 'from-blue-500/20 via-blue-600/10 to-transparent',
    gradientLight: 'from-blue-500/10 via-blue-600/5 to-transparent',
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-500/10 border-blue-500/20',
    accentBorder: 'border-blue-500/30',
    badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  documentation: {
    gradient: 'from-green-500/20 via-green-600/10 to-transparent',
    gradientLight: 'from-green-500/10 via-green-600/5 to-transparent',
    iconColor: 'text-green-400',
    iconBg: 'bg-green-500/10 border-green-500/20',
    accentBorder: 'border-green-500/30',
    badge: 'bg-green-500/10 text-green-600 dark:text-green-400',
  },
  release_notes: {
    gradient: 'from-cyan-500/20 via-cyan-600/10 to-transparent',
    gradientLight: 'from-cyan-500/10 via-cyan-600/5 to-transparent',
    iconColor: 'text-cyan-400',
    iconBg: 'bg-cyan-500/10 border-cyan-500/20',
    accentBorder: 'border-cyan-500/30',
    badge: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  },
  security_advisory: {
    gradient: 'from-amber-500/20 via-amber-600/10 to-transparent',
    gradientLight: 'from-amber-500/10 via-amber-600/5 to-transparent',
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/10 border-amber-500/20',
    accentBorder: 'border-amber-500/30',
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  custom: {
    gradient: 'from-pink-500/20 via-pink-600/10 to-transparent',
    gradientLight: 'from-pink-500/10 via-pink-600/5 to-transparent',
    iconColor: 'text-pink-400',
    iconBg: 'bg-pink-500/10 border-pink-500/20',
    accentBorder: 'border-pink-500/30',
    badge: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
  },
};

// Sample values for preview
const SAMPLE_VALUES: Record<string, string> = {
  diff: `diff --git a/src/Button.tsx b/src/Button.tsx
index 1234567..abcdef0 100644
--- a/src/Button.tsx
+++ b/src/Button.tsx
@@ -5,7 +5,12 @@ interface ButtonProps {
  children: React.ReactNode;
+  variant?: 'primary' | 'secondary';
}`,
  commits: `feat: add dark mode support
fix: resolve memory leak in useEffect
docs: update README with examples`,
  branch: 'feature/dark-mode',
  base_branch: 'main',
  code: `function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}`,
  file_path: 'src/utils/calculate.ts',
  function_name: 'calculateTotal',
  version: '1.2.0',
  previous_version: '1.1.0',
  input: 'User provided input content',
  vulnerability_json: '{"name": "lodash", "severity": "high", "cve": "CVE-2021-23337"}',
  project_context: 'PackageFlow - A desktop application for managing Node.js projects',
  severity_summary: 'Critical: 0, High: 2, Moderate: 5, Low: 3',
};

interface TemplatePreviewDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Handler for open state changes */
  onOpenChange: (open: boolean) => void;
  /** Template to preview */
  template: PromptTemplate | null;
}

export function TemplatePreviewDialog({
  open,
  onOpenChange,
  template,
}: TemplatePreviewDialogProps) {
  const modalId = React.useId();
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [copiedSection, setCopiedSection] = React.useState<string | null>(null);

  // Register/unregister modal
  React.useEffect(() => {
    if (!open) return;
    registerModal(modalId);
    return () => unregisterModal(modalId);
  }, [modalId, open]);

  // Handle ESC key
  React.useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (!isTopModal(modalId)) return;
      e.preventDefault();
      onOpenChange(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [modalId, onOpenChange, open]);

  // Focus content area when opened
  React.useEffect(() => {
    if (open && contentRef.current) {
      const timer = setTimeout(() => {
        contentRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onOpenChange(false);
    }
  };

  // Copy handler
  const handleCopy = React.useCallback(async (section: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  if (!open || !template) return null;

  const categoryInfo = getCategoryInfo(template.category);
  const config = CATEGORY_DIALOG_CONFIG[template.category] || CATEGORY_DIALOG_CONFIG.custom;
  const IconComponent = CATEGORY_ICONS[template.category];

  // Generate preview by replacing variables
  let previewContent = template.template;
  Object.entries(SAMPLE_VALUES).forEach(([key, value]) => {
    previewContent = previewContent.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  });

  // Extract used variables
  const usedVariables = (categoryInfo?.variables || []).filter(
    (v) => template.template.includes(`{${v}}`)
  );

  return (
    <div
      className={cn('fixed inset-0 z-50', 'animate-in fade-in-0 duration-200')}
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-preview-dialog-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Dialog container */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div
          className={cn(
            'relative w-full max-w-3xl max-h-[85vh]',
            'bg-background rounded-2xl',
            'border',
            config.accentBorder,
            'shadow-2xl shadow-black/60',
            'animate-in fade-in-0 zoom-in-95 duration-200',
            'slide-in-from-bottom-4',
            'flex flex-col overflow-hidden'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with gradient */}
          <div
            className={cn(
              'relative px-6 py-5',
              'border-b border-border',
              'bg-gradient-to-r',
              'dark:' + config.gradient,
              config.gradientLight
            )}
          >
            {/* Close button */}
            <button
              onClick={() => onOpenChange(false)}
              className={cn(
                'absolute right-4 top-4',
                'p-2 rounded-lg',
                'text-muted-foreground hover:text-foreground',
                'hover:bg-accent/50',
                'transition-colors duration-150',
                'focus:outline-none focus:ring-2 focus:ring-ring'
              )}
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Title area with icon badge */}
            <div className="flex items-start gap-4 pr-10">
              <div
                className={cn(
                  'flex-shrink-0',
                  'w-12 h-12 rounded-xl',
                  'flex items-center justify-center',
                  'bg-background/80 dark:bg-background/50 backdrop-blur-sm',
                  'border',
                  config.iconBg,
                  'shadow-lg'
                )}
              >
                <span className={config.iconColor}>{IconComponent}</span>
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2
                    id="template-preview-dialog-title"
                    className="text-lg font-semibold text-foreground leading-tight"
                  >
                    {template.name}
                  </h2>
                  {template.isDefault && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded text-xs font-medium">
                      <Star className="w-3 h-3" />
                      Default
                    </span>
                  )}
                  {template.isBuiltin && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded text-xs font-medium">
                      <Layers className="w-3 h-3" />
                      Built-in
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {categoryInfo?.name} Template
                  {template.description && ` - ${template.description}`}
                </p>
              </div>
            </div>
          </div>

          {/* Content area */}
          <div
            ref={contentRef}
            className="flex-1 overflow-y-auto min-h-0 focus:outline-none p-6 space-y-6"
            tabIndex={-1}
          >
            {/* Variables Used */}
            {usedVariables.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2">Variables Used</h4>
                <div className="flex flex-wrap gap-2">
                  {usedVariables.map((v) => (
                    <span
                      key={v}
                      className={cn(
                        'px-2 py-1 rounded text-xs font-mono',
                        config.badge
                      )}
                    >
                      {`{${v}}`}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Template Content */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-foreground">Template Content</h4>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {template.template.length} characters
                  </span>
                  <button
                    onClick={() => handleCopy('template', template.template)}
                    className={cn(
                      'flex items-center gap-1 px-2 py-1 rounded text-xs',
                      'text-muted-foreground hover:text-foreground',
                      'hover:bg-accent transition-colors'
                    )}
                    title="Copy template"
                  >
                    {copiedSection === 'template' ? (
                      <>
                        <Check className="w-3 h-3 text-green-500" />
                        <span className="text-green-500">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              <pre
                className={cn(
                  'p-4 rounded-lg text-sm font-mono',
                  'bg-muted/50 border border-border',
                  'whitespace-pre-wrap overflow-x-auto',
                  'max-h-48'
                )}
              >
                {template.template}
              </pre>
            </div>

            {/* Expanded Preview */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-foreground">Expanded Preview</h4>
                <div className="flex items-center gap-2">
                  <span className={cn('text-xs px-2 py-0.5 rounded', config.badge)}>
                    with sample values
                  </span>
                  <button
                    onClick={() => handleCopy('preview', previewContent)}
                    className={cn(
                      'flex items-center gap-1 px-2 py-1 rounded text-xs',
                      'text-muted-foreground hover:text-foreground',
                      'hover:bg-accent transition-colors'
                    )}
                    title="Copy expanded preview"
                  >
                    {copiedSection === 'preview' ? (
                      <>
                        <Check className="w-3 h-3 text-green-500" />
                        <span className="text-green-500">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              <pre
                className={cn(
                  'p-4 rounded-lg text-sm font-mono',
                  'bg-card border border-border',
                  'whitespace-pre-wrap overflow-x-auto',
                  'max-h-80'
                )}
              >
                {previewContent}
              </pre>
            </div>
          </div>

          {/* Footer with actions */}
          <div
            className={cn(
              'px-6 py-4',
              'border-t border-border',
              'bg-card/50',
              'flex items-center justify-between gap-4',
              'flex-shrink-0'
            )}
          >
            {/* Left side - metadata */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className={cn('px-2 py-1 rounded', config.badge)}>
                {categoryInfo?.name}
              </span>
              {template.outputFormat && (
                <span className="px-2 py-1 rounded bg-muted">
                  Format: {template.outputFormat}
                </span>
              )}
            </div>

            {/* Right side - close button */}
            <button
              onClick={() => onOpenChange(false)}
              className={cn(
                'px-4 py-2 rounded-lg',
                'text-sm font-medium',
                'bg-secondary hover:bg-accent',
                'text-foreground',
                'border border-border',
                'transition-colors duration-150',
                'focus:outline-none focus:ring-2 focus:ring-ring'
              )}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
