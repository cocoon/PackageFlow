/**
 * Export/Import functionality React Hook
 * @see specs/002-export-import-save/contracts/export-import-api.md
 */

import { useState, useCallback } from 'react';
import { exportAllData, selectImportFile, executeImport } from '../lib/export-import';
import type {
  ExportResult,
  ImportFileResult,
  ImportResult,
  ImportPreview,
  ConflictResolutionStrategy,
} from '../types/export-import';

interface ExportState {
  isExporting: boolean;
  result: ExportResult | null;
  error: string | null;
}

interface ImportState {
  isSelecting: boolean;
  isImporting: boolean;
  filePath: string | null;
  preview: ImportPreview | null;
  result: ImportResult | null;
  error: string | null;
}

export function useExportImport() {
  const [exportState, setExportState] = useState<ExportState>({
    isExporting: false,
    result: null,
    error: null,
  });

  const [importState, setImportState] = useState<ImportState>({
    isSelecting: false,
    isImporting: false,
    filePath: null,
    preview: null,
    result: null,
    error: null,
  });

  const handleExport = useCallback(async () => {
    setExportState({
      isExporting: true,
      result: null,
      error: null,
    });

    try {
      const result = await exportAllData();
      setExportState({
        isExporting: false,
        result,
        error: result.success ? null : result.error || 'Export failed',
      });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setExportState({
        isExporting: false,
        result: null,
        error: errorMessage,
      });
      return { success: false, error: errorMessage } as ExportResult;
    }
  }, []);

  const resetExportState = useCallback(() => {
    setExportState({
      isExporting: false,
      result: null,
      error: null,
    });
  }, []);

  const handleSelectImportFile = useCallback(async () => {
    setImportState((prev) => ({
      ...prev,
      isSelecting: true,
      error: null,
    }));

    try {
      const result = await selectImportFile();

      if (result.success && result.preview) {
        setImportState((prev) => ({
          ...prev,
          isSelecting: false,
          filePath: result.filePath || null,
          preview: result.preview || null,
          error: null,
        }));
      } else {
        setImportState((prev) => ({
          ...prev,
          isSelecting: false,
          error: result.error === 'USER_CANCELLED' ? null : result.error || 'Failed to select file',
        }));
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setImportState((prev) => ({
        ...prev,
        isSelecting: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage } as ImportFileResult;
    }
  }, []);

  const handleImport = useCallback(
    async (strategy: ConflictResolutionStrategy = { defaultAction: 'skip' }) => {
      if (!importState.filePath) {
        return { success: false, error: 'No file selected' } as ImportResult;
      }

      setImportState((prev) => ({
        ...prev,
        isImporting: true,
        error: null,
      }));

      try {
        const result = await executeImport(importState.filePath, strategy);
        setImportState((prev) => ({
          ...prev,
          isImporting: false,
          result,
          error: result.success ? null : result.error || 'Import failed',
        }));
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setImportState((prev) => ({
          ...prev,
          isImporting: false,
          error: errorMessage,
        }));
        return {
          success: false,
          error: errorMessage,
          summary: {
            imported: {
              projects: 0,
              workflows: 0,
              templates: 0,
              stepTemplates: 0,
              settings: false,
            },
            skipped: { projects: 0, workflows: 0, templates: 0, stepTemplates: 0 },
            overwritten: { projects: 0, workflows: 0, templates: 0, stepTemplates: 0 },
          },
        } as ImportResult;
      }
    },
    [importState.filePath]
  );

  const resetImportState = useCallback(() => {
    setImportState({
      isSelecting: false,
      isImporting: false,
      filePath: null,
      preview: null,
      result: null,
      error: null,
    });
  }, []);

  return {
    export: {
      isExporting: exportState.isExporting,
      result: exportState.result,
      error: exportState.error,
      execute: handleExport,
      reset: resetExportState,
    },

    import: {
      isSelecting: importState.isSelecting,
      isImporting: importState.isImporting,
      filePath: importState.filePath,
      preview: importState.preview,
      result: importState.result,
      error: importState.error,
      selectFile: handleSelectImportFile,
      execute: handleImport,
      reset: resetImportState,
    },
  };
}
