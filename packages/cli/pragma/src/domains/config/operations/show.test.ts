import { describe, expect, it } from "vitest";
import type { ConfigOrigins } from "#config";
import resolveConfigShow from "./show.js";

const PROJECT_ORIGINS: ConfigOrigins = {
  tier: "project",
  channel: "project",
  packages: "default",
  trace: "default",
  framework: "default",
};

const PROVENANCE = {
  globalConfigPath: "/home/u/.config/pragma/config.json",
  globalConfigExists: false,
  origins: PROJECT_ORIGINS,
};

describe("resolveConfigShow", () => {
  it("resolves tier chain and included releases", () => {
    const data = resolveConfigShow(
      { tier: "apps/lxd", channel: "experimental" },
      {
        packageManager: "bun",
        installSource: "bun (global)",
        configFilePath: "/tmp/pragma.config.json",
        configFileExists: true,
        ...PROVENANCE,
      },
    );

    expect(data.tier).toBe("apps/lxd");
    expect(data.tierChain).toEqual(["global", "apps", "apps/lxd"]);
    expect(data.channel).toBe("experimental");
    expect(data.includedReleases).toEqual(["stable", "experimental"]);
    expect(data.packageManager).toBe("bun");
    expect(data.installSource).toBe("bun (global)");
    expect(data.configFileExists).toBe(true);
  });

  it("returns empty tier chain when no tier is set", () => {
    const data = resolveConfigShow(
      { tier: undefined, channel: "normal" },
      {
        packageManager: "npm",
        installSource: "bun (local)",
        configFilePath: "/tmp/pragma.config.json",
        configFileExists: false,
        ...PROVENANCE,
      },
    );

    expect(data.tier).toBeUndefined();
    expect(data.tierChain).toEqual([]);
    expect(data.includedReleases).toEqual(["stable"]);
    expect(data.configFileExists).toBe(false);
  });

  it("includes all release levels for prerelease channel", () => {
    const data = resolveConfigShow(
      { tier: undefined, channel: "prerelease" },
      {
        packageManager: "pnpm",
        installSource: "pnpm (global)",
        configFilePath: "/tmp/pragma.config.json",
        configFileExists: true,
        ...PROVENANCE,
      },
    );

    expect(data.includedReleases).toEqual([
      "stable",
      "experimental",
      "alpha",
      "beta",
    ]);
  });
});
