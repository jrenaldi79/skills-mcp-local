/**
 * Skill metadata extracted from YAML frontmatter
 * Based on agentskills.io specification
 */
export interface SkillMetadata {
  /** Required: Max 64 chars, lowercase letters, numbers, hyphens only */
  name: string;
  /** Required: Max 1024 chars */
  description: string;
  /** Optional: License name or reference */
  license?: string;
  /** Optional: Max 500 chars, environment requirements */
  compatibility?: string;
  /** Optional: Arbitrary key-value mapping */
  metadata?: Record<string, unknown>;
  /** Optional: Space-delimited list of pre-approved tools */
  allowedTools?: string;
}

/**
 * Result of parsing skill frontmatter
 */
export interface ParseResult<T> {
  success: boolean;
  data?: T;
  body?: string;
  error?: string;
}

/**
 * Tracks where a skill was installed from for update detection
 */
export interface SkillSource {
  /** The marketplace URL the skill was installed from */
  marketplaceUrl: string;
  /** The skill's path within the marketplace (e.g., 'pdf-helper') */
  skillPath: string;
  /** ISO timestamp when the skill was installed */
  installedAt: string;
  /** Git commit hash at time of installation */
  commitHash: string;
  /** Git branch (optional, defaults to main) */
  branch?: string;
}

/**
 * Update status for a skill
 */
export interface SkillUpdateStatus {
  /** Whether an update is available */
  hasUpdate: boolean;
  /** Current local commit hash */
  localCommit?: string;
  /** Latest remote commit hash */
  remoteCommit?: string;
  /** Error message if update check failed */
  error?: string;
}

/**
 * Installed skill with full context
 */
export interface InstalledSkill {
  metadata: SkillMetadata;
  /** Absolute path to skill directory */
  location: string;
  /** Whether scripts/ directory exists */
  hasScripts: boolean;
  /** Whether references/ directory exists */
  hasReferences: boolean;
  /** Whether assets/ directory exists */
  hasAssets: boolean;
  /** Whether SKILL.md is valid */
  isValid: boolean;
  /** Validation errors if any */
  validationErrors?: string[];
  /** Source tracking information (if installed via marketplace) */
  source?: SkillSource;
  /** Update status (populated during update checks) */
  updateStatus?: SkillUpdateStatus;
}

/**
 * Skill from marketplace
 */
export interface MarketplaceSkill {
  metadata: SkillMetadata;
  /** Source marketplace URL */
  marketplaceUrl: string;
  /** Command to install this skill */
  installCommand: string;
}

/**
 * Marketplace configuration
 */
export interface MarketplaceConfig {
  version: string;
  /** List of marketplace URLs */
  marketplaces: string[];
}

/**
 * Log levels for structured logging
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Tool result for MCP server
 * Compatible with MCP SDK types
 */
export interface ToolResult {
  [x: string]: unknown;
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}
