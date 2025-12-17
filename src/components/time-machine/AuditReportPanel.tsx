// Audit Report Panel Component
// Generate and export security audit reports

import { useState, useCallback } from 'react';
import {
  FileText,
  Download,
  RefreshCw,
  Shield,
  AlertTriangle,
  Package,
  Calendar,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from 'lucide-react';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { save } from '@tauri-apps/plugin-dialog';
import { useSnapshotSearch } from '../../hooks/useSnapshotSearch';
import { cn } from '../../lib/utils';
import type { ExportFormat } from '../../types/snapshot';

interface AuditReportPanelProps {
  projectPath: string;
  className?: string;
}

export function AuditReportPanel({ projectPath, className }: AuditReportPanelProps) {
  const {
    auditReport,
    isGeneratingReport,
    reportError,
    generateReport,
    exportReport,
  } = useSnapshotSearch();

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['summary', 'dependencies'])
  );
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Generate report
  const handleGenerateReport = useCallback(() => {
    generateReport(projectPath);
  }, [projectPath, generateReport]);

  // Toggle section
  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }, []);

  // Export report
  const handleExport = useCallback(
    async (format: ExportFormat) => {
      if (!auditReport) return;

      setIsExporting(true);
      try {
        const content = await exportReport(format);
        if (!content) return;

        const extensions: Record<ExportFormat, string> = {
          json: 'json',
          markdown: 'md',
          html: 'html',
        };

        const filePath = await save({
          title: 'Export Audit Report',
          defaultPath: `security-audit-${Date.now()}.${extensions[format]}`,
          filters: [
            {
              name: format.toUpperCase(),
              extensions: [extensions[format]],
            },
          ],
        });

        if (filePath) {
          await writeTextFile(filePath, content);
        }
      } catch (err) {
        console.error('Export failed:', err);
      } finally {
        setIsExporting(false);
      }
    },
    [auditReport, exportReport]
  );

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    if (!auditReport) return;

    try {
      const content = await exportReport('markdown');
      if (content) {
        await navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error('Copy failed:', err);
    }
  }, [auditReport, exportReport]);

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  // Risk level colors
  const riskColors = {
    low: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30',
    medium: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30',
    high: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30',
    critical: 'text-red-700 dark:text-red-300 bg-red-200 dark:bg-red-900/50',
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Security Audit Report
          </h3>
          <button
            onClick={handleGenerateReport}
            disabled={isGeneratingReport}
            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg flex items-center gap-1.5"
          >
            {isGeneratingReport ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="w-3 h-3" />
                Generate
              </>
            )}
          </button>
        </div>

        {/* Export Actions */}
        {auditReport && (
          <div className="flex gap-2">
            <button
              onClick={() => handleExport('json')}
              disabled={isExporting}
              className="flex-1 px-2 py-1.5 text-xs text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded flex items-center justify-center gap-1"
            >
              <Download className="w-3 h-3" />
              JSON
            </button>
            <button
              onClick={() => handleExport('markdown')}
              disabled={isExporting}
              className="flex-1 px-2 py-1.5 text-xs text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded flex items-center justify-center gap-1"
            >
              <Download className="w-3 h-3" />
              Markdown
            </button>
            <button
              onClick={() => handleExport('html')}
              disabled={isExporting}
              className="flex-1 px-2 py-1.5 text-xs text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded flex items-center justify-center gap-1"
            >
              <Download className="w-3 h-3" />
              HTML
            </button>
            <button
              onClick={handleCopy}
              className="px-2 py-1.5 text-xs text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded flex items-center gap-1"
              title="Copy as Markdown"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        )}
      </div>

      {/* Report Content */}
      <div className="flex-1 overflow-y-auto">
        {reportError && (
          <div className="p-4 m-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg">
            {reportError}
          </div>
        )}

        {auditReport ? (
          <div className="p-4 space-y-4">
            {/* Report Header */}
            <div className="text-xs text-neutral-500">
              Generated: {formatDate(auditReport.generatedAt)}
            </div>

            {/* Risk Summary Section */}
            <CollapsibleSection
              title="Risk Summary"
              icon={<Shield className="w-4 h-4" />}
              isOpen={expandedSections.has('summary')}
              onToggle={() => toggleSection('summary')}
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                  <div className="text-xs text-neutral-500 mb-1">Overall Risk</div>
                  <div
                    className={cn(
                      'inline-block px-2 py-0.5 rounded text-sm font-medium',
                      riskColors[auditReport.riskSummary.overallRisk as keyof typeof riskColors] ||
                        'text-neutral-600 bg-neutral-100'
                    )}
                  >
                    {auditReport.riskSummary.overallRisk.toUpperCase()}
                  </div>
                </div>

                <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                  <div className="text-xs text-neutral-500 mb-1">Avg Security Score</div>
                  <div className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                    {auditReport.riskSummary.avgSecurityScore?.toFixed(0) ?? 'N/A'}
                    <span className="text-xs text-neutral-500">/100</span>
                  </div>
                </div>

                <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                  <div className="text-xs text-neutral-500 mb-1">Postinstall Scripts</div>
                  <div className="text-lg font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    {auditReport.riskSummary.totalPostinstallScripts}
                  </div>
                </div>

                <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                  <div className="text-xs text-neutral-500 mb-1">Security Issues</div>
                  <div className="text-lg font-semibold text-red-600 dark:text-red-400">
                    {auditReport.riskSummary.totalSecurityIssues}
                  </div>
                </div>
              </div>

              <div className="mt-3 text-xs text-neutral-500">
                <Calendar className="w-3 h-3 inline mr-1" />
                {auditReport.totalSnapshots} snapshots analyzed
                {auditReport.dateRange && (
                  <>
                    {' '}
                    from {formatDate(auditReport.dateRange.earliest)} to{' '}
                    {formatDate(auditReport.dateRange.latest)}
                  </>
                )}
              </div>
            </CollapsibleSection>

            {/* Dependency Analysis Section */}
            <CollapsibleSection
              title={`Dependency Analysis (${auditReport.dependencyAnalysis.length})`}
              icon={<Package className="w-4 h-4" />}
              isOpen={expandedSections.has('dependencies')}
              onToggle={() => toggleSection('dependencies')}
            >
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {auditReport.dependencyAnalysis.map((dep) => (
                  <div
                    key={dep.packageName}
                    className="p-2 bg-neutral-50 dark:bg-neutral-800 rounded text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-neutral-900 dark:text-neutral-100">
                        {dep.packageName}
                      </span>
                      <div className="flex items-center gap-2">
                        {dep.hasPostinstall && (
                          <span title="Has postinstall">
                            <AlertTriangle className="w-3 h-3 text-amber-500" />
                          </span>
                        )}
                        <span className="text-xs text-neutral-500">
                          {dep.versionsSeen.length} version{dep.versionsSeen.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-neutral-500 mt-1">
                      First seen: {formatDate(dep.firstSeen)}
                    </div>
                    {dep.securityConcerns.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {dep.securityConcerns.map((concern, i) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded"
                          >
                            {concern}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleSection>

            {/* Security Events Section */}
            <CollapsibleSection
              title={`Security Events (${auditReport.securityEvents.length})`}
              icon={<AlertTriangle className="w-4 h-4" />}
              isOpen={expandedSections.has('events')}
              onToggle={() => toggleSection('events')}
            >
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {auditReport.securityEvents.length > 0 ? (
                  auditReport.securityEvents.map((event, i) => (
                    <div
                      key={i}
                      className="p-2 bg-neutral-50 dark:bg-neutral-800 rounded text-sm flex items-start gap-2"
                    >
                      {event.severity === 'high' || event.severity === 'critical' ? (
                        <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-neutral-900 dark:text-neutral-100">
                          {event.description}
                        </div>
                        <div className="text-xs text-neutral-500 mt-0.5">
                          {formatDate(event.timestamp)} | {event.eventType}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-neutral-500 py-4">
                    <CheckCircle className="w-6 h-6 mx-auto mb-1 text-green-500" />
                    <p className="text-sm">No security events recorded</p>
                  </div>
                )}
              </div>
            </CollapsibleSection>
          </div>
        ) : !isGeneratingReport ? (
          <div className="p-8 text-center text-neutral-500">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No report generated yet</p>
            <p className="text-xs mt-1">Click &quot;Generate&quot; to create a security audit report</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// Collapsible Section Component
interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function CollapsibleSection({
  title,
  icon,
  isOpen,
  onToggle,
  children,
}: CollapsibleSectionProps) {
  return (
    <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-750"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">
          {icon}
          {title}
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-neutral-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-neutral-400" />
        )}
      </button>
      {isOpen && <div className="p-4">{children}</div>}
    </div>
  );
}
