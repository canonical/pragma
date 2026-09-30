import type { I18nConfig } from "@canonical/i18n-core";

/**
 * The app's locale configuration, consumed by `@canonical/i18n-core`
 * negotiation on the server and by the `I18nProvider` on both sides.
 *
 * Locales are declared explicitly rather than discovered by convention
 * (Constitution VI — no magic). `ar` is included to exercise the
 * right-to-left path end to end: `rtlLocales` drives `directionOf` /
 * `documentAttrs`, so `<html dir>` flips without any app-side branching.
 */
export const i18nConfig = {
  locales: ["en", "fr", "ar"],
  defaultLocale: "en",
  rtlLocales: ["ar"],
} as const satisfies I18nConfig;

/** Union of the app's configured locale tags, derived from the config. */
export type AppLocale = (typeof i18nConfig.locales)[number];
