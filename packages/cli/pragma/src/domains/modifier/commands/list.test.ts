import type { CommandOutputResult } from "@canonical/cli-core";
import type { Store } from "@canonical/ke";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
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

describe("modifier list command", () => {
  it("returns output result with all families", async () => {
    const ctx = makeCtx();
    const cmd = listCommand(ctx);
    const result = await cmd.execute({}, ctx);
    expect(result.tag).toBe("output");

    const output = result as CommandOutputResult;
    const text = output.render.plain(output.value);
    expect(text).toContain("importance");
    expect(text).toContain("density");
  });

  it("renders LLM format with --llm", async () => {
    const ctx = makeCtx({ llm: true });
    const cmd = listCommand(ctx);
    const result = await cmd.execute({}, ctx);
    const output = result as CommandOutputResult;
    const text = output.render.plain(output.value);
    expect(text).toContain("## Modifier Families");
    expect(text).toContain("**importance**");
  });
});
