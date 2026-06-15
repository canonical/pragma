# Pragma Application Boilerplate — Shared Specification

> **Status:** Draft — framework-agnostic extraction from the React reference.
> **Purpose:** Capture the *decisions* and *capabilities* of Pragma's application
> boilerplate as a framework-neutral contract, so a Svelte version can be built to
> parity. This is the spec an `application/svelte` Summon generator and an
> `apps/svelte/boilerplate-vite` reference app should satisfy.

This document does not describe React. It describes the **application** the
boilerplate produces — its architecture, the features a scaffolded app ships on
first run, and which layers are framework-neutral (reuse as-is) versus
framework-bound (re-implement per view layer). React is today's only
implementation; Svelte is the next one. Where a decision is currently realised
through a React-specific package, the spec names the **binding surface** a Svelte
implementation must provide instead.

---

## 1. Scope and sources of truth

The boilerplate exists as **two artifacts that must stay in lockstep**:

| Artifact | Path | Role |
|---|---|---|
| Reference application | `apps/react/boilerplate-vite/` | The living, runnable example. |
| Generator templates | `packages/summon/application/src/application/react/templates/` | The parameterized source the `summon application/react` generator stamps out. |

**The generator templates are canonical.** A test in the generator package
enumerates the on-disk `templates/` tree and asserts every file is emitted, so the
generator output and the template set cannot drift from each other. The *reference
app* can and does drift from the templates — treat the templates as the source of
truth when they disagree. Two known drifts at time of writing:

- `apps/react/boilerplate-vite/src/Application.tsx` (a counter demo) exists in the
  reference app but **not** in the generator templates and is imported by nothing —
  it is vestigial. The real application shell is the `publicLayout` wrapper in
  `routes.tsx`, not `Application.tsx`.
- The generator package README still describes `summon route` as appending an
  import plus a `TODO` comment. The implementation actually performs a reversible,
  formatter-safe AST insertion (see §6.3). The behaviour in this spec is
  authoritative.

**Parity goal.** A Svelte app scaffolded by `summon application/svelte` should match
the React app feature-for-feature and script-for-script: same domains, same routing
semantics, same 2×3 server matrix, same theming/SEO/sitemap behaviour, same test and
Storybook story coverage. The CLI surface should differ only in the framework token
(`application/react` → `application/svelte`, `component react` → `component svelte`).

---

## 2. Architecture decisions

Each decision lists its **rationale** and its **binding** — `Neutral` (no view-layer
coupling, reuse the same package/code) or `Bound` (currently realised through a
React package; a Svelte equivalent is required, named in §5).

### Build and toolchain

- **D1 — Vite is the build tool and dev server.** *(Neutral)* Single tool for SPA
  build, SSR build, dev transforms, and HMR. Subpath imports resolve natively, no
  resolver plugin. Svelte swaps `@vitejs/plugin-react` for
  `@sveltejs/vite-plugin-svelte`; everything else about the Vite setup carries.
- **D2 — Bun is the package manager and script runner; Node is also supported.**
  *(Neutral)* Scripts invoke `bun run …`; `runInstall` runs `bun install`. The app
  still runs under Node (the Express server targets `node --import tsx`).
- **D3 — TypeScript everywhere, `NodeNext` module resolution, shared base config.**
  *(Neutral mechanism, Bound config)* `tsconfig.json` extends a shared config —
  `@canonical/typescript-config-react` for React, `@canonical/typescript-config-svelte`
  for Svelte (already exists in `configs/typescript-svelte/`). Type-check is
  `tsc --noEmit` for React; Svelte uses `svelte-check`.
- **D4 — Biome is the single linter/formatter, via a shared config.** *(Neutral)*
  `biome.json` extends `@canonical/biome-config` and scopes
  `files.includes = ["src", "*.json", "vite.config.ts"]`. No ESLint/Prettier.
- **D5 — Package-internal imports use `#`-prefixed Node subpath imports.**
  *(Neutral)* `package.json` `"imports"` declares `#lib/*`, `#domains/*`, `#styles/*`
  pointing at `./src/…`. These are a standard Node feature honoured by Vite,
  TypeScript (`NodeNext`), and Storybook with zero extra config. Specifiers use the
  `.js` extension.
