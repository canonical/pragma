/**
 * The embedded-file registry: read a generator's template or verbatim asset
 * from disk, or — when there is no disk to read from — from a manifest the host
 * injected.
 *
 * WHY THIS IS IN summon-core AND NOT IN EACH GENERATOR PACKAGE. The host that
 * populates the registry must import it, and it must do so WITHOUT evaluating a
 * generator index (that pulls the whole generation layer, and with it React).
 * Before this module the injection point was `@canonical/summon-component
 * /embedded`, so the host's import named ONE DECLARED GENERATOR PACKAGE: a fork
 * that swapped its generator package and forgot that import shipped a binary
 * that harvested one package's templates and registered them in another
 * package's loader — a green build whose `create` died with `ENOENT … .ejs`.
 * Registering here makes the injection point name INFRASTRUCTURE the consumer
 * depends on regardless, so no declared package can be named by mistake.
 *
 * ZERO IMPORTS BEYOND `node:fs`, deliberately and permanently: the host imports
 * this module on a path that must not load the generation layer.
 *
 * THE INVARIANT A GENERATOR OWES ITS HOST. Every read must reach this registry
 * and be passed on as `template({ source, content })`; a call that gives only
 * `source` falls through to `readFile`, which from a compiled binary is ENOENT
 * under `/$bunfs` after `mkdir` has already written a half-made tree. The one
 * helper in this package that does NOT satisfy it is `templateDir`, marked
 * `@experimental` and source-run-only for that reason. A CLI embedding a
 * declared generator's templates asserts the package reaches for this module at
 * build time, which is where a fork meets the rule.
 *
 * The manifest key is PACKAGE-SCOPED (`@canonical/summon-component/react
 * /types.ts.ejs`). The package scope is what lets several generator packages
 * share one manifest — four of them in this workspace embed under it, and the
 * shipped CLI's manifest carries three; the path tail is what keeps
 * `react/types.ts.ejs` and
 * `svelte/types.ts.ejs` distinct, which is the historic wrong-framework
 * collision (`types.ts.ejs`, `index.ts.ejs`, `styles.css.ejs` and
 * `stories.ts.ejs` exist under all three component frameworks).
 */

import { readFileSync } from "node:fs";

/** The marker that separates a package's template root from the file's key. */
const TEMPLATE_ROOT_MARKER = "/templates/";

/** A file loaded from disk or from the injected manifest. */
export interface EmbeddedFile {
  /** Original source path (for diagnostics and dry-run display). */
  readonly source: string;
  /** File contents. */
  readonly content: string;
}

/**
 * The injected manifest: package-scoped path → file contents. Empty in a source
 * run (every read hits the disk); populated by the compiled-binary host before
 * any generator runs.
 */
let embeddedFiles: Readonly<Record<string, string>> = {};

/**
 * Inject the embedded-file manifest. Called once by the host (a compiled CLI)
 * before any generator's `generate()` runs. Passing an empty map — the default —
 * restores pure disk loading.
 *
 * @param manifest - Package-scoped path → file contents.
 * @note Impure — replaces module-level registry state.
 */
export function setEmbeddedFiles(
  manifest: Readonly<Record<string, string>>,
): void {
  embeddedFiles = manifest;
}

/**
 * Derive the manifest key for a source path under a package's template root:
 * the package name, then everything after the LAST `/templates/` segment.
 *
 * The build harvests with this same rule, from the package's checked-out
 * template root; the loader applies it to whatever absolute path the generator
 * computed at run time (`/$bunfs/root/templates/…` inside a compiled binary).
 * Because both ends only ever look at the tail, a package whose runtime
 * resolution is `dist/esm/…` and whose harvest root is `src/…` still agrees.
 *
 * @param packageName - The declaring generator package.
 * @param source - Absolute path to the file, as the generator computed it.
 * @returns The manifest key, or `undefined` when the path has no template root.
 */
export function deriveEmbeddedKey(
  packageName: string,
  source: string,
): string | undefined {
  const at = source.lastIndexOf(TEMPLATE_ROOT_MARKER);
  if (at === -1) return undefined;
  return `${packageName}/${source.slice(at + TEMPLATE_ROOT_MARKER.length)}`;
}

/**
 * Load a generator file from disk, or — when the disk read fails — from the
 * injected manifest. SYNCHRONOUS, so a generator can load lazily inside its
 * synchronous `generate(answers): Task` rather than through a module-eval
 * top-level `await`: a READ command never calls `generate()`, so it never
 * touches a file the standalone binary lacks, regardless of how the bundler's
 * code-splitting fell out.
 *
 * Disk is consulted FIRST, so a source run reads the real file and a compiled
 * run reads the manifest generated from those same files — the two are
 * byte-identical by construction.
 *
 * @param packageName - The declaring generator package (the manifest scope).
 * @param source - Absolute path to the file.
 * @returns The loaded file's path and contents.
 * @throws When the file is neither on disk nor in the manifest — fail loud
 *   rather than return `""`, which callers do not guard and which would write
 *   silently empty files into a user's tree.
 * @note Impure — reads the filesystem and the injected registry.
 */
export function loadEmbeddedSync(
  packageName: string,
  source: string,
): EmbeddedFile {
  try {
    return { source, content: readFileSync(source, "utf-8") };
  } catch {
    // Not on disk — fall through to the manifest (the compiled binary).
  }

  const key = deriveEmbeddedKey(packageName, source);
  // Key off `undefined`, not falsiness: an embedded file may legitimately be
  // empty (`.gitkeep`), and treating "" as a miss would throw on a file that
  // was embedded correctly.
  if (key !== undefined) {
    const content = embeddedFiles[key];
    if (content !== undefined) return { source, content };
  }

  throw new Error(
    `Embedded file not found: ${source} (not on disk, and no embedded entry for ${
      key === undefined ? "this path" : `'${key}'`
    }).`,
  );
}
