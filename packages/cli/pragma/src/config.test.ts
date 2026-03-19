import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readConfig, writeConfig } from "./config.js";

describe("readConfig", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "pragma-config-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("returns defaults when no config file exists", () => {
    const config = readConfig(dir);
    expect(config).toEqual({ tier: undefined, channel: "normal" });
  });

  it("parses tier and channel", () => {
    writeFileSync(
      join(dir, "pragma.config.toml"),
      'tier = "apps/lxd"\nchannel = "experimental"\n',
    );
    const config = readConfig(dir);
    expect(config.tier).toBe("apps/lxd");
    expect(config.channel).toBe("experimental");
  });

  it("parses tier only, defaults channel to normal", () => {
    writeFileSync(join(dir, "pragma.config.toml"), 'tier = "global"\n');
    const config = readConfig(dir);
    expect(config.tier).toBe("global");
    expect(config.channel).toBe("normal");
  });

  it("parses channel only, tier is undefined", () => {
    writeFileSync(join(dir, "pragma.config.toml"), 'channel = "prerelease"\n');
    const config = readConfig(dir);
    expect(config.tier).toBeUndefined();
    expect(config.channel).toBe("prerelease");
  });

  it("handles empty file", () => {
    writeFileSync(join(dir, "pragma.config.toml"), "");
    const config = readConfig(dir);
    expect(config).toEqual({ tier: undefined, channel: "normal" });
  });

  it("throws on invalid channel", () => {
    writeFileSync(join(dir, "pragma.config.toml"), 'channel = "aggressive"\n');
    expect(() => readConfig(dir)).toThrow('Invalid channel "aggressive"');
  });

  it("ignores non-string tier", () => {
    writeFileSync(join(dir, "pragma.config.toml"), "tier = 42\n");
    const config = readConfig(dir);
    expect(config.tier).toBeUndefined();
  });
});

describe("writeConfig", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "pragma-config-write-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("creates a new config file with tier", () => {
    writeConfig(dir, { tier: "apps/lxd" });
    const config = readConfig(dir);
    expect(config.tier).toBe("apps/lxd");
    expect(config.channel).toBe("normal");
  });

  it("creates a new config file with channel", () => {
    writeConfig(dir, { channel: "experimental" });
    const config = readConfig(dir);
    expect(config.channel).toBe("experimental");
    expect(config.tier).toBeUndefined();
  });

  it("merges tier into existing config", () => {
    writeFileSync(join(dir, "pragma.config.toml"), 'channel = "prerelease"\n');
    writeConfig(dir, { tier: "global" });
    const config = readConfig(dir);
    expect(config.tier).toBe("global");
    expect(config.channel).toBe("prerelease");
  });

  it("removes tier when set to undefined", () => {
    writeFileSync(
      join(dir, "pragma.config.toml"),
      'tier = "apps"\nchannel = "normal"\n',
    );
    writeConfig(dir, { tier: undefined });
    const config = readConfig(dir);
    expect(config.tier).toBeUndefined();
    expect(config.channel).toBe("normal");
  });

  it("removes channel when set to undefined", () => {
    writeFileSync(
      join(dir, "pragma.config.toml"),
      'tier = "apps"\nchannel = "experimental"\n',
    );
    writeConfig(dir, { channel: undefined });
    const config = readConfig(dir);
    expect(config.tier).toBe("apps");
    // Channel defaults to "normal" when absent from file
    expect(config.channel).toBe("normal");
  });

  it("round-trips tier and channel through write then read", () => {
    writeConfig(dir, { tier: "apps/lxd", channel: "prerelease" });
    const config = readConfig(dir);
    expect(config.tier).toBe("apps/lxd");
    expect(config.channel).toBe("prerelease");
  });

  it("writes empty file when all fields removed", () => {
    writeFileSync(join(dir, "pragma.config.toml"), 'tier = "apps"\n');
    writeConfig(dir, { tier: undefined });
    const raw = readFileSync(join(dir, "pragma.config.toml"), "utf-8");
    expect(raw).toBe("");
  });
});
