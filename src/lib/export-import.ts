/**
 * Export/Import Core Service
 * @see specs/002-export-import-save/contracts/export-import-api.md
 */

import { save, open, readTextFile, writeTextFile, settingsAPI, worktreeTemplateAPI, stepTemplateAPI, incomingWebhookAPI, shortcutsAPI } from './tauri-api';
import type {
  ExportData,
  ExportMetadata,
  ExportResult,
  ImportPreview,
  ImportFileResult,
  ImportResult,
  ValidationResult,
  ConflictItem,
  ConflictResolutionStrategy,
  DataType,
  WorkflowExportData,
  NodeExportData,
} from '../types/export-import';
import {
  EXPORT_FORMAT_VERSION,
  MIN_SUPPORTED_VERSION,
  EXPORT_FILE_EXTENSION,
  DEFAULT_EXPORT_FILENAME,
  WORKFLOW_FILE_EXTENSION,
  STEP_FILE_EXTENSION,
} from '../types/export-import';
import type { Workflow, WorkflowNode } from '../types/workflow';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get application version
 * Retrieves version from package.json or tauri.conf.json
 */
export function getAppVersion(): string {
  return '0.1.0';
}

/**
 * Compare semantic versions
 * @returns -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 < p2) return -1;
    if (p1 > p2) return 1;
  }
  return 0;
}

function isValidVersion(version: string): boolean {
  return /^\d+\.\d+\.\d+$/.test(version);
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate import file format
 */
