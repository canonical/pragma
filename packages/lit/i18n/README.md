# @canonical/i18n-lit

Lit bindings for [`@canonical/i18n-core`](../../runtime/i18n). A single reactive
controller — `LocaleController` — binds a host element to a shared
`LocaleSource`, re-rendering it on every locale change and exposing the
translator and memoized formatters for the active locale.

## Installation

```bash
bun add @canonical/i18n-lit @canonical/i18n-core lit
```

## Usage

```ts
import { createLocaleSource } from "@canonical/i18n-core";
import { LocaleController } from "@canonical/i18n-lit";
import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";

const config = { locales: ["en", "fr", "ar"], defaultLocale: "en", rtlLocales: ["ar"] };
const catalogs = {
  en: { "nav.home": "Home", items: { one: "{count} item", other: "{count} items" } },
  fr: { "nav.home": "Accueil", items: { one: "{count} article", other: "{count} articles" } },
};
const source = createLocaleSource(config);

@customElement("app-nav")
export class AppNav extends LitElement {
  #i18n = new LocaleController(this, source, catalogs);

  render() {
    return html`
      <a dir=${this.#i18n.direction}>${this.#i18n.t("nav.home")}</a>
      <span>${this.#i18n.t("items", { count: 3 })}</span>
      <button @click=${() => this.#i18n.setLocale("fr")}>FR</button>
    `;
  }
}
```

`source` is shared with any other framework binding (`@canonical/i18n-react`,
`@canonical/i18n-svelte`), so the same locale value — and its cookie persistence
and `<html dir>` reflection — drives React, Svelte, and Lit alike.

## License

LGPL-3.0
