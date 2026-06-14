# @canonical/i18n-core

Framework-agnostic internationalization for the Pragma design system, built on
the native [`Intl`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Intl)
API. Zero runtime dependencies.

`i18n-core` owns everything that is not framework reactivity — locale
negotiation, message catalogs and translation, memoized formatters, and a live
locale source. React, Svelte, and Lit bindings stay thin and share this one
engine.

## Installation

```bash
bun add @canonical/i18n-core
```

## Configuration

Locales are declared explicitly as plain data — no magic discovery.

```ts
import type { I18nConfig } from "@canonical/i18n-core";

const config: I18nConfig = {
  locales: ["en", "fr", "ar"],
  defaultLocale: "en",
  rtlLocales: ["ar"],
};
```

## Locale negotiation (pure, SSR-safe)

```ts
import { directionOf, negotiateLocale } from "@canonical/i18n-core";

const locale = negotiateLocale(config, {
  cookieHeader: request.headers.get("cookie"),
  acceptLanguage: request.headers.get("accept-language"),
});
const dir = directionOf(config, locale); // "ltr" | "rtl"
```

An explicit cookie wins, then `Accept-Language` negotiation, then the default
locale. It takes raw header strings and returns a tag, so it behaves the same
on the server and the client.

## Messages

```ts
import { createTranslator, mergeCatalogs } from "@canonical/i18n-core";

const t = createTranslator("en", {
  "nav.home": "Home",
  greeting: "Hello, {name}!",
  items: { one: "{count} item", other: "{count} items" },
});

t("greeting", { name: "Ada" }); // "Hello, Ada!"
t("items", { count: 3 }); // "3 items" — via Intl.PluralRules
```

`mergeCatalogs(base, overrides)` layers app messages over a component's
built-in defaults. Resolution never throws: a missing key returns the key
itself, an absent placeholder is left verbatim.

## Formatting

```ts
import { createFormatters } from "@canonical/i18n-core";

const f = createFormatters("en-US");
f.number(1234.5); // "1,234.5"
f.currency(1234.5, "USD"); // "$1,234.50"
f.relativeTime(-3, "day", { numeric: "auto" }); // "3 days ago"
f.list(["A", "B", "C"]); // "A, B, and C"
```

Formatters memoize their `Intl` instances by options, since constructing them
is comparatively expensive.

## Reactive locale source

The cross-framework runtime channel. `subscribe` follows the Svelte store
contract — it calls back immediately and on every change — which also satisfies
React's `useSyncExternalStore` and a Lit reactive controller. One object drives
every framework. In the browser it persists the choice to a cookie and reflects
`<html lang dir>`; on the server those effects are inert.

```ts
import { createLocaleSource } from "@canonical/i18n-core";

const source = createLocaleSource(config, { initial: locale });
const unsubscribe = source.subscribe((next) => render(next));
source.set("ar"); // notifies subscribers; persists + reflects dir="rtl"
```

## License

LGPL-3.0
