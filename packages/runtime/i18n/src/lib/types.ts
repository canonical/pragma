/**
 * Core type vocabulary for `@canonical/i18n-core`. Every type here is
 * framework-agnostic — plain data and function signatures over native `Intl`.
 */

/** A BCP 47 language tag, e.g. `"en"`, `"fr-CA"`, `"ar"`. */
export type Locale = string;

/** Writing direction of a locale's script. */
export type Direction = "ltr" | "rtl";

/**
 * CLDR plural categories. `Intl.PluralRules.select()` resolves a count to one
 * of these.
 */
export type PluralCategory = "zero" | "one" | "two" | "few" | "many" | "other";

/**
 * A message whose wording varies by count. `other` is required — it is the
 * fallback used whenever a locale does not define the selected category.
 */
export type PluralRecord = Partial<Record<PluralCategory, string>> & {
  other: string;
};

/** A single catalog entry: a flat string or a count-sensitive plural record. */
export type MessageValue = string | PluralRecord;

/**
 * A flat map of message keys to values for one locale. Keys are dotted
 * namespaces by convention (e.g. `"nav.home"`); the engine treats them as
 * opaque strings.
 */
export type Messages = Record<string, MessageValue>;

/**
 * Values interpolated into `{placeholder}` slots. A `count` value additionally
 * drives plural selection for a {@link PluralRecord} entry.
 */
export type TranslateVars = Record<string, string | number>;

/** Resolves a message key (with optional variables) to a localized string. */
export type Translator = (key: string, vars?: TranslateVars) => string;

/**
 * Locale-aware formatting helpers backed by memoized native `Intl` instances.
 * Construct once per locale via `createFormatters`.
 */
export interface Formatters {
  /** Format a number for the locale. */
  number(value: number, options?: Intl.NumberFormatOptions): string;
  /** Format a number as currency (ISO 4217 code, e.g. `"USD"`). */
  currency(
    value: number,
    currency: string,
    options?: Intl.NumberFormatOptions,
  ): string;
  /** Format a date/timestamp for the locale. */
  date(value: Date | number, options?: Intl.DateTimeFormatOptions): string;
  /** Format the time portion of a date/timestamp for the locale. */
  time(value: Date | number, options?: Intl.DateTimeFormatOptions): string;
  /** Format a relative time, e.g. `(-3, "day")` → "3 days ago". */
  relativeTime(
    value: number,
    unit: Intl.RelativeTimeFormatUnit,
    options?: Intl.RelativeTimeFormatOptions,
  ): string;
  /** Join a list with locale-aware conjunctions, e.g. "A, B, and C". */
  list(items: Iterable<string>, options?: Intl.ListFormatOptions): string;
}

/**
 * Declarative, framework-agnostic locale configuration. Plain data, listed
 * explicitly rather than discovered (Constitution VI — no magic).
 */
export interface I18nConfig {
  /** Supported BCP 47 tags, in preference order. */
  locales: readonly Locale[];
  /** Locale used when negotiation finds no supported match. */
  defaultLocale: Locale;
  /** Base languages whose script is right-to-left (e.g. `["ar", "he"]`). */
  rtlLocales?: readonly string[];
  /** Cookie that persists an explicit choice. Defaults to `"locale"`. */
  cookieName?: string;
}

/** Options for `createLocaleSource`. */
export interface LocaleSourceOptions {
  /** Starting locale. Defaults to {@link I18nConfig.defaultLocale}. */
  initial?: Locale;
  /** Persist changes to the cookie (browser only). Defaults to `true`. */
  persist?: boolean;
  /** Reflect changes onto `<html lang dir>` (browser only). Defaults to `true`. */
  reflect?: boolean;
}

/**
 * A live, observable locale value shared across frameworks. `subscribe` honors
 * the Svelte store contract — it calls back immediately with the current value
 * and returns an unsubscribe — which also satisfies React's
 * `useSyncExternalStore` and Lit reactive controllers. One source, every
 * framework.
 */
export interface LocaleSource {
  /** Read the current locale. */
  get(): Locale;
  /** Writing direction of the current locale. */
  readonly direction: Direction;
  /** Change the active locale (persists + reflects per options). */
  set(locale: Locale): void;
  /** Subscribe; invokes `run` immediately and on each change. Returns unsubscribe. */
  subscribe(run: (locale: Locale) => void): () => void;
}
