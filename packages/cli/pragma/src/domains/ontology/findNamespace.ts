/**
 * Find the namespace prefix for a given URI by matching against registered
 * prefix entries. Selects the longest matching namespace.
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
