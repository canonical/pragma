/**
 * Render-vocabulary sync (PROTECTED) — the two halves of the "one vocabulary"
 * guarantee that cannot be a shared module.
 *
 * 1. CROSS-BINARY GLYPHS. The pragma CLI and the summon-core Ink wizard
 *    narrate the same run — a ✓ per completed effect, a ✗ when it fails — but
 *    they cannot read one module: pragma's renderers are statically reachable
 *    from the `--help`/`__complete` fast paths, and THREE protected guards
 *    (`create.test.ts`'s static-graph walk, `lazy.test.ts`, the perf budgets)
 *    forbid summon-core from that graph — loading it costs a measured
 *    double-digit-MB RSS, and an eager summon-core subpath import has already
 *    cost the fast paths ~46 ms once (BUDGETS.md). So the duplication is kept
 *    and made STRUCTURAL: summon-core publishes its wizard glyphs off the
 *    light `/format` seam, and this test pins them byte-equal to the
 *    vocabulary's. A divergence is a red build, not a review hope.
 *
 * 2. THE RETIRED WORD STAYS RETIRED, in the model as well as the copy. The
 *    render goldens pin that no output says "band"; this pins the same for
 *    the CODE of the modules that own setup/doctor's model and rendering, so
 *    the split cannot reopen the way it did — words moved, model unmoved.
 *    Comments are stripped first: history may NAME the retired word (the
 *    vocabulary docblock does, deliberately); code may not USE it.
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { GLYPHS } from "../kernel/render/vocabulary.js";

const here = dirname(fileURLToPath(import.meta.url));

describe("cross-binary glyph vocabulary (PROTECTED)", () => {
  it("summon-core's wizard marks byte-equal the vocabulary's", async () => {
    // Dynamic import, test-only — production pragma code never reaches
    // summon-core statically, and this test must not become the exception.
    const { COMPLETED_GLYPH, FAILURE_GLYPH } = await import(
      "@canonical/summon-core/format"
    );
    expect(COMPLETED_GLYPH).toBe(GLYPHS.success);
    expect(FAILURE_GLYPH).toBe(GLYPHS.failure);
  });
});

/** The directories whose model/rendering code the word-guard covers. */
const GUARDED_DIRS = [
  "doctor",
  "setup",
  "shared",
  "sources",
  "skill",
  "../kernel/render",
];

/** Every non-test .ts file under a directory, recursively. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    if (!entry.name.endsWith(".ts") || entry.name.endsWith(".test.ts"))
      return [];
    return [path];
  });
}

/** Strip block and line comments, leaving only code that compiles to bytes. */
const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/[^\n]*/g, "$1");

describe("the retired word stays retired in the type layer (PROTECTED)", () => {
  it("no setup/doctor model or render code says `band`", () => {
    const offenders: string[] = [];
    for (const dir of GUARDED_DIRS) {
      for (const file of sourceFiles(resolve(here, dir))) {
        const code = stripComments(readFileSync(file, "utf-8"));
        const hit = code.match(/\bbands?\b/i);
        if (hit) offenders.push(`${relative(here, file)}: ${hit[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
