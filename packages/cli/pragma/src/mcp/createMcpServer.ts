/**
 * MCP server factory.
 *
 * Boots the ke store, reads config, creates the McpServer,
 * and registers all tools and resources. Returns the server ready for transport.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readConfig } from "../config.js";
import { VERSION } from "../constants.js";
import { bootStore } from "../domains/shared/bootStore.js";
import registerResources from "./registerResources.js";
import registerTools from "./registerTools.js";

/**
 * Create a fully configured MCP server.
 *
 * @note Impure — reads config file and boots ke store.
 */
export default async function createMcpServer(options?: {
  cwd?: string;
}): Promise<McpServer> {
  const config = readConfig(options?.cwd);
  const store = await bootStore();
  const server = new McpServer({
    name: "pragma",
    version: VERSION,
  });
  registerTools(server, store, config);
  registerResources(server, store, config);
  return server;
}
