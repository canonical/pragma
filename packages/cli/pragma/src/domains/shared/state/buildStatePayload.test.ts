import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_ORIGINS } from "#config";
import { VERSION } from "#constants";
import type { SemanticPackage } from "../semanticPackage.js";
import buildStatePayload, {
  buildLiveStatePayload,
} from "./buildStatePayload.js";

const PACKAGES = [
  { name: "@canonical/design-system" },
  { name: "@canonical/code-standards" },
] as unknown as readonly SemanticPackage[];

describe("buildStatePayload", () => {
  it("carries the version and the four locked entries", () => {
    const payload = buildStatePayload({
      config: { tier: undefined, channel: "normal" },
      origins: DEFAULT_ORIGINS,
      packages: PACKAGES,
    });

    expect(payload.version).toBe(VERSION);
    expect(Object.keys(payload.state)).toEqual([
      "tier",
      "channel",
      "detail",
      "packages",
    ]);
  });

  it("renders an unset tier as null with an all-tiers effect", () => {
    const payload = buildStatePayload({
      config: { tier: undefined, channel: "normal" },
      origins: DEFAULT_ORIGINS,
      packages: PACKAGES,
    });

    expect(payload.state.tier.value).toBeNull();
    expect(payload.state.tier.origin).toBe("default");
    expect(payload.state.tier.effect).toContain("all tiers");
    expect(payload.state.tier.change.perCall).toContain("allTiers");
  });

  it("folds the tier chain into the effect when a tier is set", () => {
    const payload = buildStatePayload({
      config: { tier: "apps/lxd", channel: "normal" },
      origins: { ...DEFAULT_ORIGINS, tier: "project" },
      packages: PACKAGES,
    });

    expect(payload.state.tier.value).toBe("apps/lxd");
    expect(payload.state.tier.origin).toBe("project");
    expect(payload.state.tier.effect).toContain("global > apps > apps/lxd");
  });

  it("gives per-call overrides only to tier and detail", () => {
    const payload = buildStatePayload({
      config: { tier: undefined, channel: "normal" },
      origins: DEFAULT_ORIGINS,
      packages: PACKAGES,
    });

    expect(payload.state.tier.change.perCall).toBeDefined();
    expect(payload.state.detail.change.perCall).toBeDefined();
    expect(payload.state.channel.change.perCall).toBeUndefined();
    expect(payload.state.packages.change.perCall).toBeUndefined();
  });

  it("lists the loaded package names as the packages value", () => {
    const payload = buildStatePayload({
      config: { tier: undefined, channel: "normal" },
      origins: DEFAULT_ORIGINS,
      packages: PACKAGES,
    });

    expect(payload.state.packages.value).toEqual([
      "@canonical/design-system",
      "@canonical/code-standards",
    ]);
  });

  it("reports the detail default with its origin", () => {
    const payload = buildStatePayload({
      config: { tier: undefined, channel: "normal", detail: "digest" },
      origins: { ...DEFAULT_ORIGINS, detail: "global" },
      packages: PACKAGES,
    });

    expect(payload.state.detail.value).toBe("digest");
    expect(payload.state.detail.origin).toBe("global");
    expect(payload.state.detail.change.durable).toContain("config_detail");
  });
});

describe("buildLiveStatePayload", () => {
  let dir: string;
  let xdgDir: string;
  let originalXdg: string | undefined;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "pragma-state-live-"));
    mkdirSync(join(dir, ".git"));
    originalXdg = process.env.XDG_CONFIG_HOME;
    xdgDir = mkdtempSync(join(tmpdir(), "pragma-state-live-xdg-"));
    process.env.XDG_CONFIG_HOME = xdgDir;
  });

  afterEach(() => {
    process.env.XDG_CONFIG_HOME = originalXdg;
    rmSync(dir, { recursive: true, force: true });
    rmSync(xdgDir, { recursive: true, force: true });
  });

  it("re-reads the config layers from disk on each call", () => {
    writeFileSync(join(dir, "pragma.config.json"), '{"tier":"apps"}');
    const before = buildLiveStatePayload({ cwd: dir, packages: [] });
    expect(before.state.tier.value).toBe("apps");
    expect(before.state.tier.origin).toBe("project");

    writeFileSync(
      join(dir, "pragma.config.json"),
      '{"tier":"apps","detail":"detailed"}',
    );
    const after = buildLiveStatePayload({ cwd: dir, packages: [] });
    expect(after.state.detail.value).toBe("detailed");
    expect(after.state.detail.origin).toBe("project");
  });
});
