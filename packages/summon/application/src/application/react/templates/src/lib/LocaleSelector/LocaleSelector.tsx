import { useLocale, useTranslation } from "@canonical/i18n-react";
import type { ChangeEvent, ReactElement } from "react";

/**
 * Resolve a locale tag to its endonym — the language's name in itself
 * ("English", "français", "العربية") — so every reader can find their own
 * language regardless of the page's current locale.
 */
function endonymOf(tag: string): string {
  return new Intl.DisplayNames([tag], { type: "language" }).of(tag) ?? tag;
}

/**
 * Language picker driving `useLocale` from `@canonical/i18n-react`. Changing
 * the selection re-translates every subscribed component, persists the choice
 * to the `locale` cookie (so the server renders the matching `<html lang>` on
 * the next request), and flips `<html dir>` for right-to-left locales.
 *
 * Each `<option>` carries a `lang` attribute so assistive technology
 * pronounces the endonym in its own language. Deliberately app-local: the
 * design-system tier ships no visual locale switcher.
 */
export default function LocaleSelector(): ReactElement {
  const { locale, locales, setLocale } = useLocale();
  const { t } = useTranslation();

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    setLocale(event.target.value);
  }

  return (
    <select
      aria-label={t("locale.label")}
      onChange={handleChange}
      value={locale}
    >
      {locales.map((tag) => (
        <option key={tag} value={tag} lang={tag}>
          {endonymOf(tag)}
        </option>
      ))}
    </select>
  );
}
