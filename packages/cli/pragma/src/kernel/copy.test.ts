import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { RECOVERY_CLI_PREFIX } from "../constants.js";

/**
 * The kernel is generic machinery: it may describe itself, but it may not name
 * the distribution or its domain in an authored string. A fork changes
 * `pragma.conf.ts`; anything the kernel hardcodes becomes a lie it cannot fix.
 *
 * `src/capabilities/**` is deliberately OUT of scope: the bundled domain packs
 * are CONTENT, and content is exactly where specialization belongs.
 */
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

/**
 * Files whose strings are pinned elsewhere, so changing them is not a copy edit:
 * - `*.generated.ts` — build artifacts (the embedded pack's graph data), not
 *   authored copy.
 * - `spec/emitSurface.ts` — `FIXED_SURFACE` is deep-equalled against
 *   `surface/surface.v2.json`; changing it is a covenant change.
 * - `spec/emitReference.ts` — its output is byte-compared against the committed
 *   `docs/reference/*.md`, so changing it requires a docs regen.
 * - `runtime/refs/resolve.ts` — CROSS-LANE: its one `sources update` hint is
 *   deleted by the concurrent lock-removal PR. Drop this line after that lands.
 */
const EXEMPT = [
  ".generated.ts",
  "spec/emitSurface.ts",
  "spec/emitReference.ts",
  "runtime/refs/resolve.ts",
];

/** Every authored `.ts` in the kernel, plus the identity module and the bin. */
function sources(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...sources(path));
    else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
      found.push(path);
    }
  }
  return found;
}

const files = [
  ...sources(join(root, "kernel")),
  join(root, "constants.ts"),
  join(root, "bin.ts"),
].filter((file) => !EXEMPT.some((suffix) => file.endsWith(suffix)));

/** Strip comments, so only authored *copy* is scanned (`https://` survives). */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/([^:])\/\/.*/g, "$1");
}

/** Every string literal (single-, double-, and backtick-quoted) in a file. */
const LITERAL = /(["'`])((?:\\.|(?!\1)[\s\S])*)\1/g;

/** `file: literal` for every literal matching `pattern`, so a failure names it. */
function offenders(pattern: RegExp): string[] {
  const found: string[] = [];
  for (const file of files) {
    const source = stripComments(readFileSync(file, "utf-8"));
    for (const [, , literal] of source.matchAll(LITERAL)) {
      if (literal && pattern.test(literal)) {
        found.push(`${relative(root, file)}: ${literal}`);
      }
    }
  }
  return found;
}

describe("kernel copy (PROTECTED)", () => {
  it("no kernel string quotes the program name as a command", () => {
    // The pattern is DERIVED from the shipped prefix, so this guard hardcodes
    // no name: a fork's kernel is held to the fork's own name.
    expect(offenders(new RegExp(RECOVERY_CLI_PREFIX))).toEqual([]);
  });

  it("no kernel string names a domain", () => {
    expect(offenders(/design[- ]system/i)).toEqual([]);
  });
});
