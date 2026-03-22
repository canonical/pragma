/**
 * Layer 3: CLI/MCP parity tests.
 *
 * Each test calls the same query through both the operation layer
 * (what CLI uses) and the MCP tool (what agents use), then asserts
 * data equality. CI-blocking per OD.08.
 *
 * @see F.09 IT.05, F.06 RS.05
 */

import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { listFormatters as componentListFmt } from "../../domains/component/formatters/index.js";
import {
  getComponent,
  listComponents,
} from "../../domains/component/operations/index.js";
import {
  getModifier,
  listModifiers,
} from "../../domains/modifier/operations/index.js";
import { listOntologies } from "../../domains/ontology/operations/index.js";
import type { PragmaRuntime } from "../../domains/shared/runtime.js";
import { listStandards } from "../../domains/standard/operations/index.js";
import { listTiers } from "../../domains/tier/operations/index.js";
import { getToken, listTokens } from "../../domains/token/operations/index.js";
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

// ---------------------------------------------------------------------------
// Component parity
// ---------------------------------------------------------------------------

describe("component parity", () => {
  it("component_list: operation matches MCP data", async () => {
    const opResult = await listComponents(rt.store, rt.config);
    const mcpRes = await client.callTool({
      name: "component_list",
      arguments: {},
    });
    assertParity(opResult, mcpRes);
  });

  it("component_list condensed: matches llm formatter", async () => {
    const opResult = await listComponents(rt.store, rt.config);
    const expectedText = componentListFmt.llm(opResult);

    const mcpRes = await client.callTool({
      name: "component_list",
      arguments: { condensed: true },
    });
    const content = mcpRes.content as unknown[];
    const first = content[0] as { text: string };
    const body = JSON.parse(first.text) as { text: string };
    expect(body.text).toBe(expectedText);
  });

  it("component_get: detailed fields match", async () => {
    const opResult = await getComponent(rt.store, "Button", rt.config);
    const mcpRes = await client.callTool({
      name: "component_get",
      arguments: { name: "Button" },
    });
    assertParity(opResult, mcpRes);
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

  it("modifier_get: values match", async () => {
    const opResult = await getModifier(rt.store, "importance");
    const mcpRes = await client.callTool({
      name: "modifier_get",
      arguments: { name: "importance" },
    });
    assertParity(opResult, mcpRes);
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

  it("token_get: values match", async () => {
    const opResult = await getToken(rt.store, "color.primary");
    const mcpRes = await client.callTool({
      name: "token_get",
      arguments: { name: "color.primary" },
    });
    assertParity(opResult, mcpRes);
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
});
