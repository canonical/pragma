import type { Direction, Locale, Translator } from "@canonical/i18n-core";

/** Result of `useTranslation`. */
export interface UseTranslationResult {
  /** Translate a key for the active locale. */
  t: Translator;
  /** Active locale. */
  locale: Locale;
  /** Writing direction of the active locale. */
  direction: Direction;
}

/** Result of `useLocale`. */
export interface UseLocaleResult {
  /** Active locale. */
  locale: Locale;
  /** Writing direction of the active locale. */
  direction: Direction;
  /** Change the active locale. */
  setLocale: (locale: Locale) => void;
  /** Every configured locale, for building a selector. */
  locales: readonly Locale[];
}
