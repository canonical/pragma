import type { CommandOutputResult } from "@canonical/cli-core";
import type { Store } from "@canonical/ke";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DS_ALL_TTL } from "../../../../testing/dsFixtures.js";
import { createTestStore } from "../../../../testing/store.js";
import { PragmaError } from "../../../error/index.js";
import type { PragmaContext } from "../../shared/context.js";
import getCommand from "./get.js";

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

describe("modifier get command", () => {
  it("returns a family with values", async () => {
    const ctx = makeCtx();
    const cmd = getCommand(ctx);
    const result = await cmd.execute({ name: "density" }, ctx);
    expect(result.tag).toBe("output");

    const output = result as CommandOutputResult;
    const text = output.render.plain(output.value);
    expect(text).toContain("density");
    expect(text).toContain("default");
    expect(text).toContain("compact");
  });

  it("throws ENTITY_NOT_FOUND for unknown modifier", async () => {
    const ctx = makeCtx();
    const cmd = getCommand(ctx);
    try {
      await cmd.execute({ name: "nonexistent" }, ctx);
      expect.fail("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(PragmaError);
      expect((e as PragmaError).code).toBe("ENTITY_NOT_FOUND");
    }
  });

  it("renders LLM format with --llm", async () => {
    const ctx = makeCtx({ llm: true });
    const cmd = getCommand(ctx);
    const result = await cmd.execute({ name: "importance" }, ctx);
    const output = result as CommandOutputResult;
    const text = output.render.plain(output.value);
    expect(text).toContain("## importance");
    expect(text).toContain("- default");
  });

  it("renders JSON with --format json", async () => {
    const ctx = makeCtx({ format: "json" });
    const cmd = getCommand(ctx);
    const result = await cmd.execute({ name: "importance" }, ctx);
    const output = result as CommandOutputResult;
    const text = output.render.plain(output.value);
    const parsed = JSON.parse(text);
    expect(parsed.name).toBe("importance");
    expect(parsed.values).toContain("primary");
  });
});
