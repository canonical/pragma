import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CommandContext } from "@canonical/cli-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readConfig } from "../../config.js";
import { collectConfigCommands } from "./commands.js";

const defaultCtx = (cwd: string): CommandContext => ({
  cwd,
  globalFlags: { llm: false, format: "text", verbose: false },
});

describe("config tier command", () => {
  let dir: string;
  const tierCmd = collectConfigCommands().find(
    (c) => c.path.join(" ") === "config tier",
  )!;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "pragma-cmd-tier-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("resets tier via --reset flag", async () => {
    writeFileSync(
      join(dir, "pragma.config.toml"),
      'tier = "apps/lxd"\nchannel = "normal"\n',
    );

    const result = await tierCmd.execute({ reset: true }, defaultCtx(dir));

    expect(result.tag).toBe("output");
    const config = readConfig(dir);
    expect(config.tier).toBeUndefined();
    expect(config.channel).toBe("normal");
  });

  it("renders reset output", async () => {
    const result = await tierCmd.execute({ reset: true }, defaultCtx(dir));

    expect(result.tag).toBe("output");
    if (result.tag === "output") {
      const text = result.render.plain(result.value);
      expect(text).toBe("Reset tier to default.");
    }
  });

  it("shows current tier when no args", async () => {
    writeFileSync(join(dir, "pragma.config.toml"), 'tier = "apps"\n');

    const result = await tierCmd.execute({}, defaultCtx(dir));

    expect(result.tag).toBe("output");
    if (result.tag === "output") {
      expect(result.value).toBe("apps");
      const text = result.render.plain(result.value);
      expect(text).toBe("Current tier: apps");
    }
  });

  it("shows no tier message when none set", async () => {
    const result = await tierCmd.execute({}, defaultCtx(dir));

    expect(result.tag).toBe("output");
    if (result.tag === "output") {
      const text = result.render.plain(result.value);
      expect(text).toBe("No tier set (all tiers visible).");
    }
  });
});

describe("config channel command", () => {
  let dir: string;
  const channelCmd = collectConfigCommands().find(
    (c) => c.path.join(" ") === "config channel",
  )!;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "pragma-cmd-channel-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("sets channel to experimental", async () => {
    const result = await channelCmd.execute(
      { value: "experimental" },
      defaultCtx(dir),
    );

    expect(result.tag).toBe("output");
    const config = readConfig(dir);
    expect(config.channel).toBe("experimental");
  });

  it("renders set output", async () => {
    const result = await channelCmd.execute(
      { value: "prerelease" },
      defaultCtx(dir),
    );

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

    const result = await channelCmd.execute({ reset: true }, defaultCtx(dir));

    expect(result.tag).toBe("output");
    const config = readConfig(dir);
    expect(config.channel).toBe("normal");
  });

  it("renders reset output", async () => {
    const result = await channelCmd.execute({ reset: true }, defaultCtx(dir));

    expect(result.tag).toBe("output");
    if (result.tag === "output") {
      const text = result.render.plain(result.value);
      expect(text).toBe("Reset channel to default.");
    }
  });

  it("shows current channel when no args", async () => {
    writeFileSync(join(dir, "pragma.config.toml"), 'channel = "prerelease"\n');

    const result = await channelCmd.execute({}, defaultCtx(dir));

    expect(result.tag).toBe("output");
    if (result.tag === "output") {
      expect(result.value).toBe("prerelease");
      const text = result.render.plain(result.value);
      expect(text).toBe("Current channel: prerelease");
    }
  });

  it("throws INVALID_INPUT for invalid channel", async () => {
    await expect(
      channelCmd.execute({ value: "aggressive" }, defaultCtx(dir)),
    ).rejects.toThrow('Invalid channel "aggressive"');
  });
});

describe("config show command", () => {
  let dir: string;
  const showCmd = collectConfigCommands().find(
    (c) => c.path.join(" ") === "config show",
  )!;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "pragma-cmd-show-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("renders show output with defaults", async () => {
    const result = await showCmd.execute({}, defaultCtx(dir));

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
      join(dir, "pragma.config.toml"),
      'tier = "apps/lxd"\nchannel = "experimental"\n',
    );

    const result = await showCmd.execute({}, defaultCtx(dir));

    expect(result.tag).toBe("output");
    if (result.tag === "output") {
      const text = result.render.plain(result.value);
      expect(text).toContain("tier: apps/lxd (global → apps → apps/lxd)");
      expect(text).toContain("channel: experimental (stable + experimental)");
      expect(text).toContain("config file:");
    }
  });
});
