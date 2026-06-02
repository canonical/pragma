# @canonical/ssr-adapter-cloudflare

Cloudflare Workers adapter for [`@canonical/react-ssr`](../ssr). Bridges the SSR
renderer to the Workers `fetch(request, env, ctx)` handler and caches successful
renders via the edge Cache API.

> **Note:** this adapter (and its [Deno](../ssr-adapter-deno) and
> [Vercel](../ssr-adapter-vercel) siblings) will likely be relocated outside the
> main `pragma` monorepo in the future, once the SSR deployment story is settled.
> It lives here for now to iterate alongside `@canonical/react-ssr`; treat its
> location as provisional.

## Usage

```ts
import { createFetchHandler } from "@canonical/ssr-adapter-cloudflare";

export default {
  fetch: createFetchHandler({
    routes: [{ pattern: "/*", factory: (req) => createRenderer(req) }],
  }),
};
```

- The client `AbortSignal` is forwarded to the renderer so a disconnect cancels
  the render.
- The edge Cache API is used for `GET` requests only (`cache.put` rejects other
  methods); set `enableCache: false` to disable it.

## Static assets

This adapter does **not** serve static assets — Cloudflare does, at the edge,
*before the Worker runs*. Configure [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)
with an `[assets]` block in `wrangler.toml`:

```toml
name = "my-ssr-app"
main = "./src/worker.ts"
compatibility_date = "2026-06-02"

[assets]
directory = "./dist"   # the edge serves matching files; the Worker never runs for them
```

Notes:

- Omit the `binding` — it is only needed if the Worker itself wants to `fetch()`
  an asset. For plain static precedence it is not required.
- Do **not** set `not_found_handling = "single-page-application"`; an SSR app
  must reach the Worker for unmatched routes.
- If the app owns **deep links** (top-level navigations that may miss an asset),
  set `run_worker_first = ["/*", "!/assets/*"]` so those navigations reach the
  Worker instead of the 404 handler.

> **Why no asset config here, unlike [Deno](../ssr-adapter-deno)?** Cloudflare
> (like [Vercel](../ssr-adapter-vercel)) serves static files at the edge before
> the SSR function executes, so the adapter never sees asset requests. Deno
> Deploy has no such layer for a dynamic app, so its adapter reads files itself.

## Multiple backends

Serve several backends (e.g. a sitemap alongside the app) from **one** handler
by listing multiple routes — they are matched in order, first match wins:

```ts
createFetchHandler({
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

One Worker dispatching internally is the idiomatic Cloudflare model: one deploy,
one cold start, shared bindings. Reach for separate Workers + [Service Bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/)
only when a backend needs an independent deploy cadence, team ownership, or
isolation boundary — not for a sitemap.