export function validateExportData(data: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check basic structure
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Invalid file format: must be a JSON object'] };
  }

  const obj = data as Record<string, unknown>;

  // Check metadata
  if (!obj.metadata || typeof obj.metadata !== 'object') {
    errors.push('Missing metadata field');
  } else {
    const metadata = obj.metadata as Record<string, unknown>;

    // Check version
    if (typeof metadata.version !== 'string') {
      errors.push('metadata.version must be a string');
    } else if (!isValidVersion(metadata.version)) {
      errors.push('metadata.version format invalid, must be x.y.z format');
    } else if (compareVersions(metadata.version, MIN_SUPPORTED_VERSION) < 0) {
      errors.push(`Version ${metadata.version} is not supported, minimum supported version is ${MIN_SUPPORTED_VERSION}`);
    } else if (compareVersions(metadata.version, EXPORT_FORMAT_VERSION) > 0) {
      warnings.push(`File version ${metadata.version} is newer, some features may not be compatible`);
    }

    // Check export time
    if (typeof metadata.exportedAt !== 'string') {
      errors.push('metadata.exportedAt must be a string');
    }

    // Check export type
    if (metadata.exportType !== 'full' && metadata.exportType !== 'partial') {
      errors.push('metadata.exportType must be "full" or "partial"');
    }
  }

  // Check data
  if (!obj.data || typeof obj.data !== 'object') {
    errors.push('Missing data field');
  } else {
    const data = obj.data as Record<string, unknown>;

    // Check at least one type of data exists
    const hasProjects = Array.isArray(data.projects) && data.projects.length > 0;
    const hasWorkflows = Array.isArray(data.workflows) && data.workflows.length > 0;
    const hasTemplates = Array.isArray(data.worktreeTemplates) && data.worktreeTemplates.length > 0;
    const hasSettings = data.settings !== undefined && data.settings !== null;

    if (!hasProjects && !hasWorkflows && !hasTemplates && !hasSettings) {
      errors.push('File contains no data');
    }

    // Validate ID exists for each item
    if (Array.isArray(data.projects)) {
      data.projects.forEach((p, i) => {
        if (!p || typeof p !== 'object' || !('id' in p)) {
          errors.push(`projects[${i}] missing id field`);
        }
      });
    }

    if (Array.isArray(data.workflows)) {
      data.workflows.forEach((w, i) => {
        if (!w || typeof w !== 'object' || !('id' in w)) {
          errors.push(`workflows[${i}] missing id field`);
        }
      });
    }

    if (Array.isArray(data.worktreeTemplates)) {
      data.worktreeTemplates.forEach((t, i) => {
        if (!t || typeof t !== 'object' || !('id' in t)) {
          errors.push(`worktreeTemplates[${i}] missing id field`);
        }
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

// ============================================================================
// Export Functions
// ============================================================================

/**
 * Export all application data
 */
export async function exportAllData(): Promise<ExportResult> {
  try {
    const filePath = await save({
      defaultPath: DEFAULT_EXPORT_FILENAME,
      filters: [{ name: 'PackageFlow Backup', extensions: [EXPORT_FILE_EXTENSION] }],
    });

    if (!filePath) {
      return { success: false, error: 'USER_CANCELLED' };
    }

    const [projects, workflows, templatesRes, stepTemplatesRes, settings, keyboardShortcuts] = await Promise.all([
      settingsAPI.loadProjects(),
      settingsAPI.loadWorkflows(),
      worktreeTemplateAPI.listTemplates(),
      stepTemplateAPI.loadCustomTemplates(),
      settingsAPI.loadSettings(),
      shortcutsAPI.loadSettings(),
    ]);

    const templates = templatesRes.templates ?? [];
    const stepTemplates = stepTemplatesRes.templates ?? [];

    const settingsWithShortcuts = {
      ...settings,
      keyboardShortcuts,
    };

    const metadata: ExportMetadata = {
      version: EXPORT_FORMAT_VERSION,
      appVersion: getAppVersion(),
      exportedAt: new Date().toISOString(),
      exportType: 'full',
    };

    const exportData: ExportData = {
      metadata,
      data: {
        projects,
        workflows,
        worktreeTemplates: templates,
        customStepTemplates: stepTemplates,
        settings: settingsWithShortcuts,
      },
    };

    console.log('Writing export file to:', filePath);
    try {
      await writeTextFile(filePath, JSON.stringify(exportData, null, 2));
    } catch (writeError) {
      console.error('writeTextFile error:', writeError);
      throw new Error(`Failed to write file: ${writeError instanceof Error ? writeError.message : String(writeError)}`);
    }

    return {
      success: true,
      filePath,
      counts: {
        projects: projects.length,
        workflows: workflows.length,
        templates: templates.length,
        stepTemplates: stepTemplates.length,
        hasSettings: true,
      },
    };
  } catch (error) {
    console.error('Export failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'WRITE_ERROR';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// ============================================================================
// Import Functions
// ============================================================================

/**
 * Select import file and parse preview
 */
export async function selectImportFile(): Promise<ImportFileResult> {
  try {
    const filePath = await open({
      filters: [{ name: 'PackageFlow Backup', extensions: [EXPORT_FILE_EXTENSION] }],
      multiple: false,
    });

    if (!filePath) {
      return { success: false, error: 'USER_CANCELLED' };
    }

    const content = await readTextFile(filePath as string);
    let importData: unknown;

    try {
      importData = JSON.parse(content);
    } catch {
      return { success: false, error: 'INVALID_FORMAT', filePath: filePath as string };
    }

    const validation = validateExportData(importData);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors?.join('; ') || 'INVALID_FORMAT',
        filePath: filePath as string,
      };
    }

    const data = importData as ExportData;

    const [existingProjects, existingWorkflows, existingTemplatesRes, existingStepTemplatesRes] = await Promise.all([
      settingsAPI.loadProjects(),
      settingsAPI.loadWorkflows(),
      worktreeTemplateAPI.listTemplates(),
      stepTemplateAPI.loadCustomTemplates(),
    ]);

    const conflicts = detectConflicts(data, {
      projects: existingProjects,
      workflows: existingWorkflows,
      templates: existingTemplatesRes.templates ?? [],
      stepTemplates: existingStepTemplatesRes.templates ?? [],
    });

    const preview: ImportPreview = {
      metadata: data.metadata,
      counts: {
        projects: data.data.projects?.length ?? 0,
        workflows: data.data.workflows?.length ?? 0,
        templates: data.data.worktreeTemplates?.length ?? 0,
        stepTemplates: data.data.customStepTemplates?.length ?? 0,
        hasSettings: !!data.data.settings,
      },
      conflicts,
      versionWarning: validation.warnings?.[0],
    };

    return { success: true, filePath: filePath as string, preview };
  } catch (error) {
    console.error('Import file selection failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'READ_ERROR',
    };
  }
}

/**
 * Execute import operation
 * @param filePath - Path to the import file
 * @param strategy - Conflict resolution strategy
 *   - mode: 'merge' (default) - adds new items, handles conflicts per defaultAction
 *   - mode: 'replace' - completely replaces all existing data with imported data
 */
export async function executeImport(
  filePath: string,
  strategy: ConflictResolutionStrategy = { defaultAction: 'skip' }
): Promise<ImportResult> {
  const summary = {
    imported: { projects: 0, workflows: 0, templates: 0, stepTemplates: 0, settings: false },
    skipped: { projects: 0, workflows: 0, templates: 0, stepTemplates: 0 },
    overwritten: { projects: 0, workflows: 0, templates: 0, stepTemplates: 0 },
  };

  const isReplaceMode = strategy.mode === 'replace';

  try {
    const content = await readTextFile(filePath);
    const importData = JSON.parse(content) as ExportData;

    // In replace mode, we don't need existing data for merging
    // We'll just overwrite everything
    if (isReplaceMode) {
      // Replace mode: directly save imported data, replacing all existing
      if (importData.data.projects) {
        await settingsAPI.saveProjects(importData.data.projects);
        summary.imported.projects = importData.data.projects.length;
      } else {
        // If no projects in import, clear existing
        await settingsAPI.saveProjects([]);
      }

      if (importData.data.workflows) {
        await settingsAPI.saveWorkflows(importData.data.workflows);
        summary.imported.workflows = importData.data.workflows.length;
      } else {
        await settingsAPI.saveWorkflows([]);
      }

      if (importData.data.worktreeTemplates) {
        // First clear all existing templates
        const existingTemplatesRes = await worktreeTemplateAPI.listTemplates();
        for (const template of existingTemplatesRes.templates ?? []) {
          await worktreeTemplateAPI.deleteTemplate(template.id);
        }
        // Then save imported templates
        for (const template of importData.data.worktreeTemplates) {
          await worktreeTemplateAPI.saveTemplate(template);
        }
        summary.imported.templates = importData.data.worktreeTemplates.length;
      }

      if (importData.data.customStepTemplates) {
        // First clear all existing step templates
        const existingStepTemplatesRes = await stepTemplateAPI.loadCustomTemplates();
        for (const template of existingStepTemplatesRes.templates ?? []) {
          await stepTemplateAPI.deleteCustomTemplate(template.id);
        }
        // Then save imported step templates
        for (const template of importData.data.customStepTemplates) {
          await stepTemplateAPI.saveCustomTemplate(template);
        }
        summary.imported.stepTemplates = importData.data.customStepTemplates.length;
      }

      if (importData.data.settings) {
        const { keyboardShortcuts, ...otherSettings } = importData.data.settings;
        await settingsAPI.saveSettings(otherSettings);
        if (keyboardShortcuts) {
          await shortcutsAPI.saveSettings(keyboardShortcuts);
        }
        summary.imported.settings = true;
      }

      return { success: true, summary };
    }

    // Merge mode: existing behavior
    const [existingProjects, existingWorkflows, existingTemplatesRes, existingStepTemplatesRes] = await Promise.all([
      settingsAPI.loadProjects(),
      settingsAPI.loadWorkflows(),
      worktreeTemplateAPI.listTemplates(),
      stepTemplateAPI.loadCustomTemplates(),
    ]);

    const existingTemplates = existingTemplatesRes.templates ?? [];
    const existingStepTemplates = existingStepTemplatesRes.templates ?? [];

    if (importData.data.projects) {
      const result = mergeItems(
        importData.data.projects,
        existingProjects,
        'projects',
        strategy
      );
      summary.imported.projects = result.imported;
      summary.skipped.projects = result.skipped;
      summary.overwritten.projects = result.overwritten;
      await settingsAPI.saveProjects(result.merged);
    }

    if (importData.data.workflows) {
      const result = mergeItems(
        importData.data.workflows,
        existingWorkflows,
        'workflows',
        strategy
      );
      summary.imported.workflows = result.imported;
      summary.skipped.workflows = result.skipped;
      summary.overwritten.workflows = result.overwritten;
      await settingsAPI.saveWorkflows(result.merged);
    }

    if (importData.data.worktreeTemplates) {
      const result = mergeItems(
        importData.data.worktreeTemplates,
        existingTemplates,
        'templates',
        strategy
      );
      summary.imported.templates = result.imported;
      summary.skipped.templates = result.skipped;
      summary.overwritten.templates = result.overwritten;

      for (const template of result.merged) {
        await worktreeTemplateAPI.saveTemplate(template);
      }
    }

    if (importData.data.customStepTemplates) {
      const result = mergeItems(
        importData.data.customStepTemplates,
        existingStepTemplates,
        'stepTemplates',
        strategy
      );
      summary.imported.stepTemplates = result.imported;
      summary.skipped.stepTemplates = result.skipped;
      summary.overwritten.stepTemplates = result.overwritten;

      for (const template of result.merged) {
        await stepTemplateAPI.saveCustomTemplate(template);
      }
    }

    if (importData.data.settings) {
      const { keyboardShortcuts, ...otherSettings } = importData.data.settings;

      await settingsAPI.saveSettings(otherSettings);

      if (keyboardShortcuts) {
        await shortcutsAPI.saveSettings(keyboardShortcuts);
      }

      summary.imported.settings = true;
    }

    return { success: true, summary };
  } catch (error) {
    console.error('Import failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'IMPORT_ERROR',
      summary,
    };
  }
}

// ============================================================================
// Conflict Detection
// ============================================================================

/**
 * Detect conflicts between import data and existing data
 */
export function detectConflicts(
  importData: ExportData,
  existingData: {
    projects: { id: string; name: string; lastOpenedAt: string }[];
    workflows: { id: string; name: string; updatedAt: string }[];
    templates: { id: string; name: string; updatedAt?: string; createdAt: string }[];
    stepTemplates: { id: string; name: string; createdAt: string }[];
  }
): ConflictItem[] {
  const conflicts: ConflictItem[] = [];

  const existingProjectIds = new Set(existingData.projects.map((p) => p.id));
  importData.data.projects?.forEach((p) => {
    if (existingProjectIds.has(p.id)) {
      const existing = existingData.projects.find((e) => e.id === p.id)!;
      conflicts.push({
        type: 'projects',
        id: p.id,
        name: p.name,
        existingUpdatedAt: existing.lastOpenedAt,
        importingUpdatedAt: p.lastOpenedAt,
      });
    }
  });

  const existingWorkflowIds = new Set(existingData.workflows.map((w) => w.id));
  importData.data.workflows?.forEach((w) => {
    if (existingWorkflowIds.has(w.id)) {
      const existing = existingData.workflows.find((e) => e.id === w.id)!;
      conflicts.push({
        type: 'workflows',
        id: w.id,
        name: w.name,
        existingUpdatedAt: existing.updatedAt,
        importingUpdatedAt: w.updatedAt,
      });
    }
  });

  const existingTemplateIds = new Set(existingData.templates.map((t) => t.id));
  importData.data.worktreeTemplates?.forEach((t) => {
    if (existingTemplateIds.has(t.id)) {
      const existing = existingData.templates.find((e) => e.id === t.id)!;
      conflicts.push({
        type: 'templates',
        id: t.id,
        name: t.name,
        existingUpdatedAt: existing.updatedAt || existing.createdAt,
        importingUpdatedAt: t.updatedAt || t.createdAt,
      });
    }
  });

  const existingStepTemplateIds = new Set(existingData.stepTemplates.map((t) => t.id));
  importData.data.customStepTemplates?.forEach((t) => {
    if (existingStepTemplateIds.has(t.id)) {
      const existing = existingData.stepTemplates.find((e) => e.id === t.id)!;
      conflicts.push({
        type: 'stepTemplates',
        id: t.id,
        name: t.name,
        existingUpdatedAt: existing.createdAt,
        importingUpdatedAt: t.createdAt,
      });
    }
  });

  return conflicts;
}

// ============================================================================
// UUID Generation
// ============================================================================

export function generateNewId(): string {
  return crypto.randomUUID();
}

// ============================================================================
// Internal Helper Functions
// ============================================================================

interface MergeResult<T> {
  merged: T[];
  imported: number;
  skipped: number;
  overwritten: number;
}

function mergeItems<T extends { id: string }>(
  importItems: T[],
  existingItems: T[],
  type: DataType,
  strategy: ConflictResolutionStrategy
): MergeResult<T> {
  const existingMap = new Map(existingItems.map((item) => [item.id, item]));
  const result: T[] = [...existingItems];
  let imported = 0;
  let skipped = 0;
  let overwritten = 0;

  for (const item of importItems) {
    const existing = existingMap.get(item.id);
    const itemOverride = strategy.itemOverrides?.find(
      (o) => o.id === item.id && o.type === type
    );
    const action = itemOverride?.action ?? strategy.defaultAction;

    if (!existing) {
      result.push(item);
      imported++;
    } else if (action === 'skip') {
      skipped++;
    } else if (action === 'overwrite') {
      const index = result.findIndex((r) => r.id === item.id);
      if (index !== -1) {
        result[index] = item;
        overwritten++;
      }
    } else if (action === 'keepBoth') {
      const newItem = { ...item, id: generateNewId() };
      result.push(newItem);
      imported++;
    }
  }

  return { merged: result, imported, skipped, overwritten };
}

// ============================================================================
// Single Workflow Sharing
// ============================================================================

/** Result type for single item export/import */
export interface SingleExportResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

export interface WorkflowImportResult {
  success: boolean;
  workflow?: Workflow;
  error?: string;
}

export interface NodeImportResult {
  success: boolean;
  node?: WorkflowNode;
  error?: string;
}

/**
 * Export a single workflow to a file
 */
export async function exportWorkflow(workflow: Workflow): Promise<SingleExportResult> {
  try {
    const defaultFilename = `${workflow.name.replace(/[^a-zA-Z0-9]/g, '-')}.${WORKFLOW_FILE_EXTENSION}`;
    const filePath = await save({
      defaultPath: defaultFilename,
      filters: [{ name: 'Workflow', extensions: [WORKFLOW_FILE_EXTENSION] }],
    });

    if (!filePath) {
      return { success: false, error: 'USER_CANCELLED' };
    }

    const exportData: WorkflowExportData = {
      version: EXPORT_FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      type: 'workflow',
      workflow,
    };

    await writeTextFile(filePath, JSON.stringify(exportData, null, 2));

    return { success: true, filePath };
  } catch (error) {
    console.error('Export workflow failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'EXPORT_ERROR',
    };
  }
}

/**
 * Import a workflow from a file
 * Returns the workflow with a new ID (caller is responsible for saving)
 */
export async function importWorkflow(): Promise<WorkflowImportResult> {
  try {
    const filePath = await open({
      filters: [{ name: 'Workflow', extensions: [WORKFLOW_FILE_EXTENSION] }],
      multiple: false,
    });

    if (!filePath) {
      return { success: false, error: 'USER_CANCELLED' };
    }

    const content = await readTextFile(filePath as string);
    let importData: unknown;

    try {
      importData = JSON.parse(content);
    } catch {
      return { success: false, error: 'INVALID_FORMAT' };
    }

    if (!importData || typeof importData !== 'object') {
      return { success: false, error: 'INVALID_FORMAT' };
    }

    const data = importData as Record<string, unknown>;
    if (data.type !== 'workflow' || !data.workflow) {
      return { success: false, error: 'NOT_A_WORKFLOW_FILE' };
    }

    const workflow = data.workflow as Workflow;
    const newWorkflow: Workflow = {
      ...workflow,
      id: generateNewId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nodes: workflow.nodes.map((node) => ({
        ...node,
        id: generateNewId(),
      })),
    };

    if (workflow.incomingWebhook) {
      try {
        const newConfig = await incomingWebhookAPI.createConfig();
        newWorkflow.incomingWebhook = {
          ...newConfig,
          enabled: false,
        };
      } catch (error) {
        console.error('Failed to create incoming webhook config for import:', error);
        newWorkflow.incomingWebhook = undefined;
      }
    }

    return { success: true, workflow: newWorkflow };
  } catch (error) {
    console.error('Import workflow failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'IMPORT_ERROR',
    };
  }
}

// ============================================================================
// Single Node Sharing
// ============================================================================

/**
 * Export a single node to a file
 */
export async function exportNode(node: WorkflowNode): Promise<SingleExportResult> {
  try {
    const defaultFilename = `${node.name.replace(/[^a-zA-Z0-9]/g, '-')}.${STEP_FILE_EXTENSION}`;
    const filePath = await save({
      defaultPath: defaultFilename,
      filters: [{ name: 'Workflow Step', extensions: [STEP_FILE_EXTENSION] }],
    });

    if (!filePath) {
      return { success: false, error: 'USER_CANCELLED' };
    }

    const exportData: NodeExportData = {
      version: EXPORT_FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      type: 'node',
      node,
    };

    await writeTextFile(filePath, JSON.stringify(exportData, null, 2));

    return { success: true, filePath };
  } catch (error) {
    console.error('Export node failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'EXPORT_ERROR',
    };
  }
}

/**
 * Import a node from a file
 * Returns the node with a new ID (caller is responsible for adding to workflow)
 */
export async function importNode(): Promise<NodeImportResult> {
  try {
    const filePath = await open({
      filters: [{ name: 'Workflow Step', extensions: [STEP_FILE_EXTENSION] }],
      multiple: false,
    });

    if (!filePath) {
      return { success: false, error: 'USER_CANCELLED' };
    }

    const content = await readTextFile(filePath as string);
    let importData: unknown;

    try {
      importData = JSON.parse(content);
    } catch {
      return { success: false, error: 'INVALID_FORMAT' };
    }

    if (!importData || typeof importData !== 'object') {
      return { success: false, error: 'INVALID_FORMAT' };
    }

    const data = importData as Record<string, unknown>;
    if (data.type !== 'node' || !data.node) {
      return { success: false, error: 'NOT_A_STEP_FILE' };
    }

    const node = data.node as WorkflowNode;
    const newNode: WorkflowNode = {
      ...node,
      id: generateNewId(),
    };

    return { success: true, node: newNode };
  } catch (error) {
    console.error('Import node failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'IMPORT_ERROR',
    };
  }
}
