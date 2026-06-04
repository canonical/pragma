import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";

/**
 * Minimal structural type for the parts of Vite's dev server this helper uses.
 *
 * `vite` is an optional peer dependency of this package (it is only needed by
 * consumers running a Vite-backed dev server). Typing structurally avoids a
 * hard dependency on Vite's types while still describing the contract: a
 * connect-style middleware stack `(req, res, next) => void`.
 */
export interface ViteMiddlewareServer {
  middlewares: (
    req: IncomingMessage,
    res: ServerResponse,
    next: (err?: unknown) => void,
  ) => void;
}

/**
 * Bridge Vite's connect-style middleware into a `fetch`-style handler.
 *
 * Runtime SSR dev servers built on `Bun.serve` (or any Web `fetch` server)
 * cannot mount Vite's `(req, res, next)` middleware directly: that stack
 * expects Node's `http.IncomingMessage` / `ServerResponse`, while `fetch`
 * deals in Web `Request` / `Response`. Without delegating to Vite, every
 * request — including `/@vite/client`, `/src/**`, `/@id/**`, `/@fs/**`,
 * `/@react-refresh`, and `/node_modules/.vite/**` — would have to be
 * server-rendered, so client modules and HMR assets would be returned as the
 * SSR HTML page with the wrong `Content-Type` (browsers then block them as
 * modules and the page never hydrates).
 *
 * This helper adapts a Web `Request` into a Node `req`/`res` pair, runs Vite's
 * middleware against it, and returns a Web `Response` if the middleware handled
 * the request — or `null` if the stack called `next()` (a page route the
 * caller should server-render).
 *
 * The bridge is **runtime-agnostic**: it depends only on `node:http` /
 * `node:net` and Web globals (`Request`, `Response`), so it works under Bun,
 * Node's own `fetch` servers, Deno, and Workers — not just Bun. The `vite`
 * instance is injected, not imported, keeping this module free of a runtime
 * Vite dependency.
 *
 * The response body is **buffered**: chunks written by the middleware are
 * collected and the `Response` resolves on `end`, with `status` and `headers`
 * read from the (by-then-final) `ServerResponse`. This is correct and robust
 * for dev assets — transformed JS/CSS modules and source maps, which are small
 * and already in memory when Vite writes them. Streaming would buy near-zero
 * latency here (SSR render streaming goes through the renderer's
 * `renderToReadableStream`, never this bridge) while introducing header-timing
 * and backpressure hazards, so it is deliberately avoided.
 *
 * @param vite - A Vite dev server created with `middlewareMode: true`.
 * @returns A function mapping a Web `Request` to a `Response` (Vite handled it)
 *   or `null` (pass through to SSR).
 *
 * @example
 * ```ts
 * import { createServer as createViteServer } from "vite";
 * import { viteFetchMiddleware } from "@canonical/react-ssr/server";
 *
 * const vite = await createViteServer({
 *   server: { middlewareMode: true },
 *   appType: "custom",
 * });
 * const handleAsset = viteFetchMiddleware(vite);
 *
 * Bun.serve({
 *   async fetch(req) {
 *     const asset = await handleAsset(req);
 *     if (asset) return asset; // /@vite/client, /src/**, CSS, HMR …
 *     return ssrRender(req); // page route
 *   },
 * });
 * ```
 */
export function viteFetchMiddleware(
  vite: ViteMiddlewareServer,
): (request: Request) => Promise<Response | null> {
  return (request) =>
    new Promise<Response | null>((resolve, reject) => {
      const url = new URL(request.url);

      // A bare IncomingMessage needs a socket and a populated, lower-cased
      // headers object before Vite's middleware runs — Vite reads navigation
      // hints (e.g. `sec-fetch-mode`) and will throw on an empty header bag.
      const socket = new Socket();
      const req = new IncomingMessage(socket);
      req.url = url.pathname + url.search;
      req.method = request.method || "GET";

      const headers: Record<string, string> = {};
      request.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
      });
      if (!headers.host) headers.host = url.host;
      req.headers = headers;

      const res = new ServerResponse(req);

      const chunks: Buffer[] = [];
      const originalWrite = res.write.bind(res);
      const originalEnd = res.end.bind(res);

      res.write = ((chunk: unknown, ...rest: unknown[]) => {
        if (chunk != null) chunks.push(Buffer.from(chunk as Uint8Array));
        return (originalWrite as (...args: unknown[]) => boolean)(
          chunk,
          ...rest,
        );
      }) as ServerResponse["write"];

      res.end = ((chunk: unknown, ...rest: unknown[]) => {
        if (chunk != null && typeof chunk !== "function") {
          chunks.push(Buffer.from(chunk as Uint8Array));
        }
        const result = (originalEnd as (...args: unknown[]) => ServerResponse)(
          chunk,
          ...rest,
        );
        const responseHeaders: Record<string, string> = {};
        for (const [key, value] of Object.entries(res.getHeaders())) {
          if (value != null) responseHeaders[key] = String(value);
        }
        resolve(
          new Response(chunks.length ? Buffer.concat(chunks) : null, {
            status: res.statusCode,
            headers: responseHeaders,
          }),
        );
        return result;
      }) as ServerResponse["end"];

      res.on("error", reject);

      // `next()` → Vite did not handle it (a page route); the caller renders it.
      vite.middlewares(req, res, () => resolve(null));
    });
}
