/**
 * Convert a full URI to its compact prefixed form when a matching prefix exists.
 * Falls back to the original URI when no namespace matches.
 */
export default function compactUri(
  fullUri: string,
  prefixes: Readonly<Record<string, string>>,
): string {
  for (const [prefix, namespace] of Object.entries(prefixes)) {
    if (fullUri.startsWith(namespace)) {
      return `${prefix}:${fullUri.slice(namespace.length)}`;
    }
  }

  return fullUri;
}
