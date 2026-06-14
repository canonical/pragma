import { readPreferenceCookieFromHeader } from "@canonical/react-hooks";
import {
  DEFAULT_LOCALE,
  type Direction,
  LOCALE_COOKIE,
  type Locale,
  RTL_LOCALES,
  SUPPORTED_LOCALES,
} from "./constants.js";

/** Narrow an arbitrary string to a {@link Locale} this app supports. */
export function isSupportedLocale(
  value: string | null | undefined,
): value is Locale {
  return (
    value != null && (SUPPORTED_LOCALES as readonly string[]).includes(value)
  );
}

/** Resolve the writing direction for a locale's base language. */
export function dirForLocale(locale: string | undefined): Direction {
  if (!locale) return "ltr";
  const base = locale.toLowerCase().split("-")[0];
  return RTL_LOCALES.has(base) ? "rtl" : "ltr";
}

/**
 * Parse an `Accept-Language` header into language tags ordered by descending
 * quality (`q`) weight. Malformed segments are dropped.
 *
 * @example
 * parseAcceptLanguage("fr-CA,fr;q=0.9,en;q=0.8") // ["fr-ca", "fr", "en"]
 */
export function parseAcceptLanguage(
  header: string | null | undefined,
): string[] {
  if (!header) return [];
  return header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      const weight = q ? Number.parseFloat(q.slice(2)) : 1;
      return {
        tag: tag.trim().toLowerCase(),
        weight: Number.isNaN(weight) ? 0 : weight,
      };
    })
    .filter((entry) => entry.tag.length > 0)
    .sort((a, b) => b.weight - a.weight)
    .map((entry) => entry.tag);
}

/**
 * Pick the first supported locale from a prioritized list of requested tags.
 * Matches an exact tag first (`fr-ca`), then the base language (`fr`).
 */
function matchSupported(requested: string[]): Locale | null {
  for (const tag of requested) {
    if (isSupportedLocale(tag)) return tag;
    const base = tag.split("-")[0];
    if (isSupportedLocale(base)) return base;
  }
  return null;
}

/**
 * Resolve the locale for an incoming request, server-side.
 *
 * Priority mirrors the theme preference: an explicit `locale` cookie wins, then
 * `Accept-Language` negotiation, then {@link DEFAULT_LOCALE}. Pure — it takes
 * raw header strings and returns a tag, so it is transport-agnostic and
 * trivially testable (Constitution IV — functional core).
 *
 * @param cookieHeader - Raw `Cookie` header, or null.
 * @param acceptLanguage - Raw `Accept-Language` header, or null.
 */
export function negotiateLocale(
  cookieHeader: string | null,
  acceptLanguage: string | null,
): Locale {
  const cookie = readPreferenceCookieFromHeader(cookieHeader, LOCALE_COOKIE);
  if (isSupportedLocale(cookie)) return cookie;

  return matchSupported(parseAcceptLanguage(acceptLanguage)) ?? DEFAULT_LOCALE;
}
