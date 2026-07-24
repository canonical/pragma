/**
 * Test helper: an in-process MCP client wired to a server built from modules.
 *
 * Uses the SDK's in-memory transport — no stdio, no network — so a test can
 * list tools, call a tool, and read back the parsed `{ ok, data, meta }`
 * envelope. The caller owns the lifecycle via {@link McpHarness.cleanup}.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type {
  CallToolResult,
  ServerCapabilities,
} from "@modelcontextprotocol/sdk/types.js";
import { buildServer } from "../../kernel/project/mcp/buildServer.js";
import type { CapabilityModule } from "../../kernel/spec/types.js";

/** A description of a registered tool (name + annotations + full schema). */
export interface ToolInfo {
  readonly name: string;
  readonly annotations?: Record<string, unknown>;
  /** The tool's one-line description, as an agent sees it in the catalog. */
  readonly description?: string;
  /** The tool's JSON-schema input shape, as an agent sees it in the catalog. */
  readonly inputSchema?: unknown;
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
  /** List the resources exposed by the `{+uri}` template's list callback. */
  listResources(): Promise<{ uri: string; name: string }[]>;
  /** Read one resource by URI; returns the first content's parsed/raw text. */
  readResource(uri: string): Promise<{ mimeType?: string; text: string }>;
  /** Complete a resource-template variable against a partial value. */
  completeResource(partial: string): Promise<string[]>;
  /** The server capabilities negotiated at initialize (tools/resources/prompts). */
  serverCapabilities(): ServerCapabilities | undefined;
  /** The server `instructions` string sent at initialize. */
  instructions(): string | undefined;
  /** List the native MCP prompts (`prompts/list`). */
  listPrompts(): Promise<{ name: string; description?: string }[]>;
  /** Get one native MCP prompt (`prompts/get`), with optional arguments. */
  getPrompt(
    name: string,
    args?: Record<string, string>,
  ): Promise<{ description?: string; messages: unknown[] }>;
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
  const server = await buildServer(modules, cwd);
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
        description: tool.description,
        inputSchema: tool.inputSchema,
      }));
    },
    async listResources() {
      const { resources } = await client.listResources();
      return resources.map((r) => ({ uri: r.uri, name: r.name }));
    },
    async readResource(uri) {
      const result = await client.readResource({ uri });
      const first = result.contents[0] as
        | { mimeType?: string; text?: string }
        | undefined;
      return {
        ...(first?.mimeType ? { mimeType: first.mimeType } : {}),
        text: first?.text ?? "",
      };
    },
    async completeResource(partial) {
      const result = await client.complete({
        ref: { type: "ref/resource", uri: "pragma:{+uri}" },
        argument: { name: "uri", value: partial },
      });
      return result.completion.values;
    },
    serverCapabilities() {
      return client.getServerCapabilities();
    },
    instructions() {
      return client.getInstructions();
    },
    async listPrompts() {
      const { prompts } = await client.listPrompts();
      return prompts.map((prompt) => ({
        name: prompt.name,
        ...(prompt.description ? { description: prompt.description } : {}),
      }));
    },
    async getPrompt(name, args) {
      const result = await client.getPrompt({ name, arguments: args });
      return {
        ...(result.description ? { description: result.description } : {}),
        messages: result.messages,
      };
    },
    async cleanup() {
      await client.close();
      await server.close();
    },
  };
}
