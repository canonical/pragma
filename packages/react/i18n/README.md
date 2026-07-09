# @canonical/i18n-react

React bindings for [`@canonical/i18n-core`](../../runtime/i18n). Thin by design:
the core engine owns negotiation, catalogs, formatting, and the live locale
value; these hooks expose it to React through `useSyncExternalStore`, so updates
are SSR-safe and surgical — only components that read a locale re-render.

## Installation

```bash
bun add @canonical/i18n-react @canonical/i18n-core
```

## Setup

Wrap the app once. Pass the SSR-negotiated locale so the server and the first
client render agree.

```tsx
import type { I18nConfig, Locale, Messages } from "@canonical/i18n-core";
import { I18nProvider } from "@canonical/i18n-react";

const config: I18nConfig = {
  locales: ["en", "fr", "ar"],
  defaultLocale: "en",
  rtlLocales: ["ar"],
};

const catalogs: Record<Locale, Messages> = {
  en: { "nav.home": "Home", items: { one: "{count} item", other: "{count} items" } },
  fr: { "nav.home": "Accueil", items: { one: "{count} article", other: "{count} articles" } },
};

<I18nProvider config={config} catalogs={catalogs} locale={negotiatedLocale}>
  <App />
</I18nProvider>;
```

## Hooks

```tsx
import { useFormatters, useLocale, useTranslation } from "@canonical/i18n-react";

function Home() {
  const { t, direction } = useTranslation();
  return <a dir={direction}>{t("nav.home")}</a>;
}

function Cart({ count }: { count: number }) {
  const { t } = useTranslation();
  return <span>{t("items", { count })}</span>; // plural via Intl.PluralRules
}

function Price({ amount }: { amount: number }) {
  const f = useFormatters();
  return <span>{f.currency(amount, "USD")}</span>;
}

```

## Language switcher

This package deliberately ships no visual components — semantic components
belong to the design-system tier. Pair `useLocale` with any control; listing
each locale by its **endonym** (the language's own name) and tagging each
`<option lang>` keeps the switcher accessible:

```tsx
import { useLocale } from "@canonical/i18n-react";

function LanguageSwitcher() {
  const { locale, locales, setLocale } = useLocale();
  return (
    <select
      aria-label="Language"
      value={locale}
      onChange={(event) => setLocale(event.target.value)}
    >
      {locales.map((tag) => (
        <option key={tag} value={tag} lang={tag}>
          {new Intl.DisplayNames([tag], { type: "language" }).of(tag)}
        </option>
      ))}
    </select>
  );
}
```

Changing the locale re-translates and re-formats every subscribed component and,
in the browser, persists the choice to a cookie and flips `<html dir>` for RTL
locales — all via the shared `@canonical/i18n-core` source.

For a correct first paint, set `<html lang dir>` on the server from the
negotiated locale with `documentAttrs` (see the
[`@canonical/i18n-core` README](../../runtime/i18n#server-side-rendering)).

## License

LGPL-3.0
