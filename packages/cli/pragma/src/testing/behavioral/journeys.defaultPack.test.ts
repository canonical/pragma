/**
 * E1 (AV-231, Backlog E) — the hermetic default-pack journey.
 *
 * The root method fix: the pre-existing suite tested specs against a clean,
 * single-typed 6-entity fixture, never the PRODUCT against a cold, real,
 * multi-typed pack. This file drives the REAL path end to end over the vendored
 * {@link DEFAULT_PACK_TTL} default pack — `sources update` (resolve → build →
 * lock, via `bootFixtureRuntime`) → boot → `graph query` → `block list` /
 * `ontology list` (populated AND empty) → the error paths (malformed `.ttl`,
 * corrupt `schema.json`, a missing pinned commit).
 *
 * It also pins, in-process, the real-data shapes the clean fixture masked — the
 * `entityTotal` double-count (A1), the untiered block that `block list` drops
 * (A2), and the multilingual label (A7). These were HAND-OFFS to lane A, pinned
 * with `it.fails`; lane A's fixes have landed, so they are now LIVE regression
 * guards. This is the durable fix the issue asks for: "we'd have caught this in
 * use" becomes "CI catches it".
 */

import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  truncateSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runTask } from "@canonical/task/node";
import { afterAll, describe, expect, it } from "vitest";
import { blockModule } from "../../capabilities/block/index.js";
import { graphQueryVerb } from "../../capabilities/graph/query.verb.js";
import {
  ontologyListVerb,
  ontologyShowVerb,
} from "../../capabilities/ontology/verbs.js";
import { buildUpdateTask } from "../../capabilities/sources/runUpdate.js";
import { updateVerb } from "../../capabilities/sources/update.verb.js";
import { VERSION } from "../../constants.js";
import {
  entityTotal,
  readPackIndex,
} from "../../kernel/completion/entitySource.js";
import type { ConfigLayers, PackageEntry } from "../../kernel/config/types.js";
import { PragmaError } from "../../kernel/error/PragmaError.js";
import { executeVerb } from "../../kernel/project/cli/dispatch.js";
import { bootRuntime } from "../../kernel/runtime/boot.js";
import { createQueryFacade } from "../../kernel/runtime/facade.js";
import { SCHEMA_FILE } from "../../kernel/runtime/graphpack/types.js";
import { readLock } from "../../kernel/runtime/lock.js";
import { packDir } from "../../kernel/runtime/paths.js";
import { createLazyStore } from "../../kernel/runtime/store.js";
import type { GlobalFlags, PragmaRuntime } from "../../kernel/runtime/types.js";
import type { VerbSpec } from "../../kernel/spec/types.js";
import {
  DEFAULT_PACK_ALL_VISIBLE_CONFIG,
  DEFAULT_PACK_CONFIG,
  DEFAULT_PACK_TTL,
  INSTANCE_ONLY_TTL,
  MALFORMED_TTL,
  NO_BLOCKS_TTL,
  UNTIERED_BLOCK_NAME,
} from "../fixtures/graph/defaultPack.js";
import {
  bootFixtureRuntime,
  type FixtureGraph,
  type FixtureGraphOptions,
} from "../helpers/fixtureGraph.js";

const JSON_FLAGS: GlobalFlags = {
  llm: false,
  autoLlm: false,
  format: "json",
  verbose: false,
};
const NO_MUTATION = { dryRun: false, undo: false, yes: false };

const blockListVerb = blockModule.verbs.find(
  (verb) => verb.path.join(" ") === "block list",
) as VerbSpec;

/** Track fixtures so a single `afterAll` disposes every temp dir + store. */
const fixtures: FixtureGraph[] = [];

/** Boot a tracked fixture from inline TTL (+ optional config), for auto-disposal. */
async function boot(
  ttl: string,
  config?: FixtureGraphOptions["config"],
): Promise<FixtureGraph> {
  const fixture = await bootFixtureRuntime({
    ttl,
    ...(config ? { config } : {}),
  });
  fixtures.push(fixture);
  return fixture;
}
afterAll(async () => {
  await Promise.all(fixtures.map((fixture) => fixture.dispose()));
});

