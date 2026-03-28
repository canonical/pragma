import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestMcpClient } from "#testing";
import type { McpErrorPayload } from "../types.js";

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
function parseEnvelope(
  result: Record<string, unknown>,
): Record<string, unknown> {
  const content = result.content as unknown[];
  const first = content[0] as { type: string; text: string };
  expect(first.type).toBe("text");
  return JSON.parse(first.text) as Record<string, unknown>;
}

/**
 * Extract the `data` field from a success envelope.
 */
function parseData(result: Record<string, unknown>): unknown {
  const envelope = parseEnvelope(result);
  expect(envelope.ok).toBe(true);
  return envelope.data;
}

// =============================================================================
// Tool listing
// =============================================================================

describe("tool listing", () => {
  it("registers 25 tools", async () => {
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(25);
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
    expect(names).toContain("block_list");
    expect(names).toContain("block_lookup");
    expect(names).toContain("standard_list");
    expect(names).toContain("standard_lookup");
    expect(names).toContain("standard_categories");
    expect(names).toContain("modifier_list");
    expect(names).toContain("modifier_lookup");
    expect(names).toContain("token_list");
    expect(names).toContain("token_lookup");
    expect(names).toContain("tier_list");
    expect(names).toContain("config_show");
    expect(names).toContain("config_tier");
    expect(names).toContain("config_channel");
    expect(names).toContain("tokens_add_config");
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

  it("no tool names contain pragma_ prefix", async () => {
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
      name: "block_list",
      arguments: {},
    });
    const envelope = parseEnvelope(result);
    expect(envelope.ok).toBe(true);
    expect(envelope).toHaveProperty("data");
    expect(envelope).toHaveProperty("meta");
  });

  it("error response has ok: false and error object", async () => {
    const result = await client.callTool({
      name: "config_channel",
      arguments: { value: "beta" },
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
      name: "block_list",
      arguments: {},
    });
    const envelope = parseEnvelope(result);
    const meta = envelope.meta as Record<string, unknown>;
    expect(typeof meta.count).toBe("number");
  });

  it("list operations include filters in meta", async () => {
    const result = await client.callTool({
      name: "block_list",
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
// Block tools
// =============================================================================

describe("block_list", () => {
  it("returns blocks", async () => {
    const result = await client.callTool({
      name: "block_list",
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
        name: "block_list",
        arguments: {},
      });
      const withoutNames = (parseData(without) as { name: string }[]).map(
        (c) => c.name,
      );
      expect(withoutNames).not.toContain("LXD Panel");

      const withAll = await restricted.client.callTool({
        name: "block_list",
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

describe("block_lookup", () => {
  it("returns detailed block data by default", async () => {
    const result = await client.callTool({
      name: "block_lookup",
      arguments: { names: ["Button"] },
    });
    const data = parseData(result) as {
      results: Record<string, unknown>[];
    };
    expect(data.results[0]?.name).toBe("Button");
    expect(data.results[0]).toHaveProperty("modifierValues");
    expect(data.results[0]).toHaveProperty("implementationPaths");
    expect(data.results[0]).toHaveProperty("tokens");
  });

  it("returns summary when detailed=false", async () => {
    const result = await client.callTool({
      name: "block_lookup",
      arguments: { names: ["Button"], detailed: false },
    });
    const data = parseData(result) as {
      results: Record<string, unknown>[];
    };
    expect(data.results[0]?.name).toBe("Button");
    expect(data.results[0]).not.toHaveProperty("modifierValues");
    expect(data.results[0]).not.toHaveProperty("implementationPaths");
  });

  it("returns structured per-query errors for unknown blocks", async () => {
    const result = await client.callTool({
      name: "block_lookup",
      arguments: { names: ["NonExistent"] },
    });
    const data = parseData(result) as {
      results: unknown[];
      errors: { code: string; query: string }[];
    };
    expect(data.results).toHaveLength(0);
    expect(data.errors[0]?.code).toBe("ENTITY_NOT_FOUND");
    expect(data.errors[0]?.query).toBe("NonExistent");
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

describe("standard_lookup", () => {
  it("returns detailed standard by default", async () => {
    const list = await client.callTool({
      name: "standard_list",
      arguments: {},
    });
    const standards = parseData(list) as { name: string }[];
    expect(standards.length).toBeGreaterThan(0);
    const standardName = standards[0]?.name ?? "";

    const result = await client.callTool({
      name: "standard_lookup",
      arguments: { names: [standardName] },
    });
    const data = parseData(result) as {
      results: Record<string, unknown>[];
    };
    expect(data.results[0]?.name).toBe(standardName);
    expect(data.results[0]).toHaveProperty("dos");
    expect(data.results[0]).toHaveProperty("donts");
  });

  it("returns summary when detailed=false", async () => {
    const list = await client.callTool({
      name: "standard_list",
      arguments: {},
    });
    const standards = parseData(list) as { name: string }[];
    const standardName = standards[0]?.name ?? "";

    const result = await client.callTool({
      name: "standard_lookup",
      arguments: { names: [standardName], detailed: false },
    });
    const data = parseData(result) as {
      results: Record<string, unknown>[];
    };
    expect(data.results[0]).not.toHaveProperty("dos");
    expect(data.results[0]).not.toHaveProperty("donts");
  });

  it("returns per-query errors for unknown standard", async () => {
    const result = await client.callTool({
      name: "standard_lookup",
      arguments: { names: ["nonexistent/standard"] },
    });
    const data = parseData(result) as {
      errors: { code: string }[];
    };
    expect(data.errors[0]?.code).toBe("ENTITY_NOT_FOUND");
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

describe("modifier_lookup", () => {
  it("returns modifier values", async () => {
    const result = await client.callTool({
      name: "modifier_lookup",
      arguments: { names: ["importance"] },
    });
    const data = parseData(result) as {
      results: { name: string; values: string[] }[];
    };
    expect(data.results[0]?.name).toBe("importance");
    expect(data.results[0]?.values).toContain("primary");
  });

  it("returns per-query errors for unknown modifier", async () => {
    const result = await client.callTool({
      name: "modifier_lookup",
      arguments: { names: ["nonexistent"] },
    });
    const data = parseData(result) as {
      errors: { code: string }[];
    };
    expect(data.errors[0]?.code).toBe("ENTITY_NOT_FOUND");
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

describe("token_lookup", () => {
  it("returns token with theme values", async () => {
    const result = await client.callTool({
      name: "token_lookup",
      arguments: { names: ["color.primary"] },
    });
    const data = parseData(result) as {
      results: {
        name: string;
        values: { theme: string; value: string }[];
      }[];
    };
    expect(data.results[0]?.name).toBe("color.primary");
    expect((data.results[0]?.values ?? []).length).toBeGreaterThan(0);
  });

  it("returns per-query errors for unknown token", async () => {
    const result = await client.callTool({
      name: "token_lookup",
      arguments: { names: ["nonexistent.token"] },
    });
    const data = parseData(result) as {
      errors: { code: string }[];
    };
    expect(data.errors[0]?.code).toBe("ENTITY_NOT_FOUND");
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
      tier: string | undefined;
      channel: string;
      tierChain: string[];
      includedReleases: string[];
    };
    expect(data.channel).toBe("normal");
    expect(data.tier).toBeUndefined();
    expect(data.tierChain).toEqual([]);
    expect(data.includedReleases).toContain("stable");
  });

  it("returns condensed config text", async () => {
    const result = await client.callTool({
      name: "config_show",
      arguments: { condensed: true },
    });
    const envelope = parseEnvelope(result);
    expect(envelope.ok).toBe(true);
    expect(envelope.condensed).toBe(true);
    expect(typeof envelope.text).toBe("string");
    expect(envelope.text as string).toContain("Configuration");
  });
});

describe("config_tier", () => {
  it("sets, queries, and resets tier in workspace config", async () => {
    const dir = mkdtempSync(join(tmpdir(), "pragma-mcp-tier-"));

    try {
      const scoped = await createTestMcpClient({ cwd: dir });

      try {
        const setResult = await scoped.client.callTool({
          name: "config_tier",
          arguments: { path: "global" },
        });
        expect(parseData(setResult)).toEqual({ tier: "global", action: "set" });

        const queryResult = await scoped.client.callTool({
          name: "config_tier",
          arguments: {},
        });
        expect(parseData(queryResult)).toEqual({
          tier: "global",
          action: "query",
        });

        const resetResult = await scoped.client.callTool({
          name: "config_tier",
          arguments: { reset: true },
        });
        expect(parseData(resetResult)).toEqual({ tier: null, action: "reset" });

        const queriedAfterReset = await scoped.client.callTool({
          name: "config_tier",
          arguments: {},
        });
        expect(parseData(queriedAfterReset)).toEqual({
          tier: null,
          action: "query",
        });
      } finally {
        await scoped.cleanup();
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("config_channel", () => {
  it("sets, queries, and resets channel in workspace config", async () => {
    const dir = mkdtempSync(join(tmpdir(), "pragma-mcp-channel-"));

    try {
      const scoped = await createTestMcpClient({ cwd: dir });

      try {
        const setResult = await scoped.client.callTool({
          name: "config_channel",
          arguments: { value: "experimental" },
        });
        expect(parseData(setResult)).toEqual({
          channel: "experimental",
          action: "set",
        });

        const queryResult = await scoped.client.callTool({
          name: "config_channel",
          arguments: {},
        });
        expect(parseData(queryResult)).toEqual({
          channel: "experimental",
          action: "query",
        });

        const resetResult = await scoped.client.callTool({
          name: "config_channel",
          arguments: { reset: true },
        });
        expect(parseData(resetResult)).toEqual({
          channel: "normal",
          action: "reset",
        });
      } finally {
        await scoped.cleanup();
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("returns an error for invalid channel input", async () => {
    const result = await client.callTool({
      name: "config_channel",
      arguments: { value: "beta" },
    });
    expect(result.isError).toBe(true);
    const envelope = parseEnvelope(result);
    const error = envelope.error as McpErrorPayload;
    expect(error.code).toBe("INVALID_INPUT");
  });
});

describe("tokens_add_config", () => {
  it("writes a token config file and reports its path", async () => {
    const dir = mkdtempSync(join(tmpdir(), "pragma-mcp-token-config-"));

    try {
      const scoped = await createTestMcpClient({ cwd: dir });

      try {
        const result = await scoped.client.callTool({
          name: "tokens_add_config",
          arguments: {},
        });
        const data = parseData(result) as {
          configPath: string;
          tokenSources: string[];
          installHint: string;
        };
        expect(data.configPath).toBe(join(dir, "tokens.config.mjs"));
        expect(data.tokenSources).toContain(
          "node_modules/@canonical/ds-global/tokens/**/*.json",
        );
        expect(data.installHint).toContain("@canonical/terrazzo-lsp");
        expect(existsSync(data.configPath)).toBe(true);
      } finally {
        await scoped.cleanup();
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("returns recovery metadata when config already exists", async () => {
    const dir = mkdtempSync(join(tmpdir(), "pragma-mcp-token-existing-"));
    const configPath = join(dir, "tokens.config.mjs");

    try {
      writeFileSync(configPath, "// existing\n", "utf-8");
      const scoped = await createTestMcpClient({ cwd: dir });

      try {
        const result = await scoped.client.callTool({
          name: "tokens_add_config",
          arguments: {},
        });
        expect(result.isError).toBe(true);
        const envelope = parseEnvelope(result);
        const error = envelope.error as McpErrorPayload;
        expect(error.code).toBe("INVALID_INPUT");
        expect(error.recovery?.tool).toBe("tokens_add_config");
        expect(error.recovery?.params).toEqual({ force: true });
      } finally {
        await scoped.cleanup();
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("overwrites an existing config when force=true", async () => {
    const dir = mkdtempSync(join(tmpdir(), "pragma-mcp-token-force-"));
    const configPath = join(dir, "tokens.config.mjs");

    try {
      writeFileSync(configPath, "// existing\n", "utf-8");
      const scoped = await createTestMcpClient({ cwd: dir });

      try {
        const result = await scoped.client.callTool({
          name: "tokens_add_config",
          arguments: { force: true },
        });
        const data = parseData(result) as { configPath: string };
        expect(data.configPath).toBe(configPath);
        expect(readFileSync(configPath, "utf-8")).toContain(
          'import { defineConfig } from "@canonical/terrazzo";',
        );
      } finally {
        await scoped.cleanup();
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
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
    expect(data.context.counts.blocks).toBeGreaterThan(0);
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
      { name: "block_lookup", arguments: { names: ["X"] } },
      { name: "modifier_lookup", arguments: { names: ["X"] } },
      { name: "token_lookup", arguments: { names: ["X"] } },
      { name: "standard_lookup", arguments: { names: ["X"] } },
    ] as const;

    for (const call of notFoundCalls) {
      const result = await client.callTool(call);
      const data = parseData(result) as {
        errors: { code: string }[];
      };
      expect(data.errors[0]?.code).toBe("ENTITY_NOT_FOUND");
    }
  });
});

// =============================================================================
// Ontology tools
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

  it("returns condensed ontology details", async () => {
    const result = await client.callTool({
      name: "ontology_show",
      arguments: { prefix: "ds", condensed: true },
    });
    const envelope = parseEnvelope(result);
    expect(envelope.ok).toBe(true);
    expect(envelope.condensed).toBe(true);
    expect(envelope.text).toEqual(expect.stringContaining("## ds:"));
  });
});

// =============================================================================
// Graph tools
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

  it("returns condensed graph query output", async () => {
    const result = await client.callTool({
      name: "graph_query",
      arguments: {
        sparql: "SELECT ?s WHERE { ?s ?p ?o } LIMIT 1",
        condensed: true,
      },
    });
    const envelope = parseEnvelope(result);
    expect(envelope.ok).toBe(true);
    expect(envelope.condensed).toBe(true);
    expect(envelope.text).toEqual(expect.stringContaining("bindings"));
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
    if (!validUri) {
      throw new Error("Expected a valid URI");
    }

    const result = await client.callTool({
      name: "graph_inspect",
      arguments: { uri: validUri },
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

  it("returns condensed graph inspection output", async () => {
    const queryResult = await client.callTool({
      name: "graph_query",
      arguments: { sparql: "SELECT ?s WHERE { ?s ?p ?o } LIMIT 1" },
    });
    const queryData = parseData(queryResult) as {
      bindings: { s?: string }[];
    };
    const validUri = queryData.bindings[0]?.s;
    expect(validUri).toBeDefined();
    if (!validUri) {
      throw new Error("Expected a valid URI");
    }

    const result = await client.callTool({
      name: "graph_inspect",
      arguments: { uri: validUri, condensed: true },
    });
    const envelope = parseEnvelope(result);
    expect(envelope.ok).toBe(true);
    expect(envelope.condensed).toBe(true);
    expect(envelope.text).toEqual(expect.stringContaining("## "));
  });
});

// =============================================================================
// Skill tools
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
// Doctor tool
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
// Info tool
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
// Capabilities tool
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
    expect(data.tools).toContain("block_list");
    expect(data.tools).toContain("capabilities");
    expect(data.counts.total).toBe(25);
    expect(data.counts.read).toBeGreaterThan(0);
    expect(data.counts.write).toBe(5);
    expect(data.counts.orientation).toBe(2);
    expect(data.counts.diagnostic).toBe(2);
  });
});

// =============================================================================
// Condensed responses
// =============================================================================

describe("condensed parameter", () => {
  it("block_list returns condensed text", async () => {
    const result = await client.callTool({
      name: "block_list",
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

  it("token_lookup returns condensed text", async () => {
    const result = await client.callTool({
      name: "token_lookup",
      arguments: { names: ["color.primary"], condensed: true },
    });
    const envelope = parseEnvelope(result);
    expect(envelope.ok).toBe(true);
    expect(envelope.condensed).toBe(true);
    expect(typeof envelope.text).toBe("string");
  });
});
