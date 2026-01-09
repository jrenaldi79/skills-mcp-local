import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SkillDiscoveryManager } from '../managers/skill-discovery.js';
import { MarketplaceManager } from '../managers/marketplace.js';
import { ConfigManager } from '../managers/config.js';
import { ListInstalledInputSchema, handleListInstalled } from '../tools/list-installed.js';
import { DiscoverInputSchema, handleDiscover, DiscoverInput } from '../tools/discover.js';
import { InstallInputSchema, handleInstall, InstallInput } from '../tools/install.js';
import { ConfigureInputSchema, handleConfigure, ConfigureInput } from '../tools/configure.js';
import { GetInfoInputSchema, handleGetInfo, GetInfoInput } from '../tools/get-info.js';
import { OnboardingInputSchema, handleOnboarding } from '../tools/onboarding.js';
import { UpdateInputSchema, handleUpdate, UpdateInput } from '../tools/update.js';
import logger from '../utils/logger.js';

/**
 * Check for updates on skills that have source tracking
 */
async function checkSkillUpdates(
  skills: import('../types/index.js').InstalledSkill[],
  marketplaceManager: MarketplaceManager
): Promise<void> {
  const trackableSkills = skills.filter(s => s.source);

  if (trackableSkills.length === 0) {
    return;
  }

  logger.debug('Checking for skill updates', { count: trackableSkills.length });

  // Check updates in parallel (with rate limit consideration)
  const updatePromises = trackableSkills.map(async (skill) => {
    if (!skill.source) return;

    try {
      const status = await marketplaceManager.checkForUpdates(skill.source);
      skill.updateStatus = status;
    } catch (err) {
      logger.debug('Update check failed for skill', {
        name: skill.metadata.name,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  await Promise.all(updatePromises);

  const updatesAvailable = trackableSkills.filter(s => s.updateStatus?.hasUpdate).length;
  if (updatesAvailable > 0) {
    logger.info('Updates available', { count: updatesAvailable });
  }
}

/**
 * Create and configure the MCP server with all tools
 */
export async function createServer(): Promise<McpServer> {
  // Initialize managers
  const discoveryManager = new SkillDiscoveryManager();
  const marketplaceManager = new MarketplaceManager();
  const configManager = new ConfigManager();

  // Discover skills at startup for dynamic description
  const installedSkills = await discoveryManager.discoverAllSkills();

  // Check for updates (populates updateStatus on skills)
  await checkSkillUpdates(installedSkills, marketplaceManager);

  const dynamicDescription = discoveryManager.generateToolDescription(installedSkills);

  // Create server
  const server = new McpServer({
    name: 'skills-mcp-local',
    version: '0.1.0',
  });

  // Register tools
  server.registerTool(
    'skills_list_installed',
    {
      title: 'List Installed Skills',
      description: dynamicDescription,
      inputSchema: ListInstalledInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      logger.debug('Executing skills_list_installed');
      return handleListInstalled(discoveryManager);
    }
  );

  server.registerTool(
    'skills_discover',
    {
      title: 'Discover Skills',
      description: `Browse and search for skills in configured marketplace(s).

Returns available skills with their metadata and installation commands.
Use the 'filter' parameter to search by name or description.
Use 'marketplace_url' to search a specific marketplace.`,
      inputSchema: DiscoverInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args: DiscoverInput) => {
      logger.debug('Executing skills_discover', { args });
      return handleDiscover(marketplaceManager, configManager, args);
    }
  );

  server.registerTool(
    'skills_install',
    {
      title: 'Install Skill',
      description: `Download and install a skill from a marketplace.

Installs to ~/skills/ by default.
Use skills_discover first to find available skills.`,
      inputSchema: InstallInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (args: InstallInput) => {
      logger.debug('Executing skills_install', { args });
      return handleInstall(marketplaceManager, configManager, args);
    }
  );

  server.registerTool(
    'skills_configure_marketplace',
    {
      title: 'Configure Marketplaces',
      description: `Manage marketplace URLs for skill discovery.

Actions:
- list: Show configured marketplaces
- add: Add a new marketplace URL
- remove: Remove a marketplace URL
- reset: Reset to default marketplace only

Default marketplace: https://github.com/anthropics/skills/tree/main/skills`,
      inputSchema: ConfigureInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (args: ConfigureInput) => {
      logger.debug('Executing skills_configure_marketplace', { args });
      return handleConfigure(configManager, args);
    }
  );

  server.registerTool(
    'skills_get_info',
    {
      title: 'Get Skill Info',
      description: `Get detailed information about a specific skill.

Set source to 'local' for installed skills, 'marketplace' for remote skills.
Returns full SKILL.md content and directory structure for local skills.`,
      inputSchema: GetInfoInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args: GetInfoInput) => {
      logger.debug('Executing skills_get_info', { args });
      return handleGetInfo(discoveryManager, marketplaceManager, configManager, args);
    }
  );

  server.registerTool(
    'skills_onboarding',
    {
      title: 'Skills Onboarding',
      description: `Learn how skills work and how to use them.

Provides educational information about:
- What skills are
- How to install and use skills
- Skill file format and structure
- Available tools and commands`,
      inputSchema: OnboardingInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      logger.debug('Executing skills_onboarding');
      return handleOnboarding();
    }
  );

  server.registerTool(
    'skills_update',
    {
      title: 'Update Skills',
      description: `Update installed skills from their marketplace sources.

Checks for updates and downloads newer versions of skills.
Provide a skill_name to update a specific skill, or omit to update all.
Only skills installed via skills_install can be updated.`,
      inputSchema: UpdateInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (args: UpdateInput) => {
      logger.debug('Executing skills_update', { args });
      return handleUpdate(discoveryManager, marketplaceManager, args);
    }
  );

  logger.info('MCP server created', {
    tools: 7,
    installedSkills: installedSkills.length,
  });

  return server;
}

/**
 * Start the MCP server with stdio transport
 */
export async function startServer(): Promise<void> {
  const server = await createServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);
  logger.info('MCP server running via stdio');
}
