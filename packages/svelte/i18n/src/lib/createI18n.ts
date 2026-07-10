import {
  createFormatters,
  createTranslator,
  type Direction,
  type Formatters,
  type Locale,
  type LocaleSource,
  type Messages,
  type Translator,
} from "@canonical/i18n-core";
import { derived, type Readable } from "svelte/store";

/** Svelte stores derived from a shared {@link LocaleSource}. */
export interface I18nStores {
  /** The active locale. */
  locale: Readable<Locale>;
  /** Writing direction of the active locale. */
  direction: Readable<Direction>;
  /** Translator for the active locale. */
  t: Readable<Translator>;
  /** Formatters for the active locale. */
  formatters: Readable<Formatters>;
  /** Change the active locale. */
  setLocale: (locale: Locale) => void;
}

/**
 * Adapt a framework-agnostic {@link LocaleSource} to Svelte stores. The source
 * already satisfies the Svelte store contract, so `locale` *is* the source;
 * `t`, `formatters`, and `direction` are derived and refresh on every change.
 *
 * @example
 * const { locale, t, setLocale } = createI18n(source, catalogs);
 * // in markup: {$t("nav.home")}
 */
export default function createI18n(
  source: LocaleSource,
  catalogs: Record<Locale, Messages>,
): I18nStores {
  const locale: Readable<Locale> = { subscribe: source.subscribe };

  return {
    locale,
    direction: derived(locale, () => source.direction),
    t: derived(locale, ($locale) =>
      createTranslator($locale, catalogs[$locale] ?? {}),
    ),
    formatters: derived(locale, ($locale) => createFormatters($locale)),
    setLocale: source.set,
  };
}
