/**
 * Prompt Template Settings Panel
 * Opens the existing PromptTemplateEditor dialog
 */

import React from 'react';
import { FileText, GitCommit, GitPullRequest, Search, FileCode, Tag, Sparkles } from 'lucide-react';
import { PromptTemplateEditor } from '../PromptTemplateEditor';

export function PromptTemplatePanel() {
  const [showDialog, setShowDialog] = React.useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Prompt Templates
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Customize prompts for AI-powered features
        </p>
      </div>

      {/* Quick Actions */}
      <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-foreground">Manage Templates</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Create and customize prompt templates for different use cases
            </p>
          </div>
          <button
            onClick={() => setShowDialog(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Open Editor
          </button>
        </div>
      </div>

      {/* Template Categories */}
      <div className="p-4 bg-muted/30 rounded-lg border border-border">
        <h3 className="text-sm font-medium text-foreground mb-3">Template Categories</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <CategoryCard
            title="Git Commit"
            description="Generate commit messages from diffs"
            icon={<GitCommit className="w-4 h-4" />}
          />
          <CategoryCard
            title="Pull Request"
            description="Generate PR descriptions"
            icon={<GitPullRequest className="w-4 h-4" />}
          />
          <CategoryCard
            title="Code Review"
            description="Review code changes"
            icon={<Search className="w-4 h-4" />}
          />
          <CategoryCard
            title="Documentation"
            description="Generate code documentation"
            icon={<FileCode className="w-4 h-4" />}
          />
          <CategoryCard
            title="Release Notes"
            description="Create release summaries"
            icon={<Tag className="w-4 h-4" />}
          />
          <CategoryCard
            title="Custom"
            description="Your custom prompts"
            icon={<Sparkles className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* Dialog */}
      <PromptTemplateEditor
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
      />
    </div>
  );
}

interface CategoryCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

function CategoryCard({ title, description, icon }: CategoryCardProps) {
  return (
    <div className="flex items-start gap-3 p-3 bg-card rounded-lg border border-border transition-colors">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div className="min-w-0">
        <div className="text-sm font-medium text-foreground">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
    </div>
  );
}
