/**
 * Compact a full URI to its prefixed form using the longest matching
 * namespace. When two registered namespaces both prefix the URI (a base
 * namespace and a sub-namespace), the longer — more specific — one wins.
 * Falls back to the original URI when no namespace matches.
 *
 * @param fullUri - The absolute URI to compact.
 * @param prefixes - A map of prefix to namespace IRI.
 * @returns The `prefix:local` form, or `fullUri` unchanged when none matches.
 */
export function compactUri(
  fullUri: string,
  prefixes: Readonly<Record<string, string>>,
): string {
  let best: { prefix: string; namespace: string } | undefined;
  for (const [prefix, namespace] of Object.entries(prefixes)) {
    if (!fullUri.startsWith(namespace)) continue;
    if (best === undefined || namespace.length > best.namespace.length) {
      best = { prefix, namespace };
    }
  }

  if (best === undefined) return fullUri;
  return `${best.prefix}:${fullUri.slice(best.namespace.length)}`;
}
