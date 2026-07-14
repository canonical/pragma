import type { Store } from "@canonical/ke";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestStore, DS_ALL_TTL } from "#testing";
import type { FilterConfig } from "../../shared/types/index.js";
import { renderLlmOrientation } from "../formatters/index.js";
import type { LlmData } from "../types.js";
import collectContext from "./collectContext.js";

let store: Store;
let cleanup: () => void;

beforeAll(async () => {
  const result = await createTestStore({ ttl: DS_ALL_TTL });
  store = result.store;
  cleanup = result.cleanup;
});

afterAll(() => cleanup());

const config: FilterConfig = { tier: undefined, channel: "prerelease" };

/** Extract the `## Context` data lines from a rendered orientation doc. */
function contextBlock(rendered: string): string {
  const lines = rendered.split("\n");
  const start = lines.indexOf("## Context");
  const block: string[] = [];
  for (let i = start + 1; i < lines.length && lines[i] !== ""; i++) {
    block.push(lines[i] ?? "");
  }
  return block.join("\n");
}

describe("collectContext", () => {
  it("assembles counts and namespaces from the store", async () => {
    const ctx = await collectContext(store, config);

    expect(ctx.tier).toBeUndefined();
    expect(ctx.channel).toBe("prerelease");
    expect(ctx.counts.blocks).toBeGreaterThan(0);
    expect(ctx.counts.standards).toBeGreaterThan(0);
    expect(ctx.counts.modifierFamilies).toBeGreaterThan(0);
    expect(ctx.counts.tokens).toBeGreaterThan(0);
    expect(ctx.namespaces.length).toBeGreaterThan(0);
  });

  it("renders a stable `## Context` block", async () => {
    const data: LlmData = {
      context: await collectContext(store, config),
      decisionTrees: [],
      commandReference: [],
    };

    expect(contextBlock(renderLlmOrientation(data))).toMatchInlineSnapshot(`
      "tier: (none) | channel: prerelease
      data: 5 blocks, 3 standards, 2 modifier families, 2 tokens
      namespaces: cs, ds"
    `);
  });
});
