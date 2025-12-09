/**
 * Security Audit Type Definitions
 * @see specs/005-package-security-audit/spec.md
 */

/**
 * Scan status for tracking vulnerability scan progress
 */
export type ScanStatus = 'pending' | 'running' | 'success' | 'failed';

/**
 * Supported package managers for security scanning
 */
export type PackageManagerType = 'npm' | 'pnpm' | 'yarn' | 'bun' | 'unknown';

/**
 * Vulnerability severity levels following npm audit conventions
 * - critical: Severe vulnerabilities requiring immediate attention
 * - high: High-priority issues that should be addressed soon
 * - moderate: Medium-priority issues that should be reviewed
 * - low: Low-priority issues with limited impact
 * - info: Informational notices
 */
export type VulnSeverity = 'critical' | 'high' | 'moderate' | 'low' | 'info';

/**
 * Summary of vulnerabilities by severity level
 */
export interface VulnSummary {
  total: number;
  critical: number;
  high: number;
  moderate: number;
  low: number;
  info: number;
}

/**
 * Information about available fix for a vulnerability
 */
export interface VulnFixInfo {
  /** Package name that provides the fix */
  package: string;
  /** Version that fixes the vulnerability */
  version: string;
  /** Whether the fix requires a major version update */
  isMajorUpdate: boolean;
}

/**
 * Individual vulnerability item from security scan
 */
export interface VulnItem {
  /** Unique identifier for the vulnerability (e.g., GHSA-xxxx) */
  id: string;
  /** Name of the vulnerable package */
  packageName: string;
  /** Currently installed version of the package */
  installedVersion: string;
  /** Severity level of the vulnerability */
  severity: VulnSeverity;
  /** Short title describing the vulnerability */
  title: string;
  /** Detailed description of the vulnerability */
  description?: string;
  /** Recommendation for fixing the vulnerability */
  recommendation?: string;
  /** URL to the security advisory */
  advisoryUrl?: string;
  /** CVE identifiers */
  cves: string[];
  /** CWE identifiers */
  cwes: string[];
  /** Dependency paths showing how this package is included */
  paths: string[][];
  /** Whether this is a direct dependency */
  isDirect: boolean;
  /** Whether a fix is available */
  fixAvailable: boolean;
  /** Information about the fix if available */
  fixInfo?: VulnFixInfo;
  /** Workspace packages affected by this vulnerability (for monorepos) */
  workspacePackages: string[];
}

/**
 * Error codes for scan failures
 */
export type ScanErrorCode =
  | 'CLI_NOT_FOUND'
  | 'NO_LOCKFILE'
  | 'NO_NODE_MODULES'
  | 'NETWORK_ERROR'
  | 'PARSE_ERROR'
  | 'TIMEOUT'
  | 'UNKNOWN';

/**
 * Error information from a failed scan
 */
export interface ScanError {
  /** Error code for programmatic handling */
  code: ScanErrorCode;
  /** Human-readable error message */
  message: string;
  /** Additional error details */
  details?: string;
  /** Suggested action to resolve the error */
  suggestion?: string;
}

/**
 * Security summary for a single workspace package in a monorepo
 */
export interface WorkspaceVulnSummary {
  /** Workspace package name */
  packageName: string;
  /** Workspace relative path */
  relativePath: string;
  /** Vulnerability counts for this workspace */
  summary: VulnSummary;
  /** IDs of vulnerabilities affecting this workspace */
  vulnerabilityIds: string[];
}

/**
 * Complete result of a vulnerability scan
 */
export interface VulnScanResult {
  /** Unique identifier for this scan result */
  id: string;
  /** Associated project ID */
  projectId: string;
  /** ISO timestamp when the scan was performed */
  scannedAt: string;
  /** Current status of the scan */
  status: ScanStatus;
  /** Detected package manager used for scanning */
  packageManager: PackageManagerType;
  /** Package manager version */
  packageManagerVersion: string;
  /** Summary of vulnerabilities found */
  summary: VulnSummary;
  /** List of individual vulnerabilities */
  vulnerabilities: VulnItem[];
  /** Dependency statistics */
  dependencyCount: DependencyCount;
  /** Error information if the scan failed */
  error: ScanError | null;
  /** Per-workspace vulnerability summaries (for monorepos) */
  workspaceSummaries: WorkspaceVulnSummary[];
}

/**
 * Props for severity-based filtering
 */
export interface SeverityFilterState {
  critical: boolean;
  high: boolean;
  moderate: boolean;
  low: boolean;
  info: boolean;
}

/**
 * Security state for a project in the overview
 */
export interface ProjectSecurityState {
  projectId: string;
  projectName: string;
  projectPath: string;
  lastScanResult: VulnScanResult | null;
  /** Whether a scan is currently in progress */
  isScanning: boolean;
}

/**
 * Security scan data stored per project
 */
export interface SecurityScanData {
  /** Associated project ID */
  projectId: string;
  /** Detected package manager */
  packageManager: PackageManagerType;
  /** Most recent scan result */
  lastScan: VulnScanResult | null;
  /** Scan history (up to 10 entries) */
  scanHistory: VulnScanResult[];
  /** Snooze reminder until this timestamp (ISO 8601) */
  snoozeUntil?: string;
}

/**
 * Dependency count statistics
 */
export interface DependencyCount {
  prod: number;
  dev: number;
  optional: number;
  peer: number;
  total: number;
}

/**
 * CVSS scoring information
 */
export interface CvssInfo {
  score: number;
  vector: string;
}
