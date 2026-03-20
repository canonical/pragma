import type { CommandOutputResult } from "@canonical/cli-core";
import type { Store } from "@canonical/ke";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DS_ALL_TTL } from "../../../../testing/dsFixtures.js";
import { createTestStore } from "../../../../testing/store.js";
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

describe("tier list command", () => {
  it("returns tiers with hierarchy", async () => {
    const ctx = makeCtx();
    const cmd = listCommand(ctx);
    const result = await cmd.execute({}, ctx);
    expect(result.tag).toBe("output");

    const output = result as CommandOutputResult;
    const text = output.render.plain(output.value);
    expect(text).toContain("global");
    expect(text).toContain("apps");
    expect(text).toContain("apps/lxd");
  });

  it("shows parent references", async () => {
    const ctx = makeCtx();
    const cmd = listCommand(ctx);
    const result = await cmd.execute({}, ctx);
    const output = result as CommandOutputResult;
    const text = output.render.plain(output.value);
    expect(text).toContain("(parent: global)");
    expect(text).toContain("(parent: apps)");
  });

  it("renders LLM format with --llm", async () => {
    const ctx = makeCtx({ llm: true });
    const cmd = listCommand(ctx);
    const result = await cmd.execute({}, ctx);
    const output = result as CommandOutputResult;
    const text = output.render.plain(output.value);
    expect(text).toContain("## Tiers");
    expect(text).toContain("**global**");
  });
});
