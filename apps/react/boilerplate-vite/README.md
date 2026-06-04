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
│   └── contact/          Contact form (present when scaffolded with forms)
├── lib/                  Shared components (Navigation, ThemeSelector, …)
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

## Conventions

Path aliases (`#lib`, `#domains`, `#styles`) are Node subpath imports declared in
`package.json`, resolved natively by Vite and TypeScript without a resolver
plugin. Linting and formatting run through Biome (`bun run check`). The
application is built on `@canonical/react-ds-global`, `@canonical/react-ssr`,
`@canonical/router-react`, and the shared design tokens — the same packages every
Canonical application uses, so conventions carry across projects.
