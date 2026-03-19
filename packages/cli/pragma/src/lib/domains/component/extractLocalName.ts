/**
 * Extract the local name from a full URI.
 *
 * Strips the namespace prefix, returning only the fragment or final path
 * segment. For example, `"https://ds.canonical.com/global"` becomes `"global"`,
 * and `"https://example.com/ns#Foo"` becomes `"Foo"`.
 */
export function extractLocalName(uri: string): string {
  const hashIdx = uri.lastIndexOf("#");
  if (hashIdx !== -1) return uri.slice(hashIdx + 1);
  const slashIdx = uri.lastIndexOf("/");
  if (slashIdx !== -1) return uri.slice(slashIdx + 1);
  return uri;
}
