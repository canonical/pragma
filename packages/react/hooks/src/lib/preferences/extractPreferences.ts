import { readPreferenceCookieFromHeader } from "./cookie.js";

/** Preference values extracted from a Cookie header for SSR */
export interface ExtractedPreferences {
  /** Theme cookie value, or null if not set */
  theme: string | null;
  /** Contrast cookie value, or null if not set */
  contrast: string | null;
  /** Motion cookie value, or null if not set */
  motion: string | null;
}

/**
 * Extract all preference cookies from a raw Cookie header string.
 *
 * Intended for use in SSR middleware to read user preferences from
 * the incoming request and pass them as initialData to the renderer.
 *
 * @param cookieHeader - The raw Cookie header value, e.g. "theme=dark; contrast=more"
 * @returns Object with theme, contrast, and motion cookie values (null if absent)
 */
export default function extractPreferences(
  cookieHeader: string | null,
): ExtractedPreferences {
  return {
    theme: readPreferenceCookieFromHeader(cookieHeader, "theme"),
    contrast: readPreferenceCookieFromHeader(cookieHeader, "contrast"),
    motion: readPreferenceCookieFromHeader(cookieHeader, "motion"),
  };
}
