/**
 * Build the MCP server from the grammar.
 *
 * Constructs an {@link McpServer} keeping the stable `pragma` identity (not
 * `pragma2`, so existing agent wiring resolves it), then registers every
 * exposed verb as a tool and each module's optional `mcpResources` surface (the
 * graph resource browser, wired below via `module.mcpResources?.register`). One
 * runtime is booted for the server's lifetime and shared by every tool; the
 * store stays lazy, booting only when a resource read needs it.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MCP_SERVER_NAME, VERSION } from "../../../constants.js";
import { bootRuntime } from "../../runtime/boot.js";
import type { GlobalFlags } from "../../runtime/types.js";
import type { CapabilityModule } from "../../spec/types.js";
import { buildInstructions } from "./instructions.js";
import { registerVerb } from "./registerVerb.js";

/**
 * Neutral flags for the MCP runtime. Output shaping is the projector's job
 * (every tool returns the machine envelope), so these only seed `run` bodies
 * that read `globalFlags` — none do in PR1.
 */
const MCP_FLAGS: GlobalFlags = {
  llm: true,
  autoLlm: false,
  format: "json",
  verbose: false,
};

/**
 * Assemble the MCP server, registering all exposed verbs as tools and any
 * module resource surfaces.
 *
 * Async because a module's `mcpResources.register` dynamic-imports the SDK's
 * `ResourceTemplate` (so the resource browser never lands on the storeless
 * `--help`/`__complete` fast path).
 *
 * @param modules - The capability modules to project.
 * @param cwd - The working directory for the server's runtime.
 * @returns The configured MCP server, ready to `connect` to a transport.
 * @note Impure by default — reads `process.cwd()` unless `cwd` is provided.
 */
export async function buildServer(
  modules: readonly CapabilityModule[],
  cwd: string = process.cwd(),
): Promise<McpServer> {
  const server = new McpServer(
    { name: MCP_SERVER_NAME, version: VERSION },
    // Handshake orientation (sent once at initialize), derived from the SAME
    // conventions/discovery as the `capabilities` tool so the two never diverge.
    { instructions: buildInstructions(modules) },
  );
  const runtime = bootRuntime(MCP_FLAGS, cwd);

  for (const module of modules) {
    for (const verb of module.verbs) {
      if (verb.capability.mcp.expose) {
        registerVerb(server, verb, runtime);
      }
    }
    // A module's optional resource surface (NOT a tool) — the `{+uri}` template.
    await module.mcpResources?.register(server, runtime);
    // A module's optional native prompt surface (NOT a tool) — `prompts/*`.
    await module.mcpPrompts?.register(server, runtime);
  }

  return server;
}
