import type { Store } from "@canonical/ke";
import type { TestStoreResult } from "@canonical/ke/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  DS_ONTOLOGY_TTL,
  DS_TIERS_TTL,
} from "../../../../testing/dsFixtures.js";
import { createTestStore } from "../../../../testing/store.js";
import {
  resolveConfigShow,
  validateChannel,
  validateTier,
} from "./operations.js";

const TIERS_TTL = [DS_ONTOLOGY_TTL, DS_TIERS_TTL].join("\n");

describe("validateTier", () => {
  let store: Store;
  let cleanup: TestStoreResult["cleanup"];

  beforeAll(async () => {
    const result = await createTestStore({ ttl: TIERS_TTL });
    store = result.store;
    cleanup = result.cleanup;
  });

  afterAll(async () => {
    await cleanup();
  });

  it("returns the matching TierEntry for a valid tier", async () => {
    const entry = await validateTier(store, "apps/lxd");
    expect(entry.path).toBe("apps/lxd");
    expect(entry.depth).toBe(2);
  });

  it("returns the global tier", async () => {
    const entry = await validateTier(store, "global");
    expect(entry.path).toBe("global");
    expect(entry.depth).toBe(0);
  });

  it("throws INVALID_INPUT for a nonexistent tier", async () => {
    await expect(validateTier(store, "apps/nonexistent")).rejects.toThrow(
      'Invalid tier "apps/nonexistent"',
    );
  });

  it("includes valid tier paths in error validOptions", async () => {
    try {
      await validateTier(store, "nope");
      expect.unreachable("should have thrown");
    } catch (err: unknown) {
      const pragmaErr = err as {
        code: string;
        validOptions: string[];
        recovery: string;
      };
      expect(pragmaErr.code).toBe("INVALID_INPUT");
      expect(pragmaErr.validOptions).toContain("global");
      expect(pragmaErr.validOptions).toContain("apps");
      expect(pragmaErr.validOptions).toContain("apps/lxd");
      expect(pragmaErr.recovery).toBe("pragma config tier --reset");
    }
  });
});

describe("validateChannel", () => {
  it("returns the channel for valid values", () => {
    expect(validateChannel("normal")).toBe("normal");
    expect(validateChannel("experimental")).toBe("experimental");
    expect(validateChannel("prerelease")).toBe("prerelease");
  });

  it("throws INVALID_INPUT for an invalid channel", () => {
    expect(() => validateChannel("aggressive")).toThrow(
      'Invalid channel "aggressive"',
    );
  });

  it("includes valid channels in error validOptions", () => {
    try {
      validateChannel("nope");
      expect.unreachable("should have thrown");
    } catch (err: unknown) {
      const pragmaErr = err as { code: string; validOptions: string[] };
      expect(pragmaErr.code).toBe("INVALID_INPUT");
      expect(pragmaErr.validOptions).toEqual([
        "normal",
        "experimental",
        "prerelease",
      ]);
    }
  });
});

describe("resolveConfigShow", () => {
  it("resolves tier chain and included releases", () => {
    const data = resolveConfigShow(
      { tier: "apps/lxd", channel: "experimental" },
      {
        packageManager: "bun",
        configFilePath: "/tmp/pragma.config.toml",
        configFileExists: true,
      },
    );

    expect(data.tier).toBe("apps/lxd");
    expect(data.tierChain).toEqual(["global", "apps", "apps/lxd"]);
    expect(data.channel).toBe("experimental");
    expect(data.includedReleases).toEqual(["stable", "experimental"]);
    expect(data.packageManager).toBe("bun");
    expect(data.configFileExists).toBe(true);
  });

  it("returns empty tier chain when no tier is set", () => {
    const data = resolveConfigShow(
      { tier: undefined, channel: "normal" },
      {
        packageManager: "npm",
        configFilePath: "/tmp/pragma.config.toml",
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
        configFilePath: "/tmp/pragma.config.toml",
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
