/**
 * Finds the namespace prefix for a given URI by matching against registered
 * prefix entries. When multiple prefixes match, selects the longest
 * (most specific) namespace.
 *
 * @param uri - The full URI to look up.
 * @param prefixEntries - Array of `[prefix, namespace]` tuples from the store.
 * @returns The matching `{ prefix, namespace }` or `undefined` if no prefix matches.
 */
export default function findNamespace(
  uri: string,
  prefixEntries: [string, string][],
): { prefix: string; namespace: string } | undefined {
  let best: { prefix: string; namespace: string } | undefined;
  for (const [prefix, namespace] of prefixEntries) {
    if (uri.startsWith(namespace)) {
      if (!best || namespace.length > best.namespace.length) {
        best = { prefix, namespace };
      }
    }
  }
  return best;
}
