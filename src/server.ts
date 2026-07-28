#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { getPackageVersion } from './version.js';

import { registerPrompts } from './context/prompts.js';
import { registerResources } from './context/resources.js';
import { registerTools } from './tools/registerTools.js';

// Create an MCP server
const server = new McpServer({
  name: 'OmniFocus MCP',
  version: getPackageVersion(),
});

registerTools(server);

// Register prompts (guided review workflows) and resources (live snapshots)
registerPrompts(server);
registerResources(server);

// Start the MCP server
const transport = new StdioServerTransport();

// Use await with server.connect to ensure proper connection
(async function () {
  try {
    await server.connect(transport);
  } catch (err) {
    console.error(`Failed to start MCP server: ${err}`);
  }
})();

// For a cleaner shutdown if the process is terminated
