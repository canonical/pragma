/**
 * Extract the local name from a full URI.
 *
 * `"https://ds.canonical.com/global"` → `"global"`
 * `"http://example.org/ns#Thing"` → `"Thing"`
 */

export default function extractLocalName(uri: string): string {
  const hashIdx = uri.lastIndexOf("#");
  if (hashIdx !== -1) return uri.slice(hashIdx + 1);
  const slashIdx = uri.lastIndexOf("/");
  if (slashIdx !== -1) return uri.slice(slashIdx + 1);
  return uri;
}
