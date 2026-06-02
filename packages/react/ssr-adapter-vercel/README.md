# @canonical/ssr-adapter-vercel

Vercel deployment adapter for [`@canonical/react-ssr`](../ssr). Provides a Node
serverless handler (`createNodeHandler`) and an Edge handler
(`createEdgeHandler`) that bridge the SSR renderer to Vercel's runtimes.

> **Note:** this adapter (and its [Deno](../ssr-adapter-deno) and
> [Cloudflare](../ssr-adapter-cloudflare) siblings) will likely be relocated
> outside the main `pragma` monorepo in the future, once the SSR deployment
> story is settled. It lives here for now to iterate alongside
> `@canonical/react-ssr`; treat its location as provisional.

## Usage

Node serverless function:

```ts
import { createNodeHandler } from "@canonical/ssr-adapter-vercel";

export default createNodeHandler({
  routes: [{ pattern: "/*", factory: (req) => createRenderer(req) }],
});
```

Edge function:

```ts
import { createEdgeHandler } from "@canonical/ssr-adapter-vercel";

export default createEdgeHandler({
  routes: [{ pattern: "/*", factory: (req) => createRenderer(req) }],
});
export const config = { runtime: "edge" };
```

- The Node handler streams the response with backpressure handling and forwards
  a client-disconnect `AbortSignal` to the renderer; the Edge handler uses the
  Web-standard `Request`/`Response` model.

## Static assets

This adapter does **not** serve static assets — Vercel's CDN does, from
`.vercel/output/static`, in the `filesystem` phase *before* any function runs.
That's why the adapter takes no `staticAssets` config. Per the
[Build Output API](https://vercel.com/docs/build-output-api/v3/primitives),
a rewrite `source` should not point at a file, since the filesystem takes
precedence over rewrites — so assets just work without a route.

> **Why no asset config, unlike [Deno](../ssr-adapter-deno)?** Vercel (like
> [Cloudflare](../ssr-adapter-cloudflare)) serves static files at the edge
> before the SSR function runs. Deno Deploy has no such layer for a dynamic app,
> so its adapter serves assets itself.

## Multiple backends

Serve several backends (e.g. a sitemap alongside the app) from **one** handler
by listing multiple routes — matched in order, first match wins:

```ts
createNodeHandler({
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

Vercel is file-based, so a secondary backend *can* also be its own function
(`functions/sitemap.xml.func` beside the catch-all), wired by `config.json`
routes with the specific rule before `/(.*)`. That split is worth it when a
backend needs independent scaling, runtime, or logs. For a lightweight backend
that shares the app's render code — like a sitemap — keeping it in `routes[]`
on one handler is simpler and works the same as on
[Cloudflare](../ssr-adapter-cloudflare) and [Deno](../ssr-adapter-deno).
