import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestMcpClient } from "../../testing/mcp.js";
import type { McpErrorPayload } from "./types.js";

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

function parseText(result: { content: unknown[] }): unknown {
  const first = result.content[0] as { type: string; text: string };
  expect(first.type).toBe("text");
  return JSON.parse(first.text);
}

// =============================================================================
// Tool listing
// =============================================================================

describe("tool listing", () => {
  it("registers 11 tools", async () => {
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(11);
  });

  it("all tools have descriptions", async () => {
    const { tools } = await client.listTools();
    for (const tool of tools) {
      expect(tool.description).toBeTruthy();
    }
  });

  it("includes expected tool names", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    expect(names).toContain("component_list");
    expect(names).toContain("component_get");
    expect(names).toContain("standard_list");
    expect(names).toContain("standard_get");
    expect(names).toContain("standard_categories");
    expect(names).toContain("modifier_list");
    expect(names).toContain("modifier_get");
    expect(names).toContain("token_list");
    expect(names).toContain("token_get");
    expect(names).toContain("tier_list");
    expect(names).toContain("config_show");
  });
});

// =============================================================================
// Component tools
// =============================================================================

describe("component_list", () => {
  it("returns components", async () => {
    const result = await client.callTool({
      name: "component_list",
      arguments: {},
    });
    const data = parseText(result) as unknown[];
    expect(data.length).toBeGreaterThan(0);
    const names = data.map((c) => (c as { name: string }).name);
    expect(names).toContain("Button");
    expect(names).toContain("Card");
  });

  it("returns all components with allTiers", async () => {
    const result = await client.callTool({
      name: "component_list",
      arguments: { allTiers: true },
    });
    const data = parseText(result) as unknown[];
    const names = data.map((c) => (c as { name: string }).name);
    expect(names).toContain("Beta Widget");
  });
});

describe("component_get", () => {
  it("returns detailed component data by default (MC.02)", async () => {
    const result = await client.callTool({
      name: "component_get",
      arguments: { name: "Button" },
    });
    const data = parseText(result) as Record<string, unknown>;
    expect(data.name).toBe("Button");
    // Detailed fields present by default (MC.02)
    expect(data).toHaveProperty("modifierValues");
    expect(data).toHaveProperty("implementationPaths");
    expect(data).toHaveProperty("tokens");
  });

  it("returns summary when detailed=false", async () => {
    const result = await client.callTool({
      name: "component_get",
      arguments: { name: "Button", detailed: false },
    });
    const data = parseText(result) as Record<string, unknown>;
    expect(data.name).toBe("Button");
    // Summary fields only
    expect(data).not.toHaveProperty("modifierValues");
    expect(data).not.toHaveProperty("implementationPaths");
  });

  it("returns error with recovery for unknown component (MC.03)", async () => {
    const result = await client.callTool({
      name: "component_get",
      arguments: { name: "NonExistent" },
    });
    expect(result.isError).toBe(true);
    const payload = parseText(result) as McpErrorPayload;
    expect(payload.code).toBe("ENTITY_NOT_FOUND");
    expect(payload.recovery).toBeDefined();
    expect(payload.recovery?.tool).toBe("component_list");
  });
});

// =============================================================================
// Standard tools
// =============================================================================

describe("standard_list", () => {
  it("returns standards", async () => {
    const result = await client.callTool({
      name: "standard_list",
      arguments: {},
    });
    const data = parseText(result) as unknown[];
    expect(data.length).toBeGreaterThan(0);
  });

  it("filters by category", async () => {
    const all = await client.callTool({
      name: "standard_list",
      arguments: {},
    });
    const allData = parseText(all) as { category: string }[];
    const categories = [...new Set(allData.map((s) => s.category))];

    const firstCategory = categories[0];
    if (firstCategory) {
      const filtered = await client.callTool({
        name: "standard_list",
        arguments: { category: firstCategory },
      });
      const filteredData = parseText(filtered) as { category: string }[];
      expect(filteredData.length).toBeGreaterThan(0);
      expect(
        filteredData.every(
          (s) => s.category.toLowerCase() === firstCategory.toLowerCase(),
        ),
      ).toBe(true);
    }
  });

  it("filters by search term", async () => {
    const result = await client.callTool({
      name: "standard_list",
      arguments: { search: "function" },
    });
    const data = parseText(result) as { name: string; description: string }[];
    for (const item of data) {
      const matches =
        item.name.toLowerCase().includes("function") ||
        item.description.toLowerCase().includes("function");
      expect(matches).toBe(true);
    }
  });
});

