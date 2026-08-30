import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readConfig } from "../config/readConfig.js";
import { embeddedManifest } from "../runtime/graphpack/embedded.js";
import { activePackPath, packDir } from "../runtime/paths.js";
import { resolveSources } from "../runtime/resolveSources.js";
import type { CapabilityModule, VerbSpec } from "../spec/types.js";
import { runComplete } from "./complete.js";
import {
  createIndexEntityReader,
  indexCompletionEnv,
  readPackIndex,
} from "./entitySource.js";

/** A fresh cwd with no pointer → the reader falls back to the embedded pack. */
const freshCwd = (): string => mkdtempSync(join(tmpdir(), "pragma-entity-"));

/** The 64-hex content hash the crafted pack is filed under. */
const CRAFTED_HASH = "1".repeat(64);

/** A project pointed at a crafted index.json in a temp pack cache. */
function projectWithIndex(index: unknown): string {
  const cwd = mkdtempSync(join(tmpdir(), "pragma-idx-cwd-"));
  const cache = mkdtempSync(join(tmpdir(), "pragma-idx-cache-"));
  vi.stubEnv("XDG_CACHE_HOME", cache);
  const pointer = activePackPath(cwd);
  mkdirSync(dirname(pointer), { recursive: true });
  writeFileSync(pointer, CRAFTED_HASH);
  const packDir = join(cache, "pragma", "packs", CRAFTED_HASH);
  mkdirSync(packDir, { recursive: true });
  writeFileSync(join(packDir, "index.json"), JSON.stringify(index));
  return cwd;
}

/**
 * A crafted index exercising the index / prefixes sources. Deliberately in a
 * NEUTRAL namespace: the reader knows no entity families any more, so a test
 * proving it reads `label` or `altNames` must not need this distribution's
 * vocabulary to say so.
 *
 * Real-vocabulary coverage lives in two places, and neither is here: the
 * PROTECTED contract describe below reads the shipped index for plain entity
 * NAMES, and `safety.test.ts`'s "every declared name source resolves without
 * constructing the store" drives the live grammar over the shipped index for
 * the `altNames` field (`tier lookup ap` → `Apps/Juju`, carried only by the
 * declared alt-name property) and for `prefixes`.
 */
const CRAFTED_INDEX = {
  version: 2,
  contentHash: CRAFTED_HASH,
  prefixes: { ex: "https://example.com/" },
  instanceCountByType: {},
  entities: [
    { name: "ex:Button", type: "ex:Component" },
    { name: "ex:prompt.build", type: "ex:Prompt", label: "build-a-block" },
    {
      name: "ex:tier.lxd",
      type: "ex:Tier",
      label: "LXD",
      altNames: ["apps/lxd"],
    },
    { name: "ex:tier.core", type: "ex:Tier", label: "core" },
  ],
};

