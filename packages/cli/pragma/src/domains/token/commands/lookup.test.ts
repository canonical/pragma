import type { CommandOutputResult } from "@canonical/cli-core";
import type { Store } from "@canonical/ke";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PragmaError } from "#error";
import { createTestStore, DS_ALL_TTL } from "#testing";
import type { PragmaContext } from "../../shared/context.js";
import lookupCommand from "./lookup.js";

let store: Store;
let cleanup: () => void;

beforeAll(async () => {
  const result = await createTestStore({ ttl: DS_ALL_TTL });
  store = result.store;
  cleanup = result.cleanup;
});

afterAll(() => cleanup());

function makeCtx(
  overrides?: Partial<PragmaContext["globalFlags"]>,
): PragmaContext {
  return {
    cwd: "/tmp",
    store,
    config: { tier: undefined, channel: "normal" },
    globalFlags: {
      llm: false,
      format: "text",
      verbose: false,
      ...overrides,
    },
  };
}

describe("token lookup command", () => {
  it("returns summary by default", async () => {
    const ctx = makeCtx();
    const cmd = lookupCommand(ctx);
    const result = await cmd.execute({ name: "color.primary" }, ctx);
    expect(result.tag).toBe("output");

    const output = result as CommandOutputResult;
    const text = output.render.plain(output.value);
    expect(text).toContain("color.primary");
    expect(text).toContain("Category: Color");
    expect(text).not.toContain("Values:");
  });

  it("returns values with --detailed", async () => {
    const ctx = makeCtx();
    const cmd = lookupCommand(ctx);
    const result = await cmd.execute(
      { name: "color.primary", detailed: true },
      ctx,
    );
    const output = result as CommandOutputResult;
    const text = output.render.plain(output.value);
    expect(text).toContain("Values:");
    expect(text).toContain("light: #0066cc");
    expect(text).toContain("dark: #4d9aff");
  });

  it("throws ENTITY_NOT_FOUND for unknown token", async () => {
    const ctx = makeCtx();
    const cmd = lookupCommand(ctx);
    try {
      await cmd.execute({ name: "nonexistent" }, ctx);
      expect.fail("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(PragmaError);
      expect((e as PragmaError).code).toBe("ENTITY_NOT_FOUND");
    }
  });

  it("renders LLM format with --llm --detailed", async () => {
    const ctx = makeCtx({ llm: true });
    const cmd = lookupCommand(ctx);
    const result = await cmd.execute(
      { name: "color.primary", detailed: true },
      ctx,
    );
    const output = result as CommandOutputResult;
    const text = output.render.plain(output.value);
    expect(text).toContain("## color.primary");
    expect(text).toContain("### Values");
  });

  it("renders JSON with --detailed", async () => {
    const ctx = makeCtx({ format: "json" });
    const cmd = lookupCommand(ctx);
    const result = await cmd.execute(
      { name: "color.primary", detailed: true },
      ctx,
    );
    const output = result as CommandOutputResult;
    const text = output.render.plain(output.value);
    const parsed = JSON.parse(text);
    expect(parsed.name).toBe("color.primary");
    expect(parsed.values).toHaveLength(2);
  });

  it("renders JSON without --detailed (omits values)", async () => {
    const ctx = makeCtx({ format: "json" });
    const cmd = lookupCommand(ctx);
    const result = await cmd.execute({ name: "color.primary" }, ctx);
    const output = result as CommandOutputResult;
    const text = output.render.plain(output.value);
    const parsed = JSON.parse(text);
    expect(parsed.name).toBe("color.primary");
    expect(parsed.values).toBeUndefined();
  });
});
