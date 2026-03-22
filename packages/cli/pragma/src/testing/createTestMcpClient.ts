import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { PragmaConfig } from "../config/index.js";
import type { PragmaRuntime } from "../domains/shared/runtime.js";
import { createMcpServerFromRuntime } from "../mcp/createMcpServer.js";
import { DS_ALL_TTL } from "./dsFixtures.js";
import { createTestStore } from "./store.js";
import type { TestMcpClientResult } from "./types.js";

/**
 * Create an in-process MCP client connected to a server with
 * all tools and resources registered against a test store.
 *
 * Uses InMemoryTransport — no network, no stdio. The returned
 * `cleanup` disposes the client, server, and backing store.
 *
 * @param options - Optional TTL data and config overrides.
 * @returns The connected client and a cleanup function.
 *
 * @note Impure
 */
export default async function createTestMcpClient(options?: {
  ttl?: string;
  config?: PragmaConfig;
  cwd?: string;
}): Promise<TestMcpClientResult> {
  const ttl = options?.ttl ?? DS_ALL_TTL;
  const config: PragmaConfig = options?.config ?? {
    tier: undefined,
    channel: "normal",
  };
  const cwd = options?.cwd ?? process.cwd();

  const { store, cleanup: cleanupStore } = await createTestStore({ ttl });

  const runtime: PragmaRuntime = {
    store,
    config,
    cwd,
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
