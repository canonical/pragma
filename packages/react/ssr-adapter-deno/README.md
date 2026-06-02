# @canonical/ssr-adapter-deno

Deno Deploy adapter for [`@canonical/react-ssr`](../ssr). Bridges the SSR
renderer to a `Deno.serve()` request handler, routing dynamic requests to
renderer factories and serving static assets from the filesystem.

> **Note:** this adapter (and its [Cloudflare](../ssr-adapter-cloudflare) and
> [Vercel](../ssr-adapter-vercel) siblings) will likely be relocated outside the
> main `pragma` monorepo in the future, once the SSR deployment story is settled.
> It lives here for now to iterate alongside `@canonical/react-ssr`; treat its
> location as provisional.

## Usage

```ts
import { createHandler } from "@canonical/ssr-adapter-deno";

Deno.serve(
  createHandler({
    routes: [{ pattern: "/*", factory: (req) => createRenderer(req) }],
    staticAssets: [{ urlPrefix: "/assets", directory: "./dist/client/assets" }],
  }),
);
```

- `routes` are matched in order; the first match handles the request.
- The client `AbortSignal` is forwarded to the renderer so a disconnect cancels
  the render.

## Static assets

Unlike the [Cloudflare](../ssr-adapter-cloudflare) and
[Vercel](../ssr-adapter-vercel) adapters, **this adapter serves static assets
itself**. Deno Deploy has no static-file layer in front of a dynamic
entrypoint — an SSR app runs in the `dynamic` runtime, where
[serving files is your code's responsibility](https://docs.deno.com/deploy/api/runtime-fs).
So `staticAssets` maps a URL prefix to a filesystem directory, and the handler
streams matching files (via the native `Deno.open().readable`) with immutable
cache headers:

```ts
staticAssets: [{ urlPrefix: "/assets", directory: "./dist/client/assets" }];
```

Set edge caching with response headers (`Cache-Control: s-maxage=…`,
`Deno-CDN-Cache-Control`). If you prefer not to serve assets in-process, front
the app with [`@std/http`'s `serveDir`](https://jsr.io/@std/http) in your own
Deno entry, or host assets on a separate `static`-runtime Deploy — but the
single-deployment, in-handler path above is the recommended default.

> **Why does this adapter take `staticAssets` when the others don't?** Because
> Deno is the one platform here without an edge static layer. Cloudflare and
> Vercel serve assets *before* the SSR function runs, so their adapters take no
> asset config at all.

## Multiple backends

Serve several backends (e.g. a sitemap alongside the app) from **one** handler
by listing multiple routes — matched in order, first match wins:

```ts
createHandler({
  routes: [
    {
      pattern: "/sitemap.xml",
      factory: (req) => createSitemapRenderer(req),
      contentType: "application/xml; charset=utf-8",
    },
    { pattern: "/*", factory: (req) => createAppRenderer(req) },
  ],
});
```

`Deno.serve` registers exactly one handler per deployment, so internal routing
is the only model for a single app — and the `routes[]` list is exactly that.
Separate backends mean separate Deploy apps, which is only warranted for
independent deploy/ownership/isolation, not a sitemap.
