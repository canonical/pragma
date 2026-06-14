import { DEFAULT_COOKIE_NAME } from "./constants.js";
import isSupportedLocale from "./isSupportedLocale.js";
import parseAcceptLanguage from "./parseAcceptLanguage.js";
import readCookie from "./readCookie.js";
import type { I18nConfig, Locale } from "./types.js";

/** Raw request inputs negotiation reads from, in priority order. */
export interface LocaleSources {
  /** Raw `Cookie` header — an explicit prior choice wins over everything. */
  cookieHeader?: string | null;
  /** Raw `Accept-Language` header, consulted when no cookie matches. */
  acceptLanguage?: string | null;
}

/**
 * Pick the first supported locale from a prioritized list of requested tags,
 * matching an exact tag first (`fr-ca`) then its base language (`fr`).
 */
function matchSupported(
  config: I18nConfig,
  requested: readonly string[],
): Locale | undefined {
  for (const tag of requested) {
    const base = tag.split("-")[0];
    if (isSupportedLocale(config, tag)) return tag;
    if (isSupportedLocale(config, base)) return base;
  }
  return undefined;
}

/**
 * Resolve the locale for an incoming request. An explicit cookie wins, then
 * `Accept-Language` negotiation, then {@link I18nConfig.defaultLocale}. Pure —
 * it takes raw header strings and returns a tag, so it is transport-agnostic
 * and runs the same on server and client (Constitution IV — functional core).
 *
 * @param config - Active locale configuration.
 * @param sources - Raw request headers to negotiate from.
 */
export default function negotiateLocale(
  config: I18nConfig,
  sources: LocaleSources = {},
): Locale {
  const cookie = readCookie(
    sources.cookieHeader,
    config.cookieName ?? DEFAULT_COOKIE_NAME,
  );
  if (isSupportedLocale(config, cookie)) return cookie;

  return (
    matchSupported(config, parseAcceptLanguage(sources.acceptLanguage)) ??
    config.defaultLocale
  );
}
