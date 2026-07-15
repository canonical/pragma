import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Store } from "@canonical/ke";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readConfig } from "#config";
import type { PragmaContext } from "../../shared/context.js";
import buildFrameworkCommand from "./framework.js";

function makeCtx(cwd: string): PragmaContext {
  return {
    cwd,
    globalFlags: { llm: false, format: "text" as const, verbose: false },
    store: {} as Store,
    config: { tier: undefined, channel: "normal" },
  };
}

describe("config framework command", () => {
  let dir: string;
  let xdgDir: string;
  let originalXdg: string | undefined;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "pragma-cmd-framework-"));
    // Bound the config walk at the fixture root, seed an empty project
    // file so writes stay local, and isolate the global XDG layer.
    mkdirSync(join(dir, ".git"));
    writeFileSync(join(dir, "pragma.config.json"), "{}");
    originalXdg = process.env.XDG_CONFIG_HOME;
    xdgDir = mkdtempSync(join(tmpdir(), "pragma-cmd-framework-xdg-"));
    process.env.XDG_CONFIG_HOME = xdgDir;
  });

  afterEach(() => {
    process.env.XDG_CONFIG_HOME = originalXdg;
    rmSync(dir, { recursive: true, force: true });
    rmSync(xdgDir, { recursive: true, force: true });
  });

  it("sets framework to react", async () => {
    const ctx = makeCtx(dir);
    const result = await buildFrameworkCommand(ctx).execute(
      { value: "react" },
      ctx,
    );
    expect(result.tag).toBe("output");
    expect(readConfig(dir).framework).toBe("react");
  });

  it("accepts svelte and lit", async () => {
    const ctx = makeCtx(dir);
    await buildFrameworkCommand(ctx).execute({ value: "svelte" }, ctx);
    expect(readConfig(dir).framework).toBe("svelte");
    await buildFrameworkCommand(ctx).execute({ value: "lit" }, ctx);
    expect(readConfig(dir).framework).toBe("lit");
  });

  it("rejects a value combined with --reset", async () => {
    const ctx = makeCtx(dir);
    await expect(
      buildFrameworkCommand(ctx).execute({ value: "react", reset: true }, ctx),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });

  it("rejects an explicit empty-string value", async () => {
    const ctx = makeCtx(dir);
    await expect(
      buildFrameworkCommand(ctx).execute({ value: "" }, ctx),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });

  it("rejects an invalid framework", async () => {
    const ctx = makeCtx(dir);
    await expect(
      buildFrameworkCommand(ctx).execute({ value: "angular" }, ctx),
    ).rejects.toThrow(/framework/i);
  });

  it("reports 'none' when unset", async () => {
    const ctx = makeCtx(dir);
    const result = await buildFrameworkCommand(ctx).execute({}, ctx);
    expect(result.tag).toBe("output");
    if (result.tag === "output") {
      expect(result.value).toBe("none");
    }
  });

  it("resets framework via --reset (removes the field)", async () => {
    writeFileSync(join(dir, "pragma.config.json"), '{"framework":"react"}');
    const ctx = makeCtx(dir);
    await buildFrameworkCommand(ctx).execute({ reset: true }, ctx);
    expect(readConfig(dir).framework).toBeUndefined();
    // The field is removed, not left as a stale value.
    const raw = JSON.parse(
      readFileSync(join(dir, "pragma.config.json"), "utf-8"),
    ) as Record<string, unknown>;
    expect(raw).not.toHaveProperty("framework");
  });

  it("preserves other config fields when setting framework", async () => {
    writeFileSync(
      join(dir, "pragma.config.json"),
      JSON.stringify({ tier: "Apps/WPE", trace: true }),
    );
    const ctx = makeCtx(dir);
    await buildFrameworkCommand(ctx).execute({ value: "lit" }, ctx);
    const config = readConfig(dir);
    expect(config.framework).toBe("lit");
    expect(config.tier).toBe("Apps/WPE");
    expect(config.trace).toBe(true);
  });
});
