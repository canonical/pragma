# Lit SSR Boilerplate

A minimal server-side rendering setup for Lit web components using Vite and Express.

## Architecture

This boilerplate uses Vite's SSR mode to produce two separate builds from a shared
component tree: one for the server (Node.js) and one for the client (browser).

```
src/
├── pages/
│   ├── server.ts         # Server page template
│   └── hyperscale.ts     # Hyperscale page template
├── index.css           # Global styles (imported client-side only)
└── ssr/
    ├── entry-client.ts # Browser entry: route-aware hydration
    ├── entry-server.ts # Node entry: one render function per page
    ├── renderer.ts     # Injects SSR output into the HTML template
    └── server.ts       # Express server with one route per page
```

### Why Express?

The boilerplate serves two pages with navigation between them, which requires URL
routing. Node's built-in `http` module can do this but requires manual URL parsing.
Express is the minimal step up that handles routing cleanly without adding significant
complexity. If this ever reduces back to a single page, Express can be dropped in
favour of Node's `http` module.

### Why two entry points?

`entry-server.ts` runs in Node — it has access to `@lit-labs/ssr` and produces
Declarative Shadow DOM markup. `entry-client.ts` runs in the browser — it imports
Lit's hydration support first, then lets Lit attach to the server-rendered DOM
without re-rendering from scratch.

Page templates in `src/pages/` are the single source of truth for each route.
Both the server render functions and the client route map import from there,
which guarantees the server HTML and the client hydration target are always in sync.

### Navigation

Navigation between pages uses plain `<a>` tags — there is no client-side router.
Each click triggers a full server request, which renders the new page via SSR and
sends back complete HTML. This keeps the setup minimal and consistent with the
SSR-first goal of the prototype.

### SSR constraints to be aware of

Some Lit component patterns don't work on the server and need adjustments:

- **`slotchange` events** never fire during SSR. Components that derive state from
  slot contents (e.g. toggling a class when a slot is populated) should use
  `connectedCallback` with `querySelector('[slot="..."]')` instead — this runs
  during SSR.
- **`window` / `document`** are not available during SSR. Guard any usage with
  `if (typeof window !== 'undefined')`.
- **`connectedCallback`** does run during SSR, making it the right place for any
  setup that needs to inspect children or attributes.

## Getting started

### Prerequisites

- Node.js 18+
- Bun (used as the monorepo package manager)

### Install

```bash
bun install
```

### Run (production)

Builds both client and server bundles, then starts the Express server with Node.

```bash
bun run serve
```

## Adding a page

Adding a page requires a change in three places to keep server and client in sync:

1. **Create the template** in `src/pages/my-page.ts`:
   ```ts
   import { html } from "lit";
   export const myPageTemplate = html`<ds-site-layout>...</ds-site-layout>`;
   ```

2. **Add a server render function** in `entry-server.ts`:
   ```ts
   import { myPageTemplate } from "../pages/my-page.js";
   export async function renderMyPage(): Promise<string> {
     return collectResult(render(myPageTemplate));
   }
   ```

3. **Add a route** in `server.ts`:
   ```ts
   import { renderMyPage } from "./entry-server.js";
   app.get("/my-page", (_req, res, next) => {
     renderMyPage()
       .then(renderPage)
       .then((html) => res.status(200).setHeader("Content-Type", "text/html").end(html))
       .catch(next);
   });
   ```

4. **Add the route to the client map** in `entry-client.ts`:
   ```ts
   import { myPageTemplate } from "../pages/my-page.js";
   const routes = {
     "/": homeTemplate,
     "/features": featuresTemplate,
     "/my-page": myPageTemplate,   // add this
   };
   ```

### Adding components

1. Import and register your component in `entry-server.ts` and `entry-client.ts`
2. Use it in the relevant page template

Components are registered separately in each entry point because the server and
client use different custom element registries.

## How SSR + hydration works

1. A request hits the Express server
2. The matching route calls its render function from `entry-server.ts`, which runs
   Lit SSR and produces an HTML string with Declarative Shadow DOM
   (`<template shadowrootmode="open">`)
3. `renderer.ts` injects that string into `index.html` at the `<!--ssr-outlet-->`
   placeholder
4. The browser receives the full HTML — components are visible before any JS runs
5. `entry-client.ts` loads, imports `lit-element-hydrate-support.js` first, looks
   up the current pathname in the routes map, and calls `render()` — Lit detects
   the existing DSD markup and hydrates in place rather than re-rendering