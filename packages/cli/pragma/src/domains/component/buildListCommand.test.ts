import type { CommandDefinition } from "@canonical/cli-core";
import type { Store } from "@canonical/ke";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DS_ALL_TTL } from "../../../testing/dsFixtures.js";
import { createTestStore } from "../../../testing/store.js";
import type { ComponentSummary, FilterConfig } from "../shared/types.js";
import buildListCommand from "./buildListCommand.js";

let store: Store;
let cleanup: () => void;

beforeAll(async () => {
  const result = await createTestStore({ ttl: DS_ALL_TTL });
  store = result.store;
  cleanup = result.cleanup;
});

afterAll(() => cleanup());

const prereleaseConfig: FilterConfig = {
  tier: undefined,
  channel: "prerelease",
};

const ctx = {
  cwd: "/tmp",
  globalFlags: { llm: false, format: "text" as const, verbose: false },
};
const llmCtx = {
  cwd: "/tmp",
  globalFlags: { llm: true, format: "text" as const, verbose: false },
};
const jsonCtx = {
  cwd: "/tmp",
  globalFlags: { llm: false, format: "json" as const, verbose: false },
};

async function executeOutput(
  cmd: CommandDefinition,
  params: Record<string, unknown>,
  context: typeof ctx,
): Promise<{ value: unknown; text: string }> {
  const result = await cmd.execute(params, context);
  expect(result.tag).toBe("output");
  if (result.tag !== "output") throw new Error("Expected output result");
  const text = result.render.plain(result.value);
  return { value: result.value, text };
}

describe("buildListCommand", () => {
  it("returns output result with component data", async () => {
    const cmd = buildListCommand(store, prereleaseConfig);
    const { value } = await executeOutput(cmd, {}, ctx);
    const names = (value as ComponentSummary[]).map((c) => c.name);
    expect(names).toContain("Button");
    expect(names).toContain("Card");
  });

  it("renders plain text output", async () => {
    const cmd = buildListCommand(store, prereleaseConfig);
    const { text } = await executeOutput(cmd, {}, ctx);
    expect(text).toContain("Button");
    expect(text).toContain("Card");
  });

  it("renders LLM markdown", async () => {
    const cmd = buildListCommand(store, prereleaseConfig);
    const { text } = await executeOutput(cmd, {}, llmCtx);
    expect(text).toContain("## Components");
    expect(text).toContain("**Button**");
  });

  it("renders JSON output", async () => {
    const cmd = buildListCommand(store, prereleaseConfig);
    const { text } = await executeOutput(cmd, {}, jsonCtx);
    const parsed = JSON.parse(text);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.some((c: ComponentSummary) => c.name === "Button")).toBe(
      true,
    );
  });

  it("respects tier filter from config", async () => {
    const cmd = buildListCommand(store, { tier: "global", channel: "normal" });
    const { value } = await executeOutput(cmd, {}, ctx);
    const names = (value as ComponentSummary[]).map((c) => c.name);
    expect(names).toContain("Button");
    expect(names).not.toContain("LXD Panel");
  });

  it("--all-tiers ignores tier filter", async () => {
    const cmd = buildListCommand(store, {
      tier: "global",
      channel: "prerelease",
    });
    const { value } = await executeOutput(cmd, { allTiers: true }, ctx);
    const names = (value as ComponentSummary[]).map((c) => c.name);
    expect(names).toContain("Button");
    expect(names).toContain("LXD Panel");
  });

  it("returns results with combined tier + channel", async () => {
    const cmd = buildListCommand(store, {
      tier: "apps/lxd",
      channel: "normal",
    });
    const result = await cmd.execute({}, ctx);
    expect(result.tag).toBe("output");
  });
});
