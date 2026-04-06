# @canonical/ssr-adapter-deno

Deno Deploy adapter for [`@canonical/react-ssr`](../ssr). Bridges the SSR
renderer to a `Deno.serve()` request handler, serving static assets from the
filesystem and routing dynamic requests to renderer factories.

> **Note:** this adapter (and its Cloudflare and Vercel siblings) will likely be
> relocated outside the main `pragma` monorepo in the future, once the SSR
> deployment story is settled. It lives here for now to iterate alongside
> `@canonical/react-ssr`; treat its location as provisional.

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
- `staticAssets` are read from the filesystem (via the native `Deno.readFile`)
  and served with immutable cache headers.
- The client `AbortSignal` is forwarded to the renderer so a disconnect cancels
  the render.
