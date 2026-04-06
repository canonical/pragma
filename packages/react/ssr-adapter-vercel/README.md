# @canonical/ssr-adapter-vercel

Vercel deployment adapter for [`@canonical/react-ssr`](../ssr). Provides a Node
serverless handler (`createNodeHandler`) and an Edge handler
(`createEdgeHandler`) that bridge the SSR renderer to Vercel's runtimes.

> **Note:** this adapter (and its Deno and Cloudflare siblings) will likely be
> relocated outside the main `pragma` monorepo in the future, once the SSR
> deployment story is settled. It lives here for now to iterate alongside
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

- Static assets are served by Vercel's CDN (`.vercel/output/static`), not by
  this handler.
- The Node handler streams the response with backpressure handling and forwards
  a client-disconnect `AbortSignal` to the renderer; the Edge handler uses the
  Web-standard `Request`/`Response` model.
