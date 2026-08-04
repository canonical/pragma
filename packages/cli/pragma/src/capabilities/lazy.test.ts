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
    // cited THIS file for the rule while nothing here constrained it, and the
    // one edit it forbids by name (`PragmaError`) fails no other assertion:
    // `kernel/error/PragmaError.ts` is already on the graph from
    // `capabilities/index.ts`. So the rule was prose citing a guard that did
    // not guard it.
    //
    // An EXACT enumeration, the same form as the `pragma.conf.ts` case above
    // and for the same reason: a subset check would tolerate the next arrival.
    // The two type-only entries are `pragma.conf.ts`'s own type imports plus
    // the `RawConfig` this module reads its `generators` through — the walker
    // follows `from "…"` textually and cannot tell a type import from a value
    // one, which is why the no-value-import assertion below is separate.
    const entry = resolve(here, "create/constants.ts");
    const pkgRoot = resolve(here, "../..");
    const graph = [...staticImportGraph(entry)]
      .map((file) => relative(pkgRoot, file))
      .sort();
    expect(graph).toEqual([
      "pragma.conf.ts",
      "src/capabilities/create/constants.ts",
      "src/kernel/config/types.ts",
      "src/kernel/packs/types.ts",
    ]);
    // Nothing on that graph runs at import time except this module itself
    // (which reads the declaration and may throw). The conf and both type
    // modules are inert — pinned by the case above, restated here as the
    // property this module depends on.
    for (const file of graph.filter((f) => f !== relative(pkgRoot, entry))) {
      expect(readFileSync(resolve(pkgRoot, file), "utf-8"), file).not.toMatch(
        /^import (?!type\b)/m,
      );
    }
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

  it("exactly one module on that graph statically imports zod", () => {
    // zod is NOT dynamic-import-only here, and this pins the one place it is
    // not, by measurement rather than by claim. `resolveSources` (which the
    // resource provider and the prompt provider both reach) calls
    // `packIsComplete` → `readManifest` → `manifestSchema.parse`, so
    // `graphpack/types.ts` and its zod dependency are evaluated whenever the
    // command tree is built — including on `__complete`.
    //
    // An EXACT set, not a tolerated-name list: a second importer fails this,
    // and so does removing the edge, which is what makes the day it is fixed
    // impossible to miss.
    const graph = staticImportGraph(resolve(here, "index.ts"));
    const pkgRoot = resolve(here, "..", "..");
    const zodImporters = [...graph]
      .filter((file) => /from\s*["']zod["']/.test(readFileSync(file, "utf-8")))
      .map((file) => relative(pkgRoot, file))
      .sort();
    expect(zodImporters).toEqual(["src/kernel/runtime/graphpack/types.ts"]);
  });
});
