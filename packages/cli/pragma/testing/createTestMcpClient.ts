/**
 * MCP test client — creates an in-process server+client pair
 * connected via InMemoryTransport for integration testing.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { PragmaConfig } from "../src/config.js";
import type { PragmaRuntime } from "../src/domains/shared/runtime.js";
import { createMcpServerFromRuntime } from "../src/mcp/createMcpServer.js";
import { DS_ALL_TTL } from "./dsFixtures.js";
import { createTestStore } from "./store.js";
import type { TestMcpClientResult } from "./types.js";

/**
 * Create an in-process MCP client connected to a server with
 * all tools and resources registered against a test store.
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

  const runtime: PragmaRuntime = {
    store,
    config,
    cwd: process.cwd(),
    dispose: () => cleanupStore(),
  };

  const { server } = createMcpServerFromRuntime(runtime);

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
        runtime.dispose();
      }
    },
  };
}
