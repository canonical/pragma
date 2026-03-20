import type { CommandDefinition } from "@canonical/cli-core";
import type { Store } from "@canonical/ke";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DS_ALL_TTL } from "../../../testing/dsFixtures.js";
import { createTestStore } from "../../../testing/store.js";
import type { PragmaContext } from "../shared/context.js";
import buildLlmCommand from "./llmCommand.js";
import type { LlmData } from "./types.js";

let store: Store;
let cleanup: () => void;

beforeAll(async () => {
  const result = await createTestStore({ ttl: DS_ALL_TTL });
  store = result.store;
  cleanup = result.cleanup;
});

afterAll(() => cleanup());

function makeCtx(overrides: Partial<PragmaContext> = {}): PragmaContext {
  return {
    cwd: "/tmp",
    globalFlags: { llm: false, format: "text" as const, verbose: false },
    store,
    config: { tier: undefined, channel: "prerelease" },
    ...overrides,
  };
}

async function executeOutput(
  cmd: CommandDefinition,
  ctx: PragmaContext,
): Promise<{ value: LlmData; text: string }> {
  const result = await cmd.execute({}, ctx);
  expect(result.tag).toBe("output");
  if (result.tag !== "output") throw new Error("Expected output result");
  const text = result.render.plain(result.value);
  return { value: result.value as LlmData, text };
}

describe("buildLlmCommand", () => {
  it("returns an output result", async () => {
    const ctx = makeCtx();
    const cmd = buildLlmCommand(ctx);
    const result = await cmd.execute({}, ctx);
    expect(result.tag).toBe("output");
  });

  it("output contains all three sections", async () => {
    const ctx = makeCtx();
    const cmd = buildLlmCommand(ctx);
    const { text } = await executeOutput(cmd, ctx);
    expect(text).toContain("## Context");
    expect(text).toContain("## Decision Trees");
    expect(text).toContain("## Commands");
  });

  it("context block reflects store state", async () => {
    const ctx = makeCtx({
      config: { tier: "apps/lxd", channel: "normal" },
    });
    const cmd = buildLlmCommand(ctx);
    const { text, value } = await executeOutput(cmd, ctx);

    expect(text).toContain("apps/lxd");
    expect(text).toContain("normal");
    expect(value.context.tierChain).toEqual(["global", "apps", "apps/lxd"]);
    expect(value.context.counts.components).toBeGreaterThan(0);
    expect(value.context.counts.standards).toBeGreaterThan(0);
    expect(value.context.counts.modifierFamilies).toBeGreaterThan(0);
    expect(value.context.counts.tokens).toBeGreaterThan(0);
    expect(value.context.namespaces.length).toBeGreaterThan(0);
  });

  it("includes all 5 decision trees", async () => {
    const ctx = makeCtx();
    const cmd = buildLlmCommand(ctx);
    const { value, text } = await executeOutput(cmd, ctx);
    expect(value.decisionTrees).toHaveLength(5);
    expect(text).toContain("Build a component");
    expect(text).toContain("Audit standards");
    expect(text).toContain("Find a token");
    expect(text).toContain("Explore the design system");
    expect(text).toContain("Configure");
  });

  it("output stays within 800-token budget (≤3200 chars)", async () => {
    const ctx = makeCtx();
    const cmd = buildLlmCommand(ctx);
    const { text } = await executeOutput(cmd, ctx);
    expect(text.length).toBeLessThanOrEqual(3200);
  });
});
