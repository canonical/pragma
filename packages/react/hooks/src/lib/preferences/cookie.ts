/**
 * Read a preference cookie by name from document.cookie.
 *
 * @param cookieName - The cookie name to look up
 * @returns The cookie value, or null if not found
 */
export function readPreferenceCookie(cookieName: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${escapeRegExp(cookieName)}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Write a preference cookie with a 1-year expiry.
 *
 * @param cookieName - The cookie name
 * @param value - The value to store
 */
export function writePreferenceCookie(cookieName: string, value: string): void {
  if (typeof document === "undefined") return;
  // biome-ignore lint/suspicious/noDocumentCookie: cookie API is the purpose of this module
  document.cookie = `${cookieName}=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax`;
}

/**
 * Clear a preference cookie by setting its max-age to 0.
 *
 * @param cookieName - The cookie name to clear
 */
export function clearPreferenceCookie(cookieName: string): void {
  if (typeof document === "undefined") return;
  // biome-ignore lint/suspicious/noDocumentCookie: cookie API is the purpose of this module
  document.cookie = `${cookieName}=; path=/; max-age=0; SameSite=Lax`;
}

/**
 * Read a preference cookie from a raw Cookie header string (server-side).
 *
 * @param header - The raw Cookie header value, e.g. "theme=dark; contrast=more"
 * @param cookieName - The cookie name to look up
 * @returns The cookie value, or null if not found
 */
export function readPreferenceCookieFromHeader(
  header: string | null,
  cookieName: string,
): string | null {
  if (!header) return null;
  const match = header.match(
    new RegExp(`(?:^|;\\s*)${escapeRegExp(cookieName)}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
