/**
 * This package's file reader — a binding of the shared
 * `@canonical/summon-core/embedded` registry to this package's name.
 *
 * The registry owns the policy (disk first, injected manifest second, a loud
 * throw on a miss); the only fact that lives here is the manifest scope.
 *
 * MEASURED, and the reason this package needed more than the template fix:
 * the React application generator reads 77 files, of which only 15 are `.ejs`
 * templates. The other 62 are verbatim assets (28 `.ts`, 22 `.tsx`, 3 `.patch`,
 * 2 `.gitkeep`, 2 `.css`, and one each of `.txt`/`.json`/`.graphql`/
 * `.browserslistrc`/`gitignore`) that used to reach the disk through
 * `copyFile(source, dest)`. Passing `content:` to `template()` alone would have
 * fixed a fifth of the generator and left `create application` writing an
 * application that is four fifths absent.
 */

import { loadEmbeddedSync } from "@canonical/summon-core/embedded";

/** This package's manifest scope — the key prefix its files embed under. */
const PACKAGE_NAME = "@canonical/summon-application";

/**
 * Load a template or verbatim asset from disk, or from the injected embedded
 * manifest when there is no disk to read (a compiled binary).
 *
 * @param source - Absolute path to the file.
 * @returns The file's content.
 * @throws When the file is neither on disk nor in the embedded manifest.
 * @note Impure — reads the filesystem and the injected registry.
 */
export function loadTemplateSync(source: string): string {
  return loadEmbeddedSync(PACKAGE_NAME, source).content;
}
