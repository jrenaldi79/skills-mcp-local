import YAML from 'yaml';
import { SkillMetadata, ParseResult } from '../types/index.js';

/**
 * Alias for SkillMetadata for backward compatibility
 */
export type SkillFrontmatter = SkillMetadata;

/** Regex pattern for valid skill names */
const NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Maximum lengths per spec */
const MAX_NAME_LENGTH = 64;
const MAX_DESCRIPTION_LENGTH = 1024;
const MAX_COMPATIBILITY_LENGTH = 500;

/**
 * Validates skill name according to agentskills.io specification
 */
function validateName(name: unknown): string | null {
  if (typeof name !== 'string' || name.length === 0) {
    return 'name is required and must be a non-empty string';
  }

  if (name.length > MAX_NAME_LENGTH) {
    return `name must not exceed ${MAX_NAME_LENGTH} characters`;
  }

  if (name.startsWith('-')) {
    return 'name must not start with a hyphen';
  }

  if (name.endsWith('-')) {
    return 'name must not end with a hyphen';
  }

  if (name.includes('--')) {
    return 'name must not contain consecutive hyphens';
  }

  if (!NAME_PATTERN.test(name)) {
    return 'name must contain only lowercase letters, numbers, and hyphens';
  }

  return null;
}

/**
 * Validates skill description according to agentskills.io specification
 */
function validateDescription(description: unknown): string | null {
  if (typeof description !== 'string' || description.length === 0) {
    return 'description is required and must be a non-empty string';
  }

  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return `description must not exceed ${MAX_DESCRIPTION_LENGTH} characters`;
  }

  return null;
}

/**
 * Validates compatibility field if present
 */
function validateCompatibility(compatibility: unknown): string | null {
  if (compatibility === undefined) {
    return null;
  }

  if (typeof compatibility !== 'string') {
    return 'compatibility must be a string';
  }

  if (compatibility.length > MAX_COMPATIBILITY_LENGTH) {
    return `compatibility must not exceed ${MAX_COMPATIBILITY_LENGTH} characters`;
  }

  return null;
}

/**
 * Extract frontmatter section from content
 * Returns [yamlContent, bodyContent] or null if no frontmatter found
 */
function extractFrontmatter(content: string): [string, string] | null {
  const lines = content.split('\n');

  // Must start with ---
  if (lines.length === 0 || lines[0].trim() !== '---') {
    return null;
  }

  // Find closing ---
  let closingIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      closingIndex = i;
      break;
    }
  }

  if (closingIndex === -1) {
    return null;
  }

  const yamlContent = lines.slice(1, closingIndex).join('\n');
  const bodyContent = lines.slice(closingIndex + 1).join('\n');

  return [yamlContent, bodyContent];
}

/**
 * Parse YAML frontmatter from SKILL.md content
 * Validates against agentskills.io specification
 *
 * @param content - Raw SKILL.md file content
 * @returns ParseResult with metadata and body if successful
 */
export function parseSkillFrontmatter(content: string): ParseResult<SkillFrontmatter> {
  // Extract frontmatter
  const extracted = extractFrontmatter(content);
  if (!extracted) {
    return {
      success: false,
      error: 'No valid YAML frontmatter found. File must start with --- and have a closing ---',
    };
  }

  const [yamlContent, bodyContent] = extracted;

  // Parse YAML
  let parsed: unknown;
  try {
    parsed = YAML.parse(yamlContent);
  } catch (err) {
    return {
      success: false,
      error: `Invalid YAML syntax: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  // Must be an object
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return {
      success: false,
      error: 'Frontmatter must be a YAML object with key-value pairs',
    };
  }

  const data = parsed as Record<string, unknown>;

  // Validate required fields
  const nameError = validateName(data.name);
  if (nameError) {
    return { success: false, error: nameError };
  }

  const descError = validateDescription(data.description);
  if (descError) {
    return { success: false, error: descError };
  }

  // Validate optional fields
  const compatError = validateCompatibility(data.compatibility);
  if (compatError) {
    return { success: false, error: compatError };
  }

  // Build result
  const result: SkillFrontmatter = {
    name: data.name as string,
    description: (data.description as string).trim(),
  };

  // Add optional fields if present
  if (typeof data.license === 'string') {
    result.license = data.license;
  }

  if (typeof data.compatibility === 'string') {
    result.compatibility = data.compatibility;
  }

  if (typeof data.metadata === 'object' && data.metadata !== null) {
    result.metadata = data.metadata as Record<string, unknown>;
  }

  if (typeof data['allowed-tools'] === 'string') {
    result.allowedTools = data['allowed-tools'];
  }

  return {
    success: true,
    data: result,
    body: bodyContent,
  };
}
