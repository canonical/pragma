import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readConfig } from "./config.js";

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
