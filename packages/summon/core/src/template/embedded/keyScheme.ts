/**
 * THE key scheme of the embedded-template seam — the one derivation both the
 * reader ({@link import("./store.js").loadTemplateSync}) and the writer
 * ({@link import("./buildEmbeddedManifest.js").default}) key the manifest by.
 * A scheme split across packages is the half-derivation hazard this module
 * exists to remove: whatever the writer emits, the reader derives, from the
 * same function's contract.
 *
 * A key is `<prefix>/<path under the LAST "/templates/" segment>` — e.g.
 * `component/react/types.ts.ejs`, `package/tsconfig.json.ejs`,
 * `application/react/src/lib/index.ts.ejs`. The directory-qualified tail is
 * what fixed the historic basename collision (react/svelte/lit share
 * basenames); the prefix is the generator's command-path root, which is what
 * lets ONE manifest serve every declared generator package.
 */

/**
 * Derive the manifest key for a template source path.
 *
 * @param prefix - The command-path prefix of the owning generator root.
 * @param source - The template's absolute source path.
 * @returns The qualified key, or `undefined` when the path carries no
 *   `templates/` segment (never expected for a real template).
 */
export default function qualifiedKey(
  prefix: string,
  source: string,
): string | undefined {
  const marker = "/templates/";
  const at = source.lastIndexOf(marker);
  if (at === -1) return undefined;
  return `${prefix}/${source.slice(at + marker.length)}`;
}
