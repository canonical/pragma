/**
 * Serve the MCP projector over stdio.
 *
 * The bin's `mcp` special-case (D9) and the hidden `mcp` meta verb both call
 * this: build the server from the capabilities and connect it to a stdio
 * transport. Kept separate from {@link buildServer} so tests can build a server
 * without touching stdio.
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { CapabilityModule } from "../../spec/types.js";
import { buildServer } from "./buildServer.js";

/**
 * Build the MCP server and serve it over stdio until the transport closes.
 *
 * @param modules - The capability modules to project.
 * @param cwd - The working directory for the server's runtime.
 * @note Impure — connects to stdin/stdout.
 */
export async function serveMcp(
  modules: readonly CapabilityModule[],
  cwd?: string,
): Promise<void> {
  const server = buildServer(modules, cwd);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
