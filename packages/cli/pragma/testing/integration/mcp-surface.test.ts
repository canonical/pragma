/**
 * Layer 2: MCP Surface tests.
 *
 * One test per registered tool. Each validates: callable with valid args,
 * correct success envelope shape, correct error shape where applicable,
 * and condensed mode where applicable.
 *
 * @see F.09 IT.04
 */

import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PragmaRuntime } from "../../src/domains/shared/runtime.js";
import { createTestMcpClient } from "../helpers/mcp.js";
import { createTestRuntime } from "../helpers/runtime.js";

let rt: PragmaRuntime;
let client: Client;
let cleanup: () => Promise<void>;

beforeAll(async () => {
  rt = await createTestRuntime();
  const mcp = await createTestMcpClient(rt);
  client = mcp.client;
  cleanup = mcp.cleanup;
});

afterAll(async () => {
  await cleanup();
  rt.dispose();
});

function parseEnvelope(
  result: Record<string, unknown>,
): Record<string, unknown> {
  const content = result.content as unknown[];
  const first = content[0] as { type: string; text: string };
  return JSON.parse(first.text) as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Capabilities & orientation
// ---------------------------------------------------------------------------

describe("capabilities", () => {
  it("returns tool list with counts", async () => {
    const res = await client.callTool({ name: "capabilities", arguments: {} });
    const body = parseEnvelope(res);
    expect(body.ok).toBe(true);
    const data = body.data as {
      tools: string[];
      counts: Record<string, number>;
    };
    expect(data.tools).toContain("component_list");
    expect(data.tools).toContain("capabilities");
    expect(data.counts.total).toBe(22);
  });
});

describe("llm", () => {
  it("returns orientation with decision trees", async () => {
    const res = await client.callTool({ name: "llm", arguments: {} });
    const body = parseEnvelope(res);
    expect(body.ok).toBe(true);
    const data = body.data as {
      decisionTrees: unknown[];
      commandReference: unknown[];
    };
    expect(data.decisionTrees.length).toBeGreaterThan(0);
    expect(data.commandReference.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

describe("component_list", () => {
  it("returns envelope with data and meta.count", async () => {
    const res = await client.callTool({
      name: "component_list",
      arguments: {},
    });
    const body = parseEnvelope(res);
    expect(body.ok).toBe(true);
    const data = body.data as unknown[];
    const meta = body.meta as { count: number };
    expect(data.length).toBeGreaterThan(0);
    expect(meta.count).toBe(data.length);
  });

  it("condensed returns markdown text", async () => {
    const res = await client.callTool({
      name: "component_list",
      arguments: { condensed: true },
    });
    const body = parseEnvelope(res);
    expect(body.ok).toBe(true);
    expect(body.condensed).toBe(true);
    expect(typeof body.text).toBe("string");
    expect(typeof body.tokens).toBe("string");
  });
});

describe("component_get", () => {
  it("returns detailed component", async () => {
    const res = await client.callTool({
      name: "component_get",
      arguments: { name: "Button" },
    });
    const body = parseEnvelope(res);
    expect(body.ok).toBe(true);
    const data = body.data as Record<string, unknown>;
    expect(data.name).toBe("Button");
    expect(data).toHaveProperty("modifierValues");
  });

  it("returns structured error for unknown component", async () => {
    const res = await client.callTool({
      name: "component_get",
      arguments: { name: "Nonexistent" },
    });
    const body = parseEnvelope(res);
    expect(body.ok).toBe(false);
    const error = body.error as Record<string, unknown>;
    expect(error.code).toBe("ENTITY_NOT_FOUND");
    expect(error.recovery).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Standard
// ---------------------------------------------------------------------------

describe("standard_list", () => {
  it("returns standards", async () => {
    const res = await client.callTool({
      name: "standard_list",
      arguments: {},
    });
    const body = parseEnvelope(res);
    expect(body.ok).toBe(true);
    expect((body.data as unknown[]).length).toBeGreaterThan(0);
  });
});

describe("standard_get", () => {
  it("returns detailed standard with dos/donts", async () => {
    const res = await client.callTool({
      name: "standard_get",
      arguments: { name: "react/component/folder-structure" },
    });
    const body = parseEnvelope(res);
    expect(body.ok).toBe(true);
    const data = body.data as Record<string, unknown>;
    expect(data).toHaveProperty("dos");
    expect(data).toHaveProperty("donts");
  });
});

describe("standard_categories", () => {
  it("returns categories", async () => {
    const res = await client.callTool({
      name: "standard_categories",
      arguments: {},
    });
    const body = parseEnvelope(res);
    expect(body.ok).toBe(true);
    expect((body.data as unknown[]).length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Modifier
// ---------------------------------------------------------------------------

describe("modifier_list", () => {
  it("returns modifier families", async () => {
    const res = await client.callTool({
      name: "modifier_list",
      arguments: {},
    });
    const body = parseEnvelope(res);
    expect(body.ok).toBe(true);
    const data = body.data as { name: string }[];
    expect(data.some((m) => m.name === "importance")).toBe(true);
  });
});

describe("modifier_get", () => {
  it("returns modifier with values", async () => {
    const res = await client.callTool({
      name: "modifier_get",
      arguments: { name: "importance" },
    });
    const body = parseEnvelope(res);
    expect(body.ok).toBe(true);
    const data = body.data as { values: string[] };
    expect(data.values).toContain("primary");
  });
});

// ---------------------------------------------------------------------------
// Token
// ---------------------------------------------------------------------------

describe("token_list", () => {
  it("returns tokens", async () => {
    const res = await client.callTool({
      name: "token_list",
      arguments: {},
    });
    const body = parseEnvelope(res);
    expect(body.ok).toBe(true);
    expect((body.data as unknown[]).length).toBeGreaterThan(0);
  });
});

describe("token_get", () => {
  it("returns token with values", async () => {
    const res = await client.callTool({
      name: "token_get",
      arguments: { name: "color.primary" },
    });
    const body = parseEnvelope(res);
    expect(body.ok).toBe(true);
    const data = body.data as { name: string; values: unknown[] };
    expect(data.name).toBe("color.primary");
    expect(data.values.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Tier
// ---------------------------------------------------------------------------

describe("tier_list", () => {
  it("returns tiers with hierarchy", async () => {
    const res = await client.callTool({
      name: "tier_list",
      arguments: {},
    });
    const body = parseEnvelope(res);
    expect(body.ok).toBe(true);
    const data = body.data as { path: string }[];
    expect(data.some((t) => t.path === "global")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

describe("config_show", () => {
  it("returns config", async () => {
    const res = await client.callTool({
      name: "config_show",
      arguments: {},
    });
    const body = parseEnvelope(res);
    expect(body.ok).toBe(true);
    const data = body.data as { channel: string };
    expect(data.channel).toBe("normal");
  });
});

// ---------------------------------------------------------------------------
// Ontology
// ---------------------------------------------------------------------------

describe("ontology_list", () => {
  it("returns ontologies", async () => {
    const res = await client.callTool({
      name: "ontology_list",
      arguments: {},
    });
    const body = parseEnvelope(res);
    expect(body.ok).toBe(true);
    expect((body.data as unknown[]).length).toBeGreaterThan(0);
  });
});

describe("ontology_show", () => {
  it("returns ontology details", async () => {
    const res = await client.callTool({
      name: "ontology_show",
      arguments: { prefix: "ds" },
    });
    const body = parseEnvelope(res);
    expect(body.ok).toBe(true);
    const data = body.data as { classes: unknown[]; properties: unknown[] };
    expect(data.classes.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Graph
// ---------------------------------------------------------------------------

describe("graph_query", () => {
  it("executes SPARQL and returns bindings", async () => {
    const res = await client.callTool({
      name: "graph_query",
      arguments: {
        sparql: "SELECT (COUNT(*) AS ?n) WHERE { ?s ?p ?o }",
      },
    });
    const body = parseEnvelope(res);
    expect(body.ok).toBe(true);
    const data = body.data as { bindings: { n?: string }[] };
    expect(Number(data.bindings[0]?.n)).toBeGreaterThan(0);
  });

  it("returns error for invalid SPARQL", async () => {
    const res = await client.callTool({
      name: "graph_query",
      arguments: { sparql: "NOT VALID" },
    });
    expect(res.isError).toBe(true);
  });
});

describe("graph_inspect", () => {
  it("inspects a valid URI", async () => {
    // Get a valid URI from the graph first
    const q = await client.callTool({
      name: "graph_query",
      arguments: { sparql: "SELECT ?s WHERE { ?s ?p ?o } LIMIT 1" },
    });
    const qBody = parseEnvelope(q);
    const uri = (qBody.data as { bindings: { s?: string }[] }).bindings[0]?.s;

    const res = await client.callTool({
      name: "graph_inspect",
      arguments: { uri: uri! },
    });
    const body = parseEnvelope(res);
    expect(body.ok).toBe(true);
    const data = body.data as { groups: unknown[] };
    expect(data.groups.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Skill
// ---------------------------------------------------------------------------

describe("skill_list", () => {
  it("returns skills structure", async () => {
    const res = await client.callTool({
      name: "skill_list",
      arguments: {},
    });
    const body = parseEnvelope(res);
    expect(body.ok).toBe(true);
    const data = body.data as { skills: unknown[]; sources: unknown[] };
    expect(data).toHaveProperty("skills");
    expect(data).toHaveProperty("sources");
  });
});

// ---------------------------------------------------------------------------
// Doctor
// ---------------------------------------------------------------------------

describe("doctor", () => {
  it("returns health check results", async () => {
    const res = await client.callTool({
      name: "doctor",
      arguments: {},
    });
    const body = parseEnvelope(res);
    expect(body.ok).toBe(true);
    const data = body.data as { checks: unknown[]; passed: number };
    expect(data.checks.length).toBeGreaterThan(0);
    expect(typeof data.passed).toBe("number");
  });
});

// ---------------------------------------------------------------------------
// Info
// ---------------------------------------------------------------------------

describe("info", () => {
  it("returns pragma info with store stats", async () => {
    const res = await client.callTool({
      name: "info",
      arguments: {},
    });
    const body = parseEnvelope(res);
    expect(body.ok).toBe(true);
    const data = body.data as {
      version: string;
      store: { tripleCount: number } | null;
    };
    expect(data.version).toBeDefined();
    expect(data.store?.tripleCount).toBeGreaterThan(0);
  });
});
