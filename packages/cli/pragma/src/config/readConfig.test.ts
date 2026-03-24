import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PragmaError } from "../error/PragmaError.js";
import readConfig from "./readConfig.js";
import writeConfig from "./writeConfig.js";

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
      join(dir, "pragma.config.json"),
      '{"tier":"apps/lxd","channel":"experimental"}',
    );
    const config = readConfig(dir);
    expect(config.tier).toBe("apps/lxd");
    expect(config.channel).toBe("experimental");
  });

  it("parses tier only, defaults channel to normal", () => {
    writeFileSync(join(dir, "pragma.config.json"), '{"tier":"global"}');
    const config = readConfig(dir);
    expect(config.tier).toBe("global");
    expect(config.channel).toBe("normal");
  });

  it("parses channel only, tier is undefined", () => {
    writeFileSync(join(dir, "pragma.config.json"), '{"channel":"prerelease"}');
    const config = readConfig(dir);
    expect(config.tier).toBeUndefined();
    expect(config.channel).toBe("prerelease");
  });

  it("handles empty file", () => {
    writeFileSync(join(dir, "pragma.config.json"), "");
    const config = readConfig(dir);
    expect(config).toEqual({ tier: undefined, channel: "normal" });
  });

  it("throws PragmaError on invalid channel", () => {
    writeFileSync(join(dir, "pragma.config.json"), '{"channel":"aggressive"}');
    expect(() => readConfig(dir)).toThrow(PragmaError);
    try {
      readConfig(dir);
    } catch (e) {
      expect(e).toBeInstanceOf(PragmaError);
      expect((e as PragmaError).code).toBe("CONFIG_ERROR");
      expect((e as PragmaError).validOptions).toEqual([
        "normal",
        "experimental",
        "prerelease",
      ]);
    }
  });

  it("ignores non-string tier", () => {
    writeFileSync(join(dir, "pragma.config.json"), '{"tier":42}');
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
    writeFileSync(join(dir, "pragma.config.json"), '{"channel":"prerelease"}');
    writeConfig(dir, { tier: "global" });
    const config = readConfig(dir);
    expect(config.tier).toBe("global");
    expect(config.channel).toBe("prerelease");
  });

  it("removes tier when set to undefined", () => {
    writeFileSync(
      join(dir, "pragma.config.json"),
      '{"tier":"apps","channel":"normal"}',
    );
    writeConfig(dir, { tier: undefined });
    const config = readConfig(dir);
    expect(config.tier).toBeUndefined();
    expect(config.channel).toBe("normal");
  });

  it("removes channel when set to undefined", () => {
    writeFileSync(
      join(dir, "pragma.config.json"),
      '{"tier":"apps","channel":"experimental"}',
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

  it("writes valid empty JSON when all fields removed", () => {
    writeFileSync(join(dir, "pragma.config.json"), '{"tier":"apps"}');
    writeConfig(dir, { tier: undefined });
    const raw = readFileSync(join(dir, "pragma.config.json"), "utf-8");
    expect(raw).toBe("{}\n");
  });

  it("throws on unparseable existing config instead of silently overwriting", () => {
    writeFileSync(join(dir, "pragma.config.json"), "{invalid json");
    expect(() => writeConfig(dir, { tier: "apps" })).toThrow();
  });
});
