import { describe, expect, it } from "vitest";
import type { ConfigShowData } from "../operations/types.js";
import formatters from "./show.js";

const WITH_TIER: ConfigShowData = {
  tier: "apps/lxd",
  tierChain: ["global", "apps", "apps/lxd"],
  channel: "experimental",
  includedReleases: ["stable", "experimental"],
  packageManager: "bun",
  installSource: "bun (global)",
  configFilePath: "/project/pragma.config.json",
  configFileExists: true,
};

const WITHOUT_TIER: ConfigShowData = {
  tier: undefined,
  tierChain: [],
  channel: "normal",
  includedReleases: ["stable"],
  packageManager: "npm",
  installSource: "local install",
  configFilePath: "/project/pragma.config.json",
  configFileExists: false,
};

const PRERELEASE: ConfigShowData = {
  tier: "global",
  tierChain: ["global"],
  channel: "prerelease",
  includedReleases: ["stable", "experimental", "alpha", "beta"],
  packageManager: "pnpm",
  installSource: "pnpm (global)",
  configFilePath: "/project/pragma.config.json",
  configFileExists: true,
};

describe("formatters.plain", () => {
  it("renders full config with tier", () => {
    const output = formatters.plain(WITH_TIER);
    expect(output).toContain("tier: apps/lxd (global → apps → apps/lxd)");
    expect(output).toContain("channel: experimental (stable + experimental)");
    expect(output).toContain("installed via: bun (global)");
    expect(output).toContain("config file: /project/pragma.config.json");
  });

  it("renders config without tier", () => {
    const output = formatters.plain(WITHOUT_TIER);
    expect(output).toContain("tier: (none — all tiers visible)");
    expect(output).toContain("channel: normal (stable)");
    expect(output).toContain("installed via: local install");
    expect(output).toContain("config file: (not found)");
  });

  it("renders prerelease channel with all release levels", () => {
    const output = formatters.plain(PRERELEASE);
    expect(output).toContain(
      "channel: prerelease (stable + experimental + alpha + beta)",
    );
  });
});

describe("formatters.llm", () => {
  it("renders markdown heading", () => {
    const output = formatters.llm(WITH_TIER);
    expect(output).toContain("## Configuration");
  });

  it("renders tier info as markdown", () => {
    const output = formatters.llm(WITH_TIER);
    expect(output).toContain("**Tier:** apps/lxd (global > apps > apps/lxd)");
  });

  it("renders channel info as markdown", () => {
    const output = formatters.llm(WITH_TIER);
    expect(output).toContain(
      "**Channel:** experimental (stable, experimental)",
    );
  });

  it("renders config file path in backticks", () => {
    const output = formatters.llm(WITH_TIER);
    expect(output).toContain("`/project/pragma.config.json`");
  });

  it("renders no tier message", () => {
    const output = formatters.llm(WITHOUT_TIER);
    expect(output).toContain("**Tier:** none (all tiers visible)");
  });

  it("renders missing config file", () => {
    const output = formatters.llm(WITHOUT_TIER);
    expect(output).toContain("**Config file:** not found");
  });
});

describe("formatters.json", () => {
  it("returns valid JSON", () => {
    const text = formatters.json(WITH_TIER);
    const parsed = JSON.parse(text);
    expect(parsed.tier).toBe("apps/lxd");
    expect(parsed.channel).toBe("experimental");
    expect(parsed.tierChain).toEqual(["global", "apps", "apps/lxd"]);
    expect(parsed.includedReleases).toEqual(["stable", "experimental"]);
    expect(parsed.packageManager).toBe("bun");
    expect(parsed.configFileExists).toBe(true);
  });

  it("returns JSON without tier when undefined", () => {
    const text = formatters.json(WITHOUT_TIER);
    const parsed = JSON.parse(text);
    expect(parsed.tier).toBeUndefined();
    expect(parsed.tierChain).toEqual([]);
  });

  it("preserves all fields", () => {
    const text = formatters.json(PRERELEASE);
    const parsed = JSON.parse(text);
    expect(parsed.includedReleases).toEqual([
      "stable",
      "experimental",
      "alpha",
      "beta",
    ]);
  });
});
