/**
 * AIReviewDialog - Professional AI Code Review dialog component
 * Provides a polished UI for displaying AI-generated code review feedback
 */

import * as React from 'react';
import { Sparkles, Copy, Check, RefreshCw, X, FileSearch, AlertTriangle } from 'lucide-react';
import { marked } from 'marked';
import { cn } from '../../lib/utils';
import { isTopModal, registerModal, unregisterModal } from './modalStack';

type DialogVariant = 'code-review' | 'staged-review';

interface AIReviewDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Handler for open state changes */
  onOpenChange: (open: boolean) => void;
  /** Dialog title */
  title: string;
  /** Optional subtitle (e.g., file path) */
  subtitle?: string;
  /** Markdown content to display */
  content: string;
  /** Number of tokens used (optional) */
  tokensUsed?: number | null;
  /** Handler for regenerate action (optional) */
  onRegenerate?: () => void;
  /** Whether regeneration is in progress */
  isRegenerating?: boolean;
  /** Visual variant of the dialog */
  variant?: DialogVariant;
  /** Whether the response was truncated due to token limit */
  isTruncated?: boolean;
}

const variantConfig: Record<
  DialogVariant,
  {
    icon: typeof Sparkles;
    gradient: string;
    gradientLight: string;
    iconColor: string;
    iconBg: string;
    accentBorder: string;
  }
> = {
  'code-review': {
    icon: Sparkles,
    gradient: 'from-purple-500/20 via-purple-600/10 to-transparent',
    gradientLight: 'from-purple-500/10 via-purple-600/5 to-transparent',
    iconColor: 'text-purple-400',
    iconBg: 'bg-purple-500/10 border-purple-500/20',
    accentBorder: 'border-purple-500/30',
  },
  'staged-review': {
    icon: FileSearch,
    gradient: 'from-blue-500/20 via-blue-600/10 to-transparent',
    gradientLight: 'from-blue-500/10 via-blue-600/5 to-transparent',
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-500/10 border-blue-500/20',
    accentBorder: 'border-blue-500/30',
  },
};

export function AIReviewDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  content,
  tokensUsed,
  onRegenerate,
  isRegenerating = false,
  variant = 'code-review',
  isTruncated = false,
}: AIReviewDialogProps) {
  const modalId = React.useId();
  const [copied, setCopied] = React.useState(false);
  const contentRef = React.useRef<HTMLDivElement>(null);

  const config = variantConfig[variant];
  const IconComponent = config.icon;

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

  // Focus trap - focus content area when opened
  React.useEffect(() => {
    if (open && contentRef.current) {
      const timer = setTimeout(() => {
        contentRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Parse markdown content
  const parsedContent = React.useMemo(() => {
    if (!content) return '';
    return marked.parse(content);
  }, [content]);

  // Copy raw markdown to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onOpenChange(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className={cn('fixed inset-0 z-50', 'animate-in fade-in-0 duration-200')}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-review-dialog-title"
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
              'bg-gradient-to-r dark:' + config.gradient,
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
                <IconComponent className={cn('w-6 h-6', config.iconColor)} />
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <h2
                  id="ai-review-dialog-title"
                  className="text-lg font-semibold text-foreground leading-tight"
                >
                  {title}
                </h2>
                {subtitle && (
                  <p
                    className="mt-1 text-sm text-muted-foreground truncate"
                    title={subtitle}
                  >
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Truncation Warning */}
          {isTruncated && (
            <div
              className={cn(
                'mx-6 mt-4 p-3 rounded-lg',
                'bg-yellow-500/10 border border-yellow-500/30',
                'flex items-center gap-2 text-sm',
                'text-yellow-700 dark:text-yellow-400'
              )}
            >
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>
                This review may be incomplete due to response length limits.
                Consider reviewing individual files for more detailed feedback.
              </span>
            </div>
          )}

          {/* Content area */}
          <div
            ref={contentRef}
            className="flex-1 overflow-y-auto min-h-0 focus:outline-none"
            tabIndex={-1}
          >
            {parsedContent ? (
              <div
                className={cn(
                  'p-6',
                  // Enhanced prose styling for code review
                  'prose prose-sm dark:prose-invert max-w-none',
                  // Headings
                  'prose-headings:text-foreground prose-headings:font-semibold',
                  'prose-h1:text-xl prose-h2:text-lg prose-h3:text-base',
                  'prose-h1:border-b prose-h1:border-border prose-h1:pb-2 prose-h1:mb-4',
                  'prose-h2:mt-6 prose-h2:mb-3',
                  'prose-h3:mt-4 prose-h3:mb-2',
                  // Paragraphs
                  'prose-p:text-foreground/90 prose-p:leading-relaxed',
                  // Lists
                  'prose-ul:my-3 prose-ol:my-3',
                  'prose-li:text-foreground/90 prose-li:my-1',
                  // Code blocks
                  'prose-pre:bg-muted/50 prose-pre:border prose-pre:border-border prose-pre:rounded-lg',
                  'prose-pre:shadow-inner prose-pre:my-4',
                  // Inline code
                  'prose-code:text-primary prose-code:font-medium',
                  'prose-code:before:content-none prose-code:after:content-none',
                  'prose-code:bg-muted/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded',
                  // Links
                  'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
                  // Blockquotes
                  'prose-blockquote:border-l-primary/50 prose-blockquote:bg-muted/30',
                  'prose-blockquote:rounded-r-lg prose-blockquote:py-1 prose-blockquote:px-4',
                  'prose-blockquote:not-italic prose-blockquote:text-muted-foreground',
                  // Strong/Bold
                  'prose-strong:text-foreground prose-strong:font-semibold',
                  // Horizontal rules
                  'prose-hr:border-border prose-hr:my-6'
                )}
                dangerouslySetInnerHTML={{ __html: parsedContent }}
              />
            ) : (
              <div className="flex items-center justify-center h-32">
                <p className="text-muted-foreground">No review content</p>
              </div>
            )}
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
              {tokensUsed !== null && tokensUsed !== undefined && (
                <span
                  className={cn(
                    'flex items-center gap-1.5',
                    'px-2.5 py-1.5 rounded-lg',
                    'bg-muted/50 border border-border'
                  )}
                >
                  <span className="font-medium text-foreground">
                    {tokensUsed.toLocaleString()}
                  </span>
                  <span>tokens</span>
                </span>
              )}
              <span className="hidden sm:inline">Powered by AI</span>
            </div>

            {/* Right side - actions */}
            <div className="flex items-center gap-2">
              {onRegenerate && (
                <button
                  onClick={onRegenerate}
                  disabled={isRegenerating}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg',
                    'text-sm font-medium',
                    'text-muted-foreground hover:text-foreground',
                    'hover:bg-accent',
                    'border border-transparent hover:border-border',
                    'transition-all duration-150',
                    'focus:outline-none focus:ring-2 focus:ring-ring',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  <RefreshCw
                    className={cn('w-4 h-4', isRegenerating && 'animate-spin')}
                  />
                  <span className="hidden sm:inline">Regenerate</span>
                </button>
              )}
              <button
                onClick={handleCopy}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg',
                  'text-sm font-medium',
                  'text-muted-foreground hover:text-foreground',
                  'hover:bg-accent',
                  'border border-transparent hover:border-border',
                  'transition-all duration-150',
                  'focus:outline-none focus:ring-2 focus:ring-ring'
                )}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-green-500">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span className="hidden sm:inline">Copy</span>
                  </>
                )}
              </button>
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
    </div>
  );
}
