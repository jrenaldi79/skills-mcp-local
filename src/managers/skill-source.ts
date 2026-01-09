/**
 * Skill Source Manager
 *
 * Manages tracking of where skills were installed from,
 * enabling update detection by comparing commit hashes.
 */

import * as fs from 'fs';
import * as path from 'path';
import { SkillSource } from '../types/index.js';
import logger from '../utils/logger.js';

const SOURCE_FILENAME = '.skill-source.json';

/**
 * Manages skill source tracking for update detection
 */
export class SkillSourceManager {
  /**
   * Save source tracking information for an installed skill
   */
  async saveSource(skillPath: string, source: SkillSource): Promise<void> {
    const sourcePath = path.join(skillPath, SOURCE_FILENAME);
    try {
      await fs.promises.writeFile(
        sourcePath,
        JSON.stringify(source, null, 2),
        'utf-8'
      );
      logger.debug('Saved skill source', { skillPath, commitHash: source.commitHash });
    } catch (error) {
      logger.error('Failed to save skill source', {
        skillPath,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get source tracking information for an installed skill
   * Returns null if the skill doesn't have source tracking
   */
  async getSource(skillPath: string): Promise<SkillSource | null> {
    const sourcePath = path.join(skillPath, SOURCE_FILENAME);

    try {
      await fs.promises.access(sourcePath, fs.constants.F_OK);
    } catch {
      // File doesn't exist
      return null;
    }

    try {
      const content = await fs.promises.readFile(sourcePath, 'utf-8');
      const source = JSON.parse(content) as SkillSource;
      return source;
    } catch (error) {
      logger.warn('Failed to read skill source', {
        skillPath,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Check if a skill has source tracking
   */
  async hasSource(skillPath: string): Promise<boolean> {
    const sourcePath = path.join(skillPath, SOURCE_FILENAME);
    try {
      await fs.promises.access(sourcePath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a new SkillSource object with current timestamp
   */
  createSource(
    marketplaceUrl: string,
    skillPath: string,
    commitHash: string,
    branch?: string
  ): SkillSource {
    const source: SkillSource = {
      marketplaceUrl,
      skillPath,
      installedAt: new Date().toISOString(),
      commitHash,
    };

    if (branch) {
      source.branch = branch;
    }

    return source;
  }
}

export type { SkillSource };
