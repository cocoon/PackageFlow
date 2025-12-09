/**
 * Built-in Step Templates
 * Pre-defined workflow step templates for common development tasks
 * Focus on commands that are useful but hard to remember
 */

import type {
  StepTemplate,
  TemplateCategory,
  TemplateCategoryInfo,
  GroupedTemplates,
  TemplateExportData,
  CustomTemplate,
} from '../types/step-template';
import type { WorkflowNode } from '../types/workflow';
import { isScriptNodeConfig } from '../types/workflow';
import { stepTemplateAPI, type CustomStepTemplate } from '../lib/tauri-api';

/** Category metadata for display */
export const TEMPLATE_CATEGORIES: TemplateCategoryInfo[] = [
  { id: 'package-manager', name: 'Package Manager', icon: 'Package' },
  { id: 'git', name: 'Git Operations', icon: 'GitBranch' },
  { id: 'docker', name: 'Docker', icon: 'Container' },
  { id: 'shell', name: 'Shell & System', icon: 'Terminal' },
  { id: 'testing', name: 'Testing', icon: 'TestTube' },
  { id: 'code-quality', name: 'Code Quality', icon: 'CheckCircle' },
];

/** Built-in step templates */
export const STEP_TEMPLATES: StepTemplate[] = [
  // Package Manager
  {
    id: 'pm-clean-install',
    name: 'Clean Install',
    command: 'rm -rf node_modules && {pm} install',
    category: 'package-manager',
    description: 'Remove node_modules and reinstall',
  },
  {
    id: 'pm-full-reset',
    name: 'Full Reset',
    command: 'rm -rf node_modules package-lock.json pnpm-lock.yaml yarn.lock && {pm} install',
    category: 'package-manager',
    description: 'Remove all lock files and reinstall',
  },
  {
    id: 'pm-audit-fix',
    name: 'Audit & Fix',
    command: '{pm} audit fix',
    category: 'package-manager',
    description: 'Check and auto-fix security vulnerabilities',
  },
  {
    id: 'pm-why',
    name: 'Why Package',
    command: '{pm} why <package-name>',
    category: 'package-manager',
    description: 'Show why a package is installed',
  },
  {
    id: 'pm-link',
    name: 'Link Local Package',
    command: '{pm} link <path-to-local-package>',
    category: 'package-manager',
    description: 'Link a local package for development',
  },
  {
    id: 'pm-dedupe',
    name: 'Deduplicate',
    command: '{pm} dedupe',
    category: 'package-manager',
    description: 'Remove duplicate package dependencies',
  },

  // Git Operations
  {
    id: 'git-amend-no-edit',
    name: 'Amend Last Commit',
    command: 'git commit --amend --no-edit',
    category: 'git',
    description: 'Add staged changes to last commit without editing message',
  },
  {
    id: 'git-undo-commit',
    name: 'Undo Last Commit',
    command: 'git reset --soft HEAD~1',
    category: 'git',
    description: 'Undo last commit but keep changes staged',
  },
  {
    id: 'git-stash-named',
    name: 'Stash with Name',
    command: 'git stash push -m "<stash-name>"',
    category: 'git',
    description: 'Stash changes with a descriptive name',
  },
  {
    id: 'git-stash-list',
    name: 'List Stashes',
    command: 'git stash list',
    category: 'git',
    description: 'List all stashed changes',
  },
  {
    id: 'git-clean-untracked',
    name: 'Clean Untracked Files',
    command: 'git clean -fd',
    category: 'git',
    description: 'Remove all untracked files and directories',
  },
  {
    id: 'git-log-pretty',
    name: 'Pretty Log',
    command: 'git log --oneline --graph --decorate -20',
    category: 'git',
    description: 'Show last 20 commits in graph format',
  },
  {
    id: 'git-cherry-pick',
    name: 'Cherry Pick',
    command: 'git cherry-pick <commit-hash>',
    category: 'git',
    description: 'Apply a specific commit to current branch',
  },
  {
    id: 'git-reflog',
    name: 'Show Reflog',
    command: 'git reflog -20',
    category: 'git',
    description: 'Show HEAD history (recover deleted commits)',
  },
  {
    id: 'git-branch-cleanup',
    name: 'Cleanup Merged Branches',
    command: 'git branch --merged | grep -v "\\*\\|main\\|master" | xargs -n 1 git branch -d',
    category: 'git',
    description: 'Delete all merged local branches',
  },
  {
    id: 'git-fetch-prune',
    name: 'Fetch & Prune',
    command: 'git fetch --prune',
    category: 'git',
    description: 'Fetch and remove deleted remote branches',
  },

  // Docker
  {
    id: 'docker-build',
    name: 'Build Image',
    command: 'docker build -t <image-name>:<tag> .',
    category: 'docker',
    description: 'Build image from Dockerfile',
  },
  {
    id: 'docker-run-it',
    name: 'Run Interactive',
    command: 'docker run -it --rm <image-name> /bin/sh',
    category: 'docker',
    description: 'Run container interactively (auto-remove on exit)',
  },
  {
    id: 'docker-run-port',
    name: 'Run with Port',
    command: 'docker run -d -p 3000:3000 --name <container-name> <image-name>',
    category: 'docker',
    description: 'Run detached with port mapping',
  },
  {
    id: 'docker-compose-up',
    name: 'Compose Up',
    command: 'docker compose up -d',
    category: 'docker',
    description: 'Start all services in background',
  },
  {
    id: 'docker-compose-down',
    name: 'Compose Down',
    command: 'docker compose down -v',
    category: 'docker',
    description: 'Stop services and remove volumes',
  },
  {
    id: 'docker-compose-logs',
    name: 'Compose Logs',
    command: 'docker compose logs -f --tail=100',
    category: 'docker',
    description: 'Follow last 100 lines of service logs',
  },
  {
    id: 'docker-exec',
    name: 'Exec into Container',
    command: 'docker exec -it <container-name> /bin/sh',
    category: 'docker',
    description: 'Open shell in running container',
  },
  {
    id: 'docker-logs',
    name: 'Follow Logs',
    command: 'docker logs -f --tail=100 <container-name>',
    category: 'docker',
    description: 'Follow container logs',
  },
  {
    id: 'docker-prune-all',
    name: 'System Prune',
    command: 'docker system prune -af --volumes',
    category: 'docker',
    description: 'Remove all unused images, containers, networks and volumes',
  },
  {
    id: 'docker-stop-all',
    name: 'Stop All Containers',
    command: 'docker stop $(docker ps -aq)',
    category: 'docker',
    description: 'Stop all running containers',
  },
  {
    id: 'docker-rm-all',
    name: 'Remove All Containers',
    command: 'docker rm $(docker ps -aq)',
    category: 'docker',
    description: 'Remove all containers',
  },
  {
    id: 'docker-rmi-dangling',
    name: 'Remove Dangling Images',
    command: 'docker rmi $(docker images -f "dangling=true" -q)',
    category: 'docker',
    description: 'Remove all dangling images',
  },

  // Shell & System
  {
    id: 'shell-kill-port',
    name: 'Kill Process on Port',
    command: 'lsof -ti:<port> | xargs kill -9',
    category: 'shell',
    description: 'Kill process using specified port',
  },
  {
    id: 'shell-ports',
    name: 'Show Listening Ports',
    command: 'lsof -i -P -n | grep LISTEN',
    category: 'shell',
    description: 'Show all listening ports',
  },
  {
    id: 'shell-find-large',
    name: 'Find Large Files',
    command: 'find . -type f -size +100M -exec ls -lh {} \\;',
    category: 'shell',
    description: 'Find files larger than 100MB',
  },
  {
    id: 'shell-disk-usage',
    name: 'Disk Usage',
    command: 'du -sh * | sort -hr | head -20',
    category: 'shell',
    description: 'Show 20 largest items in current directory',
  },
  {
    id: 'shell-delete-node-modules',
    name: 'Delete All node_modules',
    command: 'find . -name "node_modules" -type d -prune -exec rm -rf {} +',
    category: 'shell',
    description: 'Recursively delete all node_modules folders',
  },
  {
    id: 'shell-delete-ds-store',
    name: 'Delete .DS_Store',
    command: 'find . -name ".DS_Store" -type f -delete',
    category: 'shell',
    description: 'Delete all .DS_Store files',
  },
  {
    id: 'shell-env-from-example',
    name: 'Create .env from Example',
    command: 'cp .env.example .env',
    category: 'shell',
    description: 'Copy .env.example to .env',
  },
  {
    id: 'shell-watch-files',
    name: 'Watch File Changes',
    command: 'fswatch -o . | xargs -n1 -I{} echo "Changed"',
    category: 'shell',
    description: 'Watch for file changes in directory',
  },
  {
    id: 'shell-tar-create',
    name: 'Create Tar Archive',
    command: 'tar -czvf archive.tar.gz <directory>',
    category: 'shell',
    description: 'Create gzip compressed archive',
  },
  {
    id: 'shell-tar-extract',
    name: 'Extract Tar Archive',
    command: 'tar -xzvf archive.tar.gz',
    category: 'shell',
    description: 'Extract gzip compressed archive',
  },

  // Testing
  {
    id: 'test-coverage',
    name: 'Test with Coverage',
    command: '{pm} test -- --coverage',
    category: 'testing',
    description: 'Run tests with coverage report',
  },
  {
    id: 'test-update-snapshot',
    name: 'Update Snapshots',
    command: '{pm} test -- -u',
    category: 'testing',
    description: 'Update all test snapshots',
  },
  {
    id: 'test-watch',
    name: 'Watch Mode',
    command: '{pm} test -- --watch',
    category: 'testing',
    description: 'Run tests in watch mode',
  },
  {
    id: 'test-single',
    name: 'Test Single File',
    command: '{pm} test -- <file-pattern>',
    category: 'testing',
    description: 'Run tests matching file pattern',
  },
  {
    id: 'test-e2e',
    name: 'E2E Tests',
    command: '{pm} run test:e2e',
    category: 'testing',
    description: 'Run end-to-end tests',
  },
  {
    id: 'test-ci',
    name: 'CI Mode',
    command: '{pm} test -- --ci --runInBand',
    category: 'testing',
    description: 'Run tests in CI mode (single thread)',
  },

  // Code Quality
  {
    id: 'quality-lint-fix',
    name: 'Lint & Fix',
    command: '{pm} run lint -- --fix',
    category: 'code-quality',
    description: 'Check and auto-fix lint issues',
  },
  {
    id: 'quality-typecheck',
    name: 'Type Check',
    command: 'npx tsc --noEmit',
    category: 'code-quality',
    description: 'TypeScript type check without output',
  },
  {
    id: 'quality-format',
    name: 'Format All',
    command: 'npx prettier --write "**/*.{ts,tsx,js,jsx,json,css,md}"',
    category: 'code-quality',
    description: 'Format all code files',
  },
  {
    id: 'quality-format-check',
    name: 'Format Check',
    command: 'npx prettier --check "**/*.{ts,tsx,js,jsx,json,css,md}"',
    category: 'code-quality',
    description: 'Check formatting without modifying',
  },
  {
    id: 'quality-unused-deps',
    name: 'Find Unused Dependencies',
    command: 'npx depcheck',
    category: 'code-quality',
    description: 'Find unused package dependencies',
  },
  {
    id: 'quality-bundle-analyze',
    name: 'Analyze Bundle',
    command: 'npx vite-bundle-analyzer',
    category: 'code-quality',
    description: 'Analyze bundle size',
  },
];

