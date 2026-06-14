/**
 * Read a single cookie value from a raw `Cookie` header. Pure and
 * transport-agnostic, so it behaves identically on the server and the client
 * (Constitution IV — functional core).
 *
 * @param cookieHeader - Raw `Cookie` header value, or null/undefined.
 * @param name - Cookie name to look up.
 * @returns The decoded value, or `undefined` when absent.
 */
export default function readCookie(
  cookieHeader: string | null | undefined,
  name: string,
): string | undefined {
  if (!cookieHeader) return undefined;

  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() === name) {
      return decodeURIComponent(part.slice(separator + 1).trim());
    }
  }

  return undefined;
}
