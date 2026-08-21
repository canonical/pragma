/**
 * The embedded-template store: ONE core-level manifest serving every generator
 * package, injected by a compiled-binary host before the generators evaluate.
 *
 * Reads are disk-first: a source run (or test) reads the real file and the
 * manifest is inert; a compiled binary's `/$bunfs/…` source paths never exist
 * on disk, so every read falls through to the manifest, keyed by the shared
 * {@link qualifiedKey} scheme. A total miss is a HARD error naming the key —
 * callers do not guard against empty content, and a silent `""` would write
 * blank files.
 *
 * `loadTemplateSync` is deliberately synchronous (both branches are), so a
 * generator can load its templates LAZILY inside its synchronous
 * `generate(answers)` call — never at module eval, which is what keeps READ
 * commands template-free in a compiled binary regardless of bundler layout.
 */

import { readFileSync } from "node:fs";
import qualifiedKey from "./keyScheme.js";

/** A loaded template: its source id (for diagnostics) and its content. */
export interface LoadedTemplate {
  /** Original source path (for diagnostics and dry-run display). */
  readonly source: string;
  /** Template content string (may legitimately be empty — `.gitkeep`). */
  readonly content: string;
}

/**
 * The injected manifest: qualified key → content. Empty in a source run;
 * populated by the compiled-binary host BEFORE any generator loads a template.
 */
let embeddedTemplates: Readonly<Record<string, string>> = {};

/**
 * Inject the embedded-template manifest — the compiled-binary fallback.
 * Called once by the host before the generators are imported. Passing an
 * empty map (the default) restores pure disk loading.
 *
 * @param manifest - Qualified key → template content.
 */
export function setEmbeddedTemplates(
  manifest: Readonly<Record<string, string>>,
): void {
  embeddedTemplates = manifest;
}

/**
 * Whether a host has injected a (non-empty) embedded manifest — the "embedded
 * context" fact `template()` uses to refuse silent disk fallbacks.
 *
 * @returns True when the manifest holds at least one entry.
 */
export function hasEmbeddedTemplates(): boolean {
  return Object.keys(embeddedTemplates).length > 0;
}

/**
 * Load a template from disk, or — when the disk read fails (a compiled
 * binary) — from the injected manifest. SYNCHRONOUS.
 *
 * @param prefix - The command-path prefix of the owning generator root.
 * @param source - Absolute path to the template file.
 * @returns Loaded template with path and content.
 * @throws If the template is neither on disk nor in the embedded manifest.
 */
export function loadTemplateSync(
  prefix: string,
  source: string,
): LoadedTemplate {
  // Filesystem first (source runs / tests).
  try {
    return { source, content: readFileSync(source, "utf-8") };
  } catch {
    // Not on disk — fall through to the embedded manifest (compiled binary).
  }

  const key = qualifiedKey(prefix, source);
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
 * @param prefix - The command-path prefix of the owning generator root.
 * @param source - Absolute path to the template file.
 * @returns Loaded template with path and content.
 */
export async function loadTemplate(
  prefix: string,
  source: string,
): Promise<LoadedTemplate> {
  return loadTemplateSync(prefix, source);
}