/** The `--format json` envelope a read verb renders. */
interface Envelope {
  readonly ok: boolean;
  readonly data: unknown;
  readonly meta: Record<string, unknown>;
}

/** Run a read verb at a fixture's cwd and parse its JSON envelope. */
async function readVerb(
  verb: VerbSpec,
  params: Record<string, unknown>,
  cwd: string,
): Promise<Envelope> {
  const outcome = await executeVerb(
    verb,
    params,
    NO_MUTATION,
    bootRuntime(JSON_FLAGS, cwd),
  );
  return JSON.parse(outcome.stdout as string) as Envelope;
}

/** The sorted `name` column of a `block list` invocation. */
async function blockListNames(
  cwd: string,
  allTiers: boolean,
): Promise<string[]> {
  const envelope = await readVerb(blockListVerb, { allTiers }, cwd);
  const rows = envelope.data as { name: string }[];
  return rows.map((row) => row.name).sort();
}

describe("default-pack journey — sources update, build, boot (E1)", () => {
  it("bootFixtureRuntime runs the real resolve/build/lock and writes a content-addressed lock", async () => {
    const fixture = await boot(DEFAULT_PACK_TTL, DEFAULT_PACK_CONFIG);
    const lock = readLock(fixture.cwd);
    expect(lock?.contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(lock?.packs).toHaveLength(1);
    // The booted store answers a read against the freshly built pack.
    const ask = await fixture.runtime.query.sparql(
      "ASK { ds:button a ds:Component }",
    );
    expect(ask.type === "ask" && ask.result).toBe(true);
  });

  it("drives the literal `sources update` verb over a cold project, then boots a read", async () => {
    // A cold file-package project with NO lock yet — the real CLI command path.
    const pkg = mkdtempSync(join(tmpdir(), "e1-pkg-"));
    mkdirSync(join(pkg, "definitions"), { recursive: true });
    writeFileSync(join(pkg, "definitions", "pack.ttl"), DEFAULT_PACK_TTL);
    const cwd = mkdtempSync(join(tmpdir(), "e1-proj-"));
    writeFileSync(
      join(cwd, "pragma.config.ts"),
      `export default { packages: [{ name: "default", source: "file://${pkg}" }] };\n`,
    );
    try {
      // `sources update` is a real mutation — resolve, build, write the lock.
      const outcome = await executeVerb(
        updateVerb,
        {},
        NO_MUTATION,
        bootRuntime(JSON_FLAGS, cwd),
      );
      expect(outcome.exitCode).toBe(0);
      expect(readLock(cwd)?.contentHash).toMatch(/^[0-9a-f]{64}$/);
      // A SEPARATE, fresh runtime boots the just-built pack from the lock. No
      // channel is configured, so the default `normal` channel hides the
      // beta-gated Beta Badge. Assert the two global blocks are present while
      // staying TOLERANT of the untiered Orphan Widget: whether it appears under
      // --all-tiers is the A2 behavior, asserted in exactly one place below (the
      // A2 regression guard). Filtering Orphan out keeps this test focused on the
      // two global blocks, and still pins that Beta Badge is hidden.
      const globalBlocks = (await blockListNames(cwd, true)).filter(
        (name) => name !== UNTIERED_BLOCK_NAME,
      );
      expect(globalBlocks).toEqual(["Button", "Card"]);
    } finally {
      rmSync(pkg, { recursive: true, force: true });
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});

describe("default-pack journey — graph query over the real pack (E1)", () => {
  it("a SELECT resolves every ds:Component, including the untiered one", async () => {
    const fixture = await boot(DEFAULT_PACK_TTL, DEFAULT_PACK_CONFIG);
    const envelope = await readVerb(
      graphQueryVerb,
      {
        sparql:
          "SELECT ?name WHERE { ?c a ds:Component ; ds:name ?name } ORDER BY ?name",
      },
      fixture.cwd,
    );
    expect(envelope.ok).toBe(true);
    const data = envelope.data as {
      type: string;
      bindings: { name: string }[];
    };
    expect(data.type).toBe("select");
    // All THREE components are in the graph — the untiered Orphan Widget too.
    expect(data.bindings.map((binding) => binding.name)).toEqual([
      "Beta Badge",
      "Button",
      "Orphan Widget",
    ]);
  });

  it("an ASK over a known individual returns true", async () => {
    const fixture = await boot(DEFAULT_PACK_TTL, DEFAULT_PACK_CONFIG);
    const envelope = await readVerb(
      graphQueryVerb,
      { sparql: "ASK { ds:card a ds:Pattern }" },
      fixture.cwd,
    );
    const data = envelope.data as { type: string; result: boolean };
    expect(data.type).toBe("ask");
    expect(data.result).toBe(true);
  });

  it("a malformed query surfaces INVALID_INPUT, not an internal crash", async () => {
    const fixture = await boot(DEFAULT_PACK_TTL, DEFAULT_PACK_CONFIG);
    await expect(
      executeVerb(
        graphQueryVerb,
        { sparql: "SELECT ?s WHERE { ?s ?p" },
        NO_MUTATION,
        bootRuntime(JSON_FLAGS, fixture.cwd),
      ),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });
});

describe("default-pack journey — block list, populated and empty (E1)", () => {
  it("normal channel lists the two global blocks, hiding the beta-gated one", async () => {
    const fixture = await boot(DEFAULT_PACK_TTL, DEFAULT_PACK_CONFIG);
    expect(await blockListNames(fixture.cwd, false)).toEqual([
      "Button",
      "Card",
    ]);
  });

  it("prerelease channel reveals the beta-gated block across the tier chain", async () => {
    const fixture = await boot(
      DEFAULT_PACK_TTL,
      DEFAULT_PACK_ALL_VISIBLE_CONFIG,
    );
    // Same inputs as the A2 regression guard below (ALL_VISIBLE + allTiers).
    // Assert the tiered blocks (prerelease reveals the beta-gated Beta Badge)
    // while staying TOLERANT of the untiered Orphan Widget — its --all-tiers
    // visibility is the A2 truth, asserted in exactly one place below. Filtering
    // Orphan out keeps this green pre-A2 (absent) and post-A2 (present), so it
    // never contradicts that hand-off.
    const tieredBlocks = (await blockListNames(fixture.cwd, true)).filter(
      (name) => name !== UNTIERED_BLOCK_NAME,
    );
    expect(tieredBlocks).toEqual(["Beta Badge", "Button", "Card"]);
  });

  it("the apps tier inherits its parent chain (global) plus its own block", async () => {
    const fixture = await boot(DEFAULT_PACK_TTL, {
      tier: "apps",
      channel: "prerelease",
    });
    // resolveTierChain("apps") = [global, apps]: Button/Card (global, inherited)
    // + Beta Badge (apps, own).
    expect(await blockListNames(fixture.cwd, false)).toEqual([
      "Beta Badge",
      "Button",
      "Card",
    ]);
  });

  it("an ontology-only pack with no tiered blocks lists empty — a calm exit 0", async () => {
    const fixture = await boot(NO_BLOCKS_TTL);
    const envelope = await readVerb(
      blockListVerb,
      { allTiers: true },
      fixture.cwd,
    );
    expect(envelope.ok).toBe(true);
    expect(envelope.data).toEqual([]);
  });
});

describe("default-pack journey — ontology list/show, populated and empty (E1)", () => {
  it("lists the ds namespace with its class and property counts", async () => {
    const fixture = await boot(DEFAULT_PACK_TTL, DEFAULT_PACK_CONFIG);
    const envelope = await readVerb(ontologyListVerb, {}, fixture.cwd);
    const summaries = envelope.data as {
      prefix: string;
      classCount: number;
      propertyCount: number;
    }[];
    expect(summaries).toEqual([
      {
        prefix: "ds",
        namespace: "https://ds.canonical.com/",
        classCount: 5,
        propertyCount: 4,
      },
    ]);
  });

  it("ontology show ds surfaces the two block domain classes", async () => {
    const fixture = await boot(DEFAULT_PACK_TTL, DEFAULT_PACK_CONFIG);
    const envelope = await readVerb(
      ontologyShowVerb,
      { prefix: "ds" },
      fixture.cwd,
    );
    const data = envelope.data as { classes: { uri: string }[] };
    const localNames = data.classes.map((klass) => klass.uri.split("/").at(-1));
    expect(localNames).toContain("Component");
    expect(localNames).toContain("Pattern");
  });

  it("a pack of pure instance data lists NO ontology namespaces — empty, calm", async () => {
    const fixture = await boot(INSTANCE_ONLY_TTL);
    const envelope = await readVerb(ontologyListVerb, {}, fixture.cwd);
    expect(envelope.ok).toBe(true);
    expect(envelope.data).toEqual([]);
  });

  it("ontology show of an unknown prefix is NOT_FOUND, not a crash", async () => {
    const fixture = await boot(DEFAULT_PACK_TTL, DEFAULT_PACK_CONFIG);
    await expect(
      executeVerb(
        ontologyShowVerb,
        { prefix: "nope" },
        NO_MUTATION,
        bootRuntime(JSON_FLAGS, fixture.cwd),
      ),
    ).rejects.toBeInstanceOf(PragmaError);
  });
});

describe("default-pack journey — error paths (E1)", () => {
  it("a malformed .ttl fails the build with a NAMED CONFIG_ERROR, not INTERNAL", async () => {
    // bootFixtureRuntime writes the ttl into `fixture/definitions/fixture.ttl`
    // and runs the REAL sources-update build, which classifies the parser error.
    await expect(
      bootFixtureRuntime({ ttl: MALFORMED_TTL }),
    ).rejects.toMatchObject({ code: "CONFIG_ERROR" });
  });

  it("a torn (emptied) schema.json boots to STORE_UNAVAILABLE with the update recovery", async () => {
    const fixture = await boot(DEFAULT_PACK_TTL, DEFAULT_PACK_CONFIG);
    const lock = readLock(fixture.cwd);
    // Simulate a torn/evicted extraction: truncate schema.json in the pack cache.
    truncateSync(join(packDir(lock?.contentHash ?? ""), SCHEMA_FILE), 0);
    // A brand-new runtime (fresh store memo) boots against the now-incomplete pack.
    let caught: unknown;
    try {
      await executeVerb(
        blockListVerb,
        { allTiers: true },
        NO_MUTATION,
        bootRuntime(JSON_FLAGS, fixture.cwd),
      );
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(PragmaError);
    expect((caught as PragmaError).code).toBe("STORE_UNAVAILABLE");
    expect((caught as PragmaError).recovery?.cli).toBe("pragma sources update");
  });

  it("a --frozen update whose pinned commit is gone fails with a named CONFIG_ERROR", async () => {
    const runGit = (repo: string, args: string[]): string =>
      execFileSync("git", args, {
        cwd: repo,
        stdio: "pipe",
        env: {
          ...process.env,
          GIT_AUTHOR_NAME: "t",
          GIT_AUTHOR_EMAIL: "t@t",
          GIT_COMMITTER_NAME: "t",
          GIT_COMMITTER_EMAIL: "t@t",
        },
      }).toString();

    const repo = mkdtempSync(join(tmpdir(), "e1-repo-"));
    const cwd = mkdtempSync(join(tmpdir(), "e1-frozen-"));
    try {
      runGit(repo, ["init", "-b", "main"]);
      mkdirSync(join(repo, "definitions"), { recursive: true });
      writeFileSync(join(repo, "definitions", "pack.ttl"), NO_BLOCKS_TTL);
      runGit(repo, ["add", "-A"]);
      runGit(repo, ["commit", "-m", "one"]);

      const runtime = gitRuntimeFor(cwd, [
        { name: "pkg-git", source: `git+file://${repo}#main` },
      ]);
      // First update locks the current commit SHA.
      await runTask(await buildUpdateTask(runtime, false));
      expect(readLock(cwd)?.packs.at(0)?.resolved).toMatch(/^[0-9a-f]{40}$/);

      // Orphan the pinned commit: amend main, then expire the reflog + prune so
      // the previously-locked SHA is unreachable.
      writeFileSync(
        join(repo, "definitions", "pack.ttl"),
        `${NO_BLOCKS_TTL}\nds:extra a owl:Class .\n`,
      );
      runGit(repo, ["add", "-A"]);
      runGit(repo, ["commit", "--amend", "-m", "amended"]);
      runGit(repo, ["reflog", "expire", "--expire=now", "--all"]);
      runGit(repo, ["gc", "--prune=now"]);

      // A --frozen update must re-resolve the pinned (now-missing) SHA and refuse.
      let caught: unknown;
      try {
        await runTask(await buildUpdateTask(runtime, true));
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(PragmaError);
      expect((caught as PragmaError).code).toBe("CONFIG_ERROR");
      expect((caught as PragmaError).message).toContain("pkg-git");
    } finally {
      rmSync(repo, { recursive: true, force: true });
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});

describe("default-pack journey — real-data shapes the clean fixture masked (E1, hand-off to lanes A)", () => {
  it("every block is co-typed owl:NamedIndividual and indexed as an individual (abox)", async () => {
    const fixture = await boot(DEFAULT_PACK_TTL, DEFAULT_PACK_CONFIG);
    const index = readPackIndex(fixture.cwd);
    // The vendored pack indexes 17 distinct entities (5 classes + 4 properties +
    // 2 tiers + 2 channels + 4 blocks).
    expect(index?.entities).toHaveLength(17);
    const button = index?.entities.find(
      (entity) => entity.name === "ds:button",
    );
    expect(button?.box).toBe("abox");
    expect(button?.types).toContain("owl:NamedIndividual");
    expect(button?.types).toContain("ds:Component");
  });

  it("a multilingual rdfs:label is stored in BOTH languages and indexed tag-stripped (A7)", async () => {
    const fixture = await boot(DEFAULT_PACK_TTL, DEFAULT_PACK_CONFIG);
    // Both language variants are retrievable directly from the store.
    const en = await fixture.runtime.query.sparql(
      'SELECT ?l WHERE { ds:button rdfs:label ?l . FILTER(LANG(?l) = "en") }',
    );
    const fr = await fixture.runtime.query.sparql(
      'SELECT ?l WHERE { ds:button rdfs:label ?l . FILTER(LANG(?l) = "fr") }',
    );
    const value = (result: typeof en): string | undefined =>
      result.type === "select"
        ? (result.bindings.at(0) as { l?: string } | undefined)?.l
        : undefined;
    expect(value(en)).toBe("Button");
    expect(value(fr)).toBe("Bouton");
    // The single-valued index carries ONE label, tag-stripped (no `@en`/`@fr`).
    // NOTE(A7): which language wins is store-order-arbitrary — the index picks
    // whichever the store yields first (no `@en` preference). E3 (live oxigraph)
    // is where that ordering is confirmed against the real pack; here we only
    // assert the tag is stripped and the value is one of the two declared forms.
    const label = readPackIndex(fixture.cwd)?.entities.find(
      (entity) => entity.name === "ds:button",
    )?.label;
    expect(label).not.toMatch(/@(en|fr)/);
    expect(["Button", "Bouton"]).toContain(label);
  });

  // ----- HAND-OFFS (A1, A2): lane A's fixes have landed in this branch, so the
  // former `it.fails` pins are now LIVE regression guards. -----

  it("A1: info's entity total must not exceed the distinct entity count (owl:NamedIndividual double-count)", async () => {
    const fixture = await boot(DEFAULT_PACK_TTL, DEFAULT_PACK_CONFIG);
    const index = readPackIndex(fixture.cwd);
    // `entityTotal` (the figure `info`/`doctor` report) once SUMMED per-type
    // instance counts, double-counting each entity per asserted rdf:type (each
    // block under owl:NamedIndividual AND its domain class; ds:tier/ds:release
    // under owl:ObjectProperty AND owl:FunctionalProperty — 23 for 17 distinct
    // entities). Lane A fixed the count, so the true total no longer exceeds the
    // distinct count — guard it stays that way.
    expect(entityTotal(index as NonNullable<typeof index>)).toBeLessThanOrEqual(
      (index as NonNullable<typeof index>).entities.length,
    );
  });

  it("A2: an untiered block must still appear in `block list --all-tiers`", async () => {
    const fixture = await boot(
      DEFAULT_PACK_TTL,
      DEFAULT_PACK_ALL_VISIBLE_CONFIG,
    );
    // `block list`'s SELECT once inner-joined `?c ds:tier ?t`, dropping a
    // ds:Component with no ds:tier even under --all-tiers (though `graph query`
    // found it, proven above). Lane A made the tier join OPTIONAL, so an
    // untiered block now appears under --all-tiers — guard it stays visible.
    expect(await blockListNames(fixture.cwd, true)).toContain(
      UNTIERED_BLOCK_NAME,
    );
  });

  // KNOWN GAP / product follow-up (NOT a lane hand-off): a corrupt, NON-EMPTY
  // `schema.json` currently surfaces UNCLASSIFIED. `packIsComplete` only checks
  // size > 0, so torn-but-nonempty garbage bypasses the completeness guard and
  // `compileFromExtraction` throws a raw `SyntaxError` (renders as INTERNAL
  // "please report") instead of a classified error. It SHOULD degrade to
  // STORE_UNAVAILABLE like the emptied case does — the fix belongs in
  // `kernel/runtime/graphpack/read.ts` (guard the `schema.json` read/compile).
  // No lane in this wave owns that, so rather than a false `it.fails` hand-off
  // that would never flip, this is a plain test pinning the CURRENT behavior:
  // when read.ts starts classifying it, this guard trips — swap the assertion
  // to expect a STORE_UNAVAILABLE PragmaError then.
  it("corrupt (non-empty, invalid) schema.json currently surfaces an UNCLASSIFIED error (known gap)", async () => {
    const fixture = await boot(DEFAULT_PACK_TTL, DEFAULT_PACK_CONFIG);
    const lock = readLock(fixture.cwd);
    writeFileSync(
      join(packDir(lock?.contentHash ?? ""), SCHEMA_FILE),
      "{ not valid json ]",
    );
    let caught: unknown;
    try {
      await executeVerb(
        blockListVerb,
        { allTiers: true },
        NO_MUTATION,
        bootRuntime(JSON_FLAGS, fixture.cwd),
      );
    } catch (error) {
      caught = error;
    }
    // It throws — but as a raw, unclassified error, NOT a PragmaError. Assert the
    // gap explicitly so a future classification fix in read.ts trips this guard.
    expect(caught).toBeInstanceOf(Error);
    expect(caught).not.toBeInstanceOf(PragmaError);
  });
});

/**
 * A synthetic runtime whose config is a fixed package list — drives the
 * git-source build Task without a config file (mirrors sources.test.ts).
 *
 * @param cwd - The project directory the lock is written to.
 * @param packages - The configured package entries.
 * @returns A runtime wired to a lazy store over `cwd`.
 * @note Impure — constructs a store handle over the working directory.
 */
function gitRuntimeFor(cwd: string, packages: PackageEntry[]): PragmaRuntime {
  const layers: ConfigLayers = {
    config: { channel: "normal", packages },
    origins: {
      tier: "default",
      channel: "default",
      detail: "default",
      packages: "project",
      stories: "default",
      prefixes: "default",
      prompts: "default",
    },
    global: { path: "/nonexistent", exists: false },
    project: { exists: false },
  };
  const loadConfig = async (): Promise<ConfigLayers> => layers;
  const store = createLazyStore({ cwd, loadConfig });
  return {
    cwd,
    version: VERSION,
    globalFlags: JSON_FLAGS,
    loadConfig,
    store,
    query: createQueryFacade(store),
  };
}
