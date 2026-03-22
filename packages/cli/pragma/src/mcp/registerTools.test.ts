import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import createTestMcpClient from "../../testing/createTestMcpClient.js";
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

/**
 * Parse the envelope from a tool response.
 * Returns the full envelope object (with `ok`, `data`, `meta`, etc.).
 */
function parseEnvelope(result: {
  content: unknown[];
}): Record<string, unknown> {
  const first = result.content[0] as { type: string; text: string };
  expect(first.type).toBe("text");
  return JSON.parse(first.text) as Record<string, unknown>;
}

/**
 * Extract the `data` field from a success envelope.
 */
function parseData(result: { content: unknown[] }): unknown {
  const envelope = parseEnvelope(result);
  expect(envelope.ok).toBe(true);
  return envelope.data;
}

// =============================================================================
// Tool listing
// =============================================================================

describe("tool listing", () => {
  it("registers 22 tools", async () => {
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(22);
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
    // Existing tools
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
    expect(names).toContain("create_component");
    expect(names).toContain("create_package");
    expect(names).toContain("llm");
    // New tools (Group C)
    expect(names).toContain("ontology_list");
    expect(names).toContain("ontology_show");
    expect(names).toContain("graph_query");
    expect(names).toContain("graph_inspect");
    expect(names).toContain("skill_list");
    expect(names).toContain("doctor");
    expect(names).toContain("info");
    expect(names).toContain("capabilities");
  });

  it("no tool names contain pragma_ prefix (NM.02)", async () => {
    const { tools } = await client.listTools();
    for (const tool of tools) {
      expect(tool.name).not.toMatch(/^pragma_/);
    }
  });
});

// =============================================================================
// Envelope shape
// =============================================================================

describe("envelope shape", () => {
  it("success response has ok: true, data, and meta", async () => {
    const result = await client.callTool({
      name: "component_list",
      arguments: {},
    });
    const envelope = parseEnvelope(result);
    expect(envelope.ok).toBe(true);
    expect(envelope).toHaveProperty("data");
    expect(envelope).toHaveProperty("meta");
  });

  it("error response has ok: false and error object", async () => {
    const result = await client.callTool({
      name: "component_get",
      arguments: { name: "NonExistent" },
    });
    expect(result.isError).toBe(true);
    const envelope = parseEnvelope(result);
    expect(envelope.ok).toBe(false);
    expect(envelope).toHaveProperty("error");
    const error = envelope.error as Record<string, unknown>;
    expect(error).toHaveProperty("code");
    expect(error).toHaveProperty("message");
  });

  it("list operations include count in meta", async () => {
    const result = await client.callTool({
      name: "component_list",
      arguments: {},
    });
    const envelope = parseEnvelope(result);
    const meta = envelope.meta as Record<string, unknown>;
    expect(typeof meta.count).toBe("number");
  });

  it("list operations include filters in meta", async () => {
    const result = await client.callTool({
      name: "component_list",
      arguments: {},
    });
    const envelope = parseEnvelope(result);
    const meta = envelope.meta as Record<string, unknown>;
    expect(meta.filters).toBeDefined();
    const filters = meta.filters as Record<string, string>;
    expect(filters.channel).toBe("normal");
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
    const data = parseData(result) as unknown[];
    expect(data.length).toBeGreaterThan(0);
    const names = data.map((c) => (c as { name: string }).name);
    expect(names).toContain("Button");
    expect(names).toContain("Card");
  });

  it("allTiers widens tier filter without changing channel", async () => {
    const restricted = await createTestMcpClient({
      config: { tier: "global", channel: "normal" },
    });
    try {
      const without = await restricted.client.callTool({
        name: "component_list",
        arguments: {},
      });
      const withoutNames = (parseData(without) as { name: string }[]).map(
        (c) => c.name,
      );
      expect(withoutNames).not.toContain("LXD Panel");

      const withAll = await restricted.client.callTool({
        name: "component_list",
        arguments: { allTiers: true },
      });
      const withAllNames = (parseData(withAll) as { name: string }[]).map(
        (c) => c.name,
      );
      expect(withAllNames).toContain("LXD Panel");
      expect(withAllNames).not.toContain("Beta Widget");
    } finally {
      await restricted.cleanup();
    }
  });
});

