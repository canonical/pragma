/**
 * Layer 3: CLI/MCP parity tests.
 *
 * Each test calls the same query through both the operation layer
 * (what CLI uses) and the MCP tool (what agents use), then asserts
 * data equality. Condensed-mode tests verify that the MCP condensed
 * text matches what the LLM formatter produces for the same data.
 */

import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
// ---- Shared utilities ----
import { readConfigLayers } from "#config";
import { VERSION } from "#constants";
import { detectInstallSource } from "#package-manager";
// ---- Formatters ----
import {
  listFormatters as blockListFmt,
  lookupFormatters as blockLookupFmt,
} from "../../domains/block/formatters/index.js";
// ---- Operations ----
import {
  listBlocks,
  lookupBlock,
} from "../../domains/block/operations/index.js";
import { showFormatters as configShowFmt } from "../../domains/config/formatters/index.js";
import { resolveConfigShow } from "../../domains/config/operations/index.js";
import { renderInfoLlm } from "../../domains/info/formatters/index.js";
import { collectStoreSummary } from "../../domains/info/operations/index.js";
import type { InfoData } from "../../domains/info/types.js";
import {
  listModifiers,
  lookupModifier,
} from "../../domains/modifier/operations/index.js";
import {
  listOntologies,
  showOntology,
} from "../../domains/ontology/operations/index.js";
import { CHANNEL_RELEASES } from "../../domains/shared/filters/buildChannelFilter.js";
import { resolveTierChain } from "../../domains/shared/filters/buildTierFilter.js";
import { listTiers } from "../../domains/shared/listTiers.js";
import type { PragmaRuntime } from "../../domains/shared/runtime.js";
import { listDomainNames } from "../../domains/shared/suggestions/index.js";
import {
  createLookupFormatters as createTokenLookupFmt,
  listFormatters as tokenListFmt,
} from "../../domains/token/formatters/index.js";
import {
  listTokens,
  lookupToken,
} from "../../domains/token/operations/index.js";

// ---- Test helpers ----
import assertParity from "../helpers/assertParity.js";
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

/** Parse condensed MCP response envelope. */
function parseCondensed(mcpResponse: Record<string, unknown>): {
  text: string;
  condensed: boolean;
  tokens: string;
} {
  const content = mcpResponse.content as unknown[];
  const first = content[0] as { text: string };
  return JSON.parse(first.text) as {
    text: string;
    condensed: boolean;
    tokens: string;
  };
}

