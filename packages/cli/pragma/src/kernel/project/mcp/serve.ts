/**
 * Serve the MCP projector over stdio.
 *
 * The bin's `mcp` special-case (D9) and the hidden `mcp` meta verb both call
 * this: build the server from the capabilities and connect it to a stdio
 * transport. Kept separate from {@link buildServer} so tests can build a server
 * without touching stdio.
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadEffectiveModules } from "../../packs/collect.js";
import type { CapabilityModule } from "../../spec/types.js";
import { buildServer } from "./buildServer.js";

/**
 * Build the MCP server and serve it over stdio until the transport closes.
 *
 * The server is a real invocation (not a fast path), so it merges the package-
 * and config-declared story packs into the static capabilities before projecting
 * the tool surface.
 *
 * @param modules - The static capability modules to project.
 * @param cwd - The working directory for the server's runtime.
 * @note Impure — reads config, connects to stdin/stdout.
 */
export async function serveMcp(
  modules: readonly CapabilityModule[],
  cwd?: string,
): Promise<void> {
  const dir = cwd ?? process.cwd();
  const effective = await loadEffectiveModules(modules, dir);
  // stderr only — the stdio transport owns stdout, so naming an unusable
  // package story here is safe and reaches the host's server log.
  for (const problem of effective.problems) {
    process.stderr.write(
      `Ignored story ${problem.source}: ${problem.message}\n`,
    );
  }
  const server = await buildServer(effective.modules, dir);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
