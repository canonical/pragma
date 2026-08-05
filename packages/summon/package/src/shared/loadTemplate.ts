/**
 * This package's template reader — a binding of the shared
 * `@canonical/summon-core/embedded` registry to this package's name.
 *
 * The registry owns the policy (disk first, injected manifest second, a loud
 * throw on a miss); the only fact that lives here is the manifest scope. Every
 * `template({ source })` call in the generator passes the loaded `content:`, so
 * summon-core never falls through to `readFile(options.source)` — which is what
 * made `create package` die with `ENOENT … /$bunfs/templates/package.json.ejs`
 * from the compiled pragma binary, AFTER `mkdir` had already left a half-made
 * package on disk.
 */

import { loadEmbeddedSync } from "@canonical/summon-core/embedded";

/** This package's manifest scope — the key prefix its templates embed under. */
const PACKAGE_NAME = "@canonical/summon-package";

/**
 * Load a template from disk, or from the injected embedded manifest when there
 * is no disk to read (a compiled binary).
 *
 * @param source - Absolute path to the template file.
 * @returns The template's content.
 * @throws When the template is neither on disk nor in the embedded manifest.
 * @note Impure — reads the filesystem and the injected registry.
 */
export function loadTemplateSync(source: string): string {
  return loadEmbeddedSync(PACKAGE_NAME, source).content;
}
