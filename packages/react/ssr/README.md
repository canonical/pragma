# @canonical/react-ssr

Server-side rendering utilities for React applications. Provides streaming HTML rendering, Express middleware with `serveStream`, 
and automatic script/link tag injection from your build output.

## Installation

```bash
bun add @canonical/react-ssr
```

Peer dependencies: `react`, `react-dom`, `express` (for Express usage).

## SSR flavors

There are usually two different flavors of SSR to be considered.

Source: [Tanstack Router SSR Guide](https://tanstack.com/router/latest/docs/framework/react/guide/ssr)

### Non-streaming SSR

The entire page is rendered on the server and sent to the client in one single HTML request, 
including the serialized data the application needs to hydrate on the client.

This is what `JSXRenderer.renderToString()` offers.

### Streaming SSR

The critical first paint of the page is rendered on the server and sent to the client in one single HTML request, 
including the serialized data the application needs to hydrate on the client.

The rest of the page is then streamed to the client as it is rendered on the server.

This is accomplished by using `JSXRenderer.renderToStream()`.

## Dev vs production SSR

The renderer is the invariant of every SSR setup: it takes an `htmlString`
shell, extracts the `<head>` `<script>`/`<link>` tags, and injects them into
the streamed output. **It never reads from disk and never cares which mode you
run in.** What changes between development and production is only two things —
*where the HTML shell comes from* and *how client JS/CSS reach the browser*:

| | **Development** (transform) | **Production** (compiled) |
| --- | --- | --- |
| HTML shell | root `index.html` → `vite.transformIndexHtml()` | built `dist/client/index.html` (hashed tags baked in) |
| Server entry | `vite.ssrLoadModule()` (TypeScript, on the fly) | compiled `dist/server` bundle |
| Client JS/CSS | served by Vite's middleware (source modules, HMR) | static files from `dist/client` |
| Renderer | **same `JSXRenderer`** | **same `JSXRenderer`** |

This means a dev SSR server and a production SSR server are *deliberately
different* — the dev server transforms source on the fly (with HMR); the
production server serves a pre-built client and a compiled renderer. Both feed
the same renderer; only the shell and asset-serving differ.

In development you mount Vite's middleware so that asset, module, and HMR
requests (`/@vite/client`, `/src/**`, `/@id/**`, `/@fs/**`, `/@react-refresh`,
`/node_modules/.vite/**`) are handled by Vite, and only page routes reach the
renderer. With Express this is `app.use(vite.middlewares)`. For `fetch`-style
servers (Bun, Deno, Workers) use [`viteFetchMiddleware`](#bun-server) — it
bridges Vite's connect middleware into a `Request → Response` handler. Without
it, those asset requests get server-rendered as the HTML page with the wrong
`Content-Type`, the browser blocks the modules, and the page never hydrates.

## Express Server

Create a renderer that wraps your server entry component:

```tsx
// src/ssr/renderer.tsx
import { JSXRenderer } from "@canonical/react-ssr/renderer";
import htmlString from "../../dist/client/index.html?raw";
import EntryServer from "./entry-server.js";

const initialData: Record<string, unknown> = {};
const Renderer = new JSXRenderer(EntryServer, initialData, { htmlString });
export default Renderer.render;
```

Create an Express server using `serveStream`:

```ts
// src/ssr/server.ts
import { serveStream } from "@canonical/react-ssr/server";
import express from "express";
import render from "./renderer.js";

const app = express();
app.use("/assets", express.static("dist/client/assets"));
app.use(serveStream(render));
app.listen(5173);
```

Build and run:

```bash
vite build --ssrManifest --outDir dist/client
vite build --ssr src/ssr/server.ts --outDir dist/server
node dist/server/server.js
```

## Bun Server

`Bun.serve` works with a Web `Request`/`Response` `fetch` handler, so it cannot
mount Vite's connect middleware directly. `viteFetchMiddleware` bridges the two:
it runs a `Request` through `vite.middlewares` and returns a `Response` if Vite
handled it (assets, modules, HMR) or `null` for page routes you should render.

```ts
// src/server/server.bun.ts — development
import { JSXRenderer } from "@canonical/react-ssr/renderer";
import { viteFetchMiddleware } from "@canonical/react-ssr/server";
import { createServer as createViteServer } from "vite";
import fs from "node:fs";

const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: "custom",
});
const handleAsset = viteFetchMiddleware(vite);

Bun.serve({
  port: 5174,
  async fetch(req) {
    // Vite handles /@vite/client, /src/**, CSS, HMR; null → page route → SSR.
    const asset = await handleAsset(req);
    if (asset) return asset;

    const url = new URL(req.url);
    const html = await vite.transformIndexHtml(
      url.pathname + url.search,
      fs.readFileSync("index.html", "utf-8"),
    );
    const { default: EntryServer } = await vite.ssrLoadModule(
      "/src/server/entry.tsx",
    );
    const renderer = new JSXRenderer(
      EntryServer,
      { url: url.pathname + url.search },
      { htmlString: html },
    );
    return new Response(await renderer.renderToReadableStream(req.signal), {
      status: renderer.statusCode,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  },
});
```

`viteFetchMiddleware` depends only on `node:http` and Web globals — no Bun APIs
— so it works under any `fetch`-style runtime (Bun, Deno, Workers, Node's own
`fetch` servers). The single Bun-specific call (`Bun.serve`) stays in your app.

For **production**, you do not run Vite at all. Build the client and a compiled
renderer, then serve the built output with the `serve-bun` bin (static assets +
your renderer factory):

```bash
vite build --ssrManifest --outDir dist/client
vite build --ssr src/server/renderer.tsx --outDir dist/server
serve-bun dist/server/renderer.js --static assets:dist/client/assets
```

## Entry Points

### Server Entry

The server entry renders the full HTML document. `scriptTags` and `linkTags` are extracted from your build output and injected automatically:

```tsx
// src/ssr/entry-server.tsx
import type { ReactServerEntrypointComponent, RendererServerEntrypointProps } from "@canonical/react-ssr/renderer";
import Application from "../Application.js";

const EntryServer: ReactServerEntrypointComponent<RendererServerEntrypointProps> = ({
  lang = "en",
  scriptTags,
  linkTags,
}) => (
  <html lang={lang}>
    <head>
      <title>My App</title>
      {linkTags}
    </head>
    <body>
      <div id="root">
        <Application />
      </div>
      {scriptTags}
    </body>
  </html>
);

export default EntryServer;
```

### Client Entry

The client entry hydrates the server-rendered HTML:

```tsx
// src/ssr/entry-client.tsx
import { hydrateRoot } from "react-dom/client";
import Application from "../Application.js";

hydrateRoot(document.getElementById("root")!, <Application />);
```

## Building

Two-phase build with Vite:

```json
{
  "scripts": {
    "build": "bun run build:client && bun run build:server",
    "build:client": "vite build --ssrManifest --outDir dist/client",
    "build:server": "vite build --ssr src/ssr/server.ts --outDir dist/server"
  }
}
```

The client build produces `dist/client/index.html` with bundled script/link tags. The server build imports this HTML string to extract those tags for injection.

## Customization

Pass options to React's `renderToPipeableStream`:

```ts
const initialData: Record<string, unknown> = {};
const Renderer = new JSXRenderer(EntryServer, initialData, {
  htmlString,
  initialData,
  renderToPipeableStreamOptions: {
    bootstrapModules: ["src/ssr/entry-client.tsx"],
  },
});
```

Options include:
- `bootstrapModules` - ES modules to load (`<script type="module">`)
- `bootstrapScripts` - Scripts to load (`<script>`)
- `bootstrapScriptContent` - Inline script content

See [React's renderToPipeableStream documentation](https://react.dev/reference/react-dom/server/renderToPipeableStream) for all options.

## Examples

See working examples in the monorepo:
- [`apps/react/boilerplate-vite`](../../../apps/react/boilerplate-vite) - Vite + Express
- [`apps/react/demo`](../../../apps/react/demo) - Full application example
