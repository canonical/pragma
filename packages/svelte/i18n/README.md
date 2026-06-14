# @canonical/i18n-svelte

Svelte bindings for [`@canonical/i18n-core`](../../runtime/i18n). The core
`LocaleSource` already satisfies the Svelte store contract, so the binding is
just `createI18n` — it returns `locale`, `direction`, `t`, and `formatters` as
stores derived from one shared source.

## Installation

```bash
bun add @canonical/i18n-svelte @canonical/i18n-core
```

## Usage

```ts
// i18n.ts
import { createLocaleSource } from "@canonical/i18n-core";
import { createI18n } from "@canonical/i18n-svelte";

const config = { locales: ["en", "fr", "ar"], defaultLocale: "en", rtlLocales: ["ar"] };
const catalogs = {
  en: { "nav.home": "Home", items: { one: "{count} item", other: "{count} items" } },
  fr: { "nav.home": "Accueil", items: { one: "{count} article", other: "{count} articles" } },
};

export const { locale, direction, t, formatters, setLocale } = createI18n(
  createLocaleSource(config),
  catalogs,
);
```

```svelte
<script>
  import { t, locale, direction, setLocale } from "./i18n";
</script>

<a dir={$direction}>{$t("nav.home")}</a>
<span>{$t("items", { count: 3 })}</span>
<button on:click={() => setLocale("fr")}>FR</button>
```

The shared `LocaleSource` means the same locale value — with its cookie
persistence and `<html dir>` reflection — drives Svelte, React, and Lit alike.

## License

LGPL-3.0
