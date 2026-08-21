/**
 * The component-bound view of summon-core's embedded-template seam.
 *
 * The loader logic — disk-first read, directory-qualified embedded fallback,
 * hard error naming the key — lives in `@canonical/summon-core` (one key
 * scheme for reader and writer, serving every generator package). This module
 * is only the PREFIX BINDING over that seam: it fixes this package's
 * `component` command-path prefix, which is all the generators need. The host
 * that carries templates injects its manifest through summon-core's own
 * `setEmbeddedTemplates` — nothing here re-exports the store.
 */

import {
  loadTemplateSync as coreLoadTemplateSync,
  type LoadedTemplate,
} from "@canonical/summon-core";

export type { LoadedTemplate };

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
