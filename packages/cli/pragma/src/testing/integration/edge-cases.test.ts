/**
 * Layer 3b: Edge-case and error-path tests.
 *
 * Covers error conditions that are not exercised by the happy-path
 * parity tests or the basic MCP surface tests: unknown prefixes,
 * all-fail batches, empty result sets, and condensed-mode error
 * rendering.
 */

import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PragmaRuntime } from "../../domains/shared/runtime.js";
import { TOKEN_READ_SURFACE_ENABLED } from "../../domains/token/featureFlag.js";
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

/** Parse MCP response envelope. */
function parseEnvelope(
  mcpResponse: Record<string, unknown>,
): Record<string, unknown> {
  const content = mcpResponse.content as unknown[];
  const first = content[0] as { text: string };
  return JSON.parse(first.text) as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Unknown prefix IRI resolution
// ---------------------------------------------------------------------------

describe("IRI resolution edge cases", () => {
  it("block_lookup with unknown prefix returns error", async () => {
    const res = await client.callTool({
      name: "block_lookup",
      arguments: { names: ["zz:nonexistent.block"] },
    });
    const body = parseEnvelope(res);
    expect(body.ok).toBe(true);
    const data = body.data as { results: unknown[]; errors: unknown[] };
    expect(data.results).toHaveLength(0);
    expect(data.errors).toHaveLength(1);
  });

  it("standard_lookup with unknown prefix returns error", async () => {
    const res = await client.callTool({
      name: "standard_lookup",
      arguments: { names: ["zz:nonexistent.standard"] },
    });
    const body = parseEnvelope(res);
    expect(body.ok).toBe(true);
    const data = body.data as { results: unknown[]; errors: unknown[] };
    expect(data.results).toHaveLength(0);
    expect(data.errors).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// All-fail batch lookups
// ---------------------------------------------------------------------------

describe("all-fail batch lookups", () => {
  it("block_lookup: all names unknown → empty results, all errors", async () => {
    const res = await client.callTool({
      name: "block_lookup",
      arguments: { names: ["Unknown1", "Unknown2", "Unknown3"] },
    });
    const body = parseEnvelope(res);
    expect(body.ok).toBe(true);
    const data = body.data as {
      results: unknown[];
      errors: { query: string; code: string }[];
    };
    expect(data.results).toHaveLength(0);
    expect(data.errors).toHaveLength(3);
    for (const err of data.errors) {
      expect(err.code).toBe("ENTITY_NOT_FOUND");
    }
  });

  it("standard_lookup: all names unknown → empty results, all errors", async () => {
    const res = await client.callTool({
      name: "standard_lookup",
      arguments: { names: ["no/such/standard", "also/missing"] },
    });
    const body = parseEnvelope(res);
    expect(body.ok).toBe(true);
    const data = body.data as {
      results: unknown[];
      errors: { query: string }[];
    };
    expect(data.results).toHaveLength(0);
    expect(data.errors).toHaveLength(2);
  });

  it("modifier_lookup: unknown family → error", async () => {
    const res = await client.callTool({
      name: "modifier_lookup",
      arguments: { names: ["nonexistent_family"] },
    });
    const body = parseEnvelope(res);
    expect(body.ok).toBe(true);
    const data = body.data as {
      results: unknown[];
      errors: { query: string; code: string }[];
    };
    expect(data.results).toHaveLength(0);
    expect(data.errors).toHaveLength(1);
    expect(data.errors[0]?.code).toBe("ENTITY_NOT_FOUND");
  });

  it.skipIf(!TOKEN_READ_SURFACE_ENABLED)(
    "token_lookup: unknown token → error",
    async () => {
      const res = await client.callTool({
        name: "token_lookup",
        arguments: { names: ["color.nonexistent"] },
      });
      const body = parseEnvelope(res);
      expect(body.ok).toBe(true);
      const data = body.data as {
        results: unknown[];
        errors: { query: string; code: string }[];
      };
      expect(data.results).toHaveLength(0);
      expect(data.errors).toHaveLength(1);
      expect(data.errors[0]?.code).toBe("ENTITY_NOT_FOUND");
    },
  );
});

// ---------------------------------------------------------------------------
// Empty result sets (filtered lists)
// ---------------------------------------------------------------------------

describe("empty result sets", () => {
  it("standard_list with nonexistent category → empty rows", async () => {
    const res = await client.callTool({
      name: "standard_list",
      arguments: { category: "nonexistent_category" },
    });
    const body = parseEnvelope(res);
    // The bundled pack's value-free category filter returns zero rows for
    // an unmatched value; the old EMPTY_RESULTS error is a pinned
    // PARITY_GAP of the standard cutover (packs have no emptyError hook).
    expect(body.ok).toBe(true);
    expect(body.data).toEqual([]);
    expect((body.meta as { count: number }).count).toBe(0);
  });

  it.skipIf(!TOKEN_READ_SURFACE_ENABLED)(
    "token_list ignores the retired free-string category parameter",
    async () => {
      // The bundled token pack dropped the old `--category` free-string
      // filter (pack filters are closed enums, and the live graph has no
      // token-type vocabulary to enumerate). The MCP layer tolerates unknown
      // parameters, so the listing simply comes back unfiltered.
      const res = await client.callTool({
        name: "token_list",
        arguments: { category: "NonexistentType" },
      });
      const body = parseEnvelope(res);
      expect(body.ok).toBe(true);
      expect((body.data as unknown[]).length).toBeGreaterThan(0);
    },
  );
});

// ---------------------------------------------------------------------------
// ontology_show with unknown prefix
// ---------------------------------------------------------------------------

describe("ontology_show edge cases", () => {
  it("unknown prefix → error envelope", async () => {
    const res = await client.callTool({
      name: "ontology_show",
      arguments: { prefix: "zzz" },
    });
    const body = parseEnvelope(res);
    expect(body.ok).toBe(false);
    const error = body.error as { code: string };
    expect(error.code).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Condensed mode with errors
// ---------------------------------------------------------------------------

describe("condensed mode error rendering", () => {
  it("block_lookup condensed: includes error section for unknown blocks", async () => {
    const res = await client.callTool({
      name: "block_lookup",
      arguments: {
        names: ["Button", "Nonexistent"],
        condensed: true,
      },
    });
    const body = parseEnvelope(res);
    expect(body.condensed).toBe(true);
    const text = body.text as string;
    // Should contain the successful block
    expect(text).toContain("Button");
    // Should contain the errors section
    expect(text).toContain("Errors");
    expect(text).toContain("Nonexistent");
  });

  it("standard_lookup condensed: includes error section for unknown standards", async () => {
    const res = await client.callTool({
      name: "standard_lookup",
      arguments: {
        names: ["react/component/folder-structure", "no/such/standard"],
        condensed: true,
      },
    });
    const body = parseEnvelope(res);
    expect(body.condensed).toBe(true);
    const text = body.text as string;
    expect(text).toContain("folder-structure");
    expect(text).toContain("Errors");
    expect(text).toContain("no/such/standard");
  });

  it("modifier_lookup condensed: includes error for unknown family", async () => {
    const res = await client.callTool({
      name: "modifier_lookup",
      arguments: {
        names: ["importance", "nonexistent"],
        condensed: true,
      },
    });
    const body = parseEnvelope(res);
    expect(body.condensed).toBe(true);
    const text = body.text as string;
    expect(text).toContain("importance");
    expect(text).toContain("Errors");
    expect(text).toContain("nonexistent");
  });

  it.skipIf(!TOKEN_READ_SURFACE_ENABLED)(
    "token_lookup condensed: includes error for unknown token",
    async () => {
      const res = await client.callTool({
        name: "token_lookup",
        arguments: {
          names: ["color.primary", "color.nonexistent"],
          condensed: true,
        },
      });
      const body = parseEnvelope(res);
      expect(body.condensed).toBe(true);
      const text = body.text as string;
      expect(text).toContain("color.primary");
      expect(text).toContain("Errors");
      expect(text).toContain("color.nonexistent");
    },
  );
});
