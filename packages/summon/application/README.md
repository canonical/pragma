# @canonical/summon-application

Summon generators for scaffolding application structure: full applications, domains, routes, and wrappers. Produces code aligned with the [boilerplate reference app](../../../apps/react/boilerplate-vite/).

## Generators

### `summon application/react <name>`

Scaffolds a complete React application with routing, Storybook, and two starter domains — server-rendered by default, or client-only with `--rendering spa`.

```bash
summon application/react my-app
summon application/react --no-forms my-app
summon application/react --intl my-app
summon application/react --relay my-app
summon application/react --rendering spa my-app
```

Produces:

```
my-app/
├── .storybook/
│   ├── main.ts
│   ├── preview.ts
│   └── decorators/
│       ├── withRouter.tsx    # Hash-based router decorator
│       └── index.ts
├── patches/                  # bun dependency patches (--relay only)
├── src/
│   ├── client/entry.tsx      # Client hydration
│   ├── server/               # (omitted with --rendering spa)
│   │   ├── entry.tsx         # SSR render
│   │   ├── server.express.ts # Express dev server
│   │   ├── server.bun.ts     # Bun dev server
│   │   └── sitemap.ts
│   ├── domains/
│   │   ├── marketing/        # HomePage, GuidePage, routes
│   │   ├── account/          # AccountPage, LoginPage, routes
│   │   ├── contact/          # ContactPage, routes (omitted with --no-forms)
│   │   └── catalog/          # CatalogPage, ProductList, ProductCard (--relay only)
│   ├── lib/
│   │   ├── Navigation/
│   │   ├── ThemeSelector/
│   │   ├── ExampleComponent/
│   │   ├── LazyComponent/
│   │   └── ClientOnly/       # SSR query guard (--relay only; omitted with --rendering spa)
│   ├── i18n/                 # Locale config, message catalogs (--intl only)
│   ├── relay/                # Environment factory, mock schema, __generated__ (--relay only)
│   ├── styles/
│   ├── routes.tsx
│   └── vite-env.d.ts
├── biome.json
├── index.html
├── package.json
├── relay.config.json         # (--relay only)
├── tsconfig.json
└── vite.config.ts
```

Form components are ON by default: the contact domain and its `contactRoutes` wiring in `routes.tsx` ship unless `--no-forms` is passed.

#### `--intl`: internationalisation

Off by default. `--intl` adds locale negotiation (cookie > `Accept-Language` >
default), per-locale message catalogs for `en`/`fr`/`ar` under `src/i18n/`, a
`LocaleSelector` in the chrome, the Storybook locale toolbar and its `withI18n`
decorator, and translated copy across every page. Under `--rendering spa` the same
negotiation runs in the browser (cookie, then `navigator.languages`) because no
server saw the request.

#### `--rendering spa`: client-only, no SSR layer

Off by default — a scaffolded app server-renders. `--rendering spa` is subtractive: it
emits a strict subset of the default tree, and nothing that is SPA-only.

Omitted:

- `src/server/` — the SSR entry, the compiled renderer, and the Express and Bun
  dev/preview servers.
- `src/sitemap/` — `/sitemap.xml` is a server-rendered route, and its renderer
  is the getters' only consumer.
- `src/lib/ClientOnly/` — an SSR-safety wrapper, so a no-op here.
- The `dev:*`, `preview:*` and `build:server` scripts, `--ssrManifest` on
  `build:client`, and the `express`, `@canonical/react-ssr`, `@types/express`,
  `tsx` and `bun-types` dependencies.

Kept: the e2e suite. Its harness spawns a script and polls HTTP — `vite` and
`vite preview` are servers too — so the matrix keeps its two non-SSR cells and
`bun run test:e2e` still covers `dev` and `preview`.

**What a SPA gives up.** The client router still performs the auth redirect,
the `/home` redirect and the not-found route. What is lost is the HTTP status
on a *cold* request — no 404, 301 or 302 from a server — plus `/sitemap.xml`
and the server-painted first paint (`<html lang dir>` and the cookie-derived
theme class), so expect a brief default theme/locale flash. With `--relay` the
catalog page always suspends and fetches rather than arriving with prefetched
data. Static hosting needs a history-API fallback the scaffold does not
configure.

#### `--relay`: Relay (GraphQL) data layer

The `--relay` flag (off by default) mirrors the boilerplate's Relay data layer:

- **`src/relay/`** — a `createEnvironment` factory built on
  `relay-runtime-network`'s middleware pipeline: by default a local executor
  resolves every operation in-process against the executable mock catalog
  schema (`schema.graphql` + `schema.ts`), so the app runs with zero backend;
  setting `VITE_GRAPHQL_URL` (or passing `graphqlUrl`) switches to posting
  operations to a real endpoint. The relay-compiler artifacts in
  `src/relay/__generated__/` are committed — deterministic outputs of the
  committed schema — and regenerated with `bun run relay` (or `relay:watch`)
  after any schema or `graphql` tag edit.
