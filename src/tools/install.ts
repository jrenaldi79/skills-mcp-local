import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { MarketplaceManager, parseGitHubUrl } from '../managers/marketplace.js';
import { ConfigManager } from '../managers/config.js';
import { getDefaultInstallPath } from '../utils/paths.js';
import { parseSkillFrontmatter } from '../utils/yaml-parser.js';
import logger from '../utils/logger.js';
import { ToolResult } from '../types/index.js';

const execAsync = promisify(exec);

/** Input schema for skills_install */
export const InstallInputSchema = z.object({
  skill_name: z
    .string()
    .min(1)
    .describe('Name of the skill to install'),
  marketplace_url: z
    .string()
    .url()
    .optional()
    .describe('Source marketplace URL (optional, uses default if not specified)'),
}).strict();

export type InstallInput = z.infer<typeof InstallInputSchema>;

/**
 * Handler for skills_install tool
 * Downloads and installs a skill from a marketplace
 */
export async function handleInstall(
  marketplaceManager: MarketplaceManager,
  configManager: ConfigManager,
  args: InstallInput
): Promise<ToolResult> {
  const installPath = getDefaultInstallPath();
  const skillDir = path.join(installPath, args.skill_name);

  // Check if skill already exists
  try {
    await fs.access(skillDir);
    return {
      content: [{
        type: 'text',
        text: `Error: Skill "${args.skill_name}" already exists at ${skillDir}. Remove it first if you want to reinstall.`,
      }],
      isError: true,
    };
  } catch {
    // Good - doesn't exist
  }

  // Get marketplace URLs
  let marketplaceUrls: string[];
  if (args.marketplace_url) {
    marketplaceUrls = [args.marketplace_url];
  } else {
    marketplaceUrls = await configManager.getMarketplaces();
  }

  // Find skill in marketplaces
  const allSkills = await marketplaceManager.fetchAllSkills(marketplaceUrls);
  const skill = allSkills.find(s => s.metadata.name === args.skill_name);

  if (!skill) {
    return {
      content: [{
        type: 'text',
        text: `Error: Skill "${args.skill_name}" not found in configured marketplaces. Run skills_discover to see available skills.`,
      }],
      isError: true,
    };
  }

  // Parse the marketplace URL to get GitHub coordinates
  const parsed = parseGitHubUrl(skill.marketplaceUrl);
  if (!parsed) {
    return {
      content: [{
        type: 'text',
        text: `Error: Cannot parse marketplace URL: ${skill.marketplaceUrl}`,
      }],
      isError: true,
    };
  }

  const { owner, repo, branch, path: basePath } = parsed;
  const skillPath = basePath ? `${basePath}/${args.skill_name}` : args.skill_name;

  // Ensure install directory exists
  await fs.mkdir(installPath, { recursive: true });

  // Clone using sparse checkout (only the skill directory)
  const repoUrl = `https://github.com/${owner}/${repo}.git`;
  const tempDir = path.join(installPath, `.temp-${Date.now()}`);

  try {
    logger.info('Installing skill', { name: args.skill_name, from: skill.marketplaceUrl });

    // Initialize sparse checkout
    await execAsync(`git clone --filter=blob:none --no-checkout --depth 1 --sparse "${repoUrl}" "${tempDir}"`);
    await execAsync(`git -C "${tempDir}" sparse-checkout init --cone`);
    await execAsync(`git -C "${tempDir}" sparse-checkout set "${skillPath}"`);
    await execAsync(`git -C "${tempDir}" checkout ${branch}`);

    // Move skill to final location
    const sourceDir = path.join(tempDir, skillPath);
    await fs.rename(sourceDir, skillDir);

    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true });

    // Validate installed skill
    const skillMdPath = path.join(skillDir, 'SKILL.md');
    const content = await fs.readFile(skillMdPath, 'utf-8');
    const parseResult = parseSkillFrontmatter(content);

    if (!parseResult.success) {
      return {
        content: [{
          type: 'text',
          text: `Warning: Skill installed but SKILL.md validation failed: ${parseResult.error}\nLocation: ${skillDir}`,
        }],
      };
    }

    const output = {
      success: true,
      skill: {
        name: parseResult.data!.name,
        description: parseResult.data!.description,
        location: skillDir,
      },
      source: skill.marketplaceUrl,
    };

    return {
      content: [{
        type: 'text',
        text: `Successfully installed "${args.skill_name}" to ${skillDir}\n\nDescription: ${parseResult.data!.description}\n\nTo use this skill, read its SKILL.md file and follow the instructions.`,
      }],
      structuredContent: output,
    };
  } catch (err) {
    // Clean up on failure
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
      await fs.rm(skillDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }

    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error('Failed to install skill', { name: args.skill_name, error: errorMessage });

    return {
      content: [{
        type: 'text',
        text: `Error installing skill "${args.skill_name}": ${errorMessage}\n\nMake sure git is installed and you have network access.`,
      }],
      isError: true,
    };
  }
}
