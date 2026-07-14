# React Vite Boilerplate

A production-ready React application scaffold built on Canonical's shared design
system, router, and SSR packages. It ships server-side rendering on two runtimes
(Bun and Node), file-based routing, a component library wired to design tokens,
and Storybook — configured so the golden path works on first run.

This is the reference application behind `@canonical/summon`'s `application/react`
generator; a scaffolded app inherits this layout and these scripts.

## Quick start

```bash
bun install
bun run dev:bun      # SSR dev server with HMR, on http://localhost:5174
```

Edit anything under `src/` and the page hot-reloads. To check the production
build before shipping, run `bun run preview:bun` instead.

## Running the app

The server scripts form a **2×3 matrix** — two modes (development and preview)
across three targets (a client-only SPA, SSR on Bun, SSR on Node/Express).
Picking a cell is picking a column and a row:

|                  | `dev` — transform, HMR | `preview` — compiled, production-faithful |
| ---------------- | ---------------------- | ----------------------------------------- |
| **SPA** (no SSR) | `bun run dev`          | `bun run preview`                         |
| **SSR · Bun**    | `bun run dev:bun`      | `bun run preview:bun`                     |
| **SSR · Node**   | `bun run dev:express`  | `bun run preview:express`                 |

The naming is systematic: the bare name is the **SPA**, the `:bun` / `:express`
suffix selects the **SSR runtime**, and the `dev` / `preview` prefix selects the
**mode**. Reach for `dev:*` while building — it is the fast inner loop — and for
`preview:*` when verifying that the production bundle behaves before a deploy.

### Why two modes exist

The modes are deliberately different because development and production have
different priorities, and a single server cannot serve both well.

- **`dev*`** optimises for iteration speed. Vite serves the root `index.html`,
  transforms `/src/**` on the fly, and serves client assets and HMR through its
  own middleware — there is no build step, so changes appear immediately.
- **`preview*`** optimises for fidelity. `build:client` produces `dist/client`
  (hashed assets and a built `index.html`), `build:server` compiles the renderer
  to `dist/server`, and the [`@canonical/react-ssr`](../../../packages/react/ssr)
  `serve-bun` / `serve-express` bin serves the built client statically while
  server-rendering from the built shell — the same artifact that deploys.

The renderer is the invariant across every cell: `src/server/entry.tsx` produces
the same document whether it runs from source under Vite or compiled behind a
static server. Only the HTML shell source and the asset-serving strategy change,
which is what keeps the dev experience fast without letting it drift from
production behaviour.

### Build scripts

- `bun run build` — the client bundle (alias for `build:client`).
- `bun run build:client` — `vite build --ssrManifest` → `dist/client`.
- `bun run build:server` — `vite build --ssr src/server/renderer.tsx` →
  `dist/server`. Needed only for `preview:*`; the `preview:*` scripts run it.
- `bun run build:all` — the client bundle plus the static Storybook.
- `bun run relay` — `relay-compiler`, regenerating the artifacts in
  `src/relay/__generated__`. The artifacts are committed (the Vite plugin runs
  with `codegen: false`), so run this after editing any `graphql` tag or the
  schema — the build does not regenerate them for you.
- `bun run relay:watch` — the same, re-running on change; pair it with `dev:*`
  while working on queries.

## Testing

```bash
bun run test          # unit + component tests (Vitest, jsdom)
bun run test:coverage # the same, with a coverage report
bun run test:e2e      # boots all six matrix servers and asserts each serves
```

`test:e2e` is an end-to-end test *of the build*: it runs each of the six scripts
above — including the production builds that `preview:*` performs — and asserts
that every server returns a rendered document and serves its client assets with
the correct content type. It is slower than the unit suite by design and is kept
out of the default `test` run.

## Project structure

```
src/
├── client/entry.tsx      Client entry — hydrates the server-rendered markup
├── server/
│   ├── entry.tsx         Server entry — the document component (the invariant)
│   ├── renderer.tsx      Compiled renderer for preview/production
│   ├── server.bun.ts     Bun dev server (Vite middleware)
│   ├── server.express.ts Node/Express dev server (Vite middleware)
│   └── sitemap.ts        Sitemap generation
├── domains/              Feature domains, each owning its routes and pages
│   ├── marketing/        Home, guides
│   ├── account/          Account, login
│   ├── catalog/          Product catalog — the Relay data-layer example
│   └── contact/          Contact form (present when scaffolded with forms)
├── i18n/                 Locale configuration and message catalogs (en/fr/ar)
├── lib/                  Shared components (Navigation, ThemeSelector, …)
├── relay/                Relay environment factory, executable mock schema,
│                         and generated artifacts (__generated__/)
├── styles/               Application CSS
├── assets/               Assets imported in code (bundled and hashed by Vite)
├── Application.tsx       Application shell
└── routes.tsx            Root route map
public/                   Files served verbatim at a fixed URL (favicon, robots.txt)
test/e2e/                 The 2×3 server-matrix end-to-end suite
```