- **`src/domains/catalog/`** — an example domain wiring `useLazyLoadQuery`
  (`ProductList`) and a colocated `useFragment` (`ProductCard`) behind the
  canonical Suspense + `ErrorBoundary` pairing, with Storybook stories mocked
  via `@canonical/storybook-addon-relay` (`parameters.relay` mock resolvers +
  play tests) and component tests against both the local schema and
  `relay-test-utils`.
- **`src/lib/ClientOnly/`** — keeps queries off the server render path until
  SSR data serialization/hydration is supported: the server streams the
  fallback and the browser fetches after hydration. It is emitted only with
  `--relay` because the catalog page is its only consumer today.
- **`patches/` + `"patchedDependencies"`** — emitted only for STANDALONE
  apps. bun resolves `patchedDependencies` paths from the workspace root, so
  when the target path is inside a bun workspace (detected by walking up for
  a `package.json` whose `workspaces` globs cover the app) the workspace root
  owns patching and the scaffold emits neither the `patches/` directory nor
  the `patchedDependencies` block — an app-local block there would abort
  `bun install` with "Couldn't find patch file". A standalone app cannot
  inherit anyone's `patches/`, so three bun patches ship with the scaffold:
  `react-relay@21.0.1` (cjs-module-lexer export hints so named imports
  survive Node SSR externalisation), `relay-runtime@21.0.1` (real runtime
  bindings for type-only names the compiler artifacts import as values —
  `ConcreteRequest`, `ReaderFragment`, `FragmentRefs`), and
  `relay-runtime-network@0.1.0` (fixes its broken package `imports` map —
  temporary until the fixed upstream release lands, advl/lit-relay#32, after
  which the patch and its `patchedDependencies` entry can be dropped).
- **Wiring** — `RelayEnvironmentProvider` in both entries (one environment
  per browser session on the client, a fresh one per request on the server),
  `vite-plugin-relay-lite` in `vite.config.ts` (`codegen: false`; artifacts
  are committed), the `relay` / `relay:watch` scripts, catalog route, nav
  link, and sitemap entries, and the relay addon via `extraAddons` in
  `.storybook/main.ts`.

**Known caveats — not yet on npm.** `@canonical/storybook-addon-relay` and
the fixed `relay-runtime-network` release have not been published yet. A
scaffolded app's install currently fails to resolve
`@canonical/storybook-addon-relay` (404 from the registry), and the
`relay-runtime-network` patch remains necessary until the fixed upstream
release lands. The scaffold encodes the intended end state; a `--relay` app's
install will only fully resolve once those packages publish.

### `summon domain <name>`

Creates a domain folder under `src/domains/` with a `MainPage` and a `routes.ts` barrel.

```bash
summon domain billing
```

Produces:

```
src/domains/billing/
├── MainPage.tsx    # Page component with useHead()
└── routes.ts       # Route barrel with example route entry
```

After generating, import the domain routes in `src/routes.tsx` and wire them with `group()`:

```tsx
import billingRoutes from "#domains/billing/routes.js";

const [billing] = group(publicLayout, [billingRoutes.billing] as const);
```

### `summon route <domain>/<name>`

Adds a page component to an existing domain and wires it into the domain's `routes.ts` — no manual edit needed.

```bash
summon route billing/invoices
```

Produces:

```
src/domains/billing/
├── InvoicesPage.tsx   # New page component
└── routes.ts          # Import + route entry inserted
```

The generator locates the `routes` object with the TypeScript AST and splices in both the import and the full entry:

```ts
invoices: route({ url: "/billing/invoices", content: InvoicesPage }),
```

Running with `--undo` removes that entry and import again — safe when the insertion actually added a new key. If the route key already existed the insertion was a no-op, and `--undo` would remove the pre-existing route (the generator help documents the same caveat). Create the domain first with `summon domain <name>`.

### `summon wrapper <name>`

Creates a layout wrapper component under `src/lib/`.

```bash
summon wrapper sidebar
```

Produces:

```
src/lib/SidebarLayout/
├── SidebarLayout.tsx   # Layout component with children prop
└── index.ts            # Barrel export
```

Use the layout component in a `wrapper()` call in `routes.tsx`:

```tsx
import SidebarLayout from "#lib/SidebarLayout/index.js";

const sidebarWrapper = wrapper({
  id: "sidebar",
  component: ({ children }) => <SidebarLayout>{children}</SidebarLayout>,
});
```

## Conventions

The generators enforce the conventions established by the boilerplate:

### File structure

