import { describe, expect, it } from "vitest";
import type { ConfigShowData } from "./operations.js";
import {
  renderConfigResetPlain,
  renderConfigSetPlain,
  renderConfigShowPlain,
} from "./renderConfigPlain.js";

describe("renderConfigSetPlain", () => {
  it("renders tier set message", () => {
    expect(renderConfigSetPlain("tier", "apps/lxd")).toBe(
      'Set tier to "apps/lxd".',
    );
  });

  it("renders channel set message", () => {
    expect(renderConfigSetPlain("channel", "experimental")).toBe(
      'Set channel to "experimental".',
    );
  });
});

describe("renderConfigResetPlain", () => {
  it("renders tier reset message", () => {
    expect(renderConfigResetPlain("tier")).toBe("Reset tier to default.");
  });

  it("renders channel reset message", () => {
    expect(renderConfigResetPlain("channel")).toBe("Reset channel to default.");
  });
});

describe("renderConfigShowPlain", () => {
  it("renders full config with tier", () => {
    const data: ConfigShowData = {
      tier: "apps/lxd",
      tierChain: ["global", "apps", "apps/lxd"],
      channel: "experimental",
      includedReleases: ["stable", "experimental"],
      packageManager: "bun",
      configFilePath: "/project/pragma.config.toml",
      configFileExists: true,
    };

    const output = renderConfigShowPlain(data);

    expect(output).toContain("tier: apps/lxd (global → apps → apps/lxd)");
    expect(output).toContain("channel: experimental (stable + experimental)");
    expect(output).toContain("installed via: bun");
    expect(output).toContain("config file: /project/pragma.config.toml");
  });

  it("renders config without tier", () => {
    const data: ConfigShowData = {
      tier: undefined,
      tierChain: [],
      channel: "normal",
      includedReleases: ["stable"],
      packageManager: "npm",
      configFilePath: "/project/pragma.config.toml",
      configFileExists: false,
    };

    const output = renderConfigShowPlain(data);

    expect(output).toContain("tier: (none — all tiers visible)");
    expect(output).toContain("channel: normal (stable)");
    expect(output).toContain("config file: (not found)");
  });

  it("renders prerelease channel with all release levels", () => {
    const data: ConfigShowData = {
      tier: "global",
      tierChain: ["global"],
      channel: "prerelease",
      includedReleases: ["stable", "experimental", "alpha", "beta"],
      packageManager: "pnpm",
      configFilePath: "/project/pragma.config.toml",
      configFileExists: true,
    };

    const output = renderConfigShowPlain(data);

    expect(output).toContain(
      "channel: prerelease (stable + experimental + alpha + beta)",
    );
  });
});
