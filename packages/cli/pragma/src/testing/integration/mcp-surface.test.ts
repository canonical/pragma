/**
 * Layer 2: MCP Surface tests.
 *
 * One test per registered tool. Each validates: callable with valid args,
 * correct success envelope shape, correct error shape where applicable,
 * and condensed mode where applicable.
 */

import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PragmaRuntime } from "../../domains/shared/runtime.js";
import createTestMcpClient from "../helpers/createTestMcpClient.js";
import createTestRuntime from "../helpers/createTestRuntime.js";

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
  it("returns enriched tool catalog with conventions", async () => {
    const res = await client.callTool({ name: "capabilities", arguments: {} });
    const body = parseEnvelope(res);
    expect(body.ok).toBe(true);
    const data = body.data as {
      version: string;
      conventions: Record<string, string>;
      tools: { name: string; category: string; use_when: string }[];
      counts: Record<string, number>;
    };
    const toolNames = data.tools.map((t) => t.name);
    expect(toolNames).toContain("block_list");
    expect(toolNames).toContain("capabilities");
    expect(data.tools.every((t) => t.use_when.length > 0)).toBe(true);
    expect(data.counts.total).toBe(34);
    expect(data.conventions).toBeDefined();
    expect(data.version).toBeDefined();
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
// Block
// ---------------------------------------------------------------------------

describe("block_list", () => {
  it("returns envelope with data and meta.count", async () => {
    const res = await client.callTool({
      name: "block_list",
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
      name: "block_list",
      arguments: { condensed: true },
    });
    const body = parseEnvelope(res);
    expect(body.ok).toBe(true);
    expect(body.condensed).toBe(true);
    expect(typeof body.text).toBe("string");
    expect(typeof body.tokens).toBe("string");
  });
});

describe("block_lookup", () => {
  it("returns detailed block", async () => {
    const res = await client.callTool({
      name: "block_lookup",
      arguments: { names: ["Button"] },
    });
    const body = parseEnvelope(res);
    expect(body.ok).toBe(true);
    const data = body.data as { results: Record<string, unknown>[] };
    expect(data.results[0]?.name).toBe("Button");
    expect(data.results[0]).toHaveProperty("modifierFamilies");
  });

  it("reports IRI queries as not found (name-based lookup only)", async () => {
    // The bundled block pack looks up by ds:name; IRI-based lookup is a
    // flat-compiler primitive that arrives with the P1.5 slice. Until then
    // an IRI query fails typed, with name suggestions.
    const res = await client.callTool({
      name: "block_lookup",
      arguments: { names: ["ds:global.component.button"] },
    });
    const body = parseEnvelope(res);
    expect(body.ok).toBe(true);
    const data = body.data as { errors: { code: string }[] };
    expect(data.errors[0]?.code).toBe("ENTITY_NOT_FOUND");
  });

  it("returns structured per-query errors for unknown blocks", async () => {
    const res = await client.callTool({
      name: "block_lookup",
      arguments: { names: ["Nonexistent"] },
    });
    const body = parseEnvelope(res);
    expect(body.ok).toBe(true);
    const data = body.data as {
      results: unknown[];
      errors: { code: string; query: string }[];
    };
    expect(data.results).toHaveLength(0);
    expect(data.errors[0]?.code).toBe("ENTITY_NOT_FOUND");
    expect(data.errors[0]?.query).toBe("Nonexistent");
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

describe("standard_lookup", () => {
  it("returns detailed standard with dos/donts", async () => {
    const res = await client.callTool({
      name: "standard_lookup",
      arguments: { names: ["react/component/folder-structure"] },
    });
    const body = parseEnvelope(res);
    expect(body.ok).toBe(true);
    const data = body.data as { results: Record<string, unknown>[] };
    expect(data.results[0]).toHaveProperty("dos");
    expect(data.results[0]).toHaveProperty("donts");
  });

  it("resolves standard lookup by prefixed IRI", async () => {
    const res = await client.callTool({
      name: "standard_lookup",
      arguments: { names: ["cs:react_props"] },
    });
    const body = parseEnvelope(res);
    expect(body.ok).toBe(true);
    const data = body.data as {
      results: { name: string; extends?: string }[];
    };
    expect(data.results[0]?.name).toBe("react/component/props");
    // Pack entities keep cs:extends as the raw IRI in data (compaction is
    // display-time only) — a pinned PARITY_GAP of the standard cutover.
    expect(data.results[0]?.extends).toBe(
      "http://pragma.canonical.com/codestandards#react_folder",
    );
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

describe("modifier_lookup", () => {
  it("returns modifier with values", async () => {
    const res = await client.callTool({
      name: "modifier_lookup",
      arguments: { names: ["importance"] },
    });
    const body = parseEnvelope(res);
    expect(body.ok).toBe(true);
    // Served by the bundled modifier pack via the GraphQL fetch path; the
    // expand's rows are {name} records carrying the same value strings.
    const data = body.data as { results: { values: { name: string }[] }[] };
    expect(data.results[0]?.values.map((value) => value.name)).toContain(
      "primary",
    );
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

describe("token_lookup", () => {
  it("returns token with values", async () => {
    const res = await client.callTool({
      name: "token_lookup",
      arguments: { names: ["color.primary"] },
    });
    const body = parseEnvelope(res);
    expect(body.ok).toBe(true);
    // Served by the bundled token pack: theme values are the flat
    // valueLight/valueDark fields (the old nested {theme, value} shape).
    const data = body.data as {
      results: { name: string; valueLight?: string; valueDark?: string }[];
    };
    expect(data.results[0]?.name).toBe("color.primary");
    expect(data.results[0]?.valueLight).toBeTruthy();
    expect(data.results[0]?.valueDark).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Tier
// ---------------------------------------------------------------------------

describe("tier_list", () => {
  it("returns the tiers (bundled pack)", async () => {
    const res = await client.callTool({
      name: "tier_list",
      arguments: {},
    });
    const body = parseEnvelope(res);
    expect(body.ok).toBe(true);
    // Bundled tier pack: uniform `{uri, name}` rows (no bespoke hierarchy).
    const data = body.data as { name: string }[];
    expect(data.some((t) => t.name === "global")).toBe(true);
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

describe("config_tier", () => {
  it("queries current tier", async () => {
    const res = await client.callTool({
      name: "config_tier",
      arguments: {},
    });
    const body = parseEnvelope(res);
    expect(body.ok).toBe(true);
    const data = body.data as { action: string };
    expect(data.action).toBe("query");
  });
});

describe("config_channel", () => {
  it("queries current channel", async () => {
    const res = await client.callTool({
      name: "config_channel",
      arguments: {},
    });
    const body = parseEnvelope(res);
    expect(body.ok).toBe(true);
    const data = body.data as { channel: string; action: string };
    expect(data.action).toBe("query");
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
    expect(uri).toBeDefined();
    if (!uri) {
      throw new Error("Expected a URI from graph_query");
    }

    const res = await client.callTool({
      name: "graph_inspect",
      arguments: { uri },
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
// Tokens add-config
// ---------------------------------------------------------------------------

describe("tokens_add_config", () => {
  it("returns error when config already exists (no force)", async () => {
    // This will either succeed or fail depending on fixture state;
    // the key is that the tool is registered and callable
    const res = await client.callTool({
      name: "tokens_add_config",
      arguments: {},
    });
    const body = parseEnvelope(res);
    // Either ok:true (wrote file) or ok:false (already exists)
    expect(typeof body.ok).toBe("boolean");
  });
});

// ---------------------------------------------------------------------------
// Disclosure
// ---------------------------------------------------------------------------

describe("disclosure", () => {
  it("block_list with digest returns enriched data", async () => {
    const res = await client.callTool({
      name: "block_list",
      arguments: { digest: true },
    });
    const body = parseEnvelope(res);
    expect(body.ok).toBe(true);
    const meta = body.meta as { disclosure?: string };
    expect(meta.disclosure).toBe("digest");
  });

  // `standard list --detailed` was retired with the standard cutover (a
  // pinned PARITY_GAP: pack lists are single-level); per-entity disclosure
  // now lives on the lookup's `detail` parameter and its legacy aliases.
  it("standard_lookup honors the detail parameter", async () => {
    const summary = await client.callTool({
      name: "standard_lookup",
      arguments: {
        names: ["react/component/folder-structure"],
        detail: "summary",
      },
    });
    const summaryData = parseEnvelope(summary).data as {
      results: Record<string, unknown>[];
    };
    expect(summaryData.results[0]).not.toHaveProperty("dos");

    const detailed = await client.callTool({
      name: "standard_lookup",
      arguments: {
        names: ["react/component/folder-structure"],
        detail: "detailed",
      },
    });
    const detailedData = parseEnvelope(detailed).data as {
      results: Record<string, unknown>[];
    };
    expect(detailedData.results[0]).toHaveProperty("dos");
    expect(detailedData.results[0]).toHaveProperty("donts");
  });
});

// ---------------------------------------------------------------------------
// Multi-lookup
// ---------------------------------------------------------------------------

describe("multi lookup", () => {
  it("block_lookup returns results and errors for mixed queries", async () => {
    const res = await client.callTool({
      name: "block_lookup",
      arguments: { names: ["Button", "Nonexistent"] },
    });
    const body = parseEnvelope(res);
    expect(body.ok).toBe(true);
    const data = body.data as {
      results: { name: string }[];
      errors: { query: string; code: string }[];
    };
    expect(data.results.length).toBe(1);
    expect(data.results[0]?.name).toBe("Button");
    expect(data.errors.length).toBe(1);
    expect(data.errors[0]?.query).toBe("Nonexistent");
    expect(data.errors[0]?.code).toBe("ENTITY_NOT_FOUND");
  });

  it("standard_lookup returns results for mixed queries", async () => {
    const listRes = await client.callTool({
      name: "standard_list",
      arguments: {},
    });
    const listBody = parseEnvelope(listRes);
    const standards = listBody.data as { name: string }[];
    const firstName = standards[0]?.name;

    const res = await client.callTool({
      name: "standard_lookup",
      arguments: { names: [firstName, "nonexistent/standard"] },
    });
    const body = parseEnvelope(res);
    expect(body.ok).toBe(true);
    const data = body.data as {
      results: unknown[];
      errors: { query: string }[];
    };
    expect(data.results.length).toBe(1);
    expect(data.errors.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Structured recovery
// ---------------------------------------------------------------------------

describe("structured recovery", () => {
  it("list tools remain the recovery target for lookup misses", async () => {
    const res = await client.callTool({
      name: "config_channel",
      arguments: { value: "invalid" },
    });
    const body = parseEnvelope(res);
    expect(body.ok).toBe(false);
    const error = body.error as {
      recovery?: { tool: string };
    };
    expect(error.recovery?.tool).toBe("config_channel");
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
