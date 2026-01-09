import { z } from 'zod';
import { ToolResult } from '../types/index.js';

/** Input schema for skills_onboarding */
export const OnboardingInputSchema = z.object({}).strict();

export type OnboardingInput = z.infer<typeof OnboardingInputSchema>;

/**
 * Handler for skills_onboarding tool
 * Provides educational information about skills
 */
export async function handleOnboarding(): Promise<ToolResult> {
  const content = `# Welcome to Skills!

Skills are specialized capabilities that extend what Claude can do. They're defined in SKILL.md files and can include scripts, references, and assets.

## What are Skills?

Skills are packages that contain:
- **SKILL.md** - The main skill definition with instructions
- **scripts/** - Optional automation scripts (Python, Bash, etc.)
- **references/** - Optional additional documentation
- **assets/** - Optional static resources (templates, images)

## How to Use Skills

1. **List installed skills:**
   Use \`skills_list_installed\` to see what's available locally

2. **Discover new skills:**
   Use \`skills_discover\` to browse the marketplace

3. **Install a skill:**
   Use \`skills_install\` with the skill name

4. **Get skill details:**
   Use \`skills_get_info\` to read full skill documentation

5. **Use a skill:**
   Read the skill's SKILL.md file and follow its instructions

## Skill Locations

Skills are searched in these locations (in order):
1. \`~/skills/\` - Primary location
2. \`~/.claude/skills/\` - Claude-specific
3. \`.claude/skills/\` - Current project
4. \`~/Documents/skills/\` - Fallback
5. \`~/.local/share/skills/\` - XDG location
6. \`/usr/local/share/skills/\` - System-wide

## Installing Skills Manually

You can manually install skills by:
\`\`\`bash
cd ~/skills
git clone https://github.com/user/skill-name.git
\`\`\`

Or copy a skill folder directly to \`~/skills/\`.

## Skill Format

Every skill needs a SKILL.md with YAML frontmatter:

\`\`\`markdown
---
name: my-skill
description: What this skill does and when to use it
license: MIT
compatibility: Works with Claude Code
---

# My Skill

Instructions for using this skill...
\`\`\`

## Learn More

- Specification: https://agentskills.io/specification
- Default marketplace: https://github.com/anthropics/skills

## Available Tools

- \`skills_list_installed\` - List local skills
- \`skills_discover\` - Browse marketplace
- \`skills_install\` - Install a skill
- \`skills_update\` - Update installed skills
- \`skills_configure_marketplace\` - Manage marketplaces
- \`skills_get_info\` - Get skill details
- \`skills_onboarding\` - This guide
`;

  return {
    content: [{ type: 'text', text: content }],
    structuredContent: {
      title: 'Skills Onboarding Guide',
      sections: [
        'What are Skills?',
        'How to Use Skills',
        'Skill Locations',
        'Installing Skills Manually',
        'Skill Format',
        'Learn More',
        'Available Tools',
      ],
      specificationUrl: 'https://agentskills.io/specification',
      defaultMarketplace: 'https://github.com/anthropics/skills',
    },
  };
}
