import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import createTestMcpClient from "../../testing/createTestMcpClient.js";

let client: Client;
let cleanup: () => Promise<void>;

beforeAll(async () => {
  const result = await createTestMcpClient();
  client = result.client;
  cleanup = result.cleanup;
});

afterAll(async () => {
  await cleanup();
});

describe("createMcpServer", () => {
  it("creates a server with registered tools", async () => {
    const { tools } = await client.listTools();
    expect(tools.length).toBeGreaterThan(0);
  });

  it("all tools have input schemas", async () => {
    const { tools } = await client.listTools();
    for (const tool of tools) {
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe("object");
    }
  });

  it("creates a server with registered resources", async () => {
    const { resources } = await client.listResources();
    expect(resources.length).toBeGreaterThan(0);
  });

  it("creates a server with registered resource templates", async () => {
    const { resourceTemplates } = await client.listResourceTemplates();
    expect(resourceTemplates.length).toBeGreaterThan(0);
  });
});
