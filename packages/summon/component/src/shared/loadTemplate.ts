/**
 * Load a template file eagerly, with compiled binary support.
 *
 * In interpreted mode, reads from the filesystem. In a compiled binary,
 * falls back to `Bun.embeddedFiles` blobs (async, requires top-level await).
 */

import { readFileSync } from "node:fs";

export interface LoadedTemplate {
  /** Original source path (for diagnostics and dry-run display). */
  readonly source: string;
  /** Template content string. */
  readonly content: string;
}

/**
 * Load a template from disk or embedded files.
 *
 * @param source - Absolute path to the template file.
 * @returns Loaded template with path and content.
 */
export default async function loadTemplate(
  source: string,
): Promise<LoadedTemplate> {
  // Try filesystem first (works in interpreted mode)
  try {
    return { source, content: readFileSync(source, "utf-8") };
  } catch {
    // Fall through to embedded lookup
  }

  // Try Bun.embeddedFiles (works in compiled binary)
  if (typeof globalThis.Bun !== "undefined") {
    const blobs = (globalThis.Bun as { embeddedFiles?: readonly Blob[] })
      .embeddedFiles as ReadonlyArray<Blob & { name: string }> | undefined;

    if (blobs) {
      // KNOWN LIMITATION (basename collision): we match embedded blobs by
      // basename only, because Bun flattens embedded-asset names to the
      // filename (the source directory is not preserved). Several templates
      // share a basename across frameworks — types.ts.ejs, index.ts.ejs,
      // styles.css.ejs and stories.ts.ejs each exist in lit/, react/ and/or
      // svelte/. In a compiled binary this can resolve to the WRONG
      // framework's template (whichever blob is encountered first), producing
      // a silently incorrect generated file. The proper fix is build-side:
      // embed templates under directory-qualified unique names and match on
      // those. Deferred — needs verification against a real compiled binary
      // (see pragma-adrs/session/J.CLI_MCP_FINISH.md). Interpreted mode (the
      // common path) reads from disk above and is unaffected.
      const basename = source.slice(source.lastIndexOf("/") + 1);
      for (const blob of blobs) {
        const dehashed = blob.name.replace(/-[a-z0-9]+\./, ".");
        if (dehashed === basename) {
          const content = await blob.text();
          return { source, content };
        }
      }
    }
  }

  // Neither the filesystem nor embedded files yielded the template. Fail loud
  // rather than returning empty content: callers await this for required
  // templates and do not guard against blanks, so a silent "" would generate
  // empty files (notably in a compiled binary, where the disk read always
  // fails and a missing embed is the only failure mode).
  throw new Error(
    `Template not found: ${source} (not on disk, and no matching embedded file).`,
  );
}
