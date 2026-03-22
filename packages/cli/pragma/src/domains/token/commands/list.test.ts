import type { CommandOutputResult } from "@canonical/cli-core";
import type { Store } from "@canonical/ke";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PragmaError } from "#error";
import { createTestStore, DS_ALL_TTL } from "#testing";
import type { PragmaContext } from "../../shared/context.js";
import listCommand from "./list.js";

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

describe("token list command", () => {
  it("returns output result with all tokens", async () => {
    const ctx = makeCtx();
    const cmd = listCommand(ctx);
    const result = await cmd.execute({}, ctx);
    expect(result.tag).toBe("output");

    const output = result as CommandOutputResult;
    const text = output.render.plain(output.value);
    expect(text).toContain("color.primary");
    expect(text).toContain("spacing.sm");
  });

  it("filters by --category", async () => {
    const ctx = makeCtx();
    const cmd = listCommand(ctx);
    const result = await cmd.execute({ category: "Color" }, ctx);
    expect(result.tag).toBe("output");

    const output = result as CommandOutputResult;
    const text = output.render.plain(output.value);
    expect(text).toContain("color.primary");
    expect(text).not.toContain("spacing.sm");
  });

  it("throws EMPTY_RESULTS for non-matching category", async () => {
    const ctx = makeCtx();
    const cmd = listCommand(ctx);
    try {
      await cmd.execute({ category: "nonexistent" }, ctx);
      expect.fail("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(PragmaError);
      expect((e as PragmaError).code).toBe("EMPTY_RESULTS");
    }
  });

  it("renders LLM format with --llm", async () => {
    const ctx = makeCtx({ llm: true });
    const cmd = listCommand(ctx);
    const result = await cmd.execute({}, ctx);
    const output = result as CommandOutputResult;
    const text = output.render.plain(output.value);
    expect(text).toContain("## Design Tokens");
    expect(text).toContain("**color.primary**");
  });
});
