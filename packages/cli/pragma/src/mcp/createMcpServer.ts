/**
 * MCP server factory.
 *
 * Boots the pragma runtime, creates the McpServer, and registers all tools
 * and resources. Returns the server with a dispose handle for cleanup.
 *
 * @see F.05 BT.04
 */

import type { SourceSpec } from "@canonical/ke";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { VERSION } from "../constants.js";
import type { PragmaRuntime } from "../domains/shared/runtime.js";
import { bootPragma } from "../domains/shared/runtime.js";
import registerResources from "./registerResources.js";
import registerTools from "./registerTools.js";

/**
 * Create a fully configured MCP server with its own runtime.
 *
 * The caller owns the returned `dispose` function and must call it when
 * the transport disconnects or the process exits.
 *
 * @note Impure — reads config file and boots ke store.
 */
export async function createMcpServer(options?: {
  cwd?: string;
  sources?: SourceSpec[];
}): Promise<{ server: McpServer; dispose: () => void }> {
  const runtime = await bootPragma(options);
  const { server } = createMcpServerFromRuntime(runtime);
  return { server, dispose: () => runtime.dispose() };
}

/**
 * Create an MCP server from an existing runtime (no boot).
 *
 * Used in testing where the test controls the runtime lifecycle.
 */
export function createMcpServerFromRuntime(runtime: PragmaRuntime): {
  server: McpServer;
} {
  const server = new McpServer({ name: "pragma", version: VERSION });
  registerTools(server, runtime);
  registerResources(server, runtime);
  return { server };
}
