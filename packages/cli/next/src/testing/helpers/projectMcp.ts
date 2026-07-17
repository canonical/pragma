/**
 * Test helper: an in-process MCP client wired to a server built from modules.
 *
 * Uses the SDK's in-memory transport — no stdio, no network — so a test can
 * list tools, call a tool, and read back the parsed `{ ok, data, meta }`
 * envelope. The caller owns the lifecycle via {@link McpHarness.cleanup}.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { buildServer } from "../../kernel/project/mcp/buildServer.js";
import type { CapabilityModule } from "../../kernel/spec/types.js";

/** A description of a registered tool (name + annotations). */
export interface ToolInfo {
  readonly name: string;
  readonly annotations?: Record<string, unknown>;
}

/** An in-process MCP harness. */
export interface McpHarness {
  /** Call a tool and return its parsed envelope. */
  callTool(
    name: string,
    args?: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
  /** List the registered tools. */
  listTools(): Promise<ToolInfo[]>;
  /** Close the client and server. */
  cleanup(): Promise<void>;
}

/**
 * Build a server from `modules` and connect an in-process client to it.
 *
 * @param modules - The capability modules to project.
 * @param cwd - The working directory for the server's runtime.
 * @returns The connected harness.
 * @note Impure — connects transports.
 */
export async function projectMcp(
  modules: readonly CapabilityModule[],
  cwd?: string,
): Promise<McpHarness> {
  const server = buildServer(modules, cwd);
  const [serverTransport, clientTransport] =
    InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "pragma-test-client", version: "0.0.0" });

  await server.connect(serverTransport);
  await client.connect(clientTransport);

  return {
    async callTool(name, args = {}) {
      const result = (await client.callTool({
        name,
        arguments: args,
      })) as CallToolResult;
      const first = result.content[0];
      if (!first || first.type !== "text") {
        throw new Error(`tool "${name}" returned no text content`);
      }
      return JSON.parse(first.text) as Record<string, unknown>;
    },
    async listTools() {
      const { tools } = await client.listTools();
      return tools.map((tool) => ({
        name: tool.name,
        annotations: tool.annotations as Record<string, unknown> | undefined,
      }));
    },
    async cleanup() {
      await client.close();
      await server.close();
    },
  };
}
