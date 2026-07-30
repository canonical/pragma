/**
 * The kernel is generic machinery: it may describe itself, but it may not name
 * the distribution in an authored string. A fork changes `pragma.conf.ts`;
 * anything the kernel hardcodes becomes a lie it cannot fix.
 *
 * What this guard enforces, exactly: no string literal under `src/kernel/**`
 * (plus `constants.ts` and `bin.ts`) contains the distribution's `name` as a
 * word, or the domain phrase "design system". Module specifiers are not copy
 * and are skipped; every remaining site that legitimately carries the name is
 * listed in {@link EXEMPT} with its reason and the PR that removes it.
 *
 * What it does NOT reach: `src/capabilities/**`. The bundled domain packs there
 * are CONTENT, which is where specialization belongs — but the generic
 * capability modules beside them still author `pragma …` command literals, and
 * closing that is its own tranche (their `examples[].cmd` strings are
 * byte-compared against `docs/reference/*.md`, so the sweep and the docs regen
 * have to move together).
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { BIN_NAME } from "../constants.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

/**
 * Files whose strings are pinned, frozen, or owned by another lane, so changing
 * them is not a copy edit:
 * - `*.generated.ts` — build artifacts (the embedded pack's graph data).
 * - `spec/emitSurface.ts` — `FIXED_SURFACE` is deep-equalled against
 *   `surface/surface.v2.json`; changing it is a covenant change.
 * - `spec/emitReference.ts` — its output is byte-compared against the committed
 *   `docs/reference/*.md`, so changing it requires a docs regen.
 * - `config/defaults.ts` — THE distribution seam: it imports the distribution
 *   config and names the file it imports. That is its job, not a leak.
 * - `render/prefixes.ts` — the domain namespaces in `DEFAULT_PREFIX_MAP`, the
 *   behavioural coupling PR 4 replaces with pack-declared prefixes.
 * - `runtime/graphpack/hash.ts` — `<<<pragma-pack:…>>>` are hash domain
 *   separators; changing them re-mints every pack content hash. CROSS-LANE.
 * - `runtime/graphpack/buildIndex.ts` — a hardcoded domain `name` predicate,
 *   also PR 4's. CROSS-LANE.
 * - `runtime/paths.ts`, `completion/entitySource.ts`, `runtime/refs/resolve.ts`
 *   — the lock filename and the `--frozen` re-pin hint. CROSS-LANE: the
 *   concurrent lock-removal PR deletes all three. Drop these once it lands.
 */
const EXEMPT = [
  ".generated.ts",
  "spec/emitSurface.ts",
  "spec/emitReference.ts",
  "config/defaults.ts",
  "render/prefixes.ts",
  "runtime/graphpack/hash.ts",
  "runtime/graphpack/buildIndex.ts",
  "runtime/paths.ts",
  "completion/entitySource.ts",
  "runtime/refs/resolve.ts",
];

/**
 * Every authored `.ts` in the kernel, plus the identity module and the bin.
 *
 * @param dir - Directory to walk.
 * @returns Absolute paths of the non-test TypeScript sources beneath it.
 * @note Impure — reads the source tree.
 */
function listSources(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...listSources(path));
    else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
      found.push(path);
    }
  }
  return found;
}

const files = [
  ...listSources(join(root, "kernel")),
  join(root, "constants.ts"),
  join(root, "bin.ts"),
].filter((file) => !EXEMPT.some((suffix) => file.endsWith(suffix)));

/**
 * The authored copy in a file: every string literal that is neither a module
 * specifier nor inside a comment.
 *
 * A single left-to-right pass, not a pair of regexes, because the two orderings
 * a regex pair allows are both wrong: strip comments first and any literal
 * containing `//` is truncated, re-pairing the quotes across the deleted tail
 * and hiding whatever followed; match literals first and an apostrophe in prose
 * ("the kernel's") opens a quote that never closes, which is also the shape
 * that makes the literal pattern backtrack catastrophically. Reading the file
 * in source order makes both cases fall out: a `//` inside a string belongs to
 * the string, an apostrophe inside a comment belongs to the comment.
 *
 * Specifiers (`./x.js`, `@scope/pkg`) name modules, not users, and must stay
 * literal, so they are not copy.
 *
 * @param source - The file's text.
 * @returns The authored string literals.
 */
function readCopy(source: string): string[] {
  const copy: string[] = [];
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === "/" && source[i + 1] === "*") {
      const end = source.indexOf("*/", i + 2);
      if (end === -1) break;
      i = end + 1;
      continue;
    }
    if (char === "/" && source[i + 1] === "/") {
      const end = source.indexOf("\n", i + 2);
      if (end === -1) break;
      i = end;
      continue;
    }
    if (char !== '"' && char !== "'" && char !== "`") continue;
    const start = ++i;
    while (i < source.length && source[i] !== char) {
      i += source[i] === "\\" ? 2 : 1;
    }
    const literal = source.slice(start, i);
    if (literal && !literal.startsWith(".") && !literal.startsWith("@")) {
      copy.push(literal);
    }
  }
  return copy;
}

/**
 * `file: literal` for every authored literal matching `pattern`, so a failure
 * names its offenders instead of only counting them.
 *
 * @param pattern - What kernel copy may not contain.
 * @returns One entry per offending literal.
 * @note Impure — reads every kernel source.
 */
function findOffenders(pattern: RegExp): string[] {
  const found: string[] = [];
  for (const file of files) {
    for (const literal of readCopy(readFileSync(file, "utf-8"))) {
      if (pattern.test(literal)) {
        found.push(`${relative(root, file)}: ${literal}`);
      }
    }
  }
  return found;
}

describe("kernel copy (PROTECTED)", () => {
  it("no kernel string names the distribution", () => {
    // DERIVED from the shipped `name`, and ESCAPED: this guard hardcodes no
    // name, and a fork called `my.cli` or `c++tool` neither over-matches nor
    // dies compiling its own name as a pattern. The word boundaries keep
    // identifiers like `PragmaError` out while still catching the forms the
    // name actually leaks in — `pragma.config.ts`, `pragma-pack`, `pragma `.
    const name = BIN_NAME.replace(/[-.*+?^${}()|[\]\\]/g, "\\$&");
    expect(findOffenders(new RegExp(`\\b${name}\\b`, "i"))).toEqual([]);
  });

  it("no kernel string names a domain", () => {
    expect(findOffenders(/design[- ]system/i)).toEqual([]);
  });
});