describe("indexCompletionEnv — multi-source names(ref)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("index: entity names of a prefixed type", async () => {
    const env = indexCompletionEnv(projectWithIndex(CRAFTED_INDEX));
    expect(await env.names({ from: "index", type: "ex:Component" })).toEqual([
      "ex:Button",
    ]);
  });

  it("index + field label: emits the label, and nothing for an entity without one", async () => {
    const env = indexCompletionEnv(projectWithIndex(CRAFTED_INDEX));
    expect(
      await env.names({ from: "index", type: "ex:Prompt", field: "label" }),
    ).toEqual(["build-a-block"]);
    // `ex:Button` carries no label. The lookup that declared this field matches
    // on the label, so standing the name in would offer a token that lookup
    // cannot resolve.
    expect(
      await env.names({ from: "index", type: "ex:Component", field: "label" }),
    ).toEqual([]);
  });

  it("index + field altNames: emits only the alt names, never a label in their place", async () => {
    const env = indexCompletionEnv(projectWithIndex(CRAFTED_INDEX));
    // `ex:tier.lxd` carries `apps/lxd`; `ex:tier.core` carries none, so its
    // label `core` is NOT offered — a bespoke tier lookup filters on the
    // declared alt-name property and would refuse it.
    expect(
      await env.names({ from: "index", type: "ex:Tier", field: "altNames" }),
    ).toEqual(["apps/lxd"]);
  });

  it("prefixes: the index's prefixes ∪ the default display map", async () => {
    const env = indexCompletionEnv(projectWithIndex(CRAFTED_INDEX));
    const prefixes = await env.names({ from: "prefixes" });
    expect(prefixes).toContain("ex"); // from the index
    expect(prefixes).toContain("ds"); // default map
    expect(prefixes).toContain("rdfs"); // default map
  });

  it("skills: names from the project skills root, walked once (memoized)", async () => {
    const cwd = projectWithIndex(CRAFTED_INDEX);
    vi.stubEnv(
      "XDG_DATA_HOME",
      mkdtempSync(join(tmpdir(), "pragma-idx-data-")),
    );
    const skillDir = join(cwd, ".pragma", "skills", "docx");
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(
      join(skillDir, "SKILL.md"),
      "---\nname: docx\ndescription: Word docs.\n---\n",
    );
    const env = indexCompletionEnv(cwd);
    expect(await env.names({ from: "skills" })).toEqual(["docx"]);
    // A second read returns the same list (one filesystem walk per env).
    expect(await env.names({ from: "skills" })).toEqual(["docx"]);
  });

  it("a type nothing matches yields [] (prefixes still list the default map)", async () => {
    const env = indexCompletionEnv(
      projectWithIndex({
        version: 2,
        contentHash: CRAFTED_HASH,
        prefixes: {},
        instanceCountByType: {},
        entities: [{ name: "ex:Button", type: "ex:Component" }],
      }),
    );
    expect(
      await env.names({ from: "index", type: "ex:Prompt", field: "label" }),
    ).toEqual([]);
    expect(
      await env.names({ from: "index", type: "ex:Tier", field: "altNames" }),
    ).toEqual([]);
    // The display map is compiled in, so it answers with no index at all.
    expect(await env.names({ from: "prefixes" })).toContain("ds");
  });
});

describe("entity source contract (PROTECTED)", () => {
  it("reads the embedded index storelessly, filtering by type + partial", () => {
    const read = createIndexEntityReader(freshCwd());

    // An abox individual of ds:Component. Membership, not the full 100+ list:
    // the roster moves whenever the design system does, but a design system
    // without a button is a change a human should look at.
    expect(read("ds:Component", "")).toContain("ds:global.component.button");
    // Tbox class.
    expect(read("owl:Class", "")).toContain("ds:Component");
    // Partial-prefix filter: every candidate starts with what was typed.
    const partial = read("ds:Component", "ds:global.component.but");
    expect(partial).toContain("ds:global.component.button");
    for (const name of partial) {
      expect(name.startsWith("ds:global.component.but")).toBe(true);
    }
    // Unknown type → no matches (never throws).
    expect(read("ds:Nope", "")).toEqual([]);
  });

  it("relies only on the frozen { name, type } minimum", () => {
    const read = createIndexEntityReader(freshCwd());
    // Every result is a bare name token (string), usable with no other field.
    for (const name of read("ds:Component", "")) {
      expect(typeof name).toBe("string");
      expect(name.startsWith("ds:")).toBe(true);
    }
  });

  it("is fast (well under the 50ms storeless budget)", () => {
    const read = createIndexEntityReader(freshCwd());
    const start = performance.now();
    read("ds:Component", "");
    expect(performance.now() - start).toBeLessThan(50);
  });
});

describe("__complete entity tier wiring", () => {
  const lookupModule: CapabilityModule = {
    name: "fixture-block",
    verbs: [
      {
        path: ["block", "lookup"],
        summary: "Look up a block.",
        params: [
          {
            kind: "string",
            name: "name",
            doc: "The block name.",
            positional: true,
            required: true,
            complete: {
              kind: "names",
              source: { from: "index", type: "ds:Component" },
            },
          },
        ],
        output: {
          formatters: {
            plain: String,
            llm: String,
            json: (d) => JSON.stringify(d),
          },
        },
        capability: {
          needsStore: true,
          mutates: false,
          mcp: { expose: false, reason: "test" },
        },
        run: async () => ({}),
      } as VerbSpec,
    ],
  };

  it("resolves a positional entity param through the wired env", async () => {
    // The bin fast path and the __complete verb wire this exact env: the
    // index-backed reader over cwd, adapted to the resolver's EntityNameReader.
    await expect(
      runComplete(
        ["block", "lookup", "ds:global.component.but"],
        [lookupModule],
        indexCompletionEnv(freshCwd()),
      ),
    ).resolves.toContain("ds:global.component.button");
    // Without the env, the entity tier yields nothing (grammar-only).
    await expect(
      runComplete(
        ["block", "lookup", "ds:global.component.but"],
        [lookupModule],
      ),
    ).resolves.toEqual([]);
  });
});

