import type { Messages } from "@canonical/i18n-core";
import ar from "./ar.js";
import type { AppLocale } from "./config.js";
import en from "./en.js";
import fr from "./fr.js";

/**
 * Message catalogs keyed by locale tag, one entry per locale in
 * `i18nConfig.locales` — `AppLocale` is derived from the config, so adding a
 * locale there without adding its catalog here is a compile error. Passed to
 * the `I18nProvider` on both the server and the client; `useTranslation`
 * picks the active locale's catalog from it.
 */
export const catalogs = { en, fr, ar } satisfies Record<AppLocale, Messages>;
