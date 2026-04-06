# @canonical/ssr-adapter-cloudflare

Cloudflare Workers adapter for [`@canonical/react-ssr`](../ssr). Bridges the SSR
renderer to the Workers `fetch(request, env, ctx)` handler, serving static
assets from R2 and caching successful renders via the Cache API.

> **Note:** this adapter (and its Deno and Vercel siblings) will likely be
> relocated outside the main `pragma` monorepo in the future, once the SSR
> deployment story is settled. It lives here for now to iterate alongside
> `@canonical/react-ssr`; treat its location as provisional.

## Usage

```ts
import { createFetchHandler } from "@canonical/ssr-adapter-cloudflare";

export default {
  fetch: createFetchHandler({
    routes: [{ pattern: "/*", factory: (req) => createRenderer(req) }],
    staticAssets: [{ urlPrefix: "/assets", directory: "assets" }],
  }),
};
```

- `staticAssets[].directory` is the **R2 key prefix** — objects uploaded as
  `assets/main.js` are served at `/assets/main.js`. Stored `httpMetadata`
  (Content-Type) and `httpEtag` are applied; the immutable cache policy is set.
- Requires an `ASSETS` R2 bucket binding in `env`.
- The edge Cache API is used for `GET` requests only (`cache.put` rejects other
  methods); set `enableCache: false` to disable.
- The client `AbortSignal` is forwarded to the renderer.
