import directionOf from "./directionOf.js";
import type { Direction, I18nConfig, Locale } from "./types.js";

/**
 * Compute the `<html>` attributes for a locale: `{ lang, dir }`. Render these on
 * the server (`<html lang dir>`) from the negotiated locale so the first paint —
 * and assistive technology — are correct before the client hydrates.
 *
 * @param config - Active locale configuration.
 * @param locale - The resolved locale.
 */
export default function documentAttrs(
  config: I18nConfig,
  locale: Locale,
): { lang: Locale; dir: Direction } {
  return { lang: locale, dir: directionOf(config, locale) };
}