describe("readPackIndex answers the boot decision, never around it", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // `info`, `doctor`, the MCP resource browser and native `prompts/list` all
  // read through this. It takes the decision rather than re-deriving one, so it
  // covers all three arms — including the one a re-derivation gets wrong.
  it("reads the pack the decision names", () => {
    projectWithIndex(CRAFTED_INDEX); // plants the pack under a stubbed cache
    const index = readPackIndex({
      kind: "pack",
      dir: packDir(CRAFTED_HASH),
      contentHash: CRAFTED_HASH,
    });
    expect(index?.contentHash).toBe(CRAFTED_HASH);
    expect(index?.entities.map((entity) => entity.name)).toContain("ex:Button");
  });

  it("reads the embedded snapshot on the embedded arm", () => {
    const index = readPackIndex({ kind: "embedded" });
    expect(index?.contentHash).toBe(embeddedManifest().contentHash);
  });

  it("reads NOTHING when the store is unavailable", () => {
    // The row that matters: a project that declared its own packs and never
    // built them must not be listed the distribution's graph while every read
    // of it fails STORE_UNAVAILABLE.
    expect(readPackIndex({ kind: "unavailable", reason: "not built" })).toBe(
      undefined,
    );
  });
});

describe("the storeless fast path implements the pointer half", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // `__complete` cannot see `origins.packs` (the config evaluator is banned on
  // this graph), so it cannot distinguish a fresh install from a configured-but-
  // unbuilt project. It CAN see the pointer, and must not prefer the snapshot
  // over a pointer whose pack the cache lost — that is the decision table's
  // second row, where the two readers used to disagree.
  it("offers no candidates when the pointed-at pack is gone", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "pragma-idx-cwd-"));
    const cache = mkdtempSync(join(tmpdir(), "pragma-idx-cache-"));
    vi.stubEnv("XDG_CACHE_HOME", cache);
    const pointer = activePackPath(cwd);
    mkdirSync(dirname(pointer), { recursive: true });
    writeFileSync(pointer, CRAFTED_HASH); // …but no pack directory for it.

    expect(createIndexEntityReader(cwd)("ds:Component", "")).toEqual([]);
    expect(
      await indexCompletionEnv(cwd).names({ from: "index", type: "" }),
    ).toEqual([]);
  });

  it("still offers the snapshot's names in a configured-but-unbuilt project (the documented price)", async () => {
    // The bounded exception `entitySource.ts` documents, pinned as it IS and
    // not as it should be. The fast path is deliberately denied the config
    // layer, so a `pragma.config.ts` declaring packs is invisible to it: with
    // no pointer it cannot tell this project from a fresh install, and it
    // answers from the embedded snapshot.
    //
    // Both halves are asserted against the SAME cwd, because the ASYMMETRY is
    // the whole claim — asserting only that the snapshot answers would restate
    // the fresh-install case the PROTECTED contract describe already covers,
    // and would pass with the config file deleted. The read half refusing is
    // what makes this directory a configured-but-unbuilt project rather than a
    // fresh install. (`doctor` says so too, in the same words: verified against
    // the compiled binary, where `block list` raises STORE_UNAVAILABLE while
    // this same completion still answers.)
    //
    // If a later change gives the fast path a config-free way to see
    // `origins.packs`, THIS is the test that must move, deliberately.
    const cwd = mkdtempSync(join(tmpdir(), "pragma-unbuilt-cwd-"));
    vi.stubEnv(
      "XDG_CACHE_HOME",
      mkdtempSync(join(tmpdir(), "pragma-unbuilt-")),
    );
    writeFileSync(
      join(cwd, "pragma.config.ts"),
      'export default { packs: [{ name: "unbuilt", source: "file:///pragma-never-built" }] };\n',
    );

    const decision = resolveSources(await readConfig(cwd), cwd);
    expect(decision).toEqual({
      kind: "unavailable",
      reason: "packs are configured but the store has not been built",
    });
    expect(readPackIndex(decision)).toBeUndefined();

    expect(createIndexEntityReader(cwd)("ds:Component", "")).toContain(
      "ds:global.component.button",
    );
  });
});