/**
 * Resolve placeholders in a command
 * @param command - Command string with placeholders
 * @param packageManager - Package manager to use (npm, pnpm, yarn)
 * @returns Resolved command string
 */
export function resolveCommand(command: string, packageManager: string = 'npm'): string {
  return command.replace(/{pm}/g, packageManager);
}

/**
 * Group templates by category for display
 * @returns Array of grouped templates
 */
export function groupTemplatesByCategory(): GroupedTemplates[] {
  const categoryMap = new Map<TemplateCategory, StepTemplate[]>();

  // Initialize all categories
  for (const category of TEMPLATE_CATEGORIES) {
    categoryMap.set(category.id, []);
  }

  // Group templates
  for (const template of STEP_TEMPLATES) {
    const templates = categoryMap.get(template.category);
    if (templates) {
      templates.push(template);
    }
  }

  // Build result array in category order
  return TEMPLATE_CATEGORIES.map((category) => ({
    category,
    templates: categoryMap.get(category.id) || [],
  })).filter((group) => group.templates.length > 0);
}

/**
 * Filter templates by search query
 * @param query - Search query (case-insensitive)
 * @returns Filtered templates
 */
export function filterTemplates(query: string): StepTemplate[] {
  if (!query.trim()) {
    return STEP_TEMPLATES;
  }

  const lowerQuery = query.toLowerCase();
  return STEP_TEMPLATES.filter(
    (template) =>
      template.name.toLowerCase().includes(lowerQuery) ||
      template.command.toLowerCase().includes(lowerQuery) ||
      (template.description?.toLowerCase().includes(lowerQuery) ?? false)
  );
}

