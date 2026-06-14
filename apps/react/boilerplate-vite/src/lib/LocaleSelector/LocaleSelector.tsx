import type { ChangeEvent, ReactElement } from "react";
import {
  isSupportedLocale,
  LOCALE_LABELS,
  type Locale,
  SUPPORTED_LOCALES,
  usePreferredLocale,
} from "../i18n/index.js";

/** Read the server-resolved locale embedded for hydration, if present. */
function initialLocale(): Locale | undefined {
  if (typeof window === "undefined") return undefined;
  const data = (window as { __INITIAL_DATA__?: { locale?: string } })
    .__INITIAL_DATA__;
  return isSupportedLocale(data?.locale) ? data.locale : undefined;
}

/**
 * Language picker that drives {@link usePreferredLocale}. Mirrors
 * `ThemeSelector`: a controlled `<select>` whose choice persists in a cookie so
 * the server can render the matching `<html lang>` on the next request.
 */
export default function LocaleSelector(): ReactElement {
  const { value, set } = usePreferredLocale({ initialValue: initialLocale() });

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const selected = event.target.value;
    if (isSupportedLocale(selected)) {
      set(selected);
    }
  }

  return (
    <select aria-label="Language" onChange={handleChange} value={value}>
      {SUPPORTED_LOCALES.map((locale) => (
        <option key={locale} value={locale}>
          {LOCALE_LABELS[locale]}
        </option>
      ))}
    </select>
  );
}
