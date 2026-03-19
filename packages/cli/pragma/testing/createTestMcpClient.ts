/**
 * MCP test client — creates an in-process server+client pair
 * connected via InMemoryTransport for integration testing.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PragmaConfig } from "../src/config.js";
import { registerTools } from "../src/mcp/registerTools.js";
import { DS_ALL_TTL } from "./dsFixtures.js";
import { createTestStore } from "./store.js";

interface TestMcpClientResult {
  client: Client;
  cleanup: () => Promise<void>;
}

/**
 * Create an in-process MCP client connected to a server with
 * all tools registered against a test store.
 */
export default async function createTestMcpClient(options?: {
  ttl?: string;
  config?: PragmaConfig;
}): Promise<TestMcpClientResult> {
  const ttl = options?.ttl ?? DS_ALL_TTL;
  const config: PragmaConfig = options?.config ?? {
    tier: undefined,
    channel: "normal",
  };

  const { store, cleanup: cleanupStore } = await createTestStore({ ttl });

  const server = new McpServer({ name: "pragma-test", version: "0.0.0" });
  registerTools(server, store, config);

  const [serverTransport, clientTransport] =
    InMemoryTransport.createLinkedPair();

  const client = new Client({ name: "pragma-test-client", version: "0.0.0" });

  await server.connect(serverTransport);
  await client.connect(clientTransport);

  return {
    client,
    cleanup: async () => {
      try {
        await client.close();
        await server.close();
      } finally {
        cleanupStore();
      }
    },
  };
}

export type { TestMcpClientResult };
