/**
 * Tests for skill source tracking functionality
 * Tracks where skills were installed from for update detection
 */

import * as fs from 'fs';
import * as path from 'path';
import { SkillSourceManager } from '../../src/managers/skill-source.js';
import type { SkillSource } from '../../src/types/index.js';

// Use a temp directory for testing
const TEST_DIR = path.join(process.cwd(), 'tests', 'fixtures', 'temp-source-test');

describe('SkillSourceManager', () => {
  let manager: SkillSourceManager;

  beforeAll(async () => {
    // Create temp directory for tests
    await fs.promises.mkdir(TEST_DIR, { recursive: true });
  });

  afterAll(async () => {
    // Clean up temp directory
    try {
      await fs.promises.rm(TEST_DIR, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  beforeEach(() => {
    manager = new SkillSourceManager();
  });

  describe('createSource', () => {
    it('should create a SkillSource object with current timestamp', () => {
      const marketplaceUrl = 'https://github.com/anthropics/skills/tree/main/skills';
      const skillPath = 'pdf-helper';
      const commitHash = 'abc123def456';

      const before = new Date().toISOString();
      const source = manager.createSource(marketplaceUrl, skillPath, commitHash);
      const after = new Date().toISOString();

      expect(source.marketplaceUrl).toBe(marketplaceUrl);
      expect(source.skillPath).toBe(skillPath);
      expect(source.commitHash).toBe(commitHash);
      expect(source.installedAt >= before).toBe(true);
      expect(source.installedAt <= after).toBe(true);
    });

    it('should include branch when provided', () => {
      const source = manager.createSource(
        'https://github.com/anthropics/skills/tree/main/skills',
        'pdf-helper',
        'abc123',
        'main'
      );

      expect(source.branch).toBe('main');
    });

    it('should not include branch when not provided', () => {
      const source = manager.createSource(
        'https://github.com/anthropics/skills/tree/main/skills',
        'pdf-helper',
        'abc123'
      );

      expect(source.branch).toBeUndefined();
    });
  });

  describe('saveSource and getSource', () => {
    it('should save and retrieve skill source metadata', async () => {
      const skillPath = path.join(TEST_DIR, 'test-skill-1');
      await fs.promises.mkdir(skillPath, { recursive: true });

      const source: SkillSource = {
        marketplaceUrl: 'https://github.com/anthropics/skills/tree/main/skills',
        skillPath: 'test-skill-1',
        installedAt: '2025-01-09T12:00:00.000Z',
        commitHash: 'abc123def456',
      };

      await manager.saveSource(skillPath, source);
      const retrieved = await manager.getSource(skillPath);

      expect(retrieved).toEqual(source);
    });

    it('should save source with branch field', async () => {
      const skillPath = path.join(TEST_DIR, 'test-skill-2');
      await fs.promises.mkdir(skillPath, { recursive: true });

      const source: SkillSource = {
        marketplaceUrl: 'https://github.com/anthropics/skills/tree/main/skills',
        skillPath: 'test-skill-2',
        installedAt: '2025-01-09T12:00:00.000Z',
        commitHash: 'abc123def456',
        branch: 'main',
      };

      await manager.saveSource(skillPath, source);
      const retrieved = await manager.getSource(skillPath);

      expect(retrieved).toEqual(source);
      expect(retrieved?.branch).toBe('main');
    });
  });

  describe('getSource', () => {
    it('should return null if .skill-source.json does not exist', async () => {
      const skillPath = path.join(TEST_DIR, 'non-existent-skill');

      const result = await manager.getSource(skillPath);

      expect(result).toBeNull();
    });

    it('should return null if .skill-source.json is invalid JSON', async () => {
      const skillPath = path.join(TEST_DIR, 'corrupted-skill');
      await fs.promises.mkdir(skillPath, { recursive: true });
      await fs.promises.writeFile(
        path.join(skillPath, '.skill-source.json'),
        'not valid json',
        'utf-8'
      );

      const result = await manager.getSource(skillPath);

      expect(result).toBeNull();
    });
  });

  describe('hasSource', () => {
    it('should return true if skill has source tracking', async () => {
      const skillPath = path.join(TEST_DIR, 'tracked-skill');
      await fs.promises.mkdir(skillPath, { recursive: true });
      await fs.promises.writeFile(
        path.join(skillPath, '.skill-source.json'),
        JSON.stringify({ marketplaceUrl: 'test', skillPath: 'test', installedAt: '', commitHash: '' }),
        'utf-8'
      );

      const result = await manager.hasSource(skillPath);

      expect(result).toBe(true);
    });

    it('should return false if skill does not have source tracking', async () => {
      const skillPath = path.join(TEST_DIR, 'untracked-skill');
      await fs.promises.mkdir(skillPath, { recursive: true });

      const result = await manager.hasSource(skillPath);

      expect(result).toBe(false);
    });
  });
});