/**
 * Get category info by ID
 * @param categoryId - Category identifier
 * @returns Category info or undefined
 */
export function getCategoryInfo(categoryId: TemplateCategory): TemplateCategoryInfo | undefined {
  return TEMPLATE_CATEGORIES.find((c) => c.id === categoryId);
}

/**
 * Export templates to JSON format
 * @param templates - Templates to export
 * @returns Export data object
 */
export function exportTemplates(templates: StepTemplate[]): TemplateExportData {
  return {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    templates,
  };
}

/**
 * Export templates to JSON string
 * @param templates - Templates to export
 * @returns JSON string
 */
export function exportTemplatesToJson(templates: StepTemplate[]): string {
  return JSON.stringify(exportTemplates(templates), null, 2);
}

/**
 * Parse and validate imported template data
 * @param jsonString - JSON string to parse
 * @returns Parsed templates or error
 */
export function parseImportedTemplates(jsonString: string): {
  success: boolean;
  templates?: StepTemplate[];
  error?: string;
} {
  try {
    const data = JSON.parse(jsonString);

    // Validate structure
    if (!data.templates || !Array.isArray(data.templates)) {
      return { success: false, error: 'Invalid format: missing templates array' };
    }

    // Validate each template
    const validCategories: TemplateCategory[] = [
      'package-manager',
      'git',
      'docker',
      'shell',
      'testing',
      'code-quality',
      'custom',
    ];

    const validatedTemplates: StepTemplate[] = [];

    for (const template of data.templates) {
      // Required fields
      if (!template.id || typeof template.id !== 'string') {
        return { success: false, error: 'Invalid template: missing or invalid id' };
      }
      if (!template.name || typeof template.name !== 'string') {
        return { success: false, error: `Invalid template "${template.id}": missing or invalid name` };
      }
      if (!template.command || typeof template.command !== 'string') {
        return { success: false, error: `Invalid template "${template.id}": missing or invalid command` };
      }
      if (!template.category || !validCategories.includes(template.category)) {
        return {
          success: false,
          error: `Invalid template "${template.id}": invalid category "${template.category}"`,
        };
      }

      validatedTemplates.push({
        id: template.id,
        name: template.name,
        command: template.command,
        category: template.category,
        description: template.description || undefined,
      });
    }

    return { success: true, templates: validatedTemplates };
  } catch {
    return { success: false, error: 'Invalid JSON format' };
  }
}

