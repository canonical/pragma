import type { CommandDefinition } from "@canonical/cli-core";
import type { Store } from "@canonical/ke";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestStore, DS_ALL_TTL } from "#testing";
import type { PragmaContext } from "../../shared/context.js";
import buildLookupCommand from "./lookup.js";

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

describe("buildLookupCommand", () => {
  it("returns summary by default", async () => {
    const ctx = makeCtx();
    const cmd = buildLookupCommand(ctx);
    const { text } = await executeOutput(
      cmd,
      { names: ["react/component/folder-structure"] },
      ctx,
    );
    expect(text).toContain("react/component/folder-structure");
    expect(text).toContain("Category: react");
    expect(text).not.toContain("Do:");
  });

  it("returns dos and donts with --detailed", async () => {
    const ctx = makeCtx();
    const cmd = buildLookupCommand(ctx);
    const { text } = await executeOutput(
      cmd,
      { names: ["react/component/folder-structure"], detailed: true },
      ctx,
    );
    expect(text).toContain("Do:");
    expect(text).toContain("Don't:");
  });

  it("throws ENTITY_NOT_FOUND for unknown standard", async () => {
    const ctx = makeCtx();
    const cmd = buildLookupCommand(ctx);
    const result = await cmd.execute({ names: ["nonexistent"] }, ctx);
    expect(result.tag).toBe("output");
    if (result.tag !== "output") {
      expect.fail("Expected output result");
    }
    expect(result.render.plain(result.value)).toContain("Errors:");
  });

  it("renders LLM format with --llm", async () => {
    const ctx = makeCtx({
      globalFlags: { llm: true, format: "text" as const, verbose: false },
    });
    const cmd = buildLookupCommand(ctx);
    const { text } = await executeOutput(
      cmd,
      { names: ["react/component/folder-structure"], detailed: true },
      ctx,
    );
    expect(text).toContain("## react/component/folder-structure");
    expect(text).toContain("### Do");
  });

  it("renders JSON with --detailed", async () => {
    const ctx = makeCtx({
      globalFlags: { llm: false, format: "json" as const, verbose: false },
    });
    const cmd = buildLookupCommand(ctx);
    const { text } = await executeOutput(
      cmd,
      { names: ["react/component/folder-structure"], detailed: true },
      ctx,
    );
    const parsed = JSON.parse(text);
    expect(parsed.name).toBe("react/component/folder-structure");
    expect(parsed.dos).toBeDefined();
    expect(parsed.donts).toBeDefined();
  });

  it("renders JSON without --detailed (omits dos/donts)", async () => {
    const ctx = makeCtx({
      globalFlags: { llm: false, format: "json" as const, verbose: false },
    });
    const cmd = buildLookupCommand(ctx);
    const { text } = await executeOutput(
      cmd,
      { names: ["react/component/folder-structure"] },
      ctx,
    );
    const parsed = JSON.parse(text);
    expect(parsed.name).toBe("react/component/folder-structure");
    expect(parsed.dos).toBeUndefined();
    expect(parsed.donts).toBeUndefined();
  });

  it("renders multiple standards together", async () => {
    const ctx = makeCtx();
    const cmd = buildLookupCommand(ctx);
    const { text } = await executeOutput(
      cmd,
      { names: ["react/component/folder-structure", "react/component/props"] },
      ctx,
    );
    expect(text).toContain("react/component/folder-structure");
    expect(text).toContain("react/component/props");
  });
});
