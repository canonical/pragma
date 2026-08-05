import { existsSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Walk the *static* import graph from an entry file, following relative
 * `... from "./x.js"` and bare `import "./x.js"` specifiers (mapping `.js` back
 * to `.ts`). Dynamic `import("./x.js")` calls use no `from`, so they are not
 * followed — which is exactly the boundary the lazy-dispatch invariant relies
 * on. This is the module-graph probe the brief calls for.
 */
function staticImportGraph(
  entry: string,
  seen = new Set<string>(),
): Set<string> {
  if (seen.has(entry) || !existsSync(entry)) return seen;
  seen.add(entry);
  const source = readFileSync(entry, "utf-8");
  const fromRe = /\bfrom\s*["']([^"']+)["']/g;
  const bareRe = /(?:^|\n)\s*import\s+["']([^"']+)["']/g;
  for (const match of [
    ...source.matchAll(fromRe),
    ...source.matchAll(bareRe),
  ]) {
    const spec = match[1];
    if (!spec?.startsWith(".")) continue;
    staticImportGraph(
      resolve(dirname(entry), spec.replace(/\.js$/, ".ts")),
      seen,
    );
  }
  return seen;
}

const here = dirname(fileURLToPath(import.meta.url));
const has = (graph: Set<string>, suffix: string): boolean =>
  [...graph].some((file) => file.endsWith(suffix));

/**
 * The four roots a storeless `--help` / `__complete` / `--version` run reaches:
 * the process entry, the command tree, the completion responder, and the
 * capability set all three build from. Relative to this file. Everything
 * evaluated on those runs is somewhere on one of these graphs, which is what
 * lets the config-edge case below be derived rather than enumerated by hand.
 */
const FAST_PATH_ENTRIES = [
  "index.ts",
  "../bin.ts",
  "../kernel/project/cli/buildProgram.ts",
  "../kernel/completion/complete.ts",
] as const;

describe("lazy dispatch — module-graph probe (PROTECTED)", () => {
  it("importing capabilities/index pulls no verb run body or config reader", () => {
    const graph = staticImportGraph(resolve(here, "index.ts"));

    // Spec + formatter modules are statically reachable...
    expect(has(graph, "info/info.render.ts")).toBe(true);
    expect(has(graph, "config/show.render.ts")).toBe(true);

    // ...but run bodies and the config LAYER stay behind the dynamic boundary:
    // no reader, no defaults layer, no zod schema. The distribution config
    // itself IS on the graph — `constants.ts` projects the program's identity
    // from it, `render/prefixes.ts` its domain namespaces and
    // `kernel/vocabulary.ts` its domain terms — which is safe only because it
    // is inert data (pinned below).
    expect(has(graph, "info/collectInfo.ts")).toBe(false);
    expect(has(graph, "config/collectConfigShow.ts")).toBe(false);
    expect(has(graph, "kernel/config/readConfig.ts")).toBe(false);
    expect(has(graph, "kernel/config/defaults.ts")).toBe(false);
    expect(has(graph, "kernel/config/schema.ts")).toBe(false);
    expect(has(graph, "pragma.conf.ts")).toBe(true);
  });

  it("the distribution config is inert data — it imports nothing that runs", () => {
    const conf = resolve(here, "../../pragma.conf.ts");
    const pkgRoot = resolve(here, "../..");
    // The graph walker follows `from "…"` textually and cannot tell an
    // `import type` from a value import, so the type-only `config/types.ts`
    // and `packs/types.ts` show up here even though nothing of either survives
    // compilation. Assert that NO file on the graph has a value import — not
    // just the conf. That is the claim in the title, and it is what keeps
    // `--help`/`__complete`/`--version` free of module-init work when another
    // lane or a fork edits any of these three (`packs/types.ts` in particular
    // is the grammar that type-checks the declared stories, and its own
    // docblock promises it stays zod-free BECAUSE it lands here).
    const graph = [...staticImportGraph(conf)];
    for (const file of graph) {
      expect(readFileSync(file, "utf-8"), file).not.toMatch(
        /^import (?!type\b)/m,
      );
    }
    // The enumeration is exact, not a subset: a type import from a module that
    // itself imports something grows this list and fails here.
    expect(graph.map((f) => relative(pkgRoot, f)).sort()).toEqual([
      "pragma.conf.ts",
      "src/kernel/config/types.ts",
      "src/kernel/packs/types.ts",
    ]);
  });

  it("the dispatch path never reaches the embedded n-quads module (PROTECTED)", () => {
    // `activeStories` reads the pack's carried stories from their OWN generated
    // module rather than through `graphpack/embedded.ts`, which statically
    // imports the ~1.9 MB `pack.generated.ts`. Restoring that edge costs a
    // measured +23 ms on EVERY dispatched command, and the whole test suite
    // passes with it restored — the split is prose in three docblocks and
    // nothing else. This is the constraint those docblocks describe.
    // `index.ts` is the FIRST entry and the reason for the other three: it is
    // the root of the `--help`/`__complete` path the +23 ms is measured on, and
    // it was the one this case did not watch. Measured on a scratch copy of
    // HEAD: a single added import in `capabilities/create/constants.ts` (a
    // module on this graph) grew it from 129 to 132 files, put
    // `embedded/pack.generated.ts` on the fast path, and cost +22 ms on
    // `--help` and +25 ms on `__complete` — with this file and
    // `completion/safety.test.ts` both green, because the perf budgets leave
    // ~2x headroom (130 ms ceiling, 61 ms median). With `index.ts` in this list
    // that same edit fails here, naming the entry.
    for (const entry of [
      "index.ts",
      "../kernel/packs/collect.ts",
      "../kernel/runtime/graphpack/stories.ts",
      "../kernel/runtime/resolveSources.ts",
    ]) {
      const graph = staticImportGraph(resolve(here, entry));
      expect(has(graph, "embedded/pack.generated.ts"), entry).toBe(false);
      expect(has(graph, "graphpack/embedded.ts"), entry).toBe(false);
    }
  });

  it("the create binding table stays a leaf on the fast path (PROTECTED)", () => {
    // `capabilities/create/constants.ts` is read by `create.verb.ts` while the
    // command tree is BUILT, so whatever it imports is paid for on every
    // `--help` and every `__complete`. Its docblock has always said so — but it
    // cited THIS file for the rule while nothing here constrained it. So the
    // rule was prose citing a guard that did not guard it.
    //
    // An EXACT enumeration, the same form as the `pragma.conf.ts` case above
    // and for the same reason: a subset check would tolerate the next arrival.
    // It is a LEAF-NESS bound, not a latency claim, and the `kernel/error`
    // triple is the demonstration: those three are on the `capabilities/index.
    // ts` graph already, so admitting them here cost nothing measurable and
    // bought this seam the same `PragmaError.configError` shape
    // `kernel/vocabulary.ts` raises next door. Growing this list is a decision;
    // failing here is what makes it one.
    //
    // Three of the entries are type-only — `pragma.conf.ts`'s own type imports,
    // the `RawConfig` this module reads its `generators` through, and the error
    // types — because the walker follows `from "…"` textually and cannot tell a
    // type import from a value one, which is why the no-value-import assertion
    // below is separate.
    const entry = resolve(here, "create/constants.ts");
    const pkgRoot = resolve(here, "../..");
    const graph = [...staticImportGraph(entry)]
      .map((file) => relative(pkgRoot, file))
      .sort();
    expect(graph).toEqual([
      "pragma.conf.ts",
      "src/capabilities/create/constants.ts",
      "src/kernel/config/types.ts",
      "src/kernel/error/PragmaError.ts",
      "src/kernel/error/constants.ts",
      "src/kernel/error/types.ts",
      "src/kernel/packs/types.ts",
    ]);
    // What the loop below pins is that none of the other three pulls anything
    // FURTHER onto this graph — the absence of more edges, not the absence of
    // any evaluation. Say it that way, because two of them do evaluate: the
    // conf is a literal, `kernel/config/types.ts` freezes a three-element
    // `CHANNELS` tuple, and `kernel/packs/types.ts` declares one pure helper.
    // That is the property this module actually depends on, and the `pragma.
    // conf.ts` case above states it the same way.
    for (const file of graph.filter((f) => f !== relative(pkgRoot, entry))) {
      expect(readFileSync(resolve(pkgRoot, file), "utf-8"), file).not.toMatch(
        /^import (?!type\b)/m,
      );
    }
  });

  it("the fast path's edges into kernel/config are written `import type` (PROTECTED)", () => {
    // The enumerations above bound WHICH modules may appear on a fast-path
    // graph. They do not — cannot — say whether an edge is erased: the walker
    // reads `from "…"` textually, so `import type { RawConfig }` and
    // `import { CHANNELS }` produce the identical file list. Measured on a
    // scratch checkout: flipping BOTH of this slice's new config edges to real
    // value imports, with a real use of `CHANNELS` in each module body, left
    // `lazy.test.ts` and `completion/safety.test.ts` fully green — 23 tests, no
    // change. Two docblocks asserted the erasure and cited a guard that did not
    // check it; this is that guard.
    //
    // The invariant is the storeless one: `--help`/`__complete` build the
    // command tree from eagerly-evaluated modules, and must reach NO config
    // module at RUNTIME. `kernel/config/types.ts` is an import-free leaf today,
    // so a value edge costs little — but it is the first step of the walk that
    // ends at `config/schema.ts` and zod, and the point of a boundary is that
    // it is checked before the cost arrives.
    //
    // DERIVED FROM THE GRAPH, not from a hand-list. This case first named two
    // files — the two the slice added — and called that "the fast path". It was
    // not: `capabilities/config/fields.ts` was already on the same graph with
    // exactly the edge shape named above (`import { CHANNELS } from
    // "../../kernel/config/types.js"`), so the property the title claimed did
    // not hold when the guard was written, and the next arrival would have
    // joined it silently. Walking the graph means a new value edge fails HERE,
    // named, wherever it arrives.
    const pkgRoot = resolve(here, "../..");
    // The ONE tolerated value edge, carried the way `copy.test.ts` carries its
    // EXEMPT set rather than left out of the walk. `config set <key>` gets its
    // `<key>` enum and per-field validation from this table, so the `channel`
    // field's legal values must be a runtime value here; `kernel/config/types.
    // ts` is an import-free leaf whose whole body is a frozen three-element
    // tuple and some interfaces, so the edge pulls no module and runs no code
    // beyond freezing that tuple. It is exempt because it was measured, not
    // because it is old.
    const EXEMPT = new Set(["src/capabilities/config/fields.ts"]);
    const found = new Set<string>();
    for (const entry of FAST_PATH_ENTRIES) {
      for (const file of staticImportGraph(resolve(here, entry))) {
        const rel = relative(pkgRoot, file);
        const source = readFileSync(file, "utf-8");
        // Non-greedy across newlines so a multi-line import statement is read
        // whole, and the leading `import` is anchored so `from` inside a
        // comment or a string cannot start a match.
        for (const match of source.matchAll(
          /^import\b[\s\S]*?from\s+["']([^"']+)["']/gm,
        )) {
          if (!match[1]?.includes("kernel/config/")) continue;
          found.add(rel);
          if (EXEMPT.has(rel)) continue;
          expect(match[0], `${rel} → ${match[1]}`).toMatch(/^import\s+type\b/);
        }
      }
    }
    // Non-vacuous, and an EXACT enumeration rather than a size floor: the two
    // modules this slice added must still be reached (a rename that drops an
    // edge fails here instead of passing an empty loop), and a NEW module
    // arriving with a config edge fails too — even a type-only one, because the
    // erasure is what the loop above checks and the file set is what bounds
    // which modules get to make that promise.
    expect([...found].sort()).toEqual(
      [
        "src/capabilities/block/tierChain.ts",
        "src/capabilities/config/fields.ts",
        "src/capabilities/config/show.render.ts",
        "src/capabilities/config/types.ts",
        "src/capabilities/create/constants.ts",
        "src/capabilities/info/info.render.ts",
        "src/capabilities/info/types.ts",
        "src/capabilities/shared/registry.ts",
        "src/constants.ts",
        "pragma.conf.ts",
      ].sort(),
    );
  });

  it("the help path (buildProgram) imports no zod schema module", () => {
    const graph = staticImportGraph(
      resolve(here, "../kernel/project/cli/buildProgram.ts"),
    );
    expect(has(graph, "kernel/config/schema.ts")).toBe(false);
    expect(has(graph, "kernel/spec/validate.ts")).toBe(false);
  });

  // The store code (ke / ke-graphql / oxigraph) AND @canonical/harnesses (the
  // harness detector doctor/setup reach only behind a dynamic import) must be
  // dynamic-import-only: no file statically reachable from capabilities/index
  // may `import … from` any of them, so building the command tree — or the
  // __complete fast path — never loads the WASM runtime or the harness scan.
  // Dynamic `import("…")` (used by the lazy store + setup ops) has no `from`,
  // so it is allowed.
  it("capabilities/index pulls no ke/ke-graphql/oxigraph/harnesses into the static graph (PROTECTED)", () => {
    const heavy = [
      "@canonical/ke",
      "@canonical/ke-graphql",
      "oxigraph",
      "@canonical/harnesses",
    ];
    const graph = staticImportGraph(resolve(here, "index.ts"));
    for (const file of graph) {
      const source = readFileSync(file, "utf-8");
      for (const pkg of heavy) {
        const escaped = pkg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const staticImport = new RegExp(`from\\s*["']${escaped}["']`);
        expect(
          staticImport.test(source),
          `${file} statically imports ${pkg}`,
        ).toBe(false);
      }
    }
  });

  it("NO module on that graph statically imports zod (PROTECTED)", () => {
    // Until PR7 this expected exactly ONE: `graphpack/types.ts` declared the
    // pack schemas, `manifest.ts` value-imported `manifestSchema` for
    // `readManifest`, `packIsComplete` called that, and `resolveSources` called
    // `packIsComplete` — reached here through
    // `graph/index.ts → resources/index.ts → resources/provider.ts`. So zod was
    // evaluated whenever the command tree was built, `__complete` included, for
    // ~3–4 ms of a ~25 ms path. The manifest is now read by a hand-written
    // structural check and the surviving schemas live in `graphpack/schemas.ts`,
    // behind the store boot.
    //
    // WHAT THIS DOES AND DOES NOT COVER, stated because a guard that overclaims
    // is worse than none. It is a TEXTUAL walk of `from "…"` specifiers, so it
    // cannot distinguish `import type` from a value import: a type-only edge to
    // a zod-importing module would fail this test even though it erases. In the
    // other direction it is exact and complete FOR THIS GRAPH — a brand-new
    // module value-importing zod anywhere reachable from `capabilities/index.ts`
    // fails, because the expectation is an empty set rather than a tolerated
    // list. What it says nothing about is zod OFF this graph. A type-aware
    // import walker would close that residue; it was deliberately not attempted
    // in PR7, because it is a rewrite of three PROTECTED guards
    // (this file's three exact enumerations, `completion/safety.test.ts`'s
    // storeless graph, and `@canonical/task`'s node-free closure walk) each of
    // which currently derives its authority from being simple and textual.
    const graph = staticImportGraph(resolve(here, "index.ts"));
    const pkgRoot = resolve(here, "..", "..");
    const zodImporters = [...graph]
      .filter((file) => /from\s*["']zod["']/.test(readFileSync(file, "utf-8")))
      .map((file) => relative(pkgRoot, file))
      .sort();
    expect(zodImporters).toEqual([]);
  });
});
