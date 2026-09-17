/**
 * The first-install journey — this PR's whole point, pinned.
 *
 * A machine with no cache, no pointer, no network and an empty cwd must answer
 * real store-backed reads from the embedded pack, and must say honestly where
 * those answers come from. Equally: a project that declared its OWN packs and
 * never built them must NOT be handed the distribution's graph — it is a
 * different graph, and quietly serving it is the failure the boot decision
 * exists to prevent.
 *
 * Assertions pin MEMBERSHIP, never counts: the row counts move whenever the
 * upstream design system does, but a design system with no `Button`, or a tier
 * hierarchy with no `Global`, is a change a human should be made to look at.
 */

import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { storyModules } from "../../capabilities/distribution.js";
import { checkPackageRefs } from "../../capabilities/doctor/checks/checkPackageRefs.js";
import { promptListVerb } from "../../capabilities/prompt/verbs.js";
import { collectStatus } from "../../capabilities/sources/collectStatus.js";
import { PragmaError } from "../../kernel/error/PragmaError.js";
import { executeVerb } from "../../kernel/project/cli/dispatch.js";
import { bootRuntime } from "../../kernel/runtime/boot.js";
import { activePackPath, packDir } from "../../kernel/runtime/paths.js";
import type { GlobalFlags } from "../../kernel/runtime/types.js";
import type { CapabilityModule, VerbSpec } from "../../kernel/spec/types.js";
import { projectMcp } from "../helpers/projectMcp.js";

// Every case here boots its own runtime — a fresh install is what is under test —
// and the first read in the process parses the embedded pack cold: 65,000 triples,
// three seconds on an idle machine and more when every package's suite runs at
// once, which is how the release workflow runs them. The budget is a fact about
// the pack's size, not about any assertion, and it belongs to the file because
// whichever case runs first is the one that pays it.
vi.setConfig({ testTimeout: 60_000 });

const JSON_FLAGS: GlobalFlags = {
  llm: false,
  autoLlm: false,
  format: "json",
  verbose: false,
};
const NO_MUTATION = { dryRun: false, undo: false, yes: false };

const blockModule = storyModules.get("block");
if (!blockModule) {
  throw new Error('pragma.conf.ts declares no story for "block"');
}
const standardModule = storyModules.get("standard");
if (!standardModule) {
  throw new Error('pragma.conf.ts declares no story for "standard"');
}
const tierModule = storyModules.get("tier");
if (!tierModule) {
  throw new Error('pragma.conf.ts declares no story for "tier"');
}
const tokenModule = storyModules.get("token");
if (!tokenModule) {
  throw new Error('pragma.conf.ts declares no story for "token"');
}

const verbOf = (module: CapabilityModule, path: string): VerbSpec =>
  module.verbs.find((verb) => verb.path.join(" ") === path) as VerbSpec;

/** A cwd with nothing in it — the cold-install shape (the XDG dirs are isolated). */
const emptyCwd = (): string => mkdtempSync(join(tmpdir(), "pragma-first-"));

/**
 * A cwd whose `pragma.config.ts` declares its own packs and has never been
 * built — `origins.packs` is "project", so the embedded pack must not answer.
 */
function unbuiltProjectCwd(): string {
  const cwd = mkdtempSync(join(tmpdir(), "pragma-unbuilt-"));
  writeFileSync(
    join(cwd, "pragma.config.ts"),
    'export default { packs: [{ name: "mine", source: "file:///pragma-never-built" }] };\n',
  );
  return cwd;
}

/** Run a read verb at a cwd and return the parsed `data` payload. */
async function readData(verb: VerbSpec, cwd: string): Promise<unknown> {
  const outcome = await executeVerb(
    verb,
    {},
    NO_MUTATION,
    bootRuntime(JSON_FLAGS, cwd),
  );
  return (JSON.parse(outcome.stdout as string) as { data: unknown }).data;
}

