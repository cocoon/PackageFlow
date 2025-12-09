// Version management types
// Feature: 006-node-package-manager

import type { PackageManager } from './project';

/** Version requirement source from package.json */
export type VersionSource = 'volta' | 'packageManager' | 'engines' | 'none';

/** Project version requirement (unified format) */
export interface VersionRequirement {
  /** Node.js version requirement (exact version or range) */
  node: string | null;
  /** Package manager name */
  packageManagerName: PackageManager | null;
  /** Package manager version (exact version) */
  packageManagerVersion: string | null;
  /** Primary source of the version requirement (for backward compatibility) */
  source: VersionSource;
  /** Source of Node.js version requirement */
  nodeSource: VersionSource | null;
  /** Source of package manager version requirement */
  packageManagerSource: VersionSource | null;
}

/** Tool installation status */
export interface ToolStatus {
  /** Whether the tool is available */
  available: boolean;
  /** Tool version */
  version: string | null;
  /** Tool installation path */
  path: string | null;
}

/** System environment information */
export interface SystemEnvironment {
  /** Current Node.js version */
  nodeVersion: string | null;
  /** Current npm version */
  npmVersion: string | null;
  /** Current yarn version */
  yarnVersion: string | null;
  /** Current pnpm version */
  pnpmVersion: string | null;
  /** Volta installation status */
  volta: ToolStatus;
  /** Corepack status */
  corepack: ToolStatus;
}

/** Single compatibility check result */
export interface CompatibilityItem {
  /** Whether compatible */
  isCompatible: boolean;
  /** Current version */
  current: string | null;
  /** Required version */
  required: string | null;
  /** Name (e.g., "node", "pnpm", "yarn", "npm") */
  name: string | null;
  /** Incompatibility message */
  message: string | null;
}

/** Available version management tool */
export type VersionTool = 'volta' | 'corepack';

/** Recommended action when version mismatch */
export type RecommendedAction = 'execute' | 'useVolta' | 'useCorepack' | 'warnAndAsk';

/** Volta/Corepack conflict information */
export interface VoltaCorepackConflict {
  /** Whether a conflict is detected */
  hasConflict: boolean;
  /** Affected tools (yarn, pnpm, etc.) */
  affectedTools: string[];
  /** Human-readable description of the conflict */
  description?: string;
  /** Suggested fix command */
  fixCommand?: string;
}

/** Version compatibility check result */
export interface VersionCompatibility {
  /** Overall compatibility */
  isCompatible: boolean;
  /** Node.js compatibility */
  node: CompatibilityItem;
  /** Package manager compatibility */
  packageManager: CompatibilityItem;
  /** Available version management tools */
  availableTools: VersionTool[];
  /** Recommended action */
  recommendedAction: RecommendedAction;
  /** Volta/Corepack conflict warning (if any) */
  voltaCorepackConflict?: VoltaCorepackConflict;
}

// API Response types
export interface VersionRequirementResponse {
  success: boolean;
  data?: VersionRequirement;
  error?: string;
}

export interface SystemEnvironmentResponse {
  success: boolean;
  data?: SystemEnvironment;
  error?: string;
}

export interface VersionCompatibilityResponse {
  success: boolean;
  data?: VersionCompatibility;
  error?: string;
}