- **D6 — Generated apps pin every `@canonical/*` workspace dependency to a single
  shared version range.** *(Neutral)* The range lives in one hand-maintained
  constant `PRAGMA_WORKSPACE_VERSION` (`src/shared/versions.ts`, currently
  `^0.27.1-experimental.0`), bumped in lockstep with each Lerna release. Eliminates
  internal compatibility matrices. (`@canonical/design-tokens` is versioned
  separately and arrives transitively via `@canonical/styles`.)

### Rendering and SSR

- **D7 — SSR is mandatory, not optional.** *(Bound)* The generator hard-requires
  `--ssr` and `--router`; passing `--no-ssr` or `--no-router` aborts with
  "Standalone SPA mode is not supported." A scaffolded app always server-renders.
- **D8 — Streaming SSR with client hydration.** *(Bound)* The server renders a full
  HTML document and streams it; the client hydrates a single `#root` mount. React
  uses `renderToPipeableStream` (Express) / `renderToReadableStream` (Bun) and
  `hydrateRoot`. Svelte uses `render()` from `svelte/server` plus `mount()`/`hydrate()`
  from `svelte`.
- **D9 — The renderer is the invariant across dev and production.** *(Bound)* One
  server entry produces the same document whether loaded from source under Vite
  (`ssrLoadModule`) in dev or imported from a compiled `dist/server` bundle in
  preview/production. Only the HTML-shell source and the asset-serving strategy
  change between modes — never the renderer. This is the central SSR design
  principle and must hold for Svelte too.
- **D10 — A 2×3 server matrix: {dev, preview} × {SPA, SSR·Bun, SSR·Node/Express}.**
  *(Mixed)* Six `package.json` scripts. The bare name is the SPA; `:bun` / `:express`
  selects the SSR runtime; `dev` / `preview` selects the mode (`dev` = transform +
  HMR, `preview` = compiled, production-faithful). **Both runtimes are always
  scaffolded** — there is no Bun-vs-Express prompt. The *HTTP/Vite plumbing* of these
  servers (asset middleware, static file serving, request-URL derivation, the
  sitemap branch) is framework-neutral; only the renderer they call is bound.
- **D11 — The server is a chain of independent "bricks"; the first that handles the
  request wins.** *(Neutral pattern)* Order: (1) asset/Vite middleware (dev) or
  static files (preview), (2) `/sitemap.xml` → the XML sitemap renderer, (3)
  everything else → the document renderer. The two renderers know nothing about each
  other or about routing; the server is the only thing that inspects the URL and
  picks one. The same three bricks appear in the same order across `server.bun.ts`,
  `server.express.ts`, and the preview servers.
- **D12 — Production deploys via platform adapters, not these dev/preview servers.**
  *(Bound)* The dev/preview servers are for the inner loop and pre-deploy
  verification. Production targets Vercel / Cloudflare / Deno adapters (React ships
  `@canonical/react-ssr-adapter-{vercel,cloudflare,deno}`).
