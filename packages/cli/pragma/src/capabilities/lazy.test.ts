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
    for (const entry of [
      "../kernel/packs/collect.ts",
      "../kernel/runtime/graphpack/stories.ts",
      "../kernel/runtime/resolveSources.ts",
    ]) {
      const graph = staticImportGraph(resolve(here, entry));
      expect(has(graph, "embedded/pack.generated.ts"), entry).toBe(false);
      expect(has(graph, "graphpack/embedded.ts"), entry).toBe(false);
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

  it("NO module on that graph statically imports zod (PROTECTED)", () => {
    // This used to pin an exact set of one — `graphpack/types.ts`, reached via
    // `resolveSources` → `packIsComplete` → `readManifest` → `manifestSchema
    // .parse` — as the one genuine zod value import on the storeless graph,
    // measured at ~3–4 ms of a ~30 ms budget. Its own comment said an exact set
    // was what would make the day it got fixed impossible to miss. That day is
    // this commit: the schemas moved to `graphpack/schemas.ts`, imported only by
    // the two readers already off the fast path, and `readManifest` validates
    // structurally instead.
    //
    // The set is now EMPTY, which is strictly stronger than the pin it replaces:
    // it no longer tolerates one named module, so a brand-new module value-
    // importing zod fails here too — the gap the previous form left open.
    const graph = staticImportGraph(resolve(here, "index.ts"));
    const pkgRoot = resolve(here, "..", "..");
    const zodImporters = [...graph]
      .filter((file) => /from\s*["']zod["']/.test(readFileSync(file, "utf-8")))
      .map((file) => relative(pkgRoot, file))
      .sort();
    expect(zodImporters).toEqual([]);
  });

  it("the help path (buildProgram) imports zod from nowhere (PROTECTED)", () => {
    // The named-module check above (`kernel/config/schema.ts`,
    // `kernel/spec/validate.ts`) could only catch the two modules it names — a
    // third zod importer reaching the help path would have passed it silently.
    // Generalized (ruling R4) to the property those names were standing in for.
    const graph = staticImportGraph(
      resolve(here, "../kernel/project/cli/buildProgram.ts"),
    );
    const pkgRoot = resolve(here, "..", "..");
    const zodImporters = [...graph]
      .filter((file) => /from\s*["']zod["']/.test(readFileSync(file, "utf-8")))
      .map((file) => relative(pkgRoot, file))
      .sort();
    expect(zodImporters).toEqual([]);
  });
});
