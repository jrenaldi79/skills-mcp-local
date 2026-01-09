#!/usr/bin/env node
/**
 * Skills MCP Server
 *
 * A Model Context Protocol server that discovers and exposes local skills
 * to AI agents. Provides tools for listing installed skills, discovering
 * new skills from marketplaces, and managing skill installations.
 */

import { startServer } from './server/index.js';
import logger from './utils/logger.js';

async function main(): Promise<void> {
  try {
    await startServer();
  } catch (err) {
    logger.error('Failed to start server', {
      error: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
  }
}

main();
