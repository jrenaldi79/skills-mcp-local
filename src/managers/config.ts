import fs from 'fs/promises';
import path from 'path';
import { MarketplaceConfig } from '../types/index.js';
import { getConfigPath } from '../utils/paths.js';
import logger from '../utils/logger.js';

/** Default marketplace URL */
export const DEFAULT_MARKETPLACE = 'https://github.com/anthropics/skills/tree/main/skills';

/** Current config version */
const CONFIG_VERSION = '1.0';

/**
 * Manager for configuration persistence
 * Handles marketplace URL configuration
 */
export class ConfigManager {
  private configPath: string;
  private configCache: MarketplaceConfig | null = null;

  constructor(configPath?: string) {
    this.configPath = configPath ?? getConfigPath();
  }

  /**
   * Load configuration from disk
   */
  private async loadConfig(): Promise<MarketplaceConfig> {
    if (this.configCache) {
      return this.configCache;
    }

    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      const config = JSON.parse(content) as MarketplaceConfig;
      this.configCache = config;
      return config;
    } catch {
      // Return default config if file doesn't exist or is invalid
      const defaultConfig: MarketplaceConfig = {
        version: CONFIG_VERSION,
        marketplaces: [DEFAULT_MARKETPLACE],
      };
      return defaultConfig;
    }
  }

  /**
   * Save configuration to disk
   */
  private async saveConfig(config: MarketplaceConfig): Promise<void> {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.configPath);
      await fs.mkdir(dir, { recursive: true });

      // Write config
      await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
      this.configCache = config;

      logger.debug('Config saved', { path: this.configPath });
    } catch (err) {
      logger.error('Failed to save config', {
        path: this.configPath,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /**
   * Get list of configured marketplaces
   */
  async getMarketplaces(): Promise<string[]> {
    const config = await this.loadConfig();
    return config.marketplaces;
  }

  /**
   * Add a marketplace URL
   * Duplicates are ignored
   */
  async addMarketplace(url: string): Promise<void> {
    const config = await this.loadConfig();

    // Check for duplicates
    if (config.marketplaces.includes(url)) {
      logger.debug('Marketplace already exists', { url });
      return;
    }

    config.marketplaces.push(url);
    await this.saveConfig(config);

    logger.info('Marketplace added', { url });
  }

  /**
   * Remove a marketplace URL
   * Won't remove the last marketplace
   */
  async removeMarketplace(url: string): Promise<void> {
    const config = await this.loadConfig();

    const index = config.marketplaces.indexOf(url);
    if (index === -1) {
      logger.debug('Marketplace not found', { url });
      return;
    }

    // Don't remove if it's the only one
    if (config.marketplaces.length <= 1) {
      logger.warn('Cannot remove the only marketplace', { url });
      return;
    }

    config.marketplaces.splice(index, 1);
    await this.saveConfig(config);

    logger.info('Marketplace removed', { url });
  }

  /**
   * Reset to default marketplace only
   */
  async resetMarketplaces(): Promise<void> {
    const config: MarketplaceConfig = {
      version: CONFIG_VERSION,
      marketplaces: [DEFAULT_MARKETPLACE],
    };

    await this.saveConfig(config);
    logger.info('Marketplaces reset to default');
  }
}