Domains are the unit of feature organisation: each owns its routes and pages, so
adding a feature is adding a domain rather than threading changes through shared
files. `src/assets/` and `public/` both ship by default — the former for assets
referenced in code, the latter for fixed-URL files — and either may be removed if
an application uses only one.

## Data layer (Relay)

The `catalog` domain demonstrates the app's [Relay](https://relay.dev) data
layer: `ProductList` fetches a page of products with `useLazyLoadQuery`, and
each `ProductCard` reads its own colocated `useFragment` — the component owns
its field selection, the parent query just spreads it.

**By default the app needs no backend.** `createEnvironment`
(`src/relay/environment.ts`) resolves every GraphQL operation in-process
against an executable mock schema (`src/relay/schema.ts`, built from the SDL
in `src/relay/schema.graphql`) backed by a small deterministic catalog. Set
`VITE_GRAPHQL_URL` (or pass `graphqlUrl` to `createEnvironment`) to switch the
environment to posting operations to a real GraphQL endpoint instead — no code
changes needed.

**Generated artifacts are committed.** The Vite plugin runs with
`codegen: false`, so `src/relay/__generated__/` is not rebuilt on the fly:
after editing a `graphql` tag or the schema, run `bun run relay` (or keep
`bun run relay:watch` running) to regenerate the artifacts, and commit them.

## Internationalisation (i18n)

The app is translated through
[`@canonical/i18n-core`](../../../packages/runtime/i18n) (negotiation,
catalogs, formatters — framework-agnostic, native `Intl`) and
[`@canonical/i18n-react`](../../../packages/react/i18n) (the `I18nProvider`
plus the `useTranslation` / `useLocale` / `useFormatters` hooks). Everything
app-specific lives in `src/i18n/`:

- `config.ts` — the `I18nConfig`: `locales: ["en", "fr", "ar"]`, default
  `en`, `rtlLocales: ["ar"]`. Locales are declared, never discovered.
- `en.ts`, `fr.ts`, `ar.ts` — one message catalog per locale. English is the
  reference: the other files are typed against its key set
  (`Record<MessageKey, MessageValue>`), so a missing translation is a compile
  error. Values support `{placeholder}` interpolation and plural records
  selected by `vars.count` via `Intl.PluralRules` (see `catalog.showing`,
  which Arabic spells out across all six CLDR categories).
- `catalogs.ts` — the `Record<Locale, Messages>` handed to the provider.

**How a request gets its language.** Every server entry (both dev servers and
the compiled `renderer.tsx`) calls i18n-core's `negotiateLocale(config,
{ cookieHeader, acceptLanguage })`: an explicit `locale` cookie wins, then
`Accept-Language` negotiation (exact tag, then base language), then the
default. The result flows into `EntryServer` through the existing
`initialData` mechanism, where `documentAttrs` renders the matching
`<html lang dir>` and the `I18nProvider` receives it as the initial locale.
The client entry reads the same value back from `window.__INITIAL_DATA__`, so
the first client render agrees with the server markup; the SPA cells (no SSR)
run the identical negotiation locally against `document.cookie` and
`navigator.languages`.

**Switching at runtime.** `LocaleSelector` (`src/lib/LocaleSelector`, built on
`useLocale`, listing each locale by its `Intl.DisplayNames` endonym) calls
`setLocale`; the shared locale source re-renders every subscribed component,
persists the choice to the `locale` cookie — which is what the server reads on
the next request — and updates `<html lang dir>` live.

**Adding a locale.** Add the tag to `locales` in `src/i18n/config.ts` (and to
`rtlLocales` if it is right-to-left), create a catalog file typed against
`MessageKey`, and register it in `catalogs.ts` — the selector, negotiation,
tests, and the Storybook toolbar list (`.storybook/preview.ts`) pick it up
from there. The type error you get until the catalog is complete is the point.

**Right-to-left.** `ar` exists to keep the RTL path honest: `directionOf` /
`documentAttrs` flip `dir` with no app-side branching. Write styles with CSS
logical properties (`margin-inline-start`, `text-align: start`) so layouts
mirror structurally.

**What is (and is not) translated.** UI chrome — navigation, selector labels,
page headings and taglines, the catalog's loading/error/stock/rating strings —
comes from the catalogs. Product names and taglines are data, not chrome, and
render untranslated; the identifier-heavy developer prose on the home and
catalog pages stays in English deliberately. Prices and ratings go through
`useFormatters`, so the same data renders as `$125.00` in English and
`125,00 $US` in French.

In Storybook, every story is wrapped in the provider by a `withI18n` decorator
and the toolbar's Locale menu (globe icon) switches the story's language.

## Conventions

Path aliases (`#lib`, `#domains`, `#relay`, `#styles`) are Node subpath
imports declared in `package.json`, resolved natively by Vite and TypeScript
without a resolver plugin. Linting and formatting run through Biome (`bun run check`). The
application is built on `@canonical/react-ds-global`, `@canonical/react-ssr`,
`@canonical/router-react`, and the shared design tokens — the same packages every
Canonical application uses, so conventions carry across projects.