/**
 * Get all templates (built-in)
 * @returns All built-in templates
 */
export function getAllTemplates(): StepTemplate[] {
  return [...STEP_TEMPLATES];
}

// ============================================================================
// Custom Template Storage (uses Tauri Store)
// ============================================================================

/** Convert Tauri CustomStepTemplate to frontend CustomTemplate */
function toCustomTemplate(t: CustomStepTemplate): CustomTemplate {
  return {
    id: t.id,
    name: t.name,
    command: t.command,
    category: t.category,
    description: t.description,
    isCustom: true,
    createdAt: t.createdAt,
  };
}

/**
 * Load custom templates from Tauri store
 */
export async function loadCustomTemplates(): Promise<CustomTemplate[]> {
  try {
    const response = await stepTemplateAPI.loadCustomTemplates();
    if (response.success && response.templates) {
      return response.templates.map(toCustomTemplate);
    }
    return [];
  } catch (error) {
    console.error('Failed to load custom templates:', error);
    return [];
  }
}

/**
 * Save a workflow node as a custom template
 * @param node - The workflow node to save
 * @param templateName - Name for the template
 * @param category - Category for the template
 * @returns The created custom template or null if failed
 */
export async function saveNodeAsTemplate(
  node: WorkflowNode,
  templateName: string,
  category: TemplateCategory = 'shell'
): Promise<CustomTemplate | null> {
  try {
    // Only script nodes can be saved as templates
    if (!isScriptNodeConfig(node.config)) {
      console.error('Only script nodes can be saved as templates');
      return null;
    }

    const template: CustomStepTemplate = {
      id: `custom-${crypto.randomUUID()}`,
      name: templateName,
      command: node.config.command,
      category,
      description: `Custom template from "${node.name}"`,
      isCustom: true,
      createdAt: new Date().toISOString(),
    };

    const response = await stepTemplateAPI.saveCustomTemplate(template);
    if (response.success && response.template) {
      return toCustomTemplate(response.template);
    }
    return null;
  } catch (error) {
    console.error('Failed to save custom template:', error);
    return null;
  }
}

