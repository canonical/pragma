import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Store } from "@canonical/ke";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PragmaContext } from "../../shared/context.js";
import buildShowCommand from "./show.js";

function makeCtx(cwd: string): PragmaContext {
  return {
    cwd,
    globalFlags: { llm: false, format: "text" as const, verbose: false },
    store: {} as Store,
    config: { tier: undefined, channel: "normal" },
  };
}

describe("config show command", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "pragma-cmd-show-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("renders show output with defaults", async () => {
    const ctx = makeCtx(dir);
    const cmd = buildShowCommand(ctx);
    const result = await cmd.execute({}, ctx);

    expect(result.tag).toBe("output");
    if (result.tag === "output") {
      const text = result.render.plain(result.value);
      expect(text).toContain("tier: (none — all tiers visible)");
      expect(text).toContain("channel: normal (stable)");
      expect(text).toContain("config file: (not found)");
    }
  });

  it("renders show output with configured values", async () => {
    writeFileSync(
      join(dir, "pragma.config.json"),
      '{"tier":"apps/lxd","channel":"experimental"}',
    );

    const ctx = makeCtx(dir);
    const cmd = buildShowCommand(ctx);
    const result = await cmd.execute({}, ctx);

    expect(result.tag).toBe("output");
    if (result.tag === "output") {
      const text = result.render.plain(result.value);
      expect(text).toContain("tier: apps/lxd (global → apps → apps/lxd)");
      expect(text).toContain("channel: experimental (stable + experimental)");
      expect(text).toContain("config file:");
    }
  });
});
