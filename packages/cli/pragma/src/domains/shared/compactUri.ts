/**
 * Convert a full URI to its compact prefixed form using the longest matching
 * namespace. When two registered namespaces are both prefixes of the URI
 * (e.g. a base namespace and a sub-namespace), the longer — more specific —
 * one wins. Falls back to the original URI when no namespace matches.
 */
export default function compactUri(
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
