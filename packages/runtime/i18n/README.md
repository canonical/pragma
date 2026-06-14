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

On the server, create one source **per request** — the React/Svelte/Lit
bindings already do this. A module-level singleton shared across concurrent
requests leaks locale state between them.

## Server-side rendering

The source can only set `<html lang dir>` from the client. For a correct first
paint and assistive technology, render `<html lang dir>` on the server from the
negotiated locale with `documentAttrs`:

```ts
import { documentAttrs, negotiateLocale } from "@canonical/i18n-core";

const locale = negotiateLocale(config, {
  cookieHeader: request.headers.get("cookie"),
  acceptLanguage: request.headers.get("accept-language"),
});
const { lang, dir } = documentAttrs(config, locale);
// render: <html lang={lang} dir={dir}> … </html>
```

Pass the same `locale` to the client (`createLocaleSource({ initial: locale })`)
so the server and first client render agree.

## Right-to-left & accessibility

`directionOf` resolves writing direction from `rtlLocales` (base languages); a
sensible default set is `["ar", "he", "fa", "ur"]`. Flipping `dir` is necessary
but not sufficient — author UI with CSS **logical properties**
(`margin-inline-start`, `inset-inline`, `text-align: start`) and mirror
directional icons so RTL is structural, not decorative.

Values in `config.locales` must be valid BCP-47 tags — they are reflected to
`<html lang>` and passed to `Intl`. A missing message key is returned verbatim
(`"nav.home"`), which is visible *and* read aloud, so treat catalog completeness
as an accessibility concern. `t()` returns plain strings that the framework
escapes on render; never pipe its output into `dangerouslySetInnerHTML` /
`unsafeHTML` / `{@html}`.

## License

LGPL-3.0
