/**
 * In-process MCP client for integration testing.
 *
 * Creates a server from an existing `PragmaRuntime` via
 * `createMcpServerFromRuntime` and connects through the MCP SDK's
 * in-process transport. No network, no stdio.
 *
 * The client shares the test-owned runtime — lifecycle is explicit.
 *
 * @note Impure — creates MCP server and client, connects transport.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { PragmaRuntime } from "../../domains/shared/runtime.js";
import { createMcpServerFromRuntime } from "../../mcp/createMcpServer.js";
import type { TestMcpClientResult } from "../types.js";

/**
 * Create an in-process MCP client connected to a server backed by
 * the given runtime. The caller owns the runtime lifecycle.
 *
 * @note Impure — creates MCP server and client, connects transport.
 */
export default async function createTestMcpClient(
  runtime: PragmaRuntime,
): Promise<TestMcpClientResult> {
  const { server } = createMcpServerFromRuntime(runtime);

  const [serverTransport, clientTransport] =
    InMemoryTransport.createLinkedPair();

  const client = new Client({ name: "pragma-test-client", version: "0.0.0" });

  await server.connect(serverTransport);
  await client.connect(clientTransport);

  return {
    client,
    cleanup: async () => {
      await client.close();
      await server.close();
    },
  };
}
