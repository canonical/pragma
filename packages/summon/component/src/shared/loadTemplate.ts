/**
 * The component-bound view of summon-core's embedded-template seam.
 *
 * The loader logic — disk-first read, directory-qualified embedded fallback,
 * hard error naming the key — lives in `@canonical/summon-core` now (one key
 * scheme for reader and writer, serving every generator package). This module
 * binds it to this package's `component` command-path prefix and keeps the
 * `./embedded` subpath's exports (`setEmbeddedTemplates`, `loadTemplateSync`)
 * alive for the host that injects the manifest.
 */

import {
  loadTemplateSync as coreLoadTemplateSync,
  type LoadedTemplate,
  setEmbeddedTemplates,
} from "@canonical/summon-core";

export type { LoadedTemplate };
export { setEmbeddedTemplates };

/**
 * Load a component template (disk-first, embedded fallback under the
 * `component/` prefix). SYNCHRONOUS — see the core loader for why.
 *
 * @param source - Absolute path to the template file.
 * @returns Loaded template with path and content.
 * @throws If the template is neither on disk nor in the embedded manifest.
 */
export function loadTemplateSync(source: string): LoadedTemplate {
  return coreLoadTemplateSync("component", source);
}

/**
 * Async wrapper over {@link loadTemplateSync}.
 *
 * @param source - Absolute path to the template file.
 * @returns Loaded template with path and content.
 */
export default async function loadTemplate(
  source: string,
): Promise<LoadedTemplate> {
  return loadTemplateSync(source);
}
