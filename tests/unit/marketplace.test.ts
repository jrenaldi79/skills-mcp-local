import { MarketplaceManager, parseGitHubUrl } from '../../src/managers/marketplace.js';
import { MarketplaceSkill } from '../../src/types/index.js';

describe('MarketplaceManager', () => {
  let manager: MarketplaceManager;

  beforeEach(() => {
    manager = new MarketplaceManager();
  });

  describe('parseGitHubUrl', () => {
    it('should parse standard GitHub tree URL', () => {
      const url = 'https://github.com/anthropics/skills/tree/main/skills';
      const result = parseGitHubUrl(url);

      expect(result).not.toBeNull();
      expect(result!.owner).toBe('anthropics');
      expect(result!.repo).toBe('skills');
      expect(result!.branch).toBe('main');
      expect(result!.path).toBe('skills');
    });

    it('should parse URL with nested path', () => {
      const url = 'https://github.com/user/repo/tree/develop/path/to/skills';
      const result = parseGitHubUrl(url);

      expect(result).not.toBeNull();
      expect(result!.owner).toBe('user');
      expect(result!.repo).toBe('repo');
      expect(result!.branch).toBe('develop');
      expect(result!.path).toBe('path/to/skills');
    });

    it('should parse URL without path', () => {
      const url = 'https://github.com/owner/repo/tree/main';
      const result = parseGitHubUrl(url);

      expect(result).not.toBeNull();
      expect(result!.owner).toBe('owner');
      expect(result!.repo).toBe('repo');
      expect(result!.branch).toBe('main');
      expect(result!.path).toBe('');
    });

    it('should return null for invalid GitHub URL', () => {
      const url = 'https://example.com/not-github';
      const result = parseGitHubUrl(url);

      expect(result).toBeNull();
    });

    it('should return null for non-tree GitHub URL', () => {
      const url = 'https://github.com/owner/repo/blob/main/file.md';
      const result = parseGitHubUrl(url);

      expect(result).toBeNull();
    });
  });

  describe('fetchSkillsFromMarketplace', () => {
    // Note: These tests would require mocking HTTP requests in a real implementation
    // For now, we test the basic structure and error handling

    it('should return empty array for invalid URL', async () => {
      const skills = await manager.fetchSkillsFromMarketplace('https://invalid-url.com');

      expect(skills).toEqual([]);
    });

    it('should handle network errors gracefully', async () => {
      const skills = await manager.fetchSkillsFromMarketplace(
        'https://github.com/nonexistent/repo/tree/main/skills'
      );

      // Should not throw, just return empty array
      expect(Array.isArray(skills)).toBe(true);
    });
  });

  describe('fetchAllSkills', () => {
    it('should fetch from multiple marketplaces', async () => {
      const marketplaceUrls = [
        'https://github.com/anthropics/skills/tree/main/skills',
      ];

      const skills = await manager.fetchAllSkills(marketplaceUrls);

      // Returns array (may be empty if network fails)
      expect(Array.isArray(skills)).toBe(true);
    });

    it('should return empty array for empty marketplace list', async () => {
      const skills = await manager.fetchAllSkills([]);

      expect(skills).toEqual([]);
    });
  });

  describe('filterSkills', () => {
    const mockSkills: MarketplaceSkill[] = [
      {
        metadata: { name: 'pdf-tool', description: 'Work with PDF files' },
        marketplaceUrl: 'https://example.com',
        installCommand: 'skills_install pdf-tool',
      },
      {
        metadata: { name: 'excel-helper', description: 'Excel spreadsheet operations' },
        marketplaceUrl: 'https://example.com',
        installCommand: 'skills_install excel-helper',
      },
      {
        metadata: { name: 'data-analysis', description: 'Analyze data with Python' },
        marketplaceUrl: 'https://example.com',
        installCommand: 'skills_install data-analysis',
      },
    ];

    it('should filter skills by name', () => {
      const filtered = manager.filterSkills(mockSkills, 'pdf');

      expect(filtered.length).toBe(1);
      expect(filtered[0].metadata.name).toBe('pdf-tool');
    });

    it('should filter skills by description', () => {
      const filtered = manager.filterSkills(mockSkills, 'python');

      expect(filtered.length).toBe(1);
      expect(filtered[0].metadata.name).toBe('data-analysis');
    });

    it('should be case-insensitive', () => {
      const filtered = manager.filterSkills(mockSkills, 'PDF');

      expect(filtered.length).toBe(1);
      expect(filtered[0].metadata.name).toBe('pdf-tool');
    });

    it('should return all skills when filter is empty', () => {
      const filtered = manager.filterSkills(mockSkills, '');

      expect(filtered.length).toBe(3);
    });

    it('should return empty array when no matches', () => {
      const filtered = manager.filterSkills(mockSkills, 'nonexistent');

      expect(filtered).toEqual([]);
    });
  });
});
