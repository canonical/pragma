import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { PragmaRuntime } from "../../domains/shared/runtime.js";
import { createMcpServerFromRuntime } from "../../mcp/createMcpServer.js";
import type { TestMcpClientResult } from "../types.js";

/**
 * Create an in-process MCP client connected to a server backed by
 * the given runtime.
 *
 * Uses `createMcpServerFromRuntime` and the MCP SDK's in-memory
 * transport. No network, no stdio. The caller owns the runtime
 * lifecycle and must call `cleanup` when done.
 *
 * @param runtime - An already-booted pragma runtime.
 * @returns The connected client and a cleanup function.
 *
 * @note Impure
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
