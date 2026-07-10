import type { Locale, Messages } from "@canonical/i18n-core";
import ar from "./ar.js";
import en from "./en.js";
import fr from "./fr.js";

/**
 * Message catalogs keyed by locale tag, one entry per locale in
 * `i18nConfig.locales`. Passed to the `I18nProvider` on both the server and
 * the client; `useTranslation` picks the active locale's catalog from it.
 */
export const catalogs: Record<Locale, Messages> = { en, fr, ar };
