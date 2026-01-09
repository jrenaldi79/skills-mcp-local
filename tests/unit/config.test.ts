import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { ConfigManager, DEFAULT_MARKETPLACE } from '../../src/managers/config.js';

describe('ConfigManager', () => {
  const TEST_CONFIG_DIR = path.join(os.tmpdir(), 'skills-mcp-test-' + Date.now());
  const TEST_CONFIG_PATH = path.join(TEST_CONFIG_DIR, 'config.json');

  let manager: ConfigManager;

  beforeEach(async () => {
    // Create fresh test directory
    await fs.mkdir(TEST_CONFIG_DIR, { recursive: true });
    manager = new ConfigManager(TEST_CONFIG_PATH);
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(TEST_CONFIG_DIR, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('getMarketplaces', () => {
    it('should return default marketplace when no config exists', async () => {
      const marketplaces = await manager.getMarketplaces();

      expect(marketplaces).toEqual([DEFAULT_MARKETPLACE]);
    });

    it('should return configured marketplaces from existing config', async () => {
      const config = {
        version: '1.0',
        marketplaces: ['https://example.com/skills', 'https://another.com/skills'],
      };
      await fs.writeFile(TEST_CONFIG_PATH, JSON.stringify(config));

      const marketplaces = await manager.getMarketplaces();

      expect(marketplaces).toEqual(['https://example.com/skills', 'https://another.com/skills']);
    });
  });

  describe('addMarketplace', () => {
    it('should add a new marketplace URL', async () => {
      await manager.addMarketplace('https://new-marketplace.com/skills');

      const marketplaces = await manager.getMarketplaces();
      expect(marketplaces).toContain('https://new-marketplace.com/skills');
    });

    it('should not add duplicate marketplace URL', async () => {
      await manager.addMarketplace('https://marketplace.com/skills');
      await manager.addMarketplace('https://marketplace.com/skills');

      const marketplaces = await manager.getMarketplaces();
      const count = marketplaces.filter(m => m === 'https://marketplace.com/skills').length;
      expect(count).toBe(1);
    });

    it('should persist marketplace to config file', async () => {
      await manager.addMarketplace('https://persisted.com/skills');

      const configContent = await fs.readFile(TEST_CONFIG_PATH, 'utf-8');
      const config = JSON.parse(configContent);
      expect(config.marketplaces).toContain('https://persisted.com/skills');
    });
  });

  describe('removeMarketplace', () => {
    it('should remove an existing marketplace URL', async () => {
      await manager.addMarketplace('https://to-remove.com/skills');
      await manager.removeMarketplace('https://to-remove.com/skills');

      const marketplaces = await manager.getMarketplaces();
      expect(marketplaces).not.toContain('https://to-remove.com/skills');
    });

    it('should not error when removing non-existent marketplace', async () => {
      await expect(
        manager.removeMarketplace('https://non-existent.com/skills')
      ).resolves.not.toThrow();
    });

    it('should not remove the default marketplace if it is the only one', async () => {
      // Reset to just default
      await manager.resetMarketplaces();
      await manager.removeMarketplace(DEFAULT_MARKETPLACE);

      const marketplaces = await manager.getMarketplaces();
      expect(marketplaces.length).toBeGreaterThan(0);
    });
  });

  describe('resetMarketplaces', () => {
    it('should reset to only the default marketplace', async () => {
      await manager.addMarketplace('https://extra1.com/skills');
      await manager.addMarketplace('https://extra2.com/skills');
      await manager.resetMarketplaces();

      const marketplaces = await manager.getMarketplaces();
      expect(marketplaces).toEqual([DEFAULT_MARKETPLACE]);
    });
  });

  describe('config persistence', () => {
    it('should create config directory if it does not exist', async () => {
      const newDir = path.join(TEST_CONFIG_DIR, 'subdir', 'config.json');
      const newManager = new ConfigManager(newDir);

      await newManager.addMarketplace('https://test.com/skills');

      const exists = await fs.stat(path.dirname(newDir)).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('should preserve config version', async () => {
      await manager.addMarketplace('https://test.com/skills');

      const configContent = await fs.readFile(TEST_CONFIG_PATH, 'utf-8');
      const config = JSON.parse(configContent);
      expect(config.version).toBe('1.0');
    });
  });
});