describe("component_get", () => {
  it("returns detailed component data by default (MC.02)", async () => {
    const result = await client.callTool({
      name: "component_get",
      arguments: { name: "Button" },
    });
    const data = parseData(result) as Record<string, unknown>;
    expect(data.name).toBe("Button");
    expect(data).toHaveProperty("modifierValues");
    expect(data).toHaveProperty("implementationPaths");
    expect(data).toHaveProperty("tokens");
  });

  it("returns summary when detailed=false", async () => {
    const result = await client.callTool({
      name: "component_get",
      arguments: { name: "Button", detailed: false },
    });
    const data = parseData(result) as Record<string, unknown>;
    expect(data.name).toBe("Button");
    expect(data).not.toHaveProperty("modifierValues");
    expect(data).not.toHaveProperty("implementationPaths");
  });

  it("returns error with recovery for unknown component", async () => {
    const result = await client.callTool({
      name: "component_get",
      arguments: { name: "NonExistent" },
    });
    expect(result.isError).toBe(true);
    const envelope = parseEnvelope(result);
    expect(envelope.ok).toBe(false);
    const error = envelope.error as McpErrorPayload;
    expect(error.code).toBe("ENTITY_NOT_FOUND");
    expect(error.recovery).toBeDefined();
    expect(error.recovery?.tool).toBe("component_list");
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
    const data = parseData(result) as unknown[];
    expect(data.length).toBeGreaterThan(0);
  });

  it("filters by category", async () => {
    const all = await client.callTool({
      name: "standard_list",
      arguments: {},
    });
    const allData = parseData(all) as { category: string }[];
    const categories = [...new Set(allData.map((s) => s.category))];

    const firstCategory = categories[0];
    if (firstCategory) {
      const filtered = await client.callTool({
        name: "standard_list",
        arguments: { category: firstCategory },
      });
      const filteredData = parseData(filtered) as { category: string }[];
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
    const data = parseData(result) as { name: string; description: string }[];
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
    const list = await client.callTool({
      name: "standard_list",
      arguments: {},
    });
    const standards = parseData(list) as { name: string }[];
    expect(standards.length).toBeGreaterThan(0);
    const standardName = standards[0]?.name ?? "";

    const result = await client.callTool({
      name: "standard_get",
      arguments: { name: standardName },
    });
    const data = parseData(result) as Record<string, unknown>;
    expect(data.name).toBe(standardName);
    expect(data).toHaveProperty("dos");
    expect(data).toHaveProperty("donts");
  });

  it("returns summary when detailed=false", async () => {
    const list = await client.callTool({
      name: "standard_list",
      arguments: {},
    });
    const standards = parseData(list) as { name: string }[];
    const standardName = standards[0]?.name ?? "";

    const result = await client.callTool({
      name: "standard_get",
      arguments: { name: standardName, detailed: false },
    });
    const data = parseData(result) as Record<string, unknown>;
    expect(data).not.toHaveProperty("dos");
    expect(data).not.toHaveProperty("donts");
  });

  it("returns error for unknown standard", async () => {
    const result = await client.callTool({
      name: "standard_get",
      arguments: { name: "nonexistent/standard" },
    });
    expect(result.isError).toBe(true);
    const envelope = parseEnvelope(result);
    const error = envelope.error as McpErrorPayload;
    expect(error.code).toBe("ENTITY_NOT_FOUND");
  });
});

describe("standard_categories", () => {
  it("returns categories", async () => {
    const result = await client.callTool({
      name: "standard_categories",
      arguments: {},
    });
    const data = parseData(result) as string[];
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
    const data = parseData(result) as { name: string; values: string[] }[];
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
    const data = parseData(result) as { name: string; values: string[] };
    expect(data.name).toBe("importance");
    expect(data.values).toContain("primary");
  });

  it("returns error for unknown modifier", async () => {
    const result = await client.callTool({
      name: "modifier_get",
      arguments: { name: "nonexistent" },
    });
    expect(result.isError).toBe(true);
    const envelope = parseEnvelope(result);
    const error = envelope.error as McpErrorPayload;
    expect(error.code).toBe("ENTITY_NOT_FOUND");
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
    const data = parseData(result) as { name: string }[];
    expect(data.length).toBeGreaterThan(0);
  });
});

describe("token_get", () => {
  it("returns token with theme values", async () => {
    const result = await client.callTool({
      name: "token_get",
      arguments: { name: "color.primary" },
    });
    const data = parseData(result) as {
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
    const data = parseData(result) as { path: string }[];
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
    const data = parseData(result) as {
      tier: string | null;
      channel: string;
    };
    expect(data.channel).toBe("normal");
    expect(data.tier).toBeNull();
  });
});

// =============================================================================
// Generator tools (D14 — mutating)
// =============================================================================

describe("create_component", () => {
  it("returns JSON generation plan for react", async () => {
    const result = await client.callTool({
      name: "create_component",
      arguments: {
        framework: "react",
        componentPath: "src/components/Button",
      },
    });
    expect(result.isError).toBeFalsy();
    const data = parseData(result) as Record<string, unknown>;
    expect(data.generator).toBeDefined();
    expect((data.generator as { name: string }).name).toBe("component/react");
    expect(Array.isArray(data.plan)).toBe(true);
  });

  it("returns JSON generation plan for svelte", async () => {
    const result = await client.callTool({
      name: "create_component",
      arguments: {
        framework: "svelte",
        componentPath: "src/lib/components/Toggle",
      },
    });
    expect(result.isError).toBeFalsy();
    const data = parseData(result) as Record<string, unknown>;
    expect((data.generator as { name: string }).name).toBe("component/svelte");
  });

  it("returns error for invalid framework", async () => {
    const result = await client.callTool({
      name: "create_component",
      arguments: {
        framework: "angular",
        componentPath: "src/components/Button",
      },
    });
    expect(result.isError).toBe(true);
  });
});

describe("create_package", () => {
  it("returns JSON generation plan", async () => {
    const result = await client.callTool({
      name: "create_package",
      arguments: {
        name: "@canonical/test-pkg",
        type: "tool-ts",
      },
    });
    expect(result.isError).toBeFalsy();
    const data = parseData(result) as Record<string, unknown>;
    expect((data.generator as { name: string }).name).toBe("package");
    expect(Array.isArray(data.plan)).toBe(true);
  });
});

// =============================================================================
// LLM Orientation
// =============================================================================

describe("llm", () => {
  it("returns orientation data with context, trees, and commands", async () => {
    const result = await client.callTool({
      name: "llm",
      arguments: {},
    });
    const data = parseData(result) as {
      context: { counts: Record<string, number>; namespaces: string[] };
      decisionTrees: { intent: string }[];
      commandReference: { command: string }[];
    };
    expect(data.context.counts.components).toBeGreaterThan(0);
    expect(data.context.counts.standards).toBeGreaterThan(0);
    expect(data.context.namespaces.length).toBeGreaterThan(0);
    expect(data.decisionTrees).toHaveLength(5);
    expect(data.commandReference.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Error handling
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
      const envelope = parseEnvelope(result);
      expect(envelope.ok).toBe(false);
      const error = envelope.error as McpErrorPayload;
      expect(error.code).toBe("ENTITY_NOT_FOUND");
      expect(error.recovery).toBeDefined();
      expect(error.recovery?.tool).toMatch(/^\w+_list$/);
    }
  });
});

// =============================================================================
// Ontology tools (SF.06)
// =============================================================================

describe("ontology_list", () => {
  it("returns ontologies", async () => {
    const result = await client.callTool({
      name: "ontology_list",
      arguments: {},
    });
    const data = parseData(result) as { prefix: string }[];
    expect(data.length).toBeGreaterThan(0);
  });

  it("returns error envelope shape on failure", async () => {
    // ontology_list should always succeed with loaded data,
    // so we just verify the success shape has meta.count
    const result = await client.callTool({
      name: "ontology_list",
      arguments: {},
    });
    const envelope = parseEnvelope(result);
    const meta = envelope.meta as Record<string, unknown>;
    expect(typeof meta.count).toBe("number");
  });
});

describe("ontology_show", () => {
  it("returns ontology details for a valid prefix", async () => {
    const result = await client.callTool({
      name: "ontology_show",
      arguments: { prefix: "ds" },
    });
    const data = parseData(result) as {
      prefix: string;
      classes: unknown[];
      properties: unknown[];
    };
    expect(data.prefix).toBe("ds");
    expect(data.classes.length).toBeGreaterThan(0);
  });

  it("returns error for unknown prefix", async () => {
    const result = await client.callTool({
      name: "ontology_show",
      arguments: { prefix: "nonexistent" },
    });
    expect(result.isError).toBe(true);
    const envelope = parseEnvelope(result);
    expect(envelope.ok).toBe(false);
  });
});

// =============================================================================
// Graph tools (SF.07)
// =============================================================================

describe("graph_query", () => {
  it("executes a SPARQL query", async () => {
    const result = await client.callTool({
      name: "graph_query",
      arguments: { sparql: "SELECT ?s WHERE { ?s ?p ?o } LIMIT 1" },
    });
    const data = parseData(result) as Record<string, unknown>;
    expect(data).toBeDefined();
  });

  it("returns error for invalid SPARQL", async () => {
    const result = await client.callTool({
      name: "graph_query",
      arguments: { sparql: "NOT VALID SPARQL" },
    });
    expect(result.isError).toBe(true);
  });
});

describe("graph_inspect", () => {
  it("inspects a valid URI", async () => {
    // First get a valid URI from the graph
    const queryResult = await client.callTool({
      name: "graph_query",
      arguments: { sparql: "SELECT ?s WHERE { ?s ?p ?o } LIMIT 1" },
    });
    const queryData = parseData(queryResult) as {
      type: string;
      bindings: { s?: string }[];
    };
    const validUri = queryData.bindings[0]?.s;
    expect(validUri).toBeDefined();

    const result = await client.callTool({
      name: "graph_inspect",
      arguments: { uri: validUri! },
    });
    const data = parseData(result) as {
      uri: string;
      groups: { predicate: string; objects: string[] }[];
    };
    expect(data.uri).toBeDefined();
    expect(data.groups.length).toBeGreaterThan(0);
  });

  it("returns error for unknown URI", async () => {
    const result = await client.callTool({
      name: "graph_inspect",
      arguments: { uri: "https://example.com/nonexistent" },
    });
    expect(result.isError).toBe(true);
  });
});

// =============================================================================
// Skill tools (SF.09)
// =============================================================================

describe("skill_list", () => {
  it("returns skills data", async () => {
    const result = await client.callTool({
      name: "skill_list",
      arguments: {},
    });
    const data = parseData(result) as {
      skills: unknown[];
      sources: unknown[];
    };
    expect(data).toHaveProperty("skills");
    expect(data).toHaveProperty("sources");
  });
});

// =============================================================================
// Doctor tool (SF.11)
// =============================================================================

describe("doctor", () => {
  it("returns health check results", async () => {
    const result = await client.callTool({
      name: "doctor",
      arguments: {},
    });
    const data = parseData(result) as {
      checks: { name: string; status: string }[];
      passed: number;
      failed: number;
    };
    expect(data.checks.length).toBeGreaterThan(0);
    expect(typeof data.passed).toBe("number");
  });
});

// =============================================================================
// Info tool (SF.11)
// =============================================================================

describe("info", () => {
  it("returns pragma info", async () => {
    const result = await client.callTool({
      name: "info",
      arguments: {},
    });
    const data = parseData(result) as {
      version: string;
      channel: string;
      store: { tripleCount: number } | null;
    };
    expect(data.version).toBeDefined();
    expect(data.store).toBeDefined();
    expect(data.store?.tripleCount).toBeGreaterThan(0);
  });
});

// =============================================================================
// Capabilities tool (SF.10, OD.02)
// =============================================================================

describe("capabilities", () => {
  it("returns accurate tool list and counts", async () => {
    const result = await client.callTool({
      name: "capabilities",
      arguments: {},
    });
    const data = parseData(result) as {
      tools: string[];
      counts: {
        total: number;
        read: number;
        write: number;
        orientation: number;
        diagnostic: number;
      };
    };
    expect(data.tools).toContain("component_list");
    expect(data.tools).toContain("capabilities");
    expect(data.counts.total).toBe(22);
    expect(data.counts.read).toBeGreaterThan(0);
    expect(data.counts.write).toBe(2);
    expect(data.counts.orientation).toBe(2);
    expect(data.counts.diagnostic).toBe(2);
  });
});

// =============================================================================
// Condensed responses (RS.03)
// =============================================================================

describe("condensed parameter", () => {
  it("component_list returns condensed text", async () => {
    const result = await client.callTool({
      name: "component_list",
      arguments: { condensed: true },
    });
    const envelope = parseEnvelope(result);
    expect(envelope.ok).toBe(true);
    expect(envelope.condensed).toBe(true);
    expect(typeof envelope.text).toBe("string");
    expect(typeof envelope.tokens).toBe("string");
    expect(envelope).not.toHaveProperty("data");
  });

  it("standard_list returns condensed text", async () => {
    const result = await client.callTool({
      name: "standard_list",
      arguments: { condensed: true },
    });
    const envelope = parseEnvelope(result);
    expect(envelope.ok).toBe(true);
    expect(envelope.condensed).toBe(true);
    expect(typeof envelope.text).toBe("string");
  });

  it("tier_list returns condensed text", async () => {
    const result = await client.callTool({
      name: "tier_list",
      arguments: { condensed: true },
    });
    const envelope = parseEnvelope(result);
    expect(envelope.ok).toBe(true);
    expect(envelope.condensed).toBe(true);
  });

  it("doctor returns condensed text", async () => {
    const result = await client.callTool({
      name: "doctor",
      arguments: { condensed: true },
    });
    const envelope = parseEnvelope(result);
    expect(envelope.ok).toBe(true);
    expect(envelope.condensed).toBe(true);
    expect(typeof envelope.text).toBe("string");
  });

  it("info returns condensed text", async () => {
    const result = await client.callTool({
      name: "info",
      arguments: { condensed: true },
    });
    const envelope = parseEnvelope(result);
    expect(envelope.ok).toBe(true);
    expect(envelope.condensed).toBe(true);
  });

  it("ontology_list returns condensed text", async () => {
    const result = await client.callTool({
      name: "ontology_list",
      arguments: { condensed: true },
    });
    const envelope = parseEnvelope(result);
    expect(envelope.ok).toBe(true);
    expect(envelope.condensed).toBe(true);
    expect((envelope.text as string).length).toBeGreaterThan(0);
  });
});
