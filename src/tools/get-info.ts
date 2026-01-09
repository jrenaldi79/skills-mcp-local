import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import { SkillDiscoveryManager } from '../managers/skill-discovery.js';
import { MarketplaceManager } from '../managers/marketplace.js';
import { ConfigManager } from '../managers/config.js';
import { ToolResult } from '../types/index.js';

/** Input schema for skills_get_info */
export const GetInfoInputSchema = z.object({
  skill_name: z
    .string()
    .min(1)
    .describe('Name of the skill to get information about'),
  source: z
    .enum(['local', 'marketplace'])
    .default('local')
    .describe('Where to look for the skill: local (installed) or marketplace'),
}).strict();

export type GetInfoInput = z.infer<typeof GetInfoInputSchema>;

/**
 * Handler for skills_get_info tool
 * Gets detailed information about a specific skill
 */
export async function handleGetInfo(
  discoveryManager: SkillDiscoveryManager,
  marketplaceManager: MarketplaceManager,
  configManager: ConfigManager,
  args: GetInfoInput
): Promise<ToolResult> {
  if (args.source === 'local') {
    // Search local skills
    const skills = await discoveryManager.discoverAllSkills();
    const skill = skills.find(s => s.metadata.name === args.skill_name);

    if (!skill) {
      return {
        content: [{
          type: 'text',
          text: `Skill "${args.skill_name}" not found locally. Try source="marketplace" or run skills_list_installed to see available skills.`,
        }],
        isError: true,
      };
    }

    // Read full SKILL.md content
    const skillMdPath = path.join(skill.location, 'SKILL.md');
    let fullContent = '';
    try {
      fullContent = await fs.readFile(skillMdPath, 'utf-8');
    } catch {
      fullContent = '(Could not read SKILL.md content)';
    }

    // List directories
    const structure: string[] = [];
    try {
      const entries = await fs.readdir(skill.location, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          structure.push(`${entry.name}/`);
        } else {
          structure.push(entry.name);
        }
      }
    } catch {
      structure.push('(Could not list directory)');
    }

    const output = {
      source: 'local',
      name: skill.metadata.name,
      description: skill.metadata.description,
      location: skill.location,
      isValid: skill.isValid,
      hasScripts: skill.hasScripts,
      hasReferences: skill.hasReferences,
      hasAssets: skill.hasAssets,
      structure,
      metadata: skill.metadata,
    };

    const lines = [
      `# ${skill.metadata.name}`,
      '',
      `**Description:** ${skill.metadata.description}`,
      `**Location:** ${skill.location}`,
      '',
      '## Structure',
      ...structure.map(s => `- ${s}`),
      '',
      '## Full SKILL.md Content',
      '```markdown',
      fullContent,
      '```',
    ];

    return {
      content: [{ type: 'text', text: lines.join('\n') }],
      structuredContent: output,
    };
  } else {
    // Search marketplace
    const marketplaceUrls = await configManager.getMarketplaces();
    const allSkills = await marketplaceManager.fetchAllSkills(marketplaceUrls);
    const skill = allSkills.find(s => s.metadata.name === args.skill_name);

    if (!skill) {
      return {
        content: [{
          type: 'text',
          text: `Skill "${args.skill_name}" not found in marketplace. Run skills_discover to see available skills.`,
        }],
        isError: true,
      };
    }

    const output = {
      source: 'marketplace',
      name: skill.metadata.name,
      description: skill.metadata.description,
      marketplace: skill.marketplaceUrl,
      installCommand: skill.installCommand,
      metadata: skill.metadata,
    };

    const lines = [
      `# ${skill.metadata.name}`,
      '',
      `**Description:** ${skill.metadata.description}`,
      `**Marketplace:** ${skill.marketplaceUrl}`,
      '',
      '## Installation',
      `Run: \`${skill.installCommand}\``,
      '',
      skill.metadata.license ? `**License:** ${skill.metadata.license}` : '',
      skill.metadata.compatibility ? `**Compatibility:** ${skill.metadata.compatibility}` : '',
    ].filter(Boolean);

    return {
      content: [{ type: 'text', text: lines.join('\n') }],
      structuredContent: output,
    };
  }
}
