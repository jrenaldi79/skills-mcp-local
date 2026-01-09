import { z } from 'zod';
import { ConfigManager, DEFAULT_MARKETPLACE } from '../managers/config.js';
import { ToolResult } from '../types/index.js';

/** Input schema for skills_configure_marketplace */
export const ConfigureInputSchema = z.object({
  action: z
    .enum(['list', 'add', 'remove', 'reset'])
    .describe('Action to perform: list, add, remove, or reset marketplaces'),
  url: z
    .string()
    .url()
    .optional()
    .describe('Marketplace URL for add/remove actions'),
}).strict();

export type ConfigureInput = z.infer<typeof ConfigureInputSchema>;

/**
 * Handler for skills_configure_marketplace tool
 * Manages marketplace URL configuration
 */
export async function handleConfigure(
  configManager: ConfigManager,
  args: ConfigureInput
): Promise<ToolResult> {
  switch (args.action) {
    case 'list': {
      const marketplaces = await configManager.getMarketplaces();
      const output = {
        action: 'list',
        marketplaces,
        default: DEFAULT_MARKETPLACE,
      };

      const lines = ['Configured marketplaces:', ''];
      for (let i = 0; i < marketplaces.length; i++) {
        const isDefault = marketplaces[i] === DEFAULT_MARKETPLACE ? ' (default)' : '';
        lines.push(`${i + 1}. ${marketplaces[i]}${isDefault}`);
      }

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
        structuredContent: output,
      };
    }

    case 'add': {
      if (!args.url) {
        return {
          content: [{ type: 'text', text: 'Error: URL is required for add action' }],
          isError: true,
        };
      }

      await configManager.addMarketplace(args.url);
      const marketplaces = await configManager.getMarketplaces();

      return {
        content: [{ type: 'text', text: `Added marketplace: ${args.url}\n\nTotal marketplaces: ${marketplaces.length}` }],
        structuredContent: { action: 'add', url: args.url, marketplaces },
      };
    }

    case 'remove': {
      if (!args.url) {
        return {
          content: [{ type: 'text', text: 'Error: URL is required for remove action' }],
          isError: true,
        };
      }

      await configManager.removeMarketplace(args.url);
      const marketplaces = await configManager.getMarketplaces();

      return {
        content: [{ type: 'text', text: `Removed marketplace: ${args.url}\n\nRemaining marketplaces: ${marketplaces.length}` }],
        structuredContent: { action: 'remove', url: args.url, marketplaces },
      };
    }

    case 'reset': {
      await configManager.resetMarketplaces();

      return {
        content: [{ type: 'text', text: `Reset to default marketplace:\n${DEFAULT_MARKETPLACE}` }],
        structuredContent: { action: 'reset', marketplaces: [DEFAULT_MARKETPLACE] },
      };
    }

    default:
      return {
        content: [{ type: 'text', text: `Unknown action: ${args.action}` }],
        isError: true,
      };
  }
}
