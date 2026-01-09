import { z } from 'zod';
import { SkillDiscoveryManager } from '../managers/skill-discovery.js';
import { ToolResult } from '../types/index.js';

/** Input schema for skills_list_installed */
export const ListInstalledInputSchema = z.object({}).strict();

export type ListInstalledInput = z.infer<typeof ListInstalledInputSchema>;

/**
 * Handler for skills_list_installed tool
 * Returns all locally installed skills with their metadata
 */
export async function handleListInstalled(
  discoveryManager: SkillDiscoveryManager
): Promise<ToolResult> {
  const skills = await discoveryManager.discoverAllSkills();

  const validSkills = skills.filter(s => s.isValid);
  const invalidSkills = skills.filter(s => !s.isValid);

  const output = {
    total: skills.length,
    valid: validSkills.length,
    invalid: invalidSkills.length,
    skills: validSkills.map(s => ({
      name: s.metadata.name,
      description: s.metadata.description,
      location: s.location,
      hasScripts: s.hasScripts,
      hasReferences: s.hasReferences,
      hasAssets: s.hasAssets,
      ...(s.metadata.license ? { license: s.metadata.license } : {}),
      ...(s.metadata.compatibility ? { compatibility: s.metadata.compatibility } : {}),
    })),
    ...(invalidSkills.length > 0
      ? {
          invalidSkills: invalidSkills.map(s => ({
            location: s.location,
            errors: s.validationErrors,
          })),
        }
      : {}),
  };

  // Format text output
  const lines: string[] = [];
  lines.push(`Found ${validSkills.length} valid skill(s):`);
  lines.push('');

  for (const skill of validSkills) {
    lines.push(`## ${skill.metadata.name}`);
    lines.push(`${skill.metadata.description}`);
    lines.push(`- Location: ${skill.location}`);
    if (skill.hasScripts) lines.push('- Has scripts/');
    if (skill.hasReferences) lines.push('- Has references/');
    if (skill.hasAssets) lines.push('- Has assets/');
    lines.push('');
  }

  if (invalidSkills.length > 0) {
    lines.push(`\n${invalidSkills.length} skill(s) with errors (check validationErrors in JSON output)`);
  }

  return {
    content: [{ type: 'text', text: lines.join('\n') }],
    structuredContent: output,
  };
}
