import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Store } from "@canonical/ke";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readConfig } from "#config";
import type { PragmaContext } from "../../shared/context.js";
import buildTraceCommand from "./trace.js";

function makeCtx(cwd: string): PragmaContext {
  return {
    cwd,
    globalFlags: { llm: false, format: "text" as const, verbose: false },
    store: {} as Store,
    config: { tier: undefined, channel: "normal" },
  };
}

describe("config trace command", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "pragma-cmd-trace-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("enables tracing", async () => {
    const ctx = makeCtx(dir);
    const cmd = buildTraceCommand(ctx);
    const result = await cmd.execute({ value: "on" }, ctx);

    expect(result.tag).toBe("output");
    expect(readConfig(dir).trace).toBe(true);
  });

  it("disables tracing", async () => {
    writeFileSync(join(dir, "pragma.config.json"), '{"trace":true}');

    const ctx = makeCtx(dir);
    const cmd = buildTraceCommand(ctx);
    const result = await cmd.execute({ value: "off" }, ctx);

    expect(result.tag).toBe("output");
    expect(readConfig(dir).trace).toBe(false);
  });

  it("renders enable output", async () => {
    const ctx = makeCtx(dir);
    const cmd = buildTraceCommand(ctx);
    const result = await cmd.execute({ value: "on" }, ctx);

    expect(result.tag).toBe("output");
    if (result.tag === "output") {
      expect(result.render.plain(result.value)).toBe("Tracing enabled.");
    }
  });

  it("shows current status when no argument", async () => {
    writeFileSync(join(dir, "pragma.config.json"), '{"trace":true}');

    const ctx = makeCtx(dir);
    const cmd = buildTraceCommand(ctx);
    const result = await cmd.execute({}, ctx);

    expect(result.tag).toBe("output");
    if (result.tag === "output") {
      expect(result.value).toBe("on");
    }
  });

  it("reports off when unset", async () => {
    const ctx = makeCtx(dir);
    const cmd = buildTraceCommand(ctx);
    const result = await cmd.execute({}, ctx);

    expect(result.tag).toBe("output");
    if (result.tag === "output") {
      expect(result.value).toBe("off");
    }
  });

  it("throws INVALID_INPUT for an invalid value", async () => {
    const ctx = makeCtx(dir);
    const cmd = buildTraceCommand(ctx);
    await expect(cmd.execute({ value: "yes" }, ctx)).rejects.toThrow(
      /trace/i,
    );
  });

  // Regression guard for the data-loss bug: enabling/disabling trace must NOT
  // drop other persisted config fields. `packages` is runtime-consumed, so
  // silently discarding it on a trace toggle would break package resolution.
  it("preserves the packages field when toggling trace", async () => {
    writeFileSync(
      join(dir, "pragma.config.json"),
      JSON.stringify({
        tier: "Apps/WPE",
        channel: "experimental",
        packages: [
          "@canonical/design-system",
          {
            name: "@canonical/anatomy-dsl",
            source: "git+https://github.com/canonical/anatomy-dsl.git#main",
          },
        ],
      }),
    );

    const ctx = makeCtx(dir);
    const cmd = buildTraceCommand(ctx);
    await cmd.execute({ value: "on" }, ctx);

    const config = readConfig(dir);
    expect(config.trace).toBe(true);
    // Every pre-existing field survives the write.
    expect(config.tier).toBe("Apps/WPE");
    expect(config.channel).toBe("experimental");
    expect(config.packages).toEqual([
      "@canonical/design-system",
      {
        name: "@canonical/anatomy-dsl",
        source: "git+https://github.com/canonical/anatomy-dsl.git#main",
      },
    ]);

    // And toggling off again still preserves them.
    await cmd.execute({ value: "off" }, ctx);
    const after = readConfig(dir);
    expect(after.trace).toBe(false);
    expect(after.packages).toHaveLength(2);
  });

  it("does not persist the default channel when toggling trace", async () => {
    // A bare `trace on` on an empty config should not write channel:"normal"
    // (the default), keeping the file minimal per the existing convention.
    const ctx = makeCtx(dir);
    const cmd = buildTraceCommand(ctx);
    await cmd.execute({ value: "on" }, ctx);

    const raw = JSON.parse(
      readFileSync(join(dir, "pragma.config.json"), "utf-8"),
    ) as Record<string, unknown>;
    expect(raw.trace).toBe(true);
    expect(raw).not.toHaveProperty("channel");
    expect(raw).not.toHaveProperty("tier");
  });
});
