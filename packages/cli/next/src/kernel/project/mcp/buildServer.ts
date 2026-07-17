/**
 * Build the MCP server from the grammar.
 *
 * Constructs an {@link McpServer} keeping the stable `pragma` identity (not
 * `pragma2`, so existing agent wiring resolves it), then registers every
 * exposed verb as a tool. No resources or prompts in PR1 — those arrive with
 * the store-backed capabilities. Storeless: one runtime is booted for the
 * server's lifetime and shared by every tool.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MCP_SERVER_NAME, VERSION } from "../../../constants.js";
import { bootRuntime } from "../../runtime/boot.js";
import type { GlobalFlags } from "../../runtime/types.js";
import type { CapabilityModule } from "../../spec/types.js";
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
 * Assemble the MCP server, registering all exposed verbs as tools.
 *
 * @param modules - The capability modules to project.
 * @param cwd - The working directory for the server's runtime.
 * @returns The configured MCP server, ready to `connect` to a transport.
 * @note Impure by default — reads `process.cwd()` unless `cwd` is provided.
 */
export function buildServer(
  modules: readonly CapabilityModule[],
  cwd: string = process.cwd(),
): McpServer {
  const server = new McpServer({ name: MCP_SERVER_NAME, version: VERSION });
  const runtime = bootRuntime(MCP_FLAGS, cwd);

  for (const module of modules) {
    for (const verb of module.verbs) {
      if (verb.capability.mcp.expose) {
        registerVerb(server, verb, runtime);
      }
    }
  }

  return server;
}
