/**
 * Serve the MCP projector over stdio.
 *
 * `bin.ts` answers `mcp` at argv[0] (D9) and calls this — the ONE caller: build
 * the server from the capabilities and connect it to a stdio transport. There
 * was a second, a `hidden: true` `mcp` meta verb, and it could never reach
 * here: the bin intercepted the token before `buildProgram` ran, and
 * `buildProgram` filters hidden verbs so the spec was never registered either.
 * It has been deleted. Kept separate from {@link buildServer} so tests can
 * build a server without touching stdio — that, not a second caller, is what
 * the split buys.
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
