import os from 'os';
import path from 'path';

/**
 * Path utilities for skill discovery
 * Handles path expansion and provides standard skill locations
 */

const HOME_DIR = os.homedir();

/**
 * Skill search paths in priority order
 */
const SKILL_SEARCH_PATHS = [
  '~/skills',                    // Primary
  '~/.claude/skills',            // Claude-specific
  '.claude/skills',              // Current directory (relative)
  '~/Documents/skills',          // Fallback 1
  '~/.local/share/skills',       // Fallback 2 (XDG)
  '/usr/local/share/skills',     // System-wide
];

/**
 * Expand ~ to home directory and resolve relative paths
 *
 * @param p - Path that may contain ~ or be relative
 * @returns Absolute path with ~ expanded
 */
export function expandPath(p: string): string {
  if (!p || p.length === 0) {
    return process.cwd();
  }

  // Expand ~ at the beginning
  if (p.startsWith('~/')) {
    return path.join(HOME_DIR, p.slice(2));
  }

  if (p === '~') {
    return HOME_DIR;
  }

  // If already absolute, return as-is
  if (path.isAbsolute(p)) {
    return p;
  }

  // Resolve relative paths
  return path.resolve(p);
}

/**
 * Get all skill search paths in priority order
 * All paths are returned as absolute paths
 *
 * @returns Array of absolute paths to search for skills
 */
export function getSkillSearchPaths(): string[] {
  return SKILL_SEARCH_PATHS.map(expandPath);
}

/**
 * Get the configuration file path
 *
 * @returns Absolute path to config.json
 */
export function getConfigPath(): string {
  return path.join(HOME_DIR, '.config', 'skills-mcp', 'config.json');
}

/**
 * Get the default installation path for skills
 *
 * @returns Absolute path to default install directory
 */
export function getDefaultInstallPath(): string {
  return path.join(HOME_DIR, 'skills');
}
