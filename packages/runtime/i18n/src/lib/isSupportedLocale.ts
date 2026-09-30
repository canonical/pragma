import type { I18nConfig, Locale } from "./types.js";

/**
 * Test whether `value` is one of the locales declared in `config`.
 *
 * @param config - Active locale configuration.
 * @param value - Candidate tag (any string, or null/undefined).
 */
export default function isSupportedLocale(
  config: I18nConfig,
  value: string | null | undefined,
): value is Locale {
  return value != null && config.locales.includes(value);
}
