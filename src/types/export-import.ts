/**
 * Export/Import functionality type definitions
 * @see specs/002-export-import-save/data-model.md
 */

import type { Project, Workflow, AppSettings } from './index';
import type { WorktreeTemplate, CustomStepTemplate } from '../lib/tauri-api';

export type DataType = 'projects' | 'workflows' | 'templates' | 'stepTemplates' | 'settings';

export interface ExportMetadata {
  version: string;
  appVersion: string;
  exportedAt: string;
  exportType: 'full' | 'partial';
  includedTypes?: DataType[];
}

export interface ExportData {
  metadata: ExportMetadata;
  data: {
    projects?: Project[];
    workflows?: Workflow[];
    worktreeTemplates?: WorktreeTemplate[];
    customStepTemplates?: CustomStepTemplate[];
    settings?: AppSettings;
  };
}

export interface ExportOptions {
  includeProjects: boolean;
  includeWorkflows: boolean;
  includeTemplates: boolean;
  includeSettings: boolean;
}

export interface ExportResult {
  success: boolean;
  filePath?: string;
  error?: string;
  counts?: {
    projects: number;
    workflows: number;
    templates: number;
    stepTemplates: number;
    hasSettings: boolean;
  };
}

export interface ImportPreview {
  metadata: ExportMetadata;
  counts: {
    projects: number;
    workflows: number;
    templates: number;
    stepTemplates: number;
    hasSettings: boolean;
  };
  conflicts: ConflictItem[];
  versionWarning?: string;
}

export interface ConflictItem {
  type: DataType;
  id: string;
  name: string;
  existingUpdatedAt: string;
  importingUpdatedAt: string;
}

export interface ConflictResolutionItem {
  id: string;
  type: DataType;
  action: 'skip' | 'overwrite' | 'keepBoth';
}

/**
 * Import mode determines how existing data is handled
 * - 'merge': Add new items, handle conflicts per strategy (default)
 * - 'replace': Completely replace all existing data with imported data
 */
export type ImportMode = 'merge' | 'replace';

export interface ConflictResolutionStrategy {
  /** Import mode: 'merge' preserves existing + adds new, 'replace' overwrites everything */
  mode?: ImportMode;
  defaultAction: 'skip' | 'overwrite' | 'keepBoth';
  itemOverrides?: ConflictResolutionItem[];
}

export interface ImportFileResult {
  success: boolean;
  error?: string;
  filePath?: string;
  preview?: ImportPreview;
}

export interface ImportResult {
  success: boolean;
  error?: string;
  summary: {
    imported: {
      projects: number;
      workflows: number;
      templates: number;
      stepTemplates: number;
      settings: boolean;
    };
    skipped: {
      projects: number;
      workflows: number;
      templates: number;
      stepTemplates: number;
    };
    overwritten: {
      projects: number;
      workflows: number;
      templates: number;
      stepTemplates: number;
    };
  };
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

export const EXPORT_FORMAT_VERSION = '1.0.0';
export const MIN_SUPPORTED_VERSION = '1.0.0';
export const EXPORT_FILE_EXTENSION = 'packageflow';
export const DEFAULT_EXPORT_FILENAME = `packageflow-backup.${EXPORT_FILE_EXTENSION}`;

export interface WorkflowExportData {
  version: string;
  exportedAt: string;
  type: 'workflow';
  workflow: Workflow;
}

export interface NodeExportData {
  version: string;
  exportedAt: string;
  type: 'node';
  node: import('./workflow').WorkflowNode;
}

export const WORKFLOW_FILE_EXTENSION = 'workflow.json';
export const STEP_FILE_EXTENSION = 'step.json';
