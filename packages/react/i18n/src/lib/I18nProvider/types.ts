import type {
  I18nConfig,
  Locale,
  LocaleSource,
  Messages,
} from "@canonical/i18n-core";
import type { ReactNode } from "react";

/** Value carried by the i18n context: the stable runtime wiring. */
export interface I18nContextValue {
  /** Live locale value shared across the subtree. */
  source: LocaleSource;
  /** Active locale configuration. */
  config: I18nConfig;
  /** Message catalogs keyed by locale. */
  catalogs: Record<Locale, Messages>;
}

/** Props for `I18nProvider`. */
export interface I18nProviderProps {
  children: ReactNode;
  /** Active locale configuration. */
  config: I18nConfig;
  /** Message catalogs keyed by locale. */
  catalogs: Record<Locale, Messages>;
  /** Initial locale (e.g. SSR-negotiated). Defaults to `config.defaultLocale`. */
  locale?: Locale;
  /**
   * An existing {@link LocaleSource} to bind to — supply this only to share one
   * locale value across frameworks. When omitted, the provider owns one.
   */
  source?: LocaleSource;
}
