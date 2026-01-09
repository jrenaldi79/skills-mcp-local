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