- **D13 — `@canonical/*` packages are bundled for SSR (`ssr.noExternal`).** *(Neutral
  decision)* `vite.config.ts` sets `noExternal: [/^@canonical\//]` because some
  packages expose only a `module` entry (Node's SSR resolver ignores it) and import
  CSS as a side effect (Node can't load it, Vite's SSR transform no-ops it). The same
  reasoning applies to Svelte packages.

### Routing

- **D14 — A custom, framework-agnostic router core, not a third-party router.**
  *(Neutral core)* `@canonical/router-core` owns route matching, navigation state,
  middleware, SSR dehydration, and accessibility orchestration. **This package is
  view-layer agnostic and is reused unchanged by Svelte.** Public surface includes
  `route()`, `wrapper()`, `group()`, `redirect()`, `applyMiddleware()`,
  `StatusResponse`, and the router factories `createBrowserRouter` /
  `createStaticRouter` / `createMemoryRouter` / `createHashRouter`.
- **D15 — Routes are flat; layout is composition, not nesting.** *(Neutral)* Every
  route is a `route({ url, content, search?, prefetch? })`. Shared layout is applied
  by wrapping a list of routes with `group(wrapperComponent, [routes])`. There is no
  nested route tree.
- **D16 — Domains own their routes; the root map composes them.** *(Neutral
  structure, Bound content)* Each `src/domains/<name>/routes.ts` exports a
  `const routes = { <key>: route({…}) } as const` default export. `src/routes.tsx`
  imports each domain's routes, applies the shared `publicLayout` wrapper via
  `group()`, and assembles the root `appRoutes` map.
- **D17 — `content` is the page itself, referenced eagerly.** *(Bound)* Routes pass
  the component directly (`content: HomePage`), not a render function and not a lazy
  import. Route-level code-splitting is deliberately not used; component-level
  streaming is the splitting mechanism (D24).
- **D18 — Search/query params are validated by a Standard Schema validator.**
  *(Neutral contract)* A route may declare `search:` with a `~standard`-shaped
  validator (`{ "~standard": { output, validate(value) } }`); validated params are
  injected into the page. Used by the `account` domain (`{ auth? }`, `{ from? }`).
- **D19 — Cross-cutting route policy is route-to-route middleware.** *(Neutral
  mechanism, Bound demo)* Middleware runs once, before the router is created, and
  transforms route definitions. The boilerplate ships a demo `withAuth("/login")`
  that protects `/account`, treats `?auth=1` as authenticated, and otherwise
  `redirect(…, 302)`s to `/login?from=…`. `export const middleware = […]` is consumed
  by both client and server router factories.
- **D20 — The route map is registered once for global type inference.** *(Bound)* A
  `declare module "<router binding package>" { interface RouterRegister { routes:
  AppRoutes } }` augmentation makes `Link`/`navigate`/`buildPath` typed by route name
  across the app. For React the augmented module is `@canonical/router-react`; for
  Svelte it is the Svelte router binding package.

### App structure

- **D21 — Feature work is adding a domain, not threading shared files.** *(Neutral
  principle)* `src/domains/<name>/` is the unit of feature organisation; each owns its
  `routes.ts` and one default-exported page component per route.
- **D22 — Shared UI lives in `src/lib/<Component>/` with a fixed file convention.**
  *(Bound)* Each component folder carries the component, `types.ts`, `styles.css`,
  `index.ts` barrel, a stories file, and a tests file. Design-system components apply
  a base class `"ds <kebab-name>"` and merge an optional consumer `className`.
- **D23 — Two static-asset folders with distinct roles.** *(Neutral)* `src/assets/`
  for assets imported in code (hashed/optimised by Vite, dropped if unused);
  `public/` for fixed-URL files served verbatim (favicon, `robots.txt`). Both ship by
  default with `.gitkeep` placeholders; either may be removed.
- **D24 — Component-level streaming demonstrates code-splitting.** *(Bound)* A
  `LazyComponent` suspends on a module-scoped promise (React 19 `use()` + `<Suspense>`)
  so the shell flushes first and the content streams in. The Svelte equivalent is an
  `{#await}` block (or `<svelte:boundary>`), shown on the home page.

### Theming, head, SEO

- **D25 — Theme/preferences are cookie-persisted and painted as a class on
  `<html>`.** *(Neutral storage, Bound hook)* A `usePreferredTheme`-style API exposes
  `{ value, source, set, reset }` over a `system | light | dark` choice. The choice is
  written to a `theme` cookie (chosen over `localStorage` so the **server** can read
  it and emit the right `<html class>` for a **flash-free first paint**), and applied
  as `.light` / `.dark` on `document.documentElement`, gating `@canonical/design-tokens`
  custom properties. The same generic mechanism backs `contrast` and `motion`
  preferences. The **cookie read/write/extract logic is framework-neutral** (it
  parses headers and strings); only the reactive hook is bound.
- **D26 — Document head/title is set declaratively from pages.** *(Bound)* Pages call
  a `useHead({ title })` API from a head-management package; a `HeadProvider` wraps the
  app on client and server, and a server-side collector emits the head markup into the
  streamed document.
- **D27 — A sitemap is a second renderer brick at `/sitemap.xml`.** *(Neutral)* An
  `async getSitemapItems()` returns `{ loc, changefreq, priority, lastmod? }[]`; a
  per-request `SitemapRenderer` (constructed fresh per request because it mutates
  status during render) emits the XML `<urlset>`. The `SitemapRenderer`/`SitemapItem`
  primitives are framework-neutral XML emission (they happen to live in
  `@canonical/react-ssr/renderer` today) and the data shape is reusable verbatim.

### Styling

- **D28 — One CSS entry aggregates DS styles, optional feature CSS, then app CSS.**
  *(Neutral)* `src/styles/index.css` imports, in order: `@canonical/styles` (base +
  tokens), the global-form stylesheet (only when forms are enabled), then `./app.css`
  (the app-shell layout). Component CSS is co-located and imported from its component.
  Layout uses DS token custom properties with fallbacks (`--grid-gap`,
  `--container-gap-default`, …). No `@layer` declarations.

### Quality gates

- **D29 — Unit/component tests run on Vitest; an e2e suite tests the build itself.**
  *(Bound runner config, Neutral intent)* Unit tests use a browser-like environment
  with Testing Library and a `*.tests.ts(x)` naming convention; coverage is reported
  but does not gate (thresholds start at 0, ratcheted up over time). A separate
  `test:e2e` boots all six matrix servers (Node env, serial, long timeout) and asserts
  each serves a rendered document, references a client script, serves that script with
  a JS MIME type (guarding the "asset served as text/html" regression), and — for SSR
  cells — serves `/sitemap.xml` as XML.
- **D30 — Storybook runs per-package via a shared config factory.** *(Bound)* Stories
  are CSF; `.storybook/main.ts` calls `createConfig(<framework>, { staticDirs })` from
  `@canonical/storybook-config`, `preview.ts` spreads the shared preview and imports
  the app's `styles/index.css`. A `withRouter` decorator provides router context to
  stories that need it, built on `createHashRouter` (no server needed) wrapped in the
  head + router providers.

### Scaffolding

- **D31 — A scaffolded app is produced by a Summon generator from EJS templates.**
  *(Neutral engine, Bound templates)* See §6.
- **D32 — The only feature toggle is `--forms`; the app is otherwise fixed.**
  *(Bound payload, Neutral pattern)* `--forms` threads a single boolean through six
  conditional fragments (the contact domain files, the form dependency, the form CSS
  import, a nav link, a sitemap entry, and the routes import/group/map key). The
  toggle-threading *pattern* is the reusable design; its *payload* is framework-bound.

---

## 3. Capabilities (the golden path)

What a freshly scaffolded application does on first run, with no additional code.
These are the acceptance criteria for Svelte parity.

1. **Runs in six configurations** out of the box — SPA and SSR (Bun + Node), each in
   dev (HMR) and preview (production-faithful) — from six `package.json` scripts.
2. **Server-side renders and hydrates** every page, streaming the shell first.
3. **Domain-organised routing** with three starter domains (marketing: home + guide;
   account: account + login; contact: contact form, with `--forms`).
4. **Typed, name-based navigation** — `<Link to="guide" params={{ slug: … }}>` style
   links resolve by route name with full type inference; hover prefetches.
5. **Dynamic route params and validated search params** — `/guides/:slug`, plus
   schema-validated `?auth` / `?from`.
6. **A demo auth flow** — visiting a protected route redirects to login unless
   `?auth=1`, via route middleware.
7. **A shared application shell** (header + navigation + main) applied by wrapper
   composition, plus a not-found route.
8. **Theme switching** — system / light / dark, persisted in a cookie, applied as an
   `<html>` class, **with no flash on first paint** because the server reads the
   cookie.
9. **Declarative document titles/head** set per page.
10. **A generated `/sitemap.xml`.**
11. **Component-level streaming** — a suspending component demonstrates shell-first
    streaming and code-splitting.
12. **A design-system component library starter** — example component folder with
    types/styles/stories/tests following the DS file convention and `"ds <kebab>"`
    class.
13. **Optional forms** — `--forms` adds a working contact form built from the DS form
    package.
14. **Storybook** — per-package, with a router decorator for routed components.
15. **Tests** — a unit/component suite and a build-level e2e suite that boots every
    server.
16. **Lint, format, and type-check** wired through `bun run check` (Biome + type
    checker).

---

## 4. Dependency stack and binding layers

Which packages a scaffolded app depends on, what each does, and the Svelte status.
The **Neutral** layer is reused as-is; the **Bound** layer needs a Svelte counterpart.

| Package (React) | Role | Layer | Svelte status |
|---|---|---|---|
| `@canonical/router-core` | Route matching, nav state, middleware, SSR dehydration, a11y | **Neutral** | **Reuse as-is** |
| `@canonical/router-react` | View bindings: provider, outlet, link, hooks, type registry | Bound | **Build** `router-svelte` |
| `@canonical/react-ssr` (`/renderer`) | Document renderer (`JSXRenderer`) + streaming | Bound | **Build** Svelte renderer |
| `@canonical/react-ssr` (`/server`) | Vite/HTTP glue: `viteFetchMiddleware`, `getRequestUrl`, static serving, `serveStream`, `serve-bun`/`serve-express` bins | **Mostly Neutral** | **Reuse/extract** (see §5.2) |
| `@canonical/react-ssr` (`SitemapRenderer`, `SitemapItem`) | XML sitemap emission | **Neutral** | **Reuse/extract** |
| `@canonical/react-head` | `HeadProvider`, `useHead`, server head collector | Bound | **Build** `svelte-head` |
| `@canonical/react-hooks` (`usePreferredTheme`) | Reactive theme/contrast/motion preference | Bound | **Build** Svelte rune/store |
| `@canonical/react-hooks` (cookie helpers, `extractPreferences`) | Header/string cookie parsing for preferences | **Neutral** | **Reuse/extract** |
| `@canonical/react-ds-global` | DS components (Button, TooltipArea, …) | Bound | Use `@canonical/svelte-ds-*` |
| `@canonical/react-ds-global-form` | DS form components (Form, Field) | Bound | Svelte DS form package |
| `@canonical/styles` + `@canonical/design-tokens` | Base CSS + token custom properties | **Neutral** | **Reuse as-is** |
| `@canonical/storybook-config` | Shared Storybook `main`/`preview` factory | **Neutral** (multi-framework) | **Reuse** (`createConfig("svelte", …)`) |
| `@canonical/biome-config` | Lint/format rules | **Neutral** | **Reuse as-is** |
| `@canonical/typescript-config-react` | Base TS config | Bound | Use `@canonical/typescript-config-svelte` |
| `vite`, `vitest`, `express`, `tsx`, `bun-types`, `typescript` | Build/test/runtime tooling | **Neutral** | **Reuse as-is** |

**Key insight:** the SSR story splits cleanly. The *document renderer* is the only
deeply React-coupled SSR piece. The *server plumbing* (`viteFetchMiddleware`,
`getRequestUrl`, static-file serving, the `serve-*` bins) and the *sitemap renderer*
are framework-neutral and currently live in `@canonical/react-ssr` only by accident of
history. The cleanest path for Svelte is to **extract the neutral parts into a shared
SSR core** and have both `@canonical/react-ssr` and a new `@canonical/svelte-ssr`
depend on it. (If extraction is too invasive initially, the Svelte SSR package can
re-export the neutral helpers from `@canonical/react-ssr` to avoid duplication.)

---

## 5. Svelte parity contract

### 5.1 Reuse as-is (no new code)

- **`@canonical/router-core`** — the entire routing model. Svelte routes are still a
  `const routes = { … } as const` map of `route()` calls in a `.ts` file.
- **`@canonical/styles` + `@canonical/design-tokens`** — identical CSS/token import.
- **`@canonical/biome-config`** — identical lint/format.
- **`@canonical/storybook-config`** — call `createConfig("svelte", …)`.
- **`@canonical/typescript-config-svelte`** — already exists in `configs/`.
- **The Summon core + task runtime** (§6) — entirely framework-neutral.
- **Sitemap data shape and `SitemapRenderer`** — reuse the XML emitter; only the
  import path changes if/when it moves to a shared SSR core.
- **Preference cookie logic** (`extractPreferences`, cookie read/write/clear) — pure
  string/header parsing.

### 5.2 New binding packages to build

For each, the **surface a Svelte version must provide** (mapped from the React
binding), expressed in Svelte 5 idioms (runes, context, snippets):

**`@canonical/router-svelte`** — bindings over `router-core`:
- A provider that places a router instance into Svelte context (React
  `RouterProvider`).
- An outlet component that renders the matched subtree and shows a fallback while
  navigating (React `Outlet` with `fallback`).
- A typed `Link` that builds hrefs from route name + params/search, intercepts
  primary clicks, and prefetches on hover (React `Link`).
- Reactive accessors for router state — current location, navigation lifecycle,
  search params, single search param, and the router instance — as runes/stores
  (React `useRoute`, `useNavigationState`, `useSearchParams`, `useSearchParam`,
  `useRouter`, `useRouterState`).
- A navigation blocker primitive for unsaved-state guards (React `useBlocker`).
- The `RouterRegister` type-registry interface for the `declare module` augmentation
  (D20).

**`@canonical/svelte-ssr`** — Svelte document rendering + (shared) server glue:
- A streaming renderer over `svelte/server` `render()` that takes an HTML-shell
  string, extracts the build's `<script>`/`<link>` tags, and injects them — the
  invariant renderer of D9 (React `JSXRenderer`).
- A server entrypoint contract analogous to `ServerEntrypointProps` (lang, head/script/
  link elements, `initialData`).
- Re-export or depend on the **neutral** server helpers (`viteFetchMiddleware`,
  `getRequestUrl`, static serving, `serveStream`) and the `serve-bun` / `serve-express`
  bins, ideally from a shared SSR core (§4).
- Platform adapters mirroring `@canonical/react-ssr-adapter-*` as needed (D12).

**`@canonical/svelte-head`** — head management:
- A head provider/collector for client and server (React `HeadProvider` +
  `createHeadCollector`).
- A `useHead`-equivalent (a rune or `$effect`-backed helper, or a `<svelte:head>`-based
  approach) for setting title/meta from a page/component (React `useHead`).

**Svelte preferences** (in a Svelte hooks/utils package):
- A `usePreferredTheme`-equivalent rune/store exposing `{ value, source, set, reset }`
  over the same `theme` cookie + `.light`/`.dark` `<html>` class mechanism (D25),
  reusing the neutral cookie/extract helpers.

### 5.3 New generator: `application/svelte`

- Add a sibling generator object keyed `"application/svelte"` to the package barrel
  (`packages/summon/application/src/index.ts`), next to `"application/react"`. The
  barrel already anticipates per-framework namespacing (cf. `summon component` listing
  `react, svelte`).
- Reuse the React generator's **prompt set and control flow** verbatim in shape:
  `appPath` (positional, name derived from the path's last segment, slugified), the
  `ssr` + `router` hard-requirement gates, the single `forms` toggle, and
  `runInstall`. Only the template payload changes.
- Author a Svelte sibling of every template file under
  `src/application/svelte/templates/`. Most are `.tsx` → `.svelte`/`.ts` rewrites; the
  framework-neutral ones (`biome.json`, `.gitignore`, `robots.txt`, the sitemap data
  module, the server scripts' HTTP/Vite plumbing) carry over with minimal change.
- Mirror the **sub-generators** (`domain`, `route`, `wrapper`) for Svelte. Their
  code-string builders emit `.svelte` pages/layouts and Svelte-router imports instead
  of React/JSX. **Reuse `src/route/insertRoute.ts` as-is in spirit**: it locates the
  last import and the `const routes = { … } as const` object via the TypeScript
  compiler API and splices text (idempotent, formatter-safe, with a reversible undo).
  Because Svelte route barrels stay `.ts` object literals, this transfers directly.
- Keep the `--forms` conditional-threading pattern identical; only the inserted
  fragments become Svelte.

### 5.4 New reference app: `apps/svelte/boilerplate-vite`

- **Workspace glob gap:** the root `package.json` `workspaces` lists `apps/*`,
  `apps/react/*`, `apps/lit/*` but **not** `apps/svelte/*`. Add `apps/svelte/*` (and
  ensure the Nx/Lerna project graph picks it up) before adding a Svelte app there.
- Build it as the runnable twin of the React reference, kept in lockstep with the
  Svelte generator templates the same way the React pair is.

### 5.5 Svelte conventions already established in this repo

A Svelte app/generator should match the conventions the existing Svelte packages and
the Svelte **component** generator already use:

- **Svelte 5 runes**: `let { … } = $props()`, `{@render children?.()}`,
  `$state`/`$derived`/`$effect`. Component CSS class via `class={["ds", kebabName,
  className]}` → `"ds <kebab>"` (matches D22).
- **Component file convention** mirrors React: `Component.svelte`, `types.ts`,
  `styles.css`, `index.ts`, `Component.stories.svelte`, `Component.svelte.test.ts`
  (client/component), `Component.ssr.test.ts` (server).
- **Build**: library packages use `@sveltejs/package` (`svelte-package`); an *app*
  uses `@sveltejs/vite-plugin-svelte` (no `svelte-package`).
- **Type-check**: `svelte-check` (not bare `tsc`).
- **Storybook**: `@storybook/addon-svelte-csf` with `.stories.svelte`.
- **Testing**: Vitest with `ssr` / `client` / `server` projects, `vitest-browser-svelte`
  + `@vitest/browser` (Playwright) for component tests, and the
  `@canonical/svelte-ssr-test` `render()` harness (wraps `svelte/server` `render` with
  Testing Library queries) for SSR assertions.
- **Architecture checks**: `webarchitect package-svelte` / `webarchitect tool-ts`.

---

## 6. The Summon generator model (framework-neutral machinery)

All of this is reused unchanged; it is described so the Svelte generator author knows
what they are building *within*.

### 6.1 Generator shape

A generator is a plain `GeneratorDefinition<TAnswers>` object
(`packages/summon/core/src/types/GeneratorDefinition.ts`) with three members:

- `meta` — CLI display metadata (`name`, `displayName`, `description`, `version`,
  `help`, `examples`).
- `prompts` — an array of `PromptDefinition` (`{ name, message, type:
  "text"|"confirm"|"select"|"multiselect", default?, choices?, when?, validate?,
  group?, positional? }`). Each name becomes a kebab-case CLI flag (`appPath` →
  `--app-path`); `positional: true` allows one primary text input without a flag; a
  `confirm` with `default: true` gets a `--no-<name>` flag.
- `generate(answers)` — **a pure function returning a `Task<void>`**, a lazy
  description of effects (`WriteFile`, `CopyFile`, `MakeDir`, `Template`, `Exec`,
  `Exists`, `TransformFile`, …). It performs no I/O itself.

### 6.2 Execution and templating

- Interpreters run the task: a real one executes; a **dry-run** interpreter collects
  effects against a *virtual filesystem* (so `exists()` sees files earlier steps
  "wrote"). This powers `--dry-run`, `--llm`, `--format json`, and the test suite —
  no mocks.
- File primitives: `copyFile(src, dest)` for verbatim static templates;
  `template({ source, dest, vars })` renders an `.ejs` file through **EJS**
  (`<%= %>` interpolate, `<% %>` logic, `-%>` trims newline). `vars` are augmented by
  `withHelpers(...)` with string helpers (`camelCase`, `pascalCase`, `kebabCase`,
  `titleCase`, …). The application templates use only `name`, `forms`, and
  `pragmaVersion`.
- A **stamp** comment (`Generated by @canonical/summon-… v…`) is prepended to emitted
  files (comment style auto-chosen per filetype), disabled by `--no-generated-stamp`.

### 6.3 Idempotent, reversible code insertion

`src/route/insertRoute.ts` is the most load-bearing pattern to carry over. It:

- uses the TypeScript compiler API only to **locate** the last `import` and the
  `const routes = { … }` object literal (peeling `as const` / `satisfies` /
  parens), then **splices text** at those offsets — it does not re-print the file, so
  it never fights Biome;
- is **idempotent** — re-inserting an existing route key is a no-op;
- carries a reversible **undo** (`removeRoute`) that deletes exactly the inserted
  property line and its default import.

All sub-generators **refuse to overwrite** existing files (guarded by `exists()`,
because their undo is a destructive delete) and share `normalizeCommandPath()` for
path/casing normalisation.

### 6.4 The `application/react` prompts (template for `application/svelte`)

| Prompt | Type | Default | Effect |
|---|---|---|---|
| `appPath` | text (positional) | `my-app` | Output dir **and** source of the slugified package `name`. No npm-scope support. |
| `ssr` | confirm | `true` | **Hard requirement** — `--no-ssr` aborts. |
| `router` | confirm | `true` | **Hard requirement** — `--no-router` aborts. |
| `forms` | confirm | `true` | The only feature toggle (adds the contact domain + form wiring). |
| `runInstall` | confirm | `true` | Runs `bun install` after scaffolding. |

---

## 7. Open questions for the Svelte port

Decisions the Svelte effort must make, beyond mechanical translation:

1. **Custom router vs SvelteKit.** This spec assumes the **custom**
   `router-core` + `router-svelte` path, matching the React app and reusing
   `router-core`. SvelteKit would bring its own router, SSR, and file-based routing
   and is a different product. Recommended: stay custom for parity; revisit only if
   SvelteKit adoption becomes a goal.
2. **Where the neutral SSR/sitemap/cookie code lives.** Extract a shared SSR core now,
   or have `@canonical/svelte-ssr` re-export from `@canonical/react-ssr` initially?
   (§4.) Extraction is cleaner long-term; re-export is faster to ship.
3. **Streaming primitive.** `svelte/server` `render()` returns a string body (+ head);
   confirm the streaming/hydration story (`{#await}` / `<svelte:boundary>` +
   `hydrate()`) reaches the same shell-first behaviour as React's `<Suspense>` +
   `renderToPipeableStream` (D8, D24), and what the Svelte e2e matrix asserts.
4. **`useHead` ergonomics in Svelte.** A rune/`$effect` helper vs a `<svelte:head>`
   convention vs a collector for SSR — pick one that works identically on server and
   client (D26).
5. **The two static-asset folders** (D23) — keep both by default for Svelte, or ship
   only `public/`? (Same open question the React generator carries.)
6. **Version pinning** (D6) — inherit the same hand-maintained `PRAGMA_WORKSPACE_VERSION`
   constant, or take this chance to inject the version at build time?

---

## Reference paths

- React reference app: `apps/react/boilerplate-vite/`
- React generator + templates: `packages/summon/application/src/application/react/`
- Sub-generators: `packages/summon/application/src/{domain,route,wrapper}/`
- Idempotent route insert: `packages/summon/application/src/route/insertRoute.ts`
- Version constant: `packages/summon/application/src/shared/versions.ts`
- Summon core types: `packages/summon/core/src/types/`
- Router core: `packages/runtime/router/` (`@canonical/router-core`)
- React router binding: `packages/react/router/` (`@canonical/router-react`)
- React SSR: `packages/react/ssr/` (`@canonical/react-ssr`)
- React head: `packages/react/head/` (`@canonical/react-head`)
- Preferences/theme hooks: `packages/react/hooks/src/lib/preferences/`
- Existing Svelte SSR render harness: `packages/svelte/ssr-test/` (`@canonical/svelte-ssr-test`)
- Existing Svelte DS packages: `packages/svelte/ds-app-launchpad/`, `packages/svelte/ds-app-wpe/`
- Svelte component generator (precedent): `packages/summon/component/src/svelte/`
- Shared configs: `configs/{biome,storybook,typescript-svelte}/`