/**
 * Delete a custom template
 * @param templateId - ID of the template to delete
 * @returns Whether the deletion was successful
 */
export async function deleteCustomTemplate(templateId: string): Promise<boolean> {
  try {
    const response = await stepTemplateAPI.deleteCustomTemplate(templateId);
    return response.success;
  } catch (error) {
    console.error('Failed to delete custom template:', error);
    return false;
  }
}

/**
 * Import multiple templates as custom templates
 * @param templates - Templates to import
 * @returns Array of successfully imported templates
 */
export async function importTemplatesAsCustom(
  templates: StepTemplate[]
): Promise<CustomTemplate[]> {
  const imported: CustomTemplate[] = [];

  for (const template of templates) {
    try {
      const customTemplate: CustomStepTemplate = {
        id: `custom-${crypto.randomUUID()}`,
        name: template.name,
        command: template.command,
        category: 'custom',
        description: template.description || `Imported template`,
        isCustom: true,
        createdAt: new Date().toISOString(),
      };

      const response = await stepTemplateAPI.saveCustomTemplate(customTemplate);
      if (response.success && response.template) {
        imported.push(toCustomTemplate(response.template));
      }
    } catch (error) {
      console.error(`Failed to import template "${template.name}":`, error);
    }
  }

  return imported;
}

/**
 * Get all templates including custom ones (async)
 * @returns Combined array of built-in and custom templates
 */
export async function getAllTemplatesWithCustom(): Promise<(StepTemplate | CustomTemplate)[]> {
  const custom = await loadCustomTemplates();
  return [...custom, ...STEP_TEMPLATES];
}

/**
 * Group templates by category including custom templates (async)
 * @returns Array of grouped templates with custom templates first
 */
export async function groupTemplatesByCategoryWithCustom(): Promise<GroupedTemplates[]> {
  const customTemplates = await loadCustomTemplates();
  const groups = groupTemplatesByCategory();

  if (customTemplates.length > 0) {
    // Add custom templates category at the beginning
    const customCategory: TemplateCategoryInfo = {
      id: 'custom',
      name: 'My Templates',
      icon: 'Star',
    };

    // Create a special "My Templates" group at the top
    groups.unshift({
      category: customCategory,
      templates: customTemplates,
    });
  }

  return groups;
}

/**
 * Filter templates including custom ones (async)
 * @param query - Search query
 * @param customTemplates - Pre-loaded custom templates
 * @returns Filtered templates
 */
export function filterTemplatesWithCustom(
  query: string,
  customTemplates: CustomTemplate[]
): (StepTemplate | CustomTemplate)[] {
  const allTemplates = [...customTemplates, ...STEP_TEMPLATES];

  if (!query.trim()) {
    return allTemplates;
  }

  const lowerQuery = query.toLowerCase();
  return allTemplates.filter(
    (template) =>
      template.name.toLowerCase().includes(lowerQuery) ||
      template.command.toLowerCase().includes(lowerQuery) ||
      (template.description?.toLowerCase().includes(lowerQuery) ?? false)
  );
}