/** Parse MCP response envelope. */
function parseEnvelope(
  mcpResponse: Record<string, unknown>,
): Record<string, unknown> {
  const content = mcpResponse.content as unknown[];
  const first = content[0] as { text: string };
  return JSON.parse(first.text) as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Block parity
// ---------------------------------------------------------------------------

describe("block parity", () => {
  it("block_list: operation matches MCP data", async () => {
    const opResult = await listBlocks(rt.store, rt.config);
    const mcpRes = await client.callTool({
      name: "block_list",
      arguments: {},
    });
    assertParity(opResult, mcpRes);
  });

  it("block_list condensed: matches llm formatter", async () => {
    const opResult = await listBlocks(rt.store, rt.config);
    const expectedText = blockListFmt.llm(opResult);

    const mcpRes = await client.callTool({
      name: "block_list",
      arguments: { condensed: true },
    });
    const body = parseCondensed(mcpRes);
    expect(body.text).toBe(expectedText);
  });

  it("block_lookup: detailed result matches", async () => {
    const opResults = await lookupBlock(rt.store, "Button", rt.config);
    expect(opResults.length).toBeGreaterThan(0);
    const opResult = opResults[0];
    const mcpRes = await client.callTool({
      name: "block_lookup",
      arguments: { names: ["Button"] },
    });
    const body = parseEnvelope(mcpRes);
    expect(body.data).toEqual({ results: [opResult], errors: [] });
  });

  it("block_lookup condensed: matches llm formatter", async () => {
    const opResults = await lookupBlock(rt.store, "Button", rt.config);
    expect(opResults.length).toBeGreaterThan(0);
    const opResult = opResults[0];
    const expectedText = blockLookupFmt.llm({
      block: opResult,
      detailed: true,
      aspects: {
        anatomy: true,
        modifiers: true,
        tokens: true,
        implementations: true,
      },
    });

    const mcpRes = await client.callTool({
      name: "block_lookup",
      arguments: { names: ["Button"], condensed: true },
    });
    const body = parseCondensed(mcpRes);
    expect(body.text).toBe(expectedText);
  });
});

// ---------------------------------------------------------------------------
// Standard parity
// ---------------------------------------------------------------------------

// `standard *` is now served by the bundled `standard` story pack (the
// hand-written domain was deleted). Pack rows/entities are uniform
// `Record<string,string>` projections with expand arrays, and rendering is
// the generic pack renderer — so these tests assert *semantic* parity
// against the store (every standard reachable, by the same names, with the
// same category/description/dos/donts values) rather than byte equality
// with the removed bespoke formatters. See PARITY_GAPS in #testing for the
// pinned, accepted divergences.
describe("standard parity (bundled pack)", () => {
  it("standard_list returns one {uri, name, category, description} row per standard", async () => {
    const allNames = await listDomainNames(rt.store, "standard");
    expect(allNames.length).toBeGreaterThan(0);

    const mcpRes = await client.callTool({
      name: "standard_list",
      arguments: {},
    });
    const body = parseEnvelope(mcpRes);
    expect(body.ok).toBe(true);
    const rows = body.data as {
      uri?: string;
      name?: string;
      category?: string;
      description?: string;
    }[];

    // Same standards, same names — nothing dropped or invented.
    const listed = new Set(rows.map((row) => row.name));
    for (const name of allNames) {
      expect(listed.has(name), `"${name}" missing from standard_list`).toBe(
        true,
      );
    }
    for (const row of rows) {
      expect(row.uri).toBeTruthy();
      expect(row.description).toBeTruthy();
    }
  });

  it("standard_list condensed lists every standard under the pack heading", async () => {
    const allNames = await listDomainNames(rt.store, "standard");
    const mcpRes = await client.callTool({
      name: "standard_list",
      arguments: { condensed: true },
    });
    const body = parseCondensed(mcpRes);
    expect(body.text).toContain("## Standard");
    for (const name of allNames) {
      expect(body.text).toContain(name);
    }
  });

  it("standard_lookup returns full detail by default (MCP full-data contract)", async () => {
    const mcpRes = await client.callTool({
      name: "standard_lookup",
      arguments: { names: ["react/component/folder-structure"] },
    });
    const body = parseEnvelope(mcpRes);
    const data = body.data as {
      results: {
        name: string;
        category: string;
        dos: { code?: string; language?: string }[];
        donts: { code?: string }[];
      }[];
      errors: unknown[];
    };
    expect(data.errors).toEqual([]);
    const entity = data.results[0];
    expect(entity?.name).toBe("react/component/folder-structure");
    expect(entity?.category).toBe("react");
    expect(entity?.dos.length).toBeGreaterThan(0);
    expect(entity?.dos.every((example) => example.code)).toBe(true);
    expect(entity?.donts.length).toBeGreaterThan(0);
  });

  it("standard_lookup condensed renders the entity with its code examples", async () => {
    const mcpRes = await client.callTool({
      name: "standard_lookup",
      arguments: {
        names: ["react/component/folder-structure"],
        condensed: true,
      },
    });
    const body = parseCondensed(mcpRes);
    expect(body.text).toContain("## react/component/folder-structure");
    expect(body.text).toContain("Do");
    expect(body.text).toContain("src/lib/Button/Button.tsx");
  });

  it("standard_categories counts agree with the standard list", async () => {
    const listRes = await client.callTool({
      name: "standard_list",
      arguments: {},
    });
    const rows = parseEnvelope(listRes).data as { category?: string }[];
    const expected = new Map<string, number>();
    for (const row of rows) {
      if (row.category) {
        expected.set(row.category, (expected.get(row.category) ?? 0) + 1);
      }
    }

    const mcpRes = await client.callTool({
      name: "standard_categories",
      arguments: {},
    });
    const body = parseEnvelope(mcpRes);
    expect(body.ok).toBe(true);
    const categories = body.data as { name: string; count: string }[];
    expect(categories.length).toBeGreaterThan(0);
    for (const [category, count] of expected) {
      const row = categories.find((entry) => entry.name === category);
      expect(row, `category "${category}" missing`).toBeDefined();
      expect(Number(row?.count)).toBe(count);
    }
  });
});

// ---------------------------------------------------------------------------
// Tier parity
// ---------------------------------------------------------------------------

// `tier list` / `tier_list` is now served by the bundled `tier` story pack
// (the hand-written domain was deleted). Pack rows are `Record<string,string>`
// projected from the SELECT, so the shape is intentionally uniform: `{uri,
// name}` with no always-zero `depth` field, and the llm renderer is the
// generic pack renderer. These tests assert *semantic* parity — every tier the
// shared operation sees is present, by the same names — rather than byte
// equality with the removed bespoke formatter.
describe("tier parity (bundled pack)", () => {
  it("tier_list returns one {uri, name} row per ontology tier", async () => {
    const opResult = await listTiers(rt.store);
    const mcpRes = await client.callTool({ name: "tier_list", arguments: {} });

    const content = mcpRes.content as { type: string; text: string }[];
    const envelope = JSON.parse(content[0].text) as {
      ok: boolean;
      data: Array<{ uri?: string; name?: string }>;
    };
    expect(envelope.ok).toBe(true);

    // Same tiers, same names — no tier dropped or invented by the cutover.
    // The shared op names the field `path`; the pack names it `name` (the
    // honest `ds:name` mapping) — the values are identical.
    expect(new Set(envelope.data.map((r) => r.name))).toEqual(
      new Set(opResult.map((t) => t.path)),
    );
    // Uniform pack shape: uri + name, no bespoke `depth` field.
    for (const row of envelope.data) {
      expect(row.uri).toBeTruthy();
      expect(row).not.toHaveProperty("depth");
    }
  });

  it("tier_list condensed lists every tier under a markdown heading", async () => {
    const opResult = await listTiers(rt.store);
    const mcpRes = await client.callTool({
      name: "tier_list",
      arguments: { condensed: true },
    });
    const body = parseCondensed(mcpRes);

    // The generic pack llm renderer headings by the capitalized noun: `## Tier`.
    expect(body.text).toContain("## Tier");
    for (const tier of opResult) {
      expect(body.text).toContain(tier.path);
    }
  });
});

// ---------------------------------------------------------------------------
// Modifier parity
// ---------------------------------------------------------------------------

describe("modifier parity (bundled pack)", () => {
  // `modifier list`/`modifier lookup` are served by the bundled `modifier`
  // story pack: the list is a declarative SELECT, the lookup rides the
  // GraphQL fetch path (`source: "graphql"`). These tests assert *semantic*
  // parity against the kept operations — every family and value the old
  // TS domain returned still comes back, in the uniform pack shape.
  it("modifier_list returns every family with its values", async () => {
    const opResult = await listModifiers(rt.store);
    const mcpRes = await client.callTool({
      name: "modifier_list",
      arguments: {},
    });
    const body = parseEnvelope(mcpRes);
    const rows = body.data as Array<{
      uri: string;
      name: string;
      values?: string;
    }>;

    // Same families — none dropped or invented by the cutover.
    expect(new Set(rows.map((row) => row.uri))).toEqual(
      new Set(opResult.map((family) => family.uri)),
    );
    // Same values per family (the pack GROUP_CONCATs them for display).
    for (const family of opResult) {
      const row = rows.find((entry) => entry.uri === family.uri);
      expect(row?.name).toBe(family.name);
      const packValues = (row?.values ?? "")
        .split(", ")
        .filter((value) => value !== "")
        .sort();
      expect(packValues).toEqual([...family.values].sort());
    }
  });

  it("modifier_list condensed lists every family under a markdown heading", async () => {
    const opResult = await listModifiers(rt.store);
    const mcpRes = await client.callTool({
      name: "modifier_list",
      arguments: { condensed: true },
    });
    const body = parseCondensed(mcpRes);
    expect(body.text).toContain("## Modifier");
    for (const family of opResult) {
      expect(body.text).toContain(family.name);
    }
  });

  it("modifier_lookup resolves a family with its values via GraphQL", async () => {
    const opResult = await lookupModifier(rt.store, "importance");
    const mcpRes = await client.callTool({
      name: "modifier_lookup",
      arguments: { names: ["importance"] },
    });
    const body = parseEnvelope(mcpRes);
    const data = body.data as {
      results: Array<{
        uri: string;
        name: string;
        values: Array<{ name: string }>;
      }>;
      errors: unknown[];
    };
    expect(data.errors).toEqual([]);
    const entity = data.results[0];

    // Same entity, same values — fetched through ONE GraphQL document
    // instead of the old per-name SPARQL, unwrapped to the flat pack shape.
    expect(entity?.uri).toBe(opResult.uri);
    expect(entity?.name).toBe(opResult.name);
    expect(entity?.values.map((value) => value.name).sort()).toEqual(
      [...opResult.values].sort(),
    );
  });

  it("modifier_lookup condensed renders name and values", async () => {
    const opResult = await lookupModifier(rt.store, "importance");
    const mcpRes = await client.callTool({
      name: "modifier_lookup",
      arguments: { names: ["importance"], condensed: true },
    });
    const body = parseCondensed(mcpRes);
    expect(body.text).toContain(`## ${opResult.name}`);
    for (const value of opResult.values) {
      expect(body.text).toContain(value);
    }
  });
});

// ---------------------------------------------------------------------------
// Token parity
// ---------------------------------------------------------------------------

describe("token parity", () => {
  it("token_list: count matches", async () => {
    const opResult = await listTokens(rt.store);
    const mcpRes = await client.callTool({
      name: "token_list",
      arguments: {},
    });
    assertParity(opResult, mcpRes);
  });

  it("token_list condensed: matches llm formatter", async () => {
    const opResult = await listTokens(rt.store);
    const expectedText = tokenListFmt.llm([...opResult]);

    const mcpRes = await client.callTool({
      name: "token_list",
      arguments: { condensed: true },
    });
    const body = parseCondensed(mcpRes);
    expect(body.text).toBe(expectedText);
  });

  it("token_lookup: values match", async () => {
    const opResult = await lookupToken(rt.store, "color.primary");
    const mcpRes = await client.callTool({
      name: "token_lookup",
      arguments: { names: ["color.primary"] },
    });
    const body = parseEnvelope(mcpRes);
    const data = body.data as { results: unknown[]; errors: unknown[] };
    expect(data.results[0]).toEqual(opResult);
  });

  it("token_lookup condensed: matches llm formatter", async () => {
    const opResult = await lookupToken(rt.store, "color.primary");
    const fmt = createTokenLookupFmt({ detailed: true });
    const expectedText = fmt.llm(opResult);

    const mcpRes = await client.callTool({
      name: "token_lookup",
      arguments: { names: ["color.primary"], condensed: true },
    });
    const body = parseCondensed(mcpRes);
    expect(body.text).toBe(expectedText);
  });
});

// ---------------------------------------------------------------------------
// Ontology parity
// ---------------------------------------------------------------------------

describe("ontology parity", () => {
  it("ontology_list: count matches", async () => {
    const opResult = await listOntologies(rt.store);
    const mcpRes = await client.callTool({
      name: "ontology_list",
      arguments: {},
    });
    assertParity(opResult, mcpRes);
  });

  it("ontology_list condensed: text contains ontology data", async () => {
    const mcpRes = await client.callTool({
      name: "ontology_list",
      arguments: { condensed: true },
    });
    const body = parseCondensed(mcpRes);
    expect(body.condensed).toBe(true);
    expect(body.text).toContain("Ontologies");
    expect(body.text).toContain("ds:");
  });

  it("ontology_show: data matches operation", async () => {
    const opResult = await showOntology(rt.store, "ds");
    const mcpRes = await client.callTool({
      name: "ontology_show",
      arguments: { prefix: "ds" },
    });
    const body = parseEnvelope(mcpRes);
    expect(body.data).toEqual(opResult);
  });

  it("ontology_show condensed: text contains schema data", async () => {
    const mcpRes = await client.callTool({
      name: "ontology_show",
      arguments: { prefix: "ds", condensed: true },
    });
    const body = parseCondensed(mcpRes);
    expect(body.condensed).toBe(true);
    expect(body.text).toContain("ds:");
    expect(body.text).toContain("Classes");
  });
});

// ---------------------------------------------------------------------------
// Config parity
// ---------------------------------------------------------------------------

describe("config parity", () => {
  // Both surfaces resolve from the filesystem via the shared config show
  // story, so parity is asserted against the real config path/existence
  // (the MCP tool previously hardcoded "pragma.config.json" / true).
  function resolveExpectedConfigShow() {
    const layers = readConfigLayers(rt.cwd);
    const install = detectInstallSource();
    return resolveConfigShow(layers.config, {
      packageManager: install.packageManager,
      installSource: install.label,
      configFilePath: layers.project.path,
      configFileExists: layers.project.exists,
      globalConfigPath: layers.global.path,
      globalConfigExists: layers.global.exists,
      origins: layers.origins,
    });
  }

  it("config_show: data matches resolveConfigShow", async () => {
    const opResult = resolveExpectedConfigShow();

    const mcpRes = await client.callTool({
      name: "config_show",
      arguments: {},
    });
    const body = parseEnvelope(mcpRes);
    expect(body.data).toEqual(opResult);
  });

  it("config_show condensed: matches llm formatter", async () => {
    const expectedText = configShowFmt.llm(resolveExpectedConfigShow());

    const mcpRes = await client.callTool({
      name: "config_show",
      arguments: { condensed: true },
    });
    const body = parseCondensed(mcpRes);
    expect(body.text).toBe(expectedText);
  });
});

// ---------------------------------------------------------------------------
// Info parity
// ---------------------------------------------------------------------------

describe("info parity", () => {
  it("info: data matches shared operations", async () => {
    const install = detectInstallSource();
    const tierChain =
      rt.config.tier !== undefined ? resolveTierChain(rt.config.tier) : [];
    const channelReleases = CHANNEL_RELEASES[rt.config.channel];
    const storeSummary = await collectStoreSummary(rt.store);

    const expected: InfoData = {
      version: VERSION,
      pm: install.packageManager,
      installSource: install.label,
      configPath: "pragma.config.json",
      tier: rt.config.tier,
      tierChain,
      channel: rt.config.channel,
      channelReleases: [...channelReleases],
      update: undefined,
      updateSkipped: true,
      store: storeSummary,
    };

    const mcpRes = await client.callTool({
      name: "info",
      arguments: {},
    });
    const body = parseEnvelope(mcpRes);
    expect(body.data).toEqual(expected);
  });

  it("info condensed: matches llm formatter", async () => {
    const install = detectInstallSource();
    const tierChain =
      rt.config.tier !== undefined ? resolveTierChain(rt.config.tier) : [];
    const channelReleases = CHANNEL_RELEASES[rt.config.channel];
    const storeSummary = await collectStoreSummary(rt.store);

    const data: InfoData = {
      version: VERSION,
      pm: install.packageManager,
      installSource: install.label,
      configPath: "pragma.config.json",
      tier: rt.config.tier,
      tierChain,
      channel: rt.config.channel,
      channelReleases: [...channelReleases],
      update: undefined,
      updateSkipped: true,
      store: storeSummary,
    };
    const expectedText = renderInfoLlm(data);

    const mcpRes = await client.callTool({
      name: "info",
      arguments: { condensed: true },
    });
    const body = parseCondensed(mcpRes);
    expect(body.text).toBe(expectedText);
  });
});
