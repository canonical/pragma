/**
 * The component generators' template reader — a binding of the shared
 * `@canonical/summon-core/embedded` registry to THIS package's name.
 *
 * The registry (not this file) owns the disk-first / manifest-second policy,
 * the package-scoped key rule, and the loud failure on a miss. What lives here
 * is the one fact only this package knows: which package scope its templates
 * are embedded under. Before the registry moved to summon-core the loader also
 * hardcoded the `component/` key prefix, which meant one manifest could serve
 * exactly one generator package.
 */

import { loadEmbeddedSync } from "@canonical/summon-core/embedded";

/** This package's manifest scope — the key prefix its templates embed under. */
const PACKAGE_NAME = "@canonical/summon-component";

/** A loaded template: its source path (for diagnostics) and its content. */
export interface LoadedTemplate {
  /** Original source path (for diagnostics and dry-run display). */
  readonly source: string;
  /** Template content string. */
  readonly content: string;
}

/**
 * Load a component template from disk, or from the injected embedded manifest
 * when there is no disk to read (a compiled binary). SYNCHRONOUS, so the
 * generators load their templates lazily inside `generate()` rather than at
 * module eval — a READ command never touches a `.ejs` at all.
 *
 * @param source - Absolute path to the template file.
 * @returns Loaded template with path and content.
 * @throws When the template is neither on disk nor in the embedded manifest.
 * @note Impure — reads the filesystem and the injected registry.
 */
export function loadTemplateSync(source: string): LoadedTemplate {
  return loadEmbeddedSync(PACKAGE_NAME, source);
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
