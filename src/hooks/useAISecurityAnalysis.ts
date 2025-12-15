/**
 * useAISecurityAnalysis Hook - AI Security Vulnerability Analysis
 *
 * Provides AI-powered security vulnerability analysis functionality:
 * - Single vulnerability analysis
 * - Comprehensive summary of all vulnerabilities
 * - Mutual exclusion (only one analysis can run at a time)
 */

import { useState, useCallback } from 'react';
import { aiAPI } from '../lib/tauri-api';
import type { VulnItem, VulnSummary } from '../types/security';
import type {
  GenerateSecurityAnalysisRequest,
  GenerateSecuritySummaryRequest,
} from '../types/ai';

// ============================================================================
// Types
// ============================================================================

export interface UseAISecurityAnalysisOptions {
  /** Project path */
  projectPath: string;
  /** Project name for context */
  projectName: string;
  /** Package manager used */
  packageManager: string;
}

export interface UseAISecurityAnalysisResult {
  /** Generate analysis for a single vulnerability */
  generateAnalysis: (
    vulnerability: VulnItem,
    options?: { serviceId?: string; templateId?: string }
  ) => Promise<string | null>;

  /** Generate summary for all vulnerabilities */
  generateSummary: (
    vulnerabilities: VulnItem[],
    summary: VulnSummary,
    options?: { serviceId?: string; templateId?: string }
  ) => Promise<string | null>;

  /** Whether any generation is in progress */
  isGenerating: boolean;

  /** ID of the vulnerability currently being analyzed (null for summary mode) */
  activeVulnerabilityId: string | null;

  /** Whether summary analysis is active */
  isSummaryActive: boolean;

  /** Error message if generation failed */
  error: string | null;

  /** Number of tokens used in the last generation */
  tokensUsed: number | null;

  /** Whether the last response was truncated */
  isTruncated: boolean;

  /** Clear the current error */
  clearError: () => void;

  /** Cancel current analysis (resets state) */
  cancelAnalysis: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useAISecurityAnalysis(
  options: UseAISecurityAnalysisOptions
): UseAISecurityAnalysisResult {
  const { projectPath, projectName, packageManager } = options;

  // State
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeVulnerabilityId, setActiveVulnerabilityId] = useState<string | null>(null);
  const [isSummaryActive, setIsSummaryActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokensUsed, setTokensUsed] = useState<number | null>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  // ============================================================================
  // Single Vulnerability Analysis
  // ============================================================================

  const generateAnalysis = useCallback(
    async (
      vulnerability: VulnItem,
      genOptions?: { serviceId?: string; templateId?: string }
    ): Promise<string | null> => {
      // Check mutual exclusion
      if (isGenerating) {
        setError('Another analysis is already in progress');
        return null;
      }

      if (!projectPath) {
        setError('Project path is required');
        return null;
      }

      // Set state for mutual exclusion
      setIsGenerating(true);
      setActiveVulnerabilityId(vulnerability.id);
      setIsSummaryActive(false);
      setError(null);
      setTokensUsed(null);
      setIsTruncated(false);

      try {
        const request: GenerateSecurityAnalysisRequest = {
          projectPath,
          projectName,
          packageManager,
          vulnerability,
          serviceId: genOptions?.serviceId,
          templateId: genOptions?.templateId,
        };

        const response = await aiAPI.generateSecurityAnalysis(request);

        if (response.success && response.data) {
          setTokensUsed(response.data.tokensUsed ?? null);
          setIsTruncated(response.data.isTruncated);
          return response.data.analysis;
        } else {
          const errorMsg = response.error || 'Failed to generate security analysis';
          setError(errorMsg);
          return null;
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Unknown error generating security analysis';
        setError(message);
        console.error('Generate security analysis error:', err);
        return null;
      } finally {
        setIsGenerating(false);
        setActiveVulnerabilityId(null);
      }
    },
    [projectPath, projectName, packageManager, isGenerating]
  );

  // ============================================================================
  // All Vulnerabilities Summary
  // ============================================================================

  const generateSummary = useCallback(
    async (
      vulnerabilities: VulnItem[],
      summary: VulnSummary,
      genOptions?: { serviceId?: string; templateId?: string }
    ): Promise<string | null> => {
      console.log('[useAISecurityAnalysis] generateSummary called', {
        vulnCount: vulnerabilities.length,
        isGenerating,
        projectPath,
      });

      // Check mutual exclusion
      if (isGenerating) {
        console.warn('[useAISecurityAnalysis] Already generating, returning early');
        setError('Another analysis is already in progress');
        return null;
      }

      if (!projectPath) {
        console.warn('[useAISecurityAnalysis] No projectPath');
        setError('Project path is required');
        return null;
      }

      if (vulnerabilities.length === 0) {
        console.warn('[useAISecurityAnalysis] No vulnerabilities');
        setError('No vulnerabilities to analyze');
        return null;
      }

      // Set state for mutual exclusion
      setIsGenerating(true);
      setActiveVulnerabilityId(null);
      setIsSummaryActive(true);
      setError(null);
      setTokensUsed(null);
      setIsTruncated(false);

      try {
        const request: GenerateSecuritySummaryRequest = {
          projectPath,
          projectName,
          packageManager,
          vulnerabilities,
          summary,
          serviceId: genOptions?.serviceId,
          templateId: genOptions?.templateId,
        };

        console.log('[useAISecurityAnalysis] Calling API with request:', {
          projectPath: request.projectPath,
          projectName: request.projectName,
          vulnCount: request.vulnerabilities.length,
        });

        const response = await aiAPI.generateSecuritySummary(request);

        console.log('[useAISecurityAnalysis] API response:', {
          success: response.success,
          hasData: !!response.data,
          error: response.error,
        });

        if (response.success && response.data) {
          setTokensUsed(response.data.tokensUsed ?? null);
          setIsTruncated(response.data.isTruncated);
          console.log('[useAISecurityAnalysis] Success, analysis length:', response.data.analysis?.length);
          return response.data.analysis;
        } else {
          const errorMsg = response.error || 'Failed to generate security summary';
          console.error('[useAISecurityAnalysis] API error:', errorMsg);
          setError(errorMsg);
          return null;
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Unknown error generating security summary';
        setError(message);
        console.error('[useAISecurityAnalysis] Exception:', err);
        return null;
      } finally {
        setIsGenerating(false);
        setIsSummaryActive(false);
      }
    },
    [projectPath, projectName, packageManager, isGenerating]
  );

  // ============================================================================
  // Utility Functions
  // ============================================================================

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const cancelAnalysis = useCallback(() => {
    // Note: This only resets state, it doesn't cancel the actual API call
    // The backend will still complete the request
    setIsGenerating(false);
    setActiveVulnerabilityId(null);
    setIsSummaryActive(false);
    setError(null);
  }, []);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    generateAnalysis,
    generateSummary,
    isGenerating,
    activeVulnerabilityId,
    isSummaryActive,
    error,
    tokensUsed,
    isTruncated,
    clearError,
    cancelAnalysis,
  };
}
