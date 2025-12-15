/**
 * MCP Settings Full Panel
 * Embedded version for Settings page
 */

import React from 'react';
import { Server, Bot, Code2, Terminal } from 'lucide-react';
import { McpSettingsPanel } from '../McpSettingsPanel';
import { cn } from '../../../lib/utils';

export function McpSettingsFullPanel() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Server className="w-5 h-5" />
          MCP Integration
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure the Model Context Protocol server for AI tool integration
        </p>
      </div>

      {/* Embed the McpSettingsPanel content */}
      <McpSettingsPanelContent />
    </div>
  );
}

function McpSettingsPanelContent() {
  const [showDialog, setShowDialog] = React.useState(false);

  return (
    <>
      {/* MCP Server Configuration Card */}
      <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-medium text-foreground">
              MCP Server Configuration
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Control PackageFlow from AI assistants like Claude, VS Code
              extensions, and CLI tools
            </p>
          </div>
          <button
            onClick={() => setShowDialog(true)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium',
              'bg-primary text-primary-foreground',
              'hover:bg-primary/90 transition-colors',
              'whitespace-nowrap'
            )}
          >
            Configure MCP
          </button>
        </div>

        {/* Quick Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <InfoCard
            title="Claude Code"
            description="Use with Claude Desktop or CLI"
            icon={<Bot className="w-4 h-4" />}
          />
          <InfoCard
            title="VS Code"
            description="Continue or Cline extensions"
            icon={<Code2 className="w-4 h-4" />}
          />
          <InfoCard
            title="CLI Tools"
            description="Codex, Gemini, and more"
            icon={<Terminal className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* Features Overview */}
      <div className="p-4 bg-muted/30 rounded-lg border border-border">
        <h3 className="text-sm font-medium text-foreground mb-3">
          Available MCP Tools
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ToolCategory
            title="Read Operations"
            tools={[
              'list_projects',
              'get_project',
              'list_worktrees',
              'get_git_diff',
              'list_workflows',
            ]}
          />
          <ToolCategory
            title="Write Operations"
            tools={['create_workflow', 'add_workflow_step', 'create_step_template']}
          />
          <ToolCategory
            title="Execute Operations"
            tools={['run_workflow']}
          />
          <ToolCategory
            title="More"
            tools={['get_worktree_status', 'get_workflow', 'list_step_templates']}
          />
        </div>
      </div>

      {/* Dialog */}
      <McpSettingsPanel isOpen={showDialog} onClose={() => setShowDialog(false)} />
    </>
  );
}

interface InfoCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

function InfoCard({ title, description, icon }: InfoCardProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg',
        'bg-card border border-border',
        'transition-colors'
      )}
    >
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div className="min-w-0">
        <div className="text-sm font-medium text-foreground">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
    </div>
  );
}

interface ToolCategoryProps {
  title: string;
  tools: string[];
}

function ToolCategory({ title, tools }: ToolCategoryProps) {
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground mb-2">
        {title}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {tools.map((tool) => (
          <span
            key={tool}
            className={cn(
              'px-2 py-0.5 rounded',
              'bg-muted text-muted-foreground',
              'text-xs font-mono'
            )}
          >
            {tool}
          </span>
        ))}
      </div>
    </div>
  );
}
