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
  listFormatters as modifierListFmt,
  lookupFormatters as modifierLookupFmt,
} from "../../domains/modifier/formatters/index.js";
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
import type { PragmaRuntime } from "../../domains/shared/runtime.js";
import {
  type StandardListOutput,
  categoriesFormatters as standardCatFmt,
  listFormatters as standardListFmt,
  lookupFormatters as standardLookupFmt,
} from "../../domains/standard/formatters/index.js";
import {
  listCategories,
  listStandards,
  lookupStandard,
} from "../../domains/standard/operations/index.js";
import { listFormatters as tierListFmt } from "../../domains/tier/formatters/index.js";
import { listTiers } from "../../domains/tier/operations/index.js";
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
    const opResult = opResults[0];
    const mcpRes = await client.callTool({
      name: "block_lookup",
      arguments: { names: ["Button"] },
    });
    const body = parseEnvelope(mcpRes);
    expect(body.data).toEqual({ results: [opResult], errors: [] });
  });

  it("block_lookup condensed: matches llm formatter", async () => {
    const opResult = await lookupBlock(rt.store, "Button", rt.config);
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

describe("standard parity", () => {
  it("standard_list: count and names match", async () => {
    const opResult = await listStandards(rt.store);
    const mcpRes = await client.callTool({
      name: "standard_list",
      arguments: {},
    });
    assertParity(opResult, mcpRes);
  });

  it("standard_list condensed: matches llm formatter", async () => {
    const opResult = await listStandards(rt.store);
    const output: StandardListOutput = {
      items: opResult,
      details: undefined,
      disclosure: { level: "summary" },
    };
    const expectedText = standardListFmt.llm(output);

    const mcpRes = await client.callTool({
      name: "standard_list",
      arguments: { condensed: true },
    });
    const body = parseCondensed(mcpRes);
    expect(body.text).toBe(expectedText);
  });

  it("standard_lookup: detailed fields match", async () => {
    const opResult = await lookupStandard(
      rt.store,
      "react/component/folder-structure",
    );
    const mcpRes = await client.callTool({
      name: "standard_lookup",
      arguments: { names: ["react/component/folder-structure"] },
    });
    const body = parseEnvelope(mcpRes);
    const data = body.data as { results: unknown[]; errors: unknown[] };
    expect(data.results[0]).toEqual(opResult);
    expect(data.errors).toEqual([]);
  });

  it("standard_lookup condensed: matches llm formatter", async () => {
    const opResult = await lookupStandard(
      rt.store,
      "react/component/folder-structure",
    );
    const expectedText = standardLookupFmt.llm({
      standard: opResult,
      detailed: true,
    });

    const mcpRes = await client.callTool({
      name: "standard_lookup",
      arguments: {
        names: ["react/component/folder-structure"],
        condensed: true,
      },
    });
    const body = parseCondensed(mcpRes);
    expect(body.text).toBe(expectedText);
  });

  it("standard_categories: data matches", async () => {
    const opResult = await listCategories(rt.store);
    const mcpRes = await client.callTool({
      name: "standard_categories",
      arguments: {},
    });
    assertParity(opResult, mcpRes);
  });

  it("standard_categories condensed: matches llm formatter", async () => {
    const opResult = await listCategories(rt.store);
    const expectedText = standardCatFmt.llm(opResult);

    const mcpRes = await client.callTool({
      name: "standard_categories",
      arguments: { condensed: true },
    });
    const body = parseCondensed(mcpRes);
    expect(body.text).toBe(expectedText);
  });
});

// ---------------------------------------------------------------------------
// Tier parity
// ---------------------------------------------------------------------------

describe("tier parity", () => {
  it("tier_list: paths and depths match", async () => {
    const opResult = await listTiers(rt.store);
    const mcpRes = await client.callTool({
      name: "tier_list",
      arguments: {},
    });
    assertParity(opResult, mcpRes);
  });

  it("tier_list condensed: matches llm formatter", async () => {
    const opResult = await listTiers(rt.store);
    const expectedText = tierListFmt.llm(opResult);

    const mcpRes = await client.callTool({
      name: "tier_list",
      arguments: { condensed: true },
    });
    const body = parseCondensed(mcpRes);
    expect(body.text).toBe(expectedText);
  });
});

// ---------------------------------------------------------------------------
// Modifier parity
// ---------------------------------------------------------------------------

describe("modifier parity", () => {
  it("modifier_list: families match", async () => {
    const opResult = await listModifiers(rt.store);
    const mcpRes = await client.callTool({
      name: "modifier_list",
      arguments: {},
    });
    assertParity(opResult, mcpRes);
  });

  it("modifier_list condensed: matches llm formatter", async () => {
    const opResult = await listModifiers(rt.store);
    const expectedText = modifierListFmt.llm([...opResult]);

    const mcpRes = await client.callTool({
      name: "modifier_list",
      arguments: { condensed: true },
    });
    const body = parseCondensed(mcpRes);
    expect(body.text).toBe(expectedText);
  });

  it("modifier_lookup: values match", async () => {
    const opResult = await lookupModifier(rt.store, "importance");
    const mcpRes = await client.callTool({
      name: "modifier_lookup",
      arguments: { names: ["importance"] },
    });
    const body = parseEnvelope(mcpRes);
    const data = body.data as { results: unknown[]; errors: unknown[] };
    expect(data.results[0]).toEqual(opResult);
  });

  it("modifier_lookup condensed: matches llm formatter", async () => {
    const opResult = await lookupModifier(rt.store, "importance");
    const expectedText = modifierLookupFmt.llm(opResult);

    const mcpRes = await client.callTool({
      name: "modifier_lookup",
      arguments: { names: ["importance"], condensed: true },
    });
    const body = parseCondensed(mcpRes);
    expect(body.text).toBe(expectedText);
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
  it("config_show: data matches resolveConfigShow", async () => {
    const install = detectInstallSource();
    const opResult = resolveConfigShow(rt.config, {
      packageManager: install.packageManager,
      installSource: install.label,
      configFilePath: "pragma.config.json",
      configFileExists: true,
    });

    const mcpRes = await client.callTool({
      name: "config_show",
      arguments: {},
    });
    const body = parseEnvelope(mcpRes);
    expect(body.data).toEqual(opResult);
  });

  it("config_show condensed: matches llm formatter", async () => {
    const install = detectInstallSource();
    const opResult = resolveConfigShow(rt.config, {
      packageManager: install.packageManager,
      installSource: install.label,
      configFilePath: "pragma.config.json",
      configFileExists: true,
    });
    const expectedText = configShowFmt.llm(opResult);

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
