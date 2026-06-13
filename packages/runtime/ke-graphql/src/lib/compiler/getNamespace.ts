/** Extract the namespace part of a URI (up to and including the last '#' or '/'). */
export default function getNamespace(uri: string): string {
  const hash = uri.lastIndexOf("#");
  const slash = uri.lastIndexOf("/");
  return uri.slice(0, Math.max(hash, slash) + 1);
}
