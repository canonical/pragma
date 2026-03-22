import type { CommandDefinition } from "@canonical/cli-core";
import type { Store } from "@canonical/ke";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestStore, DS_ALL_TTL } from "#testing";
import type { PragmaContext } from "../../shared/context.js";
import type { ComponentSummary } from "../../shared/types.js";
import buildListCommand from "./list.js";

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
  params: Record<string, unknown>,
  ctx: PragmaContext,
): Promise<{ value: unknown; text: string }> {
  const result = await cmd.execute(params, ctx);
  expect(result.tag).toBe("output");
  if (result.tag !== "output") throw new Error("Expected output result");
  const text = result.render.plain(result.value);
  return { value: result.value, text };
}

describe("buildListCommand", () => {
  it("returns output result with block data", async () => {
    const ctx = makeCtx();
    const cmd = buildListCommand(ctx);
    const { value } = await executeOutput(cmd, {}, ctx);
    const names = (value as ComponentSummary[]).map((c) => c.name);
    expect(names).toContain("Button");
    expect(names).toContain("Card");
  });

  it("renders plain text output", async () => {
    const ctx = makeCtx();
    const cmd = buildListCommand(ctx);
    const { text } = await executeOutput(cmd, {}, ctx);
    expect(text).toContain("Button");
    expect(text).toContain("Card");
  });

  it("renders LLM markdown", async () => {
    const ctx = makeCtx({
      globalFlags: { llm: true, format: "text" as const, verbose: false },
    });
    const cmd = buildListCommand(ctx);
    const { text } = await executeOutput(cmd, {}, ctx);
    expect(text).toContain("## Blocks");
    expect(text).toContain("**Button**");
  });

  it("renders JSON output", async () => {
    const ctx = makeCtx({
      globalFlags: { llm: false, format: "json" as const, verbose: false },
    });
    const cmd = buildListCommand(ctx);
    const { text } = await executeOutput(cmd, {}, ctx);
    const parsed = JSON.parse(text);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.some((c: ComponentSummary) => c.name === "Button")).toBe(
      true,
    );
  });

  it("respects tier filter from config", async () => {
    const ctx = makeCtx({
      config: { tier: "global", channel: "normal" },
    });
    const cmd = buildListCommand(ctx);
    const { value } = await executeOutput(cmd, {}, ctx);
    const names = (value as ComponentSummary[]).map((c) => c.name);
    expect(names).toContain("Button");
    expect(names).not.toContain("LXD Panel");
  });

  it("--all-tiers ignores tier filter", async () => {
    const ctx = makeCtx({
      config: { tier: "global", channel: "prerelease" },
    });
    const cmd = buildListCommand(ctx);
    const { value } = await executeOutput(cmd, { allTiers: true }, ctx);
    const names = (value as ComponentSummary[]).map((c) => c.name);
    expect(names).toContain("Button");
    expect(names).toContain("LXD Panel");
  });

  it("returns results with combined tier + channel", async () => {
    const ctx = makeCtx({
      config: { tier: "apps/lxd", channel: "normal" },
    });
    const cmd = buildListCommand(ctx);
    const result = await cmd.execute({}, ctx);
    expect(result.tag).toBe("output");
  });
});
