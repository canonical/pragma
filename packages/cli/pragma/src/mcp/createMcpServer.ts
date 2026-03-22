/**
 * MCP server factory.
 *
 * Groups two construction paths for the MCP server: full boot (reads
 * config and ke store) and runtime-injection (for tests that own the
 * runtime lifecycle). Both paths register the same set of tools and
 * resources.
 */

import type { SourceSpec } from "@canonical/ke";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { VERSION } from "../constants.js";
import type { PragmaRuntime } from "../domains/shared/runtime.js";
import { bootPragma } from "../domains/shared/runtime.js";
import registerResources from "./registerResources.js";
import registerAllTools from "./tools/index.js";

/**
 * Create a fully configured MCP server with its own runtime.
 *
 * The caller owns the returned `dispose` function and must call it when
 * the transport disconnects or the process exits.
 *
 * @param options - Optional overrides for working directory and TTL sources.
 * @returns The MCP server and a dispose callback to release the runtime.
 *
 * @note Impure
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
 *
 * @param runtime - An already-booted pragma runtime.
 * @returns The MCP server instance.
 */
export function createMcpServerFromRuntime(runtime: PragmaRuntime): {
  server: McpServer;
} {
  const server = new McpServer({ name: "pragma", version: VERSION });
  registerAllTools(server, runtime);
  registerResources(server, runtime);
  return { server };
}
