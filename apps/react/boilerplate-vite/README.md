## React Vite Boilerplate

This project provides a template that can be used to quickly create a React Vite
application using the standard set of shared Canonical packages.

## Running the app

The server scripts form a **2×3 matrix** — two modes (development vs preview)
across three targets (SPA, SSR on Bun, SSR on Node/Express):

|                   | `dev` — transform, HMR                 | `preview` — compiled, production-faithful |
| ----------------- | -------------------------------------- | ----------------------------------------- |
| **SPA** (no SSR)  | `bun run dev`                          | `bun run preview`                         |
| **SSR · Bun**     | `bun run dev:bun`                      | `bun run preview:bun`                     |
| **SSR · Node**    | `bun run dev:express`                  | `bun run preview:express`                 |

Naming rule: the bare name is the **SPA**; the `:bun` / `:express` suffix selects
the **SSR** runtime. The `dev*` prefix is the fast inner loop (Vite transforms
source on the fly, with HMR); the `preview*` prefix builds the client and runs a
**compiled** renderer over the built assets — the same shape that deploys.

Use `dev:*` while building; run `preview:*` to verify the production bundle
before you deploy.

### How the two modes differ

- **`dev*`** — Vite serves the root `index.html`, transforms `/src/**` on the
  fly, and serves client assets/HMR through Vite's middleware. No build step.
- **`preview*`** — `build:client` produces `dist/client` (hashed assets + a
  built `index.html`); `build:server` compiles the renderer to `dist/server`;
  the [`@canonical/react-ssr`](../../../packages/react/ssr) `serve-bun` /
  `serve-express` bin serves the built client statically and SSRs from the built
  shell.

The renderer (`src/server/entry.tsx`) is the same across every cell — only the
HTML shell source and how assets are served change.

### Build scripts

- `bun run build` — alias for `build:client` (the client bundle).
- `bun run build:client` — `vite build --ssrManifest` → `dist/client`.
- `bun run build:server` — `vite build --ssr src/server/renderer.tsx` →
  `dist/server` (only needed for `preview:*`).
- `bun run build:all` — client bundle + Storybook.
