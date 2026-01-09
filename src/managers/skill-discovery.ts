import fs from 'fs/promises';
import path from 'path';
import { InstalledSkill, SkillMetadata } from '../types/index.js';
import { parseSkillFrontmatter } from '../utils/yaml-parser.js';
import { getSkillSearchPaths } from '../utils/paths.js';
import logger from '../utils/logger.js';

/**
 * Manager for discovering locally installed skills
 */
export class SkillDiscoveryManager {
  /**
   * Check if a directory exists
   */
  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(dirPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Check if a file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(filePath);
      return stat.isFile();
    } catch {
      return false;
    }
  }

  /**
   * Read SKILL.md content from a skill directory
   */
  private async readSkillFile(skillPath: string): Promise<string | null> {
    const skillFile = path.join(skillPath, 'SKILL.md');
    try {
      return await fs.readFile(skillFile, 'utf-8');
    } catch {
      return null;
    }
  }

  /**
   * Discover a single skill from its directory
   */
  private async discoverSkill(skillDir: string): Promise<InstalledSkill | null> {
    const skillMdPath = path.join(skillDir, 'SKILL.md');

    // Check if SKILL.md exists
    if (!(await this.fileExists(skillMdPath))) {
      return null;
    }

    const content = await this.readSkillFile(skillDir);
    if (!content) {
      return null;
    }

    // Parse frontmatter
    const parseResult = parseSkillFrontmatter(content);

    // Check for subdirectories
    const hasScripts = await this.directoryExists(path.join(skillDir, 'scripts'));
    const hasReferences = await this.directoryExists(path.join(skillDir, 'references'));
    const hasAssets = await this.directoryExists(path.join(skillDir, 'assets'));

    if (parseResult.success && parseResult.data) {
      return {
        metadata: parseResult.data,
        location: skillDir,
        hasScripts,
        hasReferences,
        hasAssets,
        isValid: true,
      };
    } else {
      // Create a fallback metadata for invalid skills
      const dirName = path.basename(skillDir);
      const fallbackMetadata: SkillMetadata = {
        name: dirName,
        description: 'Invalid skill - parsing failed',
      };

      return {
        metadata: fallbackMetadata,
        location: skillDir,
        hasScripts,
        hasReferences,
        hasAssets,
        isValid: false,
        validationErrors: [parseResult.error || 'Unknown parsing error'],
      };
    }
  }

  /**
   * Discover all skills in a specific directory
   *
   * @param searchPath - Directory to search for skills
   * @returns Array of discovered skills
   */
  async discoverSkillsInPath(searchPath: string): Promise<InstalledSkill[]> {
    // Check if path exists
    if (!(await this.directoryExists(searchPath))) {
      logger.debug('Search path does not exist', { path: searchPath });
      return [];
    }

    const skills: InstalledSkill[] = [];

    try {
      const entries = await fs.readdir(searchPath, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }

        const skillDir = path.join(searchPath, entry.name);
        const skill = await this.discoverSkill(skillDir);

        if (skill) {
          logger.debug('Discovered skill', {
            name: skill.metadata.name,
            valid: skill.isValid,
            path: skillDir,
          });
          skills.push(skill);
        }
      }
    } catch (err) {
      logger.error('Error reading directory', {
        path: searchPath,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return skills;
  }

  /**
   * Discover skills across all configured search paths
   * Skills from earlier paths take priority (deduplication by name)
   *
   * @param searchPaths - Optional custom search paths (uses defaults if not provided)
   * @returns Array of discovered skills (deduplicated)
   */
  async discoverAllSkills(searchPaths?: string[]): Promise<InstalledSkill[]> {
    const paths = searchPaths ?? getSkillSearchPaths();
    const skillMap = new Map<string, InstalledSkill>();

    for (const searchPath of paths) {
      const skills = await this.discoverSkillsInPath(searchPath);

      for (const skill of skills) {
        // Only add if not already found (earlier paths take priority)
        if (!skillMap.has(skill.metadata.name)) {
          skillMap.set(skill.metadata.name, skill);
        }
      }
    }

    return Array.from(skillMap.values());
  }

  /**
   * Generate a tool description containing all skill metadata
   * This description is embedded in the MCP tool definition
   *
   * @param skills - Array of installed skills
   * @returns Formatted description string
   */
  generateToolDescription(skills: InstalledSkill[]): string {
    if (skills.length === 0) {
      return `Lists all installed skills on this machine.

No skills are currently installed. Install skills to ~/skills/ or run skills_discover to find available skills.

Call this tool to refresh the skill list.`;
    }

    const validSkills = skills.filter(s => s.isValid);
    const lines = [
      'Lists all installed skills. Currently installed:',
      '',
    ];

    for (const skill of validSkills) {
      lines.push(`- ${skill.metadata.name}: ${skill.metadata.description}`);
      lines.push(`  Location: ${skill.location}/`);
      lines.push('');
    }

    lines.push('Call this tool to get full metadata in JSON format or to refresh the list.');

    return lines.join('\n');
  }
}
