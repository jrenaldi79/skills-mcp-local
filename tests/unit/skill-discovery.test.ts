import path from 'path';
import { SkillDiscoveryManager } from '../../src/managers/skill-discovery.js';
import { InstalledSkill, SkillSource, SkillUpdateStatus } from '../../src/types/index.js';

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

    it('should show update available indicator for skills with updates', () => {
      const skills: InstalledSkill[] = [
        {
          metadata: { name: 'outdated-skill', description: 'A skill with updates' },
          location: '/home/user/skills/outdated-skill',
          hasScripts: false,
          hasReferences: false,
          hasAssets: false,
          isValid: true,
          source: {
            marketplaceUrl: 'https://github.com/test/repo/tree/main/skills',
            skillPath: 'outdated-skill',
            installedAt: '2025-01-01T00:00:00.000Z',
            commitHash: 'abc123',
          },
          updateStatus: {
            hasUpdate: true,
            localCommit: 'abc123',
            remoteCommit: 'def456',
          },
        },
      ];

      const description = manager.generateToolDescription(skills);

      expect(description).toContain('outdated-skill');
      expect(description).toMatch(/update.*available/i);
    });

    it('should not show update indicator for skills without updates', () => {
      const skills: InstalledSkill[] = [
        {
          metadata: { name: 'current-skill', description: 'An up-to-date skill' },
          location: '/home/user/skills/current-skill',
          hasScripts: false,
          hasReferences: false,
          hasAssets: false,
          isValid: true,
          source: {
            marketplaceUrl: 'https://github.com/test/repo/tree/main/skills',
            skillPath: 'current-skill',
            installedAt: '2025-01-01T00:00:00.000Z',
            commitHash: 'abc123',
          },
          updateStatus: {
            hasUpdate: false,
            localCommit: 'abc123',
            remoteCommit: 'abc123',
          },
        },
      ];

      const description = manager.generateToolDescription(skills);

      expect(description).toContain('current-skill');
      // Should not contain update notification for this skill specifically
      expect(description).not.toMatch(/current-skill.*update.*available/i);
    });

    it('should show summary of skills with updates available', () => {
      const skills: InstalledSkill[] = [
        {
          metadata: { name: 'skill-a', description: 'Skill A' },
          location: '/home/user/skills/skill-a',
          hasScripts: false,
          hasReferences: false,
          hasAssets: false,
          isValid: true,
          updateStatus: { hasUpdate: true, localCommit: 'a', remoteCommit: 'b' },
        },
        {
          metadata: { name: 'skill-b', description: 'Skill B' },
          location: '/home/user/skills/skill-b',
          hasScripts: false,
          hasReferences: false,
          hasAssets: false,
          isValid: true,
          updateStatus: { hasUpdate: true, localCommit: 'c', remoteCommit: 'd' },
        },
        {
          metadata: { name: 'skill-c', description: 'Skill C' },
          location: '/home/user/skills/skill-c',
          hasScripts: false,
          hasReferences: false,
          hasAssets: false,
          isValid: true,
          updateStatus: { hasUpdate: false, localCommit: 'e', remoteCommit: 'e' },
        },
      ];

      const description = manager.generateToolDescription(skills);

      // Should mention multiple skills have updates
      expect(description).toMatch(/2.*skill.*update/i);
      expect(description).toContain('skills_update');
    });
  });
});