describe("first install — an empty cwd answers real reads offline", () => {
  it("block list resolves the design system's blocks", async () => {
    const rows = (await readData(
      verbOf(blockModule, "block list"),
      emptyCwd(),
    )) as { name: string }[];
    expect(rows.map((row) => row.name)).toContain("Button");
  });

  it("standard list resolves the code standards", async () => {
    const rows = (await readData(
      verbOf(standardModule, "standard list"),
      emptyCwd(),
    )) as { uri: string; name: string }[];
    expect(rows.length).toBeGreaterThan(0);
    // Every row is a code standard from the standards pack's own namespace.
    for (const row of rows) {
      expect(row.uri).toContain("codestandards#");
    }
  });

  it("tier list resolves the tier hierarchy", async () => {
    const rows = (await readData(
      verbOf(tierModule, "tier list"),
      emptyCwd(),
    )) as { name: string }[];
    expect(rows.map((row) => row.name)).toContain("Global");
  });
});

describe("first install — empty results are honest, not papered over", () => {
  // `token list` used to be this describe's first case, asserting no rows
  // "because the graph carries no ds:Token". That is no longer true and the
  // change is the point: the noun addressed a class no shipped graph asserted,
  // it now addresses the token symbols, and the embedded pack carries them with
  // the name literal the story keys on — so a first install ANSWERS. The case
  // moved rather than being deleted, and it moved in both directions.
  // ONE case and ONE store boot for the whole token noun, deliberately. Each
  // `readData` here boots its own runtime — which is the point of this file,
  // since a fresh install is what is under test — and the embedded pack is the
  // expensive part of that. Three separate cases meant three boots of a
  // 53,467-triple store for three claims about the same install, which is a
  // cost this file pays under every parallel run for no extra coverage.
  it("the token noun answers a first install: rows, a named symbol, and honest emptiness", async () => {
    const cwd = emptyCwd();
    const runtime = bootRuntime(JSON_FLAGS, cwd);

    const read = async (
      verb: VerbSpec,
      params: Record<string, unknown> = {},
    ): Promise<unknown> => {
      const outcome = await executeVerb(verb, params, NO_MUTATION, runtime);
      return (JSON.parse(outcome.stdout as string) as { data: unknown }).data;
    };

    // The symbols resolve offline, from the embedded pack, with no build.
    const rows = (await read(verbOf(tokenModule, "token list"))) as {
      name: string;
    }[];
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) expect(row.name).toBeTruthy();

    // Membership, never a count — but asserted through a FILTER rather than
    // through the unfiltered page, because this is the first population large
    // enough for the page to matter: 436 symbols sort before `color.text`, so
    // it is not on the first page and an unfiltered `toContain` would be
    // testing the alphabet. A filter compiles INTO the query, so it answers
    // from the whole population however the rows happen to page.
    const matched = (await read(verbOf(tokenModule, "token list"), {
      search: "color.text",
    })) as { name: string }[];
    expect(matched.map((row) => row.name)).toContain("color.text");

    // The bindings between blocks and symbols now ride the pack too — they
    // are derived from the component anatomies the embedded snapshot carries —
    // so this verb ANSWERS on a first install where it used to be the honest
    // emptiness this describe was written around. The claim moved rather than
    // being deleted: what a first install owes the reader is a usable answer,
    // and the columns that make a row usable are asserted here.
    const consumers = (await read(verbOf(tokenModule, "token consumers"))) as {
      block: string;
      via?: string;
      symbol: string;
    }[];
    expect(consumers.length).toBeGreaterThan(0);
    for (const row of consumers) {
      // The CONSUMING block, which is the fact the verb exists for, and the
      // via only where the binding came from another block's tree.
      expect(row.block).toBeTruthy();
      expect(row.symbol).toBeTruthy();
      if (row.via) expect(row.via).not.toBe(row.block);
    }
  });

  it("prompt list exits calmly with no prompts (the graph carries no ds:Prompt)", async () => {
    expect(await readData(promptListVerb as VerbSpec, emptyCwd())).toEqual({
      prompts: [],
    });
  });
});

