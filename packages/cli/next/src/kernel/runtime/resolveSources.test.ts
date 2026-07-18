import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ConfigLayers } from "../config/types.js";
import { loadStoreSession } from "./loadSession.js";
import { writeLock } from "./lock.js";
import { packDir } from "./paths.js";
import { resolveSources } from "./resolveSources.js";

/**
 * Pin the store-boot decision table (`resolveSources`) — especially the two
 * STORE_UNAVAILABLE rows and the single `pragma sources update` recovery — so
 * the error/recovery UX PR3+ leans on cannot drift silently.
 */

let roots: string[] = [];
const tmp = (): string => {
  const dir = mkdtempSync(join(tmpdir(), "pragma-resolvesrc-"));
  roots.push(dir);
  return dir;
};

/** Config layers whose only relevant knob is the `packages` origin. */
function layersWith(packagesOrigin: "default" | "project"): ConfigLayers {
  return {
    config: {
      channel: "normal",
      packages:
        packagesOrigin === "project"
          ? [{ name: "x", source: "file:///x" }]
          : [],
    },
    origins: {
      tier: "default",
      channel: "default",
      detail: "default",
      packages: packagesOrigin,
      stories: "default",
      prefixes: "default",
      prompts: "default",
    },
    global: { path: "/nonexistent", exists: false },
    project: { exists: false },
  };
}

/** Materialize a COMPLETE pack (manifest + non-empty dump) at the given hash. */
function writeCompletePack(hash: string): string {
  const dir = packDir(hash);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "data.nq"), "<urn:s> <urn:p> <urn:o> .\n");
  writeFileSync(
    join(dir, "manifest.json"),
    JSON.stringify({
      name: "t",
      version: "0",
      sourceRef: "t",
      contentHash: hash,
      prefixes: {},
      createdAt: new Date().toISOString(),
    }),
  );
  return dir;
}

beforeEach(() => {
  roots = [];
});
afterEach(() => {
  for (const dir of roots) rmSync(dir, { recursive: true, force: true });
});

describe("resolveSources decision table", () => {
  it("lock present + pack cached → load the locked pack", () => {
    const cwd = tmp();
    const hash = "a".repeat(64);
    const dir = writeCompletePack(hash);
    writeLock(cwd, { version: 1, contentHash: hash, packs: [] });

    expect(resolveSources(layersWith("default"), cwd)).toEqual({
      kind: "pack",
      dir,
      contentHash: hash,
    });
  });

  it("lock present + pack evicted → STORE_UNAVAILABLE", () => {
    const cwd = tmp();
    // A lock whose content-addressed pack is absent from the cache.
    writeLock(cwd, { version: 1, contentHash: "b".repeat(64), packs: [] });

    expect(resolveSources(layersWith("default"), cwd)).toEqual({
      kind: "unavailable",
      reason: "the locked pack is missing from the cache",
    });
  });

  it("no lock + default packages → embedded fallback", () => {
    expect(resolveSources(layersWith("default"), tmp())).toEqual({
      kind: "embedded",
    });
  });

  it("no lock + packages configured → STORE_UNAVAILABLE", () => {
    expect(resolveSources(layersWith("project"), tmp())).toEqual({
      kind: "unavailable",
      reason: "packages are configured but the store has not been built",
    });
  });
});

describe("loadStoreSession recovery", () => {
  it("surfaces the single `pragma sources update` recovery when cold", async () => {
    const cwd = tmp();
    const ctx = { cwd, loadConfig: async () => layersWith("project") };

    await expect(loadStoreSession(ctx)).rejects.toMatchObject({
      code: "STORE_UNAVAILABLE",
      recovery: { cli: "pragma sources update" },
    });
  });
});
