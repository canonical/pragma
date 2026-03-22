/**
 * Layer 4: Agent session tests.
 *
 * Multi-step journeys that walk through the decision trees the
 * orientation advertises. Each scenario simulates an agent's workflow.
 *
 * @see F.09 IT.06
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

describe("agent sessions", () => {
  it("journey: build a component", async () => {
    // 1. Probe capabilities
    const caps = parseEnvelope(
      await client.callTool({ name: "capabilities", arguments: {} }),
    );
    expect(caps.ok).toBe(true);

    // 2. Orient via LLM
    const orientation = parseEnvelope(
      await client.callTool({ name: "llm", arguments: {} }),
    );
    expect(orientation.ok).toBe(true);
    const llmData = orientation.data as {
      decisionTrees: { intent: string }[];
    };
    const buildTree = llmData.decisionTrees.find(
      (t) => t.intent === "Build a block",
    );
    expect(buildTree).toBeDefined();

    // 3. Discover blocks
    const list = parseEnvelope(
      await client.callTool({ name: "block_list", arguments: {} }),
    );
    const blocks = list.data as { name: string }[];
    expect(blocks.length).toBeGreaterThan(0);

    // 4. Get block detail
    const firstName = blocks[0]!.name;
    const detail = parseEnvelope(
      await client.callTool({
        name: "block_get",
        arguments: { name: firstName },
      }),
    );
    expect(detail.ok).toBe(true);
    expect((detail.data as { name: string }).name).toBe(firstName);

    // 5. Error recovery — bad name returns structured error
    const err = parseEnvelope(
      await client.callTool({
        name: "block_get",
        arguments: { name: "XXXXX" },
      }),
    );
    expect(err.ok).toBe(false);
    expect((err.error as { code: string }).code).toBe("ENTITY_NOT_FOUND");
  });

  it("journey: audit standards", async () => {
    // 1. List categories
    const cats = parseEnvelope(
      await client.callTool({ name: "standard_categories", arguments: {} }),
    );
    const categories = cats.data as { name: string }[];
    expect(categories.length).toBeGreaterThan(0);

    // 2. List standards in first category
    const standards = parseEnvelope(
      await client.callTool({
        name: "standard_list",
        arguments: { category: categories[0]!.name },
      }),
    );
    const stdList = standards.data as { name: string }[];
    expect(stdList.length).toBeGreaterThan(0);

    // 3. Get standard detail — verify dos and donts exist
    const detail = parseEnvelope(
      await client.callTool({
        name: "standard_get",
        arguments: { name: stdList[0]!.name },
      }),
    );
    expect(detail.ok).toBe(true);
    const std = detail.data as { dos: unknown[]; donts: unknown[] };
    expect(std.dos).toBeDefined();
    expect(std.donts).toBeDefined();
  });

  it("journey: SPARQL escape hatch", async () => {
    // Direct SPARQL query for component names
    const result = parseEnvelope(
      await client.callTool({
        name: "graph_query",
        arguments: {
          sparql:
            "SELECT ?name WHERE { ?c a <https://ds.canonical.com/Component> ; <https://ds.canonical.com/name> ?name } ORDER BY ?name",
        },
      }),
    );
    expect(result.ok).toBe(true);
    const data = result.data as { bindings: { name?: string }[] };
    // Canonical fixture has 4 components
    expect(data.bindings.length).toBe(4);
    expect(data.bindings[0]!.name).toBe("Beta Widget");
    expect(data.bindings[1]!.name).toBe("Button");
  });
});
