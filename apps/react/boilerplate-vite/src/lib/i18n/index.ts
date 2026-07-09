/** @module App-local locale negotiation and preference. */

export {
  DEFAULT_LOCALE,
  type Direction,
  LOCALE_COOKIE,
  LOCALE_LABELS,
  type Locale,
  RTL_LOCALES,
  SUPPORTED_LOCALES,
} from "./constants.js";
export {
  dirForLocale,
  isSupportedLocale,
  negotiateLocale,
  parseAcceptLanguage,
} from "./negotiateLocale.js";
export {
  default as usePreferredLocale,
  type UsePreferredLocaleProps,
  type UsePreferredLocaleResult,
} from "./usePreferredLocale.js";
