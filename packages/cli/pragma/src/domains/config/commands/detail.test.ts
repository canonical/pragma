import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Store } from "@canonical/ke";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readConfig } from "#config";
import type { PragmaContext } from "../../shared/context.js";
import buildDetailCommand from "./detail.js";

function makeCtx(cwd: string): PragmaContext {
  return {
    cwd,
    globalFlags: { llm: false, format: "text" as const, verbose: false },
    store: {} as Store,
    config: { tier: undefined, channel: "normal" },
  };
}

describe("config detail command", () => {
  let dir: string;
  let xdgDir: string;
  let originalXdg: string | undefined;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "pragma-cmd-detail-"));
    // Bound the config walk at the fixture root, seed an empty project
    // file so writes stay local, and isolate the global XDG layer.
    mkdirSync(join(dir, ".git"));
    writeFileSync(join(dir, "pragma.config.json"), "{}");
    originalXdg = process.env.XDG_CONFIG_HOME;
    xdgDir = mkdtempSync(join(tmpdir(), "pragma-cmd-detail-xdg-"));
    process.env.XDG_CONFIG_HOME = xdgDir;
  });

  afterEach(() => {
    process.env.XDG_CONFIG_HOME = originalXdg;
    rmSync(dir, { recursive: true, force: true });
    rmSync(xdgDir, { recursive: true, force: true });
  });

  it("sets detail to digest", async () => {
    const ctx = makeCtx(dir);
    const cmd = buildDetailCommand(ctx);
    const result = await cmd.execute({ level: "digest" }, ctx);

    expect(result.tag).toBe("output");
    const config = readConfig(dir);
    expect(config.detail).toBe("digest");
  });

  it("renders set output", async () => {
    const ctx = makeCtx(dir);
    const cmd = buildDetailCommand(ctx);
    const result = await cmd.execute({ level: "detailed" }, ctx);

    expect(result.tag).toBe("output");
    if (result.tag === "output") {
      const text = result.render.plain(result.value);
      expect(text).toContain('Set detail to "detailed".');
    }
  });

  it("rejects a level combined with --reset", async () => {
    const ctx = makeCtx(dir);
    const cmd = buildDetailCommand(ctx);
    await expect(
      cmd.execute({ level: "digest", reset: true }, ctx),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });

  it("rejects an explicit empty-string level", async () => {
    const ctx = makeCtx(dir);
    const cmd = buildDetailCommand(ctx);
    await expect(cmd.execute({ level: "" }, ctx)).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });
  });

  it("rejects a non-token level", async () => {
    const ctx = makeCtx(dir);
    const cmd = buildDetailCommand(ctx);
    await expect(
      cmd.execute({ level: "Very Detailed" }, ctx),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });

  it("resets detail via --reset flag", async () => {
    writeFileSync(join(dir, "pragma.config.json"), '{"detail":"digest"}');

    const ctx = makeCtx(dir);
    const cmd = buildDetailCommand(ctx);
    const result = await cmd.execute({ reset: true }, ctx);

    expect(result.tag).toBe("output");
    const config = readConfig(dir);
    expect(config.detail).toBeUndefined();
  });

  it("renders reset output", async () => {
    const ctx = makeCtx(dir);
    const cmd = buildDetailCommand(ctx);
    const result = await cmd.execute({ reset: true }, ctx);

    expect(result.tag).toBe("output");
    if (result.tag === "output") {
      const text = result.render.plain(result.value);
      expect(text).toContain("Reset detail to default.");
    }
  });

  it("shows current detail when no args", async () => {
    writeFileSync(join(dir, "pragma.config.json"), '{"detail":"summary"}');

    const ctx = makeCtx(dir);
    const cmd = buildDetailCommand(ctx);
    const result = await cmd.execute({}, ctx);

    expect(result.tag).toBe("output");
    if (result.tag === "output") {
      expect(result.value).toBe("summary");
      const text = result.render.plain(result.value);
      expect(text).toBe("Current detail: summary");
    }
  });

  it("reports no default when detail is unset", async () => {
    const ctx = makeCtx(dir);
    const cmd = buildDetailCommand(ctx);
    const result = await cmd.execute({}, ctx);

    expect(result.tag).toBe("output");
    if (result.tag === "output") {
      const text = result.render.plain(result.value);
      expect(text).toBe(
        "No detail default set (each surface uses its own default).",
      );
    }
  });
});
