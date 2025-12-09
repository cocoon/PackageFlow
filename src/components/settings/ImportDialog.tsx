/**
 * Import Dialog Component
 * Multi-step dialog for importing exported data with preview and conflict handling
 * @see specs/002-export-import-save/contracts/export-import-api.md
 */

import React, { useCallback, useState } from 'react';
import {
  Upload,
  CheckCircle,
  XCircle,
  Loader2,
  FileText,
  AlertTriangle,
  FolderUp,
  ChevronRight,
  FolderDown,
  Workflow,
  GitBranch,
  Settings,
  ArrowLeft,
  Zap,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
} from '../ui/Dialog';
import { Button } from '../ui/Button';
import { useExportImport } from '../../hooks/useExportImport';
import type {
  ImportResult,
  ImportPreview,
  ConflictResolutionStrategy,
} from '../../types/export-import';

// ============================================================================
// Types
// ============================================================================

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: (result: ImportResult) => void;
}

type ImportStep = 'select' | 'preview' | 'importing' | 'result';

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Step indicator showing progress through the import flow
 */
interface StepIndicatorProps {
  currentStep: ImportStep;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep }) => {
  const steps = [
    { key: 'select', label: 'Select' },
    { key: 'preview', label: 'Review' },
    { key: 'result', label: 'Complete' },
  ] as const;

  const getCurrentIndex = () => {
    if (currentStep === 'importing') return 1;
    return steps.findIndex((s) => s.key === currentStep);
  };

  const currentIndex = getCurrentIndex();

  return (
    <div className="flex items-center justify-center gap-2 mb-5">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isUpcoming = index > currentIndex;

        return (
          <React.Fragment key={step.key}>
            <div className="flex items-center gap-1.5">
              <div
                className={`
                  flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium
                  transition-colors duration-200
                  ${isCompleted ? 'bg-green-500/30 text-green-400 border border-green-500/50' : ''}
                  ${isCurrent ? 'bg-blue-500/30 text-blue-400 border border-blue-500/50' : ''}
                  ${isUpcoming ? 'bg-muted text-muted-foreground border border-border' : ''}
                `}
              >
                {isCompleted ? (
                  <CheckCircle className="h-3.5 w-3.5" />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={`text-xs font-medium ${
                  isCurrent ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <ChevronRight
                className={`h-3.5 w-3.5 ${
                  index < currentIndex ? 'text-green-500/50' : 'text-muted-foreground'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

/**
 * File selection step content
 */
interface SelectStepProps {
  error: string | null;
  isSelecting: boolean;
  onSelectFile: () => void;
  onClose: () => void;
}

const SelectStep: React.FC<SelectStepProps> = ({
  error,
  isSelecting,
  onSelectFile,
  onClose,
}) => (
  <>
    <div className="flex flex-col items-center py-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted border-2 border-dashed border-border">
        <FileText className="h-7 w-7 text-muted-foreground" />
      </div>
      <h4 className="mt-4 text-sm font-medium text-foreground">
        Select a PackageFlow backup file
      </h4>
      <p className="mt-1 text-xs text-muted-foreground text-center max-w-[280px]">
        Choose a .packageflow file to restore your projects, workflows, templates,
        and settings.
      </p>
    </div>

    {error && error !== 'USER_CANCELLED' && (
      <div className="rounded-lg bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700/50 p-3">
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <XCircle className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    )}

    <DialogFooter>
      <Button variant="outline" onClick={onClose}>
        Cancel
      </Button>
      <Button onClick={onSelectFile} disabled={isSelecting}>
        {isSelecting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Opening...
          </>
        ) : (
          <>
            <FolderUp className="mr-2 h-4 w-4" />
            Browse Files
          </>
        )}
      </Button>
    </DialogFooter>
  </>
);

/**
 * Import mode type
 */
type ImportModeOption = 'merge' | 'replace';

/**
 * Preview step body content (scrollable)
 */
interface PreviewStepBodyProps {
  preview: ImportPreview;
  filePath: string | null;
  importMode: ImportModeOption;
  onImportModeChange: (mode: ImportModeOption) => void;
}

const PreviewStepBody: React.FC<PreviewStepBodyProps> = ({
  preview,
  filePath,
  importMode,
  onImportModeChange,
}) => {
  const dataItems: Array<{
    label: string;
    count: number;
    icon: typeof FolderDown;
    color: 'blue' | 'purple' | 'green' | 'cyan' | 'orange';
    showAs?: string;
  }> = [
    {
      label: 'Projects',
      count: preview.counts.projects,
      icon: FolderDown,
      color: 'blue',
    },
    {
      label: 'Workflows',
      count: preview.counts.workflows,
      icon: Workflow,
      color: 'purple',
    },
    {
      label: 'Templates',
      count: preview.counts.templates,
      icon: GitBranch,
      color: 'green',
    },
    {
      label: 'Step Templates',
      count: preview.counts.stepTemplates,
      icon: Zap,
      color: 'cyan',
    },
    {
      label: 'Settings',
      count: preview.counts.hasSettings ? 1 : 0,
      icon: Settings,
      color: 'orange',
      showAs: preview.counts.hasSettings ? 'Included' : 'Not included',
    },
  ];

  const colorClasses = {
    blue: 'bg-blue-500/20 text-blue-400',
    purple: 'bg-purple-500/20 text-purple-400',
    green: 'bg-green-500/20 text-green-400',
    cyan: 'bg-cyan-500/20 text-cyan-400',
    orange: 'bg-orange-500/20 text-orange-400',
  };

  return (
    <>
      <div className="rounded-lg bg-card border border-border p-4">
        <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
          Contents to Import
        </h4>
        <div className="space-y-2">
          {dataItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex items-center justify-between rounded bg-muted px-3 py-2"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded ${colorClasses[item.color]}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-sm text-foreground">{item.label}</span>
                </div>
                <span
                  className={`text-sm font-medium ${
                    item.count > 0
                      ? colorClasses[item.color].split(' ')[1]
                      : 'text-muted-foreground'
                  }`}
                >
                  {item.showAs ?? item.count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Import Mode Selection */}
      <div className="rounded-lg bg-card border border-border p-4">
        <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
          Import Mode
        </h4>
        <div className="space-y-2">
          {/* Merge Mode */}
          <label
            className={`flex items-start gap-3 rounded-lg p-3 cursor-pointer transition-colors ${
              importMode === 'merge'
                ? 'bg-blue-500/10 border border-blue-500/30'
                : 'bg-muted border border-transparent hover:bg-muted/80'
            }`}
          >
            <input
              type="radio"
              name="importMode"
              value="merge"
              checked={importMode === 'merge'}
              onChange={() => onImportModeChange('merge')}
              className="mt-1"
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                Merge (Add New Only)
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Only adds new items. Existing items with the same ID will be skipped.
              </p>
            </div>
          </label>

          {/* Replace Mode */}
          <label
            className={`flex items-start gap-3 rounded-lg p-3 cursor-pointer transition-colors ${
              importMode === 'replace'
                ? 'bg-red-500/10 border border-red-500/30'
                : 'bg-muted border border-transparent hover:bg-muted/80'
            }`}
          >
            <input
              type="radio"
              name="importMode"
              value="replace"
              checked={importMode === 'replace'}
              onChange={() => onImportModeChange('replace')}
              className="mt-1"
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                Replace (Full Overwrite)
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Completely replaces all existing data with imported data.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Replace Mode Warning */}
      {importMode === 'replace' && (
        <div className="rounded-lg bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700/50 p-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-300">
                Warning: This will delete all existing data
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                All your current projects, workflows, templates, and settings will be
                permanently replaced. This action cannot be undone.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Conflict Warning (only show in merge mode) */}
      {importMode === 'merge' && preview.conflicts.length > 0 && (
        <div className="rounded-lg bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-400 dark:border-yellow-700/50 p-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                {preview.conflicts.length} conflict
                {preview.conflicts.length > 1 ? 's' : ''} detected
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Items with the same ID already exist. These will be skipped to
                preserve your current data.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Version Warning */}
      {preview.versionWarning && (
        <div className="rounded-lg bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-400 dark:border-yellow-700/50 p-3">
          <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm">{preview.versionWarning}</span>
          </div>
        </div>
      )}

      {/* File path */}
      {filePath && (
        <div className="rounded-lg bg-card border border-border p-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">Source file:</p>
          <p className="text-xs text-muted-foreground font-mono break-all truncate">
            {filePath}
          </p>
        </div>
      )}
    </>
  );
};

/**
 * Preview step footer (fixed)
 */
interface PreviewStepFooterProps {
  importMode: ImportModeOption;
  onBack: () => void;
  onImport: () => void;
}

const PreviewStepFooter: React.FC<PreviewStepFooterProps> = ({
  importMode,
  onBack,
  onImport,
}) => (
  <DialogFooter className="justify-between flex-shrink-0">
    <Button variant="ghost" onClick={onBack}>
      <ArrowLeft className="mr-2 h-4 w-4" />
      Back
    </Button>
    <Button
      onClick={onImport}
      variant={importMode === 'replace' ? 'destructive' : 'default'}
    >
      <Upload className="mr-2 h-4 w-4" />
      {importMode === 'replace' ? 'Replace All Data' : 'Confirm Import'}
    </Button>
  </DialogFooter>
);

/**
 * Importing state with progress
 */
const ImportingState: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-10">
    <div className="relative">
      <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
      <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10 border border-blue-500/30">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    </div>
    <p className="mt-4 text-sm text-foreground">Importing your data...</p>
    <p className="mt-1 text-xs text-muted-foreground">Please do not close this window</p>
  </div>
);

/**
 * Result step body content (scrollable)
 */
interface ResultStepBodyProps {
  result: ImportResult;
}

const ResultStepBody: React.FC<ResultStepBodyProps> = ({ result }) => {
  if (!result.success) {
    return (
      <div className="rounded-lg bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700/50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-200 dark:bg-red-500/20">
            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-red-700 dark:text-red-300">Import Failed</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              {result.error || 'An unknown error occurred'}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Your existing data has not been modified. Please check the file
              and try again.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { imported, skipped } = result.summary;
  const hasSkipped =
    skipped.projects > 0 || skipped.workflows > 0 || skipped.templates > 0 || skipped.stepTemplates > 0;

  return (
    <>
      <div className="flex flex-col items-center py-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/20 border border-green-500/30">
          <CheckCircle className="h-7 w-7 text-green-400" />
        </div>
        <h4 className="mt-3 text-base font-medium text-foreground">
          Import Complete
        </h4>
        <p className="mt-1 text-sm text-muted-foreground">
          Your data has been restored successfully
        </p>
      </div>

      <div className="rounded-lg bg-card border border-border p-4">
        <h5 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
          Import Summary
        </h5>
        <div className="space-y-3">
          {/* Imported items */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Successfully imported:</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center justify-between rounded bg-muted px-3 py-1.5">
                <span className="text-xs text-foreground">Projects</span>
                <span className="text-xs font-medium text-green-400">
                  {imported.projects}
                </span>
              </div>
              <div className="flex items-center justify-between rounded bg-muted px-3 py-1.5">
                <span className="text-xs text-foreground">Workflows</span>
                <span className="text-xs font-medium text-green-400">
                  {imported.workflows}
                </span>
              </div>
              <div className="flex items-center justify-between rounded bg-muted px-3 py-1.5">
                <span className="text-xs text-foreground">Templates</span>
                <span className="text-xs font-medium text-green-400">
                  {imported.templates}
                </span>
              </div>
              <div className="flex items-center justify-between rounded bg-muted px-3 py-1.5">
                <span className="text-xs text-foreground">Step Templates</span>
                <span className="text-xs font-medium text-green-400">
                  {imported.stepTemplates}
                </span>
              </div>
              <div className="flex items-center justify-between rounded bg-muted px-3 py-1.5 col-span-2">
                <span className="text-xs text-foreground">Settings</span>
                <span className="text-xs font-medium text-green-400">
                  {imported.settings ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>

          {/* Skipped items */}
          {hasSkipped && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                Skipped (already exist):
              </p>
              <div className="grid grid-cols-2 gap-2">
                {skipped.projects > 0 && (
                  <div className="flex items-center justify-between rounded bg-yellow-100 dark:bg-yellow-900/20 px-3 py-1.5">
                    <span className="text-xs text-muted-foreground">Projects</span>
                    <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
                      {skipped.projects}
                    </span>
                  </div>
                )}
                {skipped.workflows > 0 && (
                  <div className="flex items-center justify-between rounded bg-yellow-100 dark:bg-yellow-900/20 px-3 py-1.5">
                    <span className="text-xs text-muted-foreground">Workflows</span>
                    <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
                      {skipped.workflows}
                    </span>
                  </div>
                )}
                {skipped.templates > 0 && (
                  <div className="flex items-center justify-between rounded bg-yellow-100 dark:bg-yellow-900/20 px-3 py-1.5">
                    <span className="text-xs text-muted-foreground">Templates</span>
                    <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
                      {skipped.templates}
                    </span>
                  </div>
                )}
                {skipped.stepTemplates > 0 && (
                  <div className="flex items-center justify-between rounded bg-yellow-100 dark:bg-yellow-900/20 px-3 py-1.5">
                    <span className="text-xs text-muted-foreground">Step Templates</span>
                    <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
                      {skipped.stepTemplates}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

/**
 * Result step footer (fixed)
 */
interface ResultStepFooterProps {
  result: ImportResult;
  onClose: () => void;
}

const ResultStepFooter: React.FC<ResultStepFooterProps> = ({ result, onClose }) => (
  <DialogFooter className="flex-shrink-0">
    <Button variant={result.success ? 'default' : 'outline'} onClick={onClose}>
      {result.success ? 'Done' : 'Close'}
    </Button>
  </DialogFooter>
);

// ============================================================================
// ImportDialog Component
// ============================================================================

export const ImportDialog: React.FC<ImportDialogProps> = ({
  open,
  onOpenChange,
  onImportComplete,
}) => {
  const { import: importState } = useExportImport();
  const [step, setStep] = useState<ImportStep>('select');
  const [importMode, setImportMode] = useState<ImportModeOption>('merge');

  const handleSelectFile = useCallback(async () => {
    const result = await importState.selectFile();
    if (result.success && result.preview) {
      setStep('preview');
    }
  }, [importState]);

  const handleImport = useCallback(async () => {
    setStep('importing');
    const strategy: ConflictResolutionStrategy = {
      mode: importMode,
      defaultAction: 'skip',
    };
    const result = await importState.execute(strategy);
    setStep('result');
    if (result.success && onImportComplete) {
      onImportComplete(result);
    }
  }, [importState, importMode, onImportComplete]);

  const handleClose = useCallback(() => {
    importState.reset();
    setStep('select');
    onOpenChange(false);
  }, [importState, onOpenChange]);

  const handleBack = useCallback(() => {
    setStep('select');
    setImportMode('merge');
    importState.reset();
  }, [importState]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col overflow-hidden">
        <DialogClose onClick={handleClose} />
        {/* Fixed Header */}
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/20">
              <Upload className="h-4 w-4 text-purple-400" />
            </div>
            Import Data
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto mt-4 min-h-0">
          {/* Step indicator - hide during importing */}
          {step !== 'importing' && <StepIndicator currentStep={step} />}

          <div className="space-y-4">
            {/* Step 1: Select File - has its own footer */}
            {step === 'select' && (
              <SelectStep
                error={importState.error}
                isSelecting={importState.isSelecting}
                onSelectFile={handleSelectFile}
                onClose={handleClose}
              />
            )}

            {/* Step 2: Preview - body only */}
            {step === 'preview' && importState.preview && (
              <PreviewStepBody
                preview={importState.preview}
                filePath={importState.filePath}
                importMode={importMode}
                onImportModeChange={setImportMode}
              />
            )}

            {/* Step 3: Importing */}
            {step === 'importing' && <ImportingState />}

            {/* Step 4: Result - body only */}
            {step === 'result' && importState.result && (
              <ResultStepBody result={importState.result} />
            )}
          </div>
        </div>

        {/* Fixed Footer - only for preview and result steps */}
        {step === 'preview' && importState.preview && (
          <PreviewStepFooter
            importMode={importMode}
            onBack={handleBack}
            onImport={handleImport}
          />
        )}
        {step === 'result' && importState.result && (
          <ResultStepFooter result={importState.result} onClose={handleClose} />
        )}
      </DialogContent>
    </Dialog>
  );
};
