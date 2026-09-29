import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { VERSION } from "../../constants.js";
import type { ConfigLayers } from "../config/types.js";
import { loadStoreSession } from "./loadSession.js";
import { parseSemver } from "./packVersion.js";
import { activePackPath, packDir } from "./paths.js";
import { describeIgnoredPack, resolveSources } from "./resolveSources.js";

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

/**
 * Write a pack's manifest.json at the given hash (the completeness marker).
 *
 * `version` is the CLI version that built the pack — the field the upgrade row
 * of the decision table compares. The default is deliberately NOT a version:
 * every case that predates the upgrade row keeps the built pack whatever CLI is
 * running, so those cases stay about what they were about.
 */
function writeManifest(dir: string, hash: string, version = "0"): void {
  writeFileSync(
    join(dir, "manifest.json"),
    JSON.stringify({
      name: "t",
      version,
      sourceRef: "t",
      contentHash: hash,
      prefixes: {},
      createdAt: BUILT_AT,
    }),
  );
}

/** The `createdAt` every fixture pack records — a fixed day, for the sentence. */
const BUILT_AT = "2026-09-10T21:49:00.411Z";

/** Materialize a COMPLETE pack — manifest + non-empty dump, schema, and index. */
function writeCompletePack(hash: string, version?: string): string {
  const dir = packDir(hash);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "data.nq"), "<urn:s> <urn:p> <urn:o> .\n");
  writeFileSync(join(dir, "schema.json"), "{}");
  writeFileSync(join(dir, "index.json"), "{}");
  writeFileSync(join(dir, "stories.json"), "[]");
  writeManifest(dir, hash, version);
  return dir;
}

/** A version one minor release below the running CLI, and one above it. */
function neighbouringVersions(): { older: string; newer: string } {
  const [major, minor] = parseSemver(VERSION) as [number, number, number];
  return {
    older: minor > 0 ? `${major}.${minor - 1}.0` : `${major - 1}.0.0`,
    newer: `${major}.${minor + 1}.0`,
  };
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

describe("resolveSources — a pack an older CLI built (the upgrade row)", () => {
  it("yields to the embedded snapshot, and names the pack it passed over", () => {
    // The reported bug: a pack built weeks ago by an older CLI answered every
    // read from the graph the upgrade replaced, and nothing said so.
    const cwd = tmp();
    const hash = "e".repeat(64);
    const { older } = neighbouringVersions();
    writeCompletePack(hash, older);
    writePointer(cwd, hash);

    expect(resolveSources(layersWith("default"), cwd)).toEqual({
      kind: "embedded",
      ignoredPack: { contentHash: hash, builtBy: older, builtAt: BUILT_AT },
    });
  });

  it("keeps the built pack when the project declares its OWN packs", () => {
    // A project with its own packs has its own graph, and a snapshot of the
    // distribution's is not a substitute for it, stale or not. Byte-identical
    // to the pre-existing pack row.
    const cwd = tmp();
    const hash = "f".repeat(64);
    const { older } = neighbouringVersions();
    const dir = writeCompletePack(hash, older);
    writePointer(cwd, hash);

    expect(resolveSources(layersWith("project"), cwd)).toEqual({
      kind: "pack",
      dir,
      contentHash: hash,
    });
  });

  it("keeps a pack this CLI, or a newer one, built", () => {
    const { newer } = neighbouringVersions();
    for (const version of [VERSION, newer]) {
      const cwd = tmp();
      const hash = version === VERSION ? "1".repeat(64) : "2".repeat(64);
      const dir = writeCompletePack(hash, version);
      writePointer(cwd, hash);

      expect(resolveSources(layersWith("default"), cwd)).toEqual({
        kind: "pack",
        dir,
        contentHash: hash,
      });
    }
  });

  it("names the version, the day, and both ways out", () => {
    expect(
      describeIgnoredPack({
        contentHash: "0e82d35c6668",
        builtBy: "0.37.0",
        builtAt: BUILT_AT,
      }),
    ).toBe(
      "a pack built by pragma 0.37.0 on 2026-09-10 is ignored — run `pragma sources update` to rebuild it or `pragma sources reset` to remove it",
    );
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
