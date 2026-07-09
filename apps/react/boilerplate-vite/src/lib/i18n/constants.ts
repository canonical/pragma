/**
 * App-local internationalization configuration.
 *
 * The boilerplate ships a small, explicit locale set rather than discovering
 * locales by convention (Constitution VI — no magic). Keep this list and the
 * message catalogues that will accompany it co-located with the app until a
 * second application needs the same negotiation logic; only then promote it to
 * a shared package (Constitution VIII — DRY only for stable patterns).
 */

/** BCP 47 language tags this app is translated into, in preference order. */
export const SUPPORTED_LOCALES = ["en", "fr", "es", "de", "ar"] as const;

/** A locale this app can render. */
export type Locale = (typeof SUPPORTED_LOCALES)[number];

/** Locale used when negotiation finds no supported match. */
export const DEFAULT_LOCALE: Locale = "en";

/** Cookie that persists an explicit user locale choice. */
export const LOCALE_COOKIE = "locale";

/** Writing direction of the document. */
export type Direction = "ltr" | "rtl";

/** Base languages that render right-to-left. */
export const RTL_LOCALES: ReadonlySet<string> = new Set([
  "ar",
  "he",
  "fa",
  "ur",
]);

/** Endonym labels for the locale selector (each shown in its own language). */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  es: "Español",
  de: "Deutsch",
  ar: "العربية",
};
