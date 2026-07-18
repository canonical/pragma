import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
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

    // ...but run bodies and the config reader are only dynamic-imported.
    expect(has(graph, "info/collectInfo.ts")).toBe(false);
    expect(has(graph, "config/collectConfigShow.ts")).toBe(false);
    expect(has(graph, "kernel/config/readConfig.ts")).toBe(false);
  });

  it("the help path (buildProgram) imports no zod schema module", () => {
    const graph = staticImportGraph(
      resolve(here, "../kernel/project/cli/buildProgram.ts"),
    );
    expect(has(graph, "kernel/config/schema.ts")).toBe(false);
    expect(has(graph, "kernel/spec/validate.ts")).toBe(false);
  });

  // The store code (ke / ke-graphql / oxigraph) must be dynamic-import-only:
  // no file statically reachable from capabilities/index may `import … from`
  // any of them, so building the command tree — or the __complete fast path —
  // never loads the WASM runtime. Dynamic `import("…")` (used by the lazy
  // store) has no `from`, so it is allowed.
  it("capabilities/index pulls no ke/ke-graphql/oxigraph into the static graph (PROTECTED)", () => {
    const heavy = ["@canonical/ke", "@canonical/ke-graphql", "oxigraph"];
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
});
