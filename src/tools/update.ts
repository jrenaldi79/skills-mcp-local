import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { SkillDiscoveryManager } from '../managers/skill-discovery.js';
import { MarketplaceManager, parseGitHubUrl } from '../managers/marketplace.js';
import { SkillSourceManager } from '../managers/skill-source.js';
import logger from '../utils/logger.js';
import { ToolResult, InstalledSkill } from '../types/index.js';

const execAsync = promisify(exec);

/** Input schema for skills_update */
export const UpdateInputSchema = z.object({
  skill_name: z
    .string()
    .optional()
    .describe('Name of specific skill to update (omit to update all skills with updates)'),
}).strict();

export type UpdateInput = z.infer<typeof UpdateInputSchema>;

interface UpdateResult {
  name: string;
  previousCommit: string;
  newCommit: string;
}

interface SkipResult {
  name: string;
  reason: string;
}

interface FailResult {
  name: string;
  error: string;
}

/**
 * Update a single skill from its marketplace source
 */
async function updateSkill(
  skill: InstalledSkill,
  marketplaceManager: MarketplaceManager
): Promise<{ success: boolean; result?: UpdateResult; error?: string }> {
  if (!skill.source) {
    return { success: false, error: 'No source tracking information' };
  }

  // Check for updates
  const updateStatus = await marketplaceManager.checkForUpdates(skill.source);

  if (!updateStatus.hasUpdate) {
    return { success: false, error: 'Already up to date' };
  }

  // Parse marketplace URL
  const parsed = parseGitHubUrl(skill.source.marketplaceUrl);
  if (!parsed) {
    return { success: false, error: 'Invalid marketplace URL' };
  }

  const { owner, repo, branch, path: basePath } = parsed;
  const skillPath = basePath ? `${basePath}/${skill.source.skillPath}` : skill.source.skillPath;
  const repoUrl = `https://github.com/${owner}/${repo}.git`;

  // Create temp directory for update
  const parentDir = path.dirname(skill.location);
  const tempDir = path.join(parentDir, `.temp-update-${Date.now()}`);
  const backupDir = path.join(parentDir, `.backup-${skill.metadata.name}-${Date.now()}`);

  try {
    logger.info('Updating skill', {
      name: skill.metadata.name,
      from: skill.source.commitHash.substring(0, 7),
      to: updateStatus.remoteCommit?.substring(0, 7),
    });

    // Clone new version
    await execAsync(`git clone --filter=blob:none --no-checkout --depth 1 --sparse "${repoUrl}" "${tempDir}"`);
    await execAsync(`git -C "${tempDir}" sparse-checkout init --cone`);
    await execAsync(`git -C "${tempDir}" sparse-checkout set "${skillPath}"`);
    await execAsync(`git -C "${tempDir}" checkout ${branch}`);

    // Get new commit hash
    const { stdout: newCommitHash } = await execAsync(`git -C "${tempDir}" rev-parse HEAD`);
    const cleanNewCommit = newCommitHash.trim();

    // Backup current skill
    await fs.rename(skill.location, backupDir);

    try {
      // Move new version to skill location
      const sourceDir = path.join(tempDir, skillPath);
      await fs.rename(sourceDir, skill.location);

      // Update source tracking
      const sourceManager = new SkillSourceManager();
      const newSource = sourceManager.createSource(
        skill.source.marketplaceUrl,
        skill.source.skillPath,
        cleanNewCommit,
        branch
      );
      await sourceManager.saveSource(skill.location, newSource);

      // Clean up
      await fs.rm(tempDir, { recursive: true, force: true });
      await fs.rm(backupDir, { recursive: true, force: true });

      return {
        success: true,
        result: {
          name: skill.metadata.name,
          previousCommit: skill.source.commitHash,
          newCommit: cleanNewCommit,
        },
      };
    } catch (err) {
      // Restore backup on failure
      try {
        await fs.rm(skill.location, { recursive: true, force: true });
        await fs.rename(backupDir, skill.location);
      } catch {
        // Backup restore failed
      }
      throw err;
    }
  } catch (err) {
    // Clean up temp files
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }

    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error('Failed to update skill', { name: skill.metadata.name, error: errorMessage });
    return { success: false, error: errorMessage };
  }
}

/**
 * Handler for skills_update tool
 * Updates installed skills from their marketplace sources
 */
export async function handleUpdate(
  discoveryManager: SkillDiscoveryManager,
  marketplaceManager: MarketplaceManager,
  args: UpdateInput
): Promise<ToolResult> {
  // Discover all installed skills
  const installedSkills = await discoveryManager.discoverAllSkills();

  // Filter skills based on input
  let skillsToCheck: InstalledSkill[];
  if (args.skill_name) {
    const skill = installedSkills.find(s => s.metadata.name === args.skill_name);
    if (!skill) {
      return {
        content: [{
          type: 'text',
          text: `Error: Skill "${args.skill_name}" not found. Run skills_list_installed to see available skills.`,
        }],
        isError: true,
      };
    }
    skillsToCheck = [skill];
  } else {
    skillsToCheck = installedSkills;
  }

  // Filter to only skills with source tracking
  const trackableSkills = skillsToCheck.filter(s => s.source);

  if (trackableSkills.length === 0) {
    const message = args.skill_name
      ? `Skill "${args.skill_name}" was not installed via marketplace and cannot be updated automatically.`
      : 'No skills with marketplace source tracking found. Only skills installed via skills_install can be updated.';

    return {
      content: [{
        type: 'text',
        text: message,
      }],
    };
  }

  // Check for updates and perform updates
  const updated: UpdateResult[] = [];
  const skipped: SkipResult[] = [];
  const failed: FailResult[] = [];

  for (const skill of trackableSkills) {
    const { success, result, error } = await updateSkill(skill, marketplaceManager);

    if (success && result) {
      updated.push(result);
    } else if (error === 'Already up to date') {
      skipped.push({ name: skill.metadata.name, reason: error });
    } else {
      failed.push({ name: skill.metadata.name, error: error || 'Unknown error' });
    }
  }

  // Build response
  const lines: string[] = [];

  if (updated.length > 0) {
    lines.push('✅ Updated:');
    for (const u of updated) {
      lines.push(`  - ${u.name}: ${u.previousCommit.substring(0, 7)} → ${u.newCommit.substring(0, 7)}`);
    }
    lines.push('');
  }

  if (skipped.length > 0) {
    lines.push('⏭️ Already up to date:');
    for (const s of skipped) {
      lines.push(`  - ${s.name}`);
    }
    lines.push('');
  }

  if (failed.length > 0) {
    lines.push('❌ Failed:');
    for (const f of failed) {
      lines.push(`  - ${f.name}: ${f.error}`);
    }
    lines.push('');
  }

  if (updated.length === 0 && skipped.length > 0 && failed.length === 0) {
    lines.unshift('All skills are up to date.\n');
  }

  const summary = {
    updated: updated.length,
    skipped: skipped.length,
    failed: failed.length,
  };

  return {
    content: [{
      type: 'text',
      text: lines.join('\n').trim(),
    }],
    structuredContent: {
      updated,
      skipped,
      failed,
      summary,
    },
  };
}
