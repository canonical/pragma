/**
 * Load a template file eagerly, with compiled-binary support.
 *
 * In a source run (or tests) the template is read from disk. In the standalone
 * `bun build --compile` binary the `.ejs` files are not on disk, so the loader
 * falls back to an EMBEDDED MANIFEST injected by the host via
 * {@link setEmbeddedTemplates} — a map keyed by DIRECTORY-QUALIFIED path
 * (`component/<framework>/<file>`), compiled into the binary as inline strings.
 *
 * The directory-qualified key is what fixes the historic basename collision:
 * several component templates share a basename across frameworks
 * (`types.ts.ejs`, `index.ts.ejs`, `styles.css.ejs`, `stories.ts.ejs` exist in
 * `react/`, `svelte/` and `lit/`). The previous fallback matched embedded blobs
 * by BARE BASENAME, so a compiled binary could silently emit the WRONG
 * framework's template (whichever blob was encountered first). Matching on the
 * framework-qualified suffix instead guarantees the right framework's file.
 */

import { readFileSync } from "node:fs";

export interface LoadedTemplate {
  /** Original source path (for diagnostics and dry-run display). */
  readonly source: string;
  /** Template content string. */
  readonly content: string;
}

/**
 * The injected embedded-template manifest: directory-qualified path
 * (`component/react/types.ts.ejs`) → template content. Empty in a source run
 * (templates load from disk); populated by the compiled-binary host BEFORE the
 * component generators evaluate their top-level `await loadTemplate`.
 */
let embeddedTemplates: Readonly<Record<string, string>> = {};

/**
 * Inject the embedded-template manifest — the compiled-binary fallback. Called
 * once by the host (the `pragma` `create` runtime) before the component
 * generators are imported, so their eager `loadTemplate` calls can resolve from
 * it when the disk read fails. Passing an empty map (the default) restores pure
 * disk loading.
 *
 * @param manifest - Directory-qualified path → template content.
 */
export function setEmbeddedTemplates(
  manifest: Readonly<Record<string, string>>,
): void {
  embeddedTemplates = manifest;
}

/**
 * The directory-qualified manifest key for a template source path: the portion
 * after the last `/templates/` segment (e.g. `react/types.ts.ejs`), prefixed
 * with the generator id (`component/`). Returns `undefined` when the path has no
 * `templates/` segment (never expected for a real template).
 *
 * The `component/` prefix is correct because this loader is used ONLY by the
 * component generators; the shared manifest additionally carries `package/…` and
 * `application/…` entries (embedded for a future compiled-binary rollout of
 * those nouns), which this loader never queries.
 */
function qualifiedKey(source: string): string | undefined {
  const marker = "/templates/";
  const at = source.lastIndexOf(marker);
  if (at === -1) return undefined;
  return `component/${source.slice(at + marker.length)}`;
}

/**
 * Load a template from disk, or — when the disk read fails (a compiled binary) —
 * from the injected embedded manifest. SYNCHRONOUS.
 *
 * Disk is consulted FIRST: a source run reads the real file, and the compiled
 * binary's absolute `/$bunfs/…` source paths never exist on a user's disk, so it
 * always falls through to the manifest. A source run and a compiled run are
 * therefore byte-identical (the manifest is generated from the same files).
 *
 * This is synchronous (both branches — `readFileSync` and the in-memory manifest
 * lookup — are), so a generator can load its templates LAZILY inside its
 * synchronous `generate(answers): Task` call rather than via a module-eval
 * top-level `await`. That is the whole point of the sync form: a READ command
 * (which never calls `generate()`) then never touches a template, regardless of
 * whether bun's `--compile` code-splitting kept the generator module lazy — the
 * exact fragility that crashed `pragma block list` on some bun versions.
 *
 * @param source - Absolute path to the template file.
 * @returns Loaded template with path and content.
 * @throws If the template is neither on disk nor in the embedded manifest — fail
 *   loud rather than return `""`, which callers do not guard against and would
 *   silently write as empty files (notably in a compiled binary).
 */
export function loadTemplateSync(source: string): LoadedTemplate {
  // Filesystem first (source runs / tests).
  try {
    return { source, content: readFileSync(source, "utf-8") };
  } catch {
    // Not on disk — fall through to the embedded manifest (compiled binary).
  }

  // Directory-qualified embedded lookup: `react/types.ts.ejs` and
  // `svelte/types.ts.ejs` map to distinct keys, so the collision is impossible.
  const key = qualifiedKey(source);
  if (key !== undefined) {
    const content = embeddedTemplates[key];
    if (content !== undefined) return { source, content };
  }

  throw new Error(
    `Template not found: ${source} (not on disk, and no embedded template for ${
      key === undefined ? "this path" : `'${key}'`
    }).`,
  );
}

/**
 * Async wrapper over {@link loadTemplateSync}, kept for callers that await a
 * template load. The body is fully synchronous.
 *
 * @param source - Absolute path to the template file.
 * @returns Loaded template with path and content.
 */
export default async function loadTemplate(
  source: string,
): Promise<LoadedTemplate> {
  return loadTemplateSync(source);
}
