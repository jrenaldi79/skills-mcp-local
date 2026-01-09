import { z } from 'zod';
import { MarketplaceManager } from '../managers/marketplace.js';
import { ConfigManager } from '../managers/config.js';
import { ToolResult } from '../types/index.js';

/** Input schema for skills_discover */
export const DiscoverInputSchema = z.object({
  filter: z
    .string()
    .optional()
    .describe('Filter skills by name or description (optional)'),
  marketplace_url: z
    .string()
    .url()
    .optional()
    .describe('Specific marketplace URL to search (optional, uses all configured if not specified)'),
}).strict();

export type DiscoverInput = z.infer<typeof DiscoverInputSchema>;

/**
 * Handler for skills_discover tool
 * Lists available skills from configured marketplaces
 */
export async function handleDiscover(
  marketplaceManager: MarketplaceManager,
  configManager: ConfigManager,
  args: DiscoverInput
): Promise<ToolResult> {
  // Get marketplace URLs
  let marketplaceUrls: string[];
  if (args.marketplace_url) {
    marketplaceUrls = [args.marketplace_url];
  } else {
    marketplaceUrls = await configManager.getMarketplaces();
  }

  // Fetch skills
  const allSkills = await marketplaceManager.fetchAllSkills(marketplaceUrls);

  // Apply filter if provided
  const skills = args.filter
    ? marketplaceManager.filterSkills(allSkills, args.filter)
    : allSkills;

  const output = {
    total: skills.length,
    filter: args.filter || null,
    marketplaces: marketplaceUrls,
    skills: skills.map(s => ({
      name: s.metadata.name,
      description: s.metadata.description,
      installCommand: s.installCommand,
      marketplace: s.marketplaceUrl,
      ...(s.metadata.license ? { license: s.metadata.license } : {}),
    })),
  };

  // Format text output
  const lines: string[] = [];
  lines.push(`Found ${skills.length} skill(s) in marketplace(s):`);
  if (args.filter) {
    lines.push(`Filter: "${args.filter}"`);
  }
  lines.push('');

  for (const skill of skills) {
    lines.push(`## ${skill.metadata.name}`);
    lines.push(`${skill.metadata.description}`);
    lines.push(`- Install: \`${skill.installCommand}\``);
    lines.push('');
  }

  if (skills.length === 0) {
    lines.push('No skills found. Try a different filter or add more marketplaces.');
  }

  return {
    content: [{ type: 'text', text: lines.join('\n') }],
    structuredContent: output,
  };
}
