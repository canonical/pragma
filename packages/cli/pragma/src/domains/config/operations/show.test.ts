import { describe, expect, it } from "vitest";
import resolveConfigShow from "./show.js";

describe("resolveConfigShow", () => {
  it("resolves tier chain and included releases", () => {
    const data = resolveConfigShow(
      { tier: "apps/lxd", channel: "experimental" },
      {
        packageManager: "bun",
        installSource: "bun (global)",
        configFilePath: "/tmp/pragma.config.json",
        configFileExists: true,
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
        installSource: "local install",
        configFilePath: "/tmp/pragma.config.json",
        configFileExists: false,
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
