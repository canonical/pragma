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

import type { EmbeddedFile } from "@canonical/summon-core/embedded";
import { loadEmbeddedSync } from "@canonical/summon-core/embedded";

/** This package's manifest scope — the key prefix its templates embed under. */
const PACKAGE_NAME = "@canonical/summon-component";

/**
 * The registry's own file type, re-exported rather than re-declared: this
 * binding returns what `loadEmbeddedSync` returns, unmodified, so a hand-copied
 * twin could only ever go stale — a field added to `EmbeddedFile` would silently
 * fail to reach this package's consumers.
 */
export type { EmbeddedFile };

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
export function loadTemplateSync(source: string): EmbeddedFile {
  return loadEmbeddedSync(PACKAGE_NAME, source);
}