describe("standard_get", () => {
  it("returns detailed standard by default (MC.02)", async () => {
    // Get a standard name from the list
    const list = await client.callTool({
      name: "standard_list",
      arguments: {},
    });
    const standards = parseText(list) as { name: string }[];
    expect(standards.length).toBeGreaterThan(0);
    const standardName = standards[0]?.name ?? "";

    const result = await client.callTool({
      name: "standard_get",
      arguments: { name: standardName },
    });
    const data = parseText(result) as Record<string, unknown>;
    expect(data.name).toBe(standardName);
    // Detailed fields present by default
    expect(data).toHaveProperty("dos");
    expect(data).toHaveProperty("donts");
  });

  it("returns summary when detailed=false", async () => {
    const list = await client.callTool({
      name: "standard_list",
      arguments: {},
    });
    const standards = parseText(list) as { name: string }[];
    const standardName = standards[0]?.name ?? "";

    const result = await client.callTool({
      name: "standard_get",
      arguments: { name: standardName, detailed: false },
    });
    const data = parseText(result) as Record<string, unknown>;
    expect(data).not.toHaveProperty("dos");
    expect(data).not.toHaveProperty("donts");
  });

  it("returns error for unknown standard (MC.04)", async () => {
    const result = await client.callTool({
      name: "standard_get",
      arguments: { name: "nonexistent/standard" },
    });
    expect(result.isError).toBe(true);
    const payload = parseText(result) as McpErrorPayload;
    expect(payload.code).toBe("ENTITY_NOT_FOUND");
  });
});

describe("standard_categories", () => {
  it("returns categories", async () => {
    const result = await client.callTool({
      name: "standard_categories",
      arguments: {},
    });
    const data = parseText(result) as string[];
    expect(data.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Modifier tools
// =============================================================================

describe("modifier_list", () => {
  it("returns modifier families", async () => {
    const result = await client.callTool({
      name: "modifier_list",
      arguments: {},
    });
    const data = parseText(result) as { name: string; values: string[] }[];
    expect(data.length).toBeGreaterThan(0);
    const names = data.map((m) => m.name);
    expect(names).toContain("importance");
  });
});

describe("modifier_get", () => {
  it("returns modifier values", async () => {
    const result = await client.callTool({
      name: "modifier_get",
      arguments: { name: "importance" },
    });
    const data = parseText(result) as { name: string; values: string[] };
    expect(data.name).toBe("importance");
    expect(data.values).toContain("primary");
  });

  it("returns error for unknown modifier", async () => {
    const result = await client.callTool({
      name: "modifier_get",
      arguments: { name: "nonexistent" },
    });
    expect(result.isError).toBe(true);
    const payload = parseText(result) as McpErrorPayload;
    expect(payload.code).toBe("ENTITY_NOT_FOUND");
  });
});

// =============================================================================
// Token tools
// =============================================================================

describe("token_list", () => {
  it("returns tokens", async () => {
    const result = await client.callTool({
      name: "token_list",
      arguments: {},
    });
    const data = parseText(result) as { name: string }[];
    expect(data.length).toBeGreaterThan(0);
  });
});

describe("token_get", () => {
  it("returns token with theme values", async () => {
    const result = await client.callTool({
      name: "token_get",
      arguments: { name: "color.primary" },
    });
    const data = parseText(result) as {
      name: string;
      values: { theme: string; value: string }[];
    };
    expect(data.name).toBe("color.primary");
    expect(data.values.length).toBeGreaterThan(0);
  });

  it("returns error for unknown token", async () => {
    const result = await client.callTool({
      name: "token_get",
      arguments: { name: "nonexistent.token" },
    });
    expect(result.isError).toBe(true);
  });
});

// =============================================================================
// Tier tools
// =============================================================================

describe("tier_list", () => {
  it("returns tiers", async () => {
    const result = await client.callTool({
      name: "tier_list",
      arguments: {},
    });
    const data = parseText(result) as { path: string }[];
    expect(data.length).toBeGreaterThan(0);
    const paths = data.map((t) => t.path);
    expect(paths).toContain("global");
  });
});

// =============================================================================
// Config tools
// =============================================================================

describe("config_show", () => {
  it("returns config", async () => {
    const result = await client.callTool({
      name: "config_show",
      arguments: {},
    });
    const data = parseText(result) as {
      tier: string | null;
      channel: string;
    };
    expect(data.channel).toBe("normal");
    expect(data.tier).toBeNull();
  });
});

// =============================================================================
// Error handling (MC.03, MC.04, ER.08)
// =============================================================================

describe("error handling", () => {
  it("all entity-not-found errors include recovery objects", async () => {
    const notFoundCalls = [
      { name: "component_get", arguments: { name: "X" } },
      { name: "modifier_get", arguments: { name: "X" } },
      { name: "token_get", arguments: { name: "X" } },
      { name: "standard_get", arguments: { name: "X" } },
    ] as const;

    for (const call of notFoundCalls) {
      const result = await client.callTool(call);
      expect(result.isError).toBe(true);
      const payload = parseText(result) as McpErrorPayload;
      expect(payload.code).toBe("ENTITY_NOT_FOUND");
      expect(payload.recovery).toBeDefined();
      expect(payload.recovery?.tool).toMatch(/^\w+_list$/);
    }
  });
});