describe("first install — a project with its own unbuilt packs is refused", () => {
  it("a read throws STORE_UNAVAILABLE naming `pragma sources update`", async () => {
    let caught: unknown;
    try {
      await readData(verbOf(blockModule, "block list"), unbuiltProjectCwd());
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(PragmaError);
    expect((caught as PragmaError).code).toBe("STORE_UNAVAILABLE");
    expect((caught as PragmaError).recovery?.cli).toBe("pragma sources update");
  });

  it("doctor reports it as a failure, not a healthy install", async () => {
    const result = await checkPackageRefs(
      bootRuntime(JSON_FLAGS, unbuiltProjectCwd()),
    );
    expect(result.status).toBe("fail");
    expect(result.detail).toContain("the store has not been built");
    expect(result.remedy).toBe("pragma sources update");
  });
});

describe("first install — the surfaces say where the answers come from", () => {
  it("sources status reports the embedded snapshot with its provenance", async () => {
    const status = await collectStatus(bootRuntime(JSON_FLAGS, emptyCwd()));
    expect(status.store).toBe("embedded");
    // The upstream revisions the snapshot was compiled from — never "up to date".
    expect(status.sourceRef).toContain("@canonical/design-system@");
    expect(status.entityCount).toBeGreaterThan(0);
  });

  it("doctor passes, saying the packs came with the CLI rather than from the config", async () => {
    const result = await checkPackageRefs(bootRuntime(JSON_FLAGS, emptyCwd()));
    expect(result.status).toBe("pass");
    // What is pinned is the DISTINCTION — a fresh install reads packs it
    // shipped with, not packs this project configured — and that the row says
    // how to change that. The wording is the reader's ("shipped with the CLI"),
    // not the build's ("embedded snapshot"); the per-pack revisions moved to
    // the row's sub-items when each pack got its own line.
    expect(result.detail).toContain("shipped with the CLI");
    expect(result.detail).toContain("pragma sources update");
  });
});

describe("after an upgrade — a pack an older CLI built does not answer", () => {
  /**
   * A cwd pointed at a complete pack that some older CLI built.
   *
   * Planted rather than built: the point is what the boot does with the
   * POINTER, and the pack it names is never loaded — if it were, this pack's
   * one-triple graph would answer instead of the snapshot, which is exactly the
   * failure under test.
   */
  function stalePackCwd(): { cwd: string; hash: string } {
    const cwd = mkdtempSync(join(tmpdir(), "pragma-stale-"));
    const hash = "c".repeat(64);
    const dir = packDir(hash);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "data.nq"), "<urn:s> <urn:p> <urn:o> .\n");
    writeFileSync(join(dir, "schema.json"), "{}");
    writeFileSync(join(dir, "index.json"), "{}");
    writeFileSync(join(dir, "stories.json"), "[]");
    writeFileSync(
      join(dir, "manifest.json"),
      JSON.stringify({
        name: "pragma",
        version: "0.1.0",
        sourceRef: "@canonical/design-system@git:ac03466",
        contentHash: hash,
        prefixes: {},
        createdAt: "2026-09-10T21:49:00.411Z",
      }),
    );
    mkdirSync(dirname(activePackPath(cwd)), { recursive: true });
    writeFileSync(activePackPath(cwd), hash);
    return { cwd, hash };
  }

  it("the read answers from the shipped snapshot, and its meta names the pack", async () => {
    const { cwd, hash } = stalePackCwd();
    const outcome = await executeVerb(
      verbOf(blockModule, "block list"),
      {},
      NO_MUTATION,
      bootRuntime(JSON_FLAGS, cwd),
    );
    const envelope = JSON.parse(outcome.stdout as string) as {
      data: { name: string }[];
      meta: Record<string, unknown>;
    };
    // The upgrade's own graph answered — the planted pack holds one triple and
    // no blocks at all, so a row named Button can only have come from the
    // snapshot.
    expect(envelope.data.map((row) => row.name)).toContain("Button");
    // And the answer says, as data, which pack it did not come from.
    expect(envelope.meta.ignoredPack).toEqual({
      contentHash: hash,
      builtBy: "0.1.0",
      builtAt: "2026-09-10T21:49:00.411Z",
    });
  });

  it("the same read over MCP carries the same meta", async () => {
    const { cwd, hash } = stalePackCwd();
    const mcp = await projectMcp([blockModule], cwd);
    const envelope = await mcp.callTool("block_list");
    expect(envelope.meta).toMatchObject({
      ignoredPack: { contentHash: hash, builtBy: "0.1.0" },
    });
  });
});
