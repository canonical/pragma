import type { Direction, I18nConfig, Locale } from "./types.js";

/**
 * Resolve the writing direction for a locale from its base language.
 *
 * @param config - Active locale configuration; its `rtlLocales` list decides.
 * @param locale - Locale tag, e.g. `"ar-EG"`, or undefined.
 */
export default function directionOf(
  config: I18nConfig,
  locale: Locale | undefined,
): Direction {
  if (!locale) return "ltr";
  const base = locale.toLowerCase().split("-")[0];
  return config.rtlLocales?.includes(base) ? "rtl" : "ltr";
}