```
src/
├── client/                 # Client entry point (hydration; createRoot with --rendering spa)
├── server/                 # Server entry points (Express, Bun) — omitted with --rendering spa
├── domains/                # Feature domains
│   ├── marketing/
│   │   ├── HomePage.tsx
│   │   ├── GuidePage.tsx
│   │   └── routes.ts
│   ├── account/
│   │   ├── AccountPage.tsx
│   │   ├── LoginPage.tsx
│   │   └── routes.ts
│   ├── contact/            # Omitted with --no-forms
│   │   ├── ContactPage.tsx
│   │   └── routes.ts
│   └── catalog/            # When --relay is enabled
│       ├── CatalogPage.tsx
│       ├── ProductList.tsx
│       ├── ProductCard.tsx
│       ├── ErrorBoundary.tsx
│       └── routes.ts
├── lib/                    # Shared components
│   ├── Navigation/
│   └── SidebarLayout/
├── relay/                  # When --relay is enabled
│   ├── environment.ts      # Environment factory (local executor / HTTP)
│   ├── schema.graphql      # Mock SDL (relay-compiler validates against it)
│   ├── schema.ts           # Executable mock schema (graphql-js)
│   └── __generated__/      # Committed relay-compiler artifacts
├── styles/                 # CSS
└── routes.tsx              # Root route map, middleware, type registration
```

### Naming

| Concept | Pattern | Example |
|---------|---------|---------|
| Page component | `{Name}Page.tsx` | `SettingsPage.tsx` |
| Layout component | `{Name}Layout.tsx` | `SidebarLayout.tsx` |
| Domain routes | `routes.ts` (not `.tsx`) | `src/domains/billing/routes.ts` |
| Root routes | `routes.tsx` | `src/routes.tsx` |
| Component folders | PascalCase | `src/lib/SidebarLayout/` |

### Route definitions

Routes are flat objects using `route()` from `@canonical/router-core`:

```ts
const routes = {
  invoices: route({
    url: "/billing/invoices",
    content: InvoicesPage,
  }),
} as const;

export default routes;
```

- `content` receives the component directly (not a wrapper function)
- Pages use `useHead()` from `@canonical/react-head` for title and meta
- No `fetch()` / `warm()` unless needed for cache warming
- No `.error` — use React error boundaries
- Route files are `.ts` (no JSX in route definitions)

### Storybook decorators

The generated application includes a `withRouter` decorator for stories that need a router context:

```tsx
import withRouter from "../decorators/withRouter.js";

const meta = {
  decorators: [withRouter()],
} satisfies Meta;
```

Pass custom routes when the story depends on specific route shapes:

```tsx
import { appRoutes } from "../../routes.js";

const meta = {
  decorators: [withRouter({ routes: appRoutes })],
} satisfies Meta;
```

The decorator uses `createHashRouter` from `@canonical/router-core`, which stores routes in `window.location.hash` — suitable for Storybook and static environments where no server handles URL paths.

### Wrappers

Wrapper components are standard React components with a `children` prop. They become routable wrappers via `wrapper()` + `group()` in `routes.tsx`:

```tsx
const layout = wrapper({
  id: "sidebar",
  component: ({ children }) => <SidebarLayout>{children}</SidebarLayout>,
});

const [invoices, payments] = group(layout, [
  billingRoutes.invoices,
  billingRoutes.payments,
] as const);
```

### Type registration

Register routes once in `routes.tsx` for global type inference:

```tsx
declare module "@canonical/router-react" {
  interface RouterRegister {
    routes: typeof appRoutes;
  }
}
```

This enables typed `<Link to="invoices">`, `router.navigate("invoices")`, and `router.buildPath("invoices")`.

## Open questions

Design decisions about the generated output that are not yet settled:

- **A `--rendering spa` app has no sitemap.** `/sitemap.xml` is a server-rendered route, so
  `--rendering spa` drops `src/sitemap/` entirely. The getters themselves are portable — a
  build step could write a static `public/sitemap.xml` and a static host would serve
  it fine — but that is new tooling nothing else needs, and keeping the renderer
  would hold `@canonical/react-ssr` as a dependency for otherwise-dead code.
  **Open:** whether SEO-facing SPAs should get a build-time sitemap emitter.

- **Pinned pragma version is fetched at summon time.** Generated apps pin the pragma
  workspace packages (`react-ds-global`, `router-core`, `styles`, …) at `^<latest>`, where
  `<latest>` is queried from the npm registry when the app is scaffolded
  (`resolvePragmaVersion` in `src/shared/versions.ts`, via `npm view`). If the registry is
  unreachable it falls back to `^<installed generator version>` — safe because
  `@canonical/summon-application` is released in lockstep with those packages. Note
  `@canonical/design-tokens` is versioned separately and is *not* covered here (it arrives
  transitively via `@canonical/styles`). **Open:** whether to cache the lookup or let users
  pin explicitly for reproducible offline scaffolding.

- **Two static-asset folders (`src/assets/` + `public/`).** The generated app ships both,
  and `.storybook/main.ts` lists `staticDirs: ["../src/assets", "../public"]` to match the
  `@canonical/react-ds-global` convention. The two serve different roles under Vite —
  `src/assets/` for assets *imported in code* (hashed/optimized, dropped if unused), `public/`
  for files referenced by fixed URL (favicon, `robots.txt`, served as-is, unhashed). **Open:**
  whether a scaffolded app genuinely needs both by default, or whether one (likely just
  `public/` for a favicon) is enough and `src/assets/` should be added only when the app
  actually imports an asset. Currently both ship with `.gitkeep` placeholders.
