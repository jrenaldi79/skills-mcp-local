import { parseSkillFrontmatter, SkillFrontmatter } from '../../src/utils/yaml-parser.js';

describe('YAML Frontmatter Parser', () => {
  describe('parseSkillFrontmatter', () => {
    it('should parse valid YAML frontmatter with required fields', () => {
      const content = `---
name: test-skill
description: A test skill for unit testing
---

# Test Skill

This is the body content.
`;
      const result = parseSkillFrontmatter(content);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.name).toBe('test-skill');
      expect(result.data!.description).toBe('A test skill for unit testing');
      expect(result.body).toBe('\n# Test Skill\n\nThis is the body content.\n');
    });

    it('should parse all optional fields', () => {
      const content = `---
name: full-skill
description: A skill with all optional fields
license: MIT
compatibility: Designed for Claude Code
metadata:
  author: test-author
  version: "1.0.0"
allowed-tools: Bash(git:*) Read Write
---

Body content here.
`;
      const result = parseSkillFrontmatter(content);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.name).toBe('full-skill');
      expect(result.data!.description).toBe('A skill with all optional fields');
      expect(result.data!.license).toBe('MIT');
      expect(result.data!.compatibility).toBe('Designed for Claude Code');
      expect(result.data!.metadata).toEqual({ author: 'test-author', version: '1.0.0' });
      expect(result.data!.allowedTools).toBe('Bash(git:*) Read Write');
    });

    it('should fail when name is missing', () => {
      const content = `---
description: Missing name field
---

Body content.
`;
      const result = parseSkillFrontmatter(content);

      expect(result.success).toBe(false);
      expect(result.error).toContain('name');
    });

    it('should fail when description is missing', () => {
      const content = `---
name: missing-description
---

Body content.
`;
      const result = parseSkillFrontmatter(content);

      expect(result.success).toBe(false);
      expect(result.error).toContain('description');
    });

    it('should fail when name exceeds 64 characters', () => {
      const longName = 'a'.repeat(65);
      const content = `---
name: ${longName}
description: Name is too long
---

Body content.
`;
      const result = parseSkillFrontmatter(content);

      expect(result.success).toBe(false);
      expect(result.error).toContain('64');
    });

    it('should fail when name contains invalid characters', () => {
      const content = `---
name: Invalid_Name
description: Name has underscores
---

Body content.
`;
      const result = parseSkillFrontmatter(content);

      expect(result.success).toBe(false);
      expect(result.error).toContain('lowercase');
    });

    it('should fail when name starts with hyphen', () => {
      const content = `---
name: -invalid
description: Name starts with hyphen
---

Body content.
`;
      const result = parseSkillFrontmatter(content);

      expect(result.success).toBe(false);
      expect(result.error).toContain('hyphen');
    });

    it('should fail when name ends with hyphen', () => {
      const content = `---
name: invalid-
description: Name ends with hyphen
---

Body content.
`;
      const result = parseSkillFrontmatter(content);

      expect(result.success).toBe(false);
      expect(result.error).toContain('hyphen');
    });

    it('should fail when name contains consecutive hyphens', () => {
      const content = `---
name: invalid--name
description: Name has consecutive hyphens
---

Body content.
`;
      const result = parseSkillFrontmatter(content);

      expect(result.success).toBe(false);
      expect(result.error).toContain('consecutive');
    });

    it('should fail when description exceeds 1024 characters', () => {
      const longDesc = 'a'.repeat(1025);
      const content = `---
name: test-skill
description: ${longDesc}
---

Body content.
`;
      const result = parseSkillFrontmatter(content);

      expect(result.success).toBe(false);
      expect(result.error).toContain('1024');
    });

    it('should fail when compatibility exceeds 500 characters', () => {
      const longCompat = 'a'.repeat(501);
      const content = `---
name: test-skill
description: Valid description
compatibility: ${longCompat}
---

Body content.
`;
      const result = parseSkillFrontmatter(content);

      expect(result.success).toBe(false);
      expect(result.error).toContain('500');
    });

    it('should fail when no frontmatter delimiters found', () => {
      const content = `# No Frontmatter

Just regular markdown content.
`;
      const result = parseSkillFrontmatter(content);

      expect(result.success).toBe(false);
      expect(result.error).toContain('frontmatter');
    });

    it('should fail when frontmatter is not closed', () => {
      const content = `---
name: test-skill
description: No closing delimiter

Body content.
`;
      const result = parseSkillFrontmatter(content);

      expect(result.success).toBe(false);
      expect(result.error).toContain('frontmatter');
    });

    it('should handle empty body content', () => {
      const content = `---
name: minimal-skill
description: A minimal skill
---
`;
      const result = parseSkillFrontmatter(content);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.body).toBe('');
    });

    it('should handle multiline descriptions in YAML', () => {
      const content = `---
name: multiline-skill
description: |
  This is a multiline description.
  It spans multiple lines.
  And includes various details.
---

Body content.
`;
      const result = parseSkillFrontmatter(content);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.description).toContain('multiline description');
      expect(result.data!.description).toContain('spans multiple lines');
    });

    it('should handle invalid YAML syntax gracefully', () => {
      const content = `---
name: test-skill
description: [invalid: yaml: syntax
---

Body content.
`;
      const result = parseSkillFrontmatter(content);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
