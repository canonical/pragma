import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ConfigLayers } from "../config/types.js";
import { loadStoreSession } from "./loadSession.js";
import { activePackPath, packDir } from "./paths.js";
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

/** Config layers whose only relevant knob is the `packs` origin. */
function layersWith(packsOrigin: "default" | "project"): ConfigLayers {
  return {
    config: {
      channel: "normal",
      packs:
        packsOrigin === "project" ? [{ name: "x", source: "file:///x" }] : [],
    },
    origins: {
      tier: "default",
      channel: "default",
      detail: "default",
      packs: packsOrigin,
      stories: "default",
      prefixes: "default",
    },
    global: { path: "/nonexistent", exists: false },
    project: { exists: false },
  };
}

/** Write a pack's manifest.json at the given hash (the completeness marker). */
function writeManifest(dir: string, hash: string): void {
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
}

/** Materialize a COMPLETE pack — manifest + non-empty dump, schema, and index. */
function writeCompletePack(hash: string): string {
  const dir = packDir(hash);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "data.nq"), "<urn:s> <urn:p> <urn:o> .\n");
  writeFileSync(join(dir, "schema.json"), "{}");
  writeFileSync(join(dir, "index.json"), "{}");
  writeFileSync(join(dir, "stories.json"), "[]");
  writeManifest(dir, hash);
  return dir;
}

/** Plant the active-pack pointer a `sources update` would have written. */
function writePointer(cwd: string, content: string): void {
  const path = activePackPath(cwd);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

beforeEach(() => {
  roots = [];
});
afterEach(() => {
  for (const dir of roots) rmSync(dir, { recursive: true, force: true });
});

describe("resolveSources decision table", () => {
  it("pointer present + pack cached → load the built pack", () => {
    const cwd = tmp();
    const hash = "a".repeat(64);
    const dir = writeCompletePack(hash);
    writePointer(cwd, hash);

    expect(resolveSources(layersWith("default"), cwd)).toEqual({
      kind: "pack",
      dir,
      contentHash: hash,
    });
  });

  it("pointer present + pack evicted → STORE_UNAVAILABLE", () => {
    const cwd = tmp();
    // A pointer whose content-addressed pack is absent from the cache.
    writePointer(cwd, "b".repeat(64));

    expect(resolveSources(layersWith("default"), cwd)).toEqual({
      kind: "unavailable",
      reason: "the built pack is missing from the cache",
    });
  });

  it("pointer present + pack with a torn schema/index → STORE_UNAVAILABLE", () => {
    const cwd = tmp();
    const hash = "c".repeat(64);
    // manifest + non-empty dump present, but the extracted schema/index are
    // missing (a torn or partially-evicted pack). This used to slip through
    // `packIsComplete` and then crash at read time as an INTERNAL error; it must
    // now be treated as not-built so the boot surfaces STORE_UNAVAILABLE — and
    // say INCOMPLETE, not "missing", because the directory is right there. This
    // is also the shape every pack built before `stories.json` now takes.
    const dir = packDir(hash);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "data.nq"), "<urn:s> <urn:p> <urn:o> .\n");
    writeManifest(dir, hash);
    writePointer(cwd, hash);

    expect(resolveSources(layersWith("default"), cwd)).toEqual({
      kind: "unavailable",
      reason: "the built pack is incomplete — an older or torn build",
    });
  });

  it("pointer present + a pack whose stories.json is not an array → STORE_UNAVAILABLE", () => {
    const cwd = tmp();
    const hash = "d".repeat(64);
    const dir = writeCompletePack(hash);
    // Every file present and non-empty, but `stories.json` holds an object.
    // Gated on size alone this passed, so `buildPack` REUSED the directory and
    // every package-declared noun disappeared while `sources update` reported
    // success. It is a torn build like any other, and says so.
    writeFileSync(join(dir, "stories.json"), '{"noun":"recipe"}');
    writePointer(cwd, hash);

    expect(resolveSources(layersWith("default"), cwd)).toEqual({
      kind: "unavailable",
      reason: "the built pack is incomplete — an older or torn build",
    });
  });

  it("a malformed pointer is treated as absent, not as a pack name", () => {
    // A truncated/garbage pointer must never name a cache directory. With
    // default packs it falls through to the embedded row, exactly as no
    // pointer at all would.
    const cwd = tmp();
    writePointer(cwd, "not-a-content-hash\n");

    expect(resolveSources(layersWith("default"), cwd)).toEqual({
      kind: "embedded",
    });
    expect(resolveSources(layersWith("project"), cwd)).toEqual({
      kind: "unavailable",
      reason: "packs are configured but the store has not been built",
    });
  });

  it("no pointer + default packs → embedded fallback", () => {
    expect(resolveSources(layersWith("default"), tmp())).toEqual({
      kind: "embedded",
    });
  });

  it("no pointer + packs configured → STORE_UNAVAILABLE", () => {
    expect(resolveSources(layersWith("project"), tmp())).toEqual({
      kind: "unavailable",
      reason: "packs are configured but the store has not been built",
    });
  });
});

describe("loadStoreSession recovery", () => {
  it("surfaces the `pragma sources update` recovery (CLI + MCP tool) when cold", async () => {
    const cwd = tmp();
    const ctx = { cwd, loadConfig: async () => layersWith("project") };

    // An agent can't run a shell command — the recovery also names the tool it
    // calls (then retries: PR9 C1 cold-store retry makes the retry succeed).
    await expect(loadStoreSession(ctx)).rejects.toMatchObject({
      code: "STORE_UNAVAILABLE",
      recovery: {
        cli: "pragma sources update",
        mcp: { tool: "sources_update" },
      },
    });
  });
});
