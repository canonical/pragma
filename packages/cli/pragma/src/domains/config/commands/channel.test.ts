import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Store } from "@canonical/ke";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readConfig } from "../../../config.js";
import type { PragmaContext } from "../../shared/context.js";
import buildChannelCommand from "./channel.js";

function makeCtx(cwd: string): PragmaContext {
  return {
    cwd,
    globalFlags: { llm: false, format: "text" as const, verbose: false },
    store: {} as Store,
    config: { tier: undefined, channel: "normal" },
  };
}

describe("config channel command", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "pragma-cmd-channel-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("sets channel to experimental", async () => {
    const ctx = makeCtx(dir);
    const cmd = buildChannelCommand(ctx);
    const result = await cmd.execute({ value: "experimental" }, ctx);

    expect(result.tag).toBe("output");
    const config = readConfig(dir);
    expect(config.channel).toBe("experimental");
  });

  it("renders set output", async () => {
    const ctx = makeCtx(dir);
    const cmd = buildChannelCommand(ctx);
    const result = await cmd.execute({ value: "prerelease" }, ctx);

    expect(result.tag).toBe("output");
    if (result.tag === "output") {
      const text = result.render.plain(result.value);
      expect(text).toBe('Set channel to "prerelease".');
    }
  });

  it("resets channel via --reset flag", async () => {
    writeFileSync(
      join(dir, "pragma.config.toml"),
      'channel = "experimental"\n',
    );

    const ctx = makeCtx(dir);
    const cmd = buildChannelCommand(ctx);
    const result = await cmd.execute({ reset: true }, ctx);

    expect(result.tag).toBe("output");
    const config = readConfig(dir);
    expect(config.channel).toBe("normal");
  });

  it("renders reset output", async () => {
    const ctx = makeCtx(dir);
    const cmd = buildChannelCommand(ctx);
    const result = await cmd.execute({ reset: true }, ctx);

    expect(result.tag).toBe("output");
    if (result.tag === "output") {
      const text = result.render.plain(result.value);
      expect(text).toBe("Reset channel to default.");
    }
  });

  it("shows current channel when no args", async () => {
    writeFileSync(join(dir, "pragma.config.toml"), 'channel = "prerelease"\n');

    const ctx = makeCtx(dir);
    const cmd = buildChannelCommand(ctx);
    const result = await cmd.execute({}, ctx);

    expect(result.tag).toBe("output");
    if (result.tag === "output") {
      expect(result.value).toBe("prerelease");
      const text = result.render.plain(result.value);
      expect(text).toBe("Current channel: prerelease");
    }
  });

  it("throws INVALID_INPUT for invalid channel", async () => {
    const ctx = makeCtx(dir);
    const cmd = buildChannelCommand(ctx);
    await expect(cmd.execute({ value: "aggressive" }, ctx)).rejects.toThrow(
      'Invalid channel "aggressive"',
    );
  });
});
