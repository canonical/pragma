import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Store } from "@canonical/ke";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readConfig } from "#config";
import type { PragmaContext } from "../../shared/context.js";
import buildTierCommand from "./tier.js";

function makeCtx(cwd: string): PragmaContext {
  return {
    cwd,
    globalFlags: { llm: false, format: "text" as const, verbose: false },
    store: {} as Store,
    config: { tier: undefined, channel: "normal" },
  };
}

describe("config tier command", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "pragma-cmd-tier-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("resets tier via --reset flag", async () => {
    writeFileSync(
      join(dir, "pragma.config.json"),
      '{"tier":"apps/lxd","channel":"normal"}',
    );

    const ctx = makeCtx(dir);
    const cmd = buildTierCommand(ctx);
    const result = await cmd.execute({ reset: true }, ctx);

    expect(result.tag).toBe("output");
    const config = readConfig(dir);
    expect(config.tier).toBeUndefined();
    expect(config.channel).toBe("normal");
  });

  it("renders reset output", async () => {
    const ctx = makeCtx(dir);
    const cmd = buildTierCommand(ctx);
    const result = await cmd.execute({ reset: true }, ctx);

    expect(result.tag).toBe("output");
    if (result.tag === "output") {
      const text = result.render.plain(result.value);
      expect(text).toBe("Reset tier to default.");
    }
  });

  it("shows current tier when no args", async () => {
    writeFileSync(join(dir, "pragma.config.json"), '{"tier":"apps"}');

    const ctx = makeCtx(dir);
    const cmd = buildTierCommand(ctx);
    const result = await cmd.execute({}, ctx);

    expect(result.tag).toBe("output");
    if (result.tag === "output") {
      expect(result.value).toBe("apps");
      const text = result.render.plain(result.value);
      expect(text).toBe("Current tier: apps");
    }
  });

  it("shows no tier message when none set", async () => {
    const ctx = makeCtx(dir);
    const cmd = buildTierCommand(ctx);
    const result = await cmd.execute({}, ctx);

    expect(result.tag).toBe("output");
    if (result.tag === "output") {
      const text = result.render.plain(result.value);
      expect(text).toBe("No tier set (all tiers visible).");
    }
  });
});
