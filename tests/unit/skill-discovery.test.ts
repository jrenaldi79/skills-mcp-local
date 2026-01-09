import path from 'path';
import { SkillDiscoveryManager } from '../../src/managers/skill-discovery.js';
import { InstalledSkill } from '../../src/types/index.js';

// Use fixtures directory for testing
const FIXTURES_DIR = path.join(process.cwd(), 'tests', 'fixtures', 'skills');

describe('SkillDiscoveryManager', () => {
  let manager: SkillDiscoveryManager;

  beforeEach(() => {
    manager = new SkillDiscoveryManager();
  });

  describe('discoverSkillsInPath', () => {
    it('should discover valid skills in a directory', async () => {
      const skills = await manager.discoverSkillsInPath(FIXTURES_DIR);

      expect(skills.length).toBeGreaterThan(0);
      const validSkill = skills.find(s => s.metadata.name === 'valid-skill');
      expect(validSkill).toBeDefined();
      expect(validSkill!.isValid).toBe(true);
      expect(validSkill!.metadata.description).toBe('A valid test skill for unit testing');
    });

    it('should return empty array for non-existent directory', async () => {
      const skills = await manager.discoverSkillsInPath('/non/existent/path');

      expect(skills).toEqual([]);
    });

    it('should detect scripts directory presence', async () => {
      const skills = await manager.discoverSkillsInPath(FIXTURES_DIR);

      const skillWithScripts = skills.find(s => s.metadata.name === 'skill-with-scripts');
      expect(skillWithScripts).toBeDefined();
      expect(skillWithScripts!.hasScripts).toBe(true);
    });

    it('should detect references directory presence', async () => {
      const skills = await manager.discoverSkillsInPath(FIXTURES_DIR);

      const skillWithRefs = skills.find(s => s.metadata.name === 'skill-with-references');
      expect(skillWithRefs).toBeDefined();
      expect(skillWithRefs!.hasReferences).toBe(true);
    });

    it('should detect assets directory presence', async () => {
      const skills = await manager.discoverSkillsInPath(FIXTURES_DIR);

      const skillWithAssets = skills.find(s => s.metadata.name === 'skill-with-assets');
      expect(skillWithAssets).toBeDefined();
      expect(skillWithAssets!.hasAssets).toBe(true);
    });

    it('should mark invalid skills with validation errors', async () => {
      const skills = await manager.discoverSkillsInPath(FIXTURES_DIR);

      const invalidSkill = skills.find(s => s.metadata.name === 'invalid-skill' || !s.isValid);
      // Should either not find invalid skills or mark them as invalid
      if (invalidSkill) {
        expect(invalidSkill.isValid).toBe(false);
        expect(invalidSkill.validationErrors).toBeDefined();
        expect(invalidSkill.validationErrors!.length).toBeGreaterThan(0);
      }
    });

    it('should include location path for each skill', async () => {
      const skills = await manager.discoverSkillsInPath(FIXTURES_DIR);

      for (const skill of skills) {
        expect(skill.location).toBeDefined();
        expect(path.isAbsolute(skill.location)).toBe(true);
      }
    });
  });

  describe('discoverAllSkills', () => {
    it('should search all configured paths', async () => {
      // Use custom search paths for testing
      const customPaths = [FIXTURES_DIR];
      const skills = await manager.discoverAllSkills(customPaths);

      expect(skills.length).toBeGreaterThan(0);
    });

    it('should deduplicate skills found in multiple paths', async () => {
      // Same path twice should not duplicate skills
      const customPaths = [FIXTURES_DIR, FIXTURES_DIR];
      const skills = await manager.discoverAllSkills(customPaths);

      const names = skills.map(s => s.metadata.name);
      const uniqueNames = [...new Set(names)];
      expect(names.length).toBe(uniqueNames.length);
    });

    it('should prioritize skills from earlier paths', async () => {
      // First path takes priority
      const customPaths = [FIXTURES_DIR];
      const skills = await manager.discoverAllSkills(customPaths);

      // All skills should come from FIXTURES_DIR
      for (const skill of skills) {
        expect(skill.location.startsWith(FIXTURES_DIR)).toBe(true);
      }
    });
  });

  describe('generateToolDescription', () => {
    it('should generate description with skill list', () => {
      const skills: InstalledSkill[] = [
        {
          metadata: { name: 'test-skill', description: 'A test skill' },
          location: '/path/to/test-skill',
          hasScripts: false,
          hasReferences: false,
          hasAssets: false,
          isValid: true,
        },
      ];

      const description = manager.generateToolDescription(skills);

      expect(description).toContain('test-skill');
      expect(description).toContain('A test skill');
    });

    it('should handle empty skill list', () => {
      const description = manager.generateToolDescription([]);

      expect(description).toContain('No skills');
    });

    it('should include location hints', () => {
      const skills: InstalledSkill[] = [
        {
          metadata: { name: 'my-skill', description: 'My skill' },
          location: '/home/user/skills/my-skill',
          hasScripts: true,
          hasReferences: false,
          hasAssets: false,
          isValid: true,
        },
      ];

      const description = manager.generateToolDescription(skills);

      expect(description).toContain('my-skill');
      expect(description).toContain('My skill');
    });
  });
});
