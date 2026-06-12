/** Extract the local name of a URI (the part after the last '#' or '/'). */
export default function getLocalName(uri: string): string {
  const hash = uri.lastIndexOf("#");
  const slash = uri.lastIndexOf("/");
  return uri.slice(Math.max(hash, slash) + 1);
}
