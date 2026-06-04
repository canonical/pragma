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
 * Headers set via `res.writeHead(status, headers)` are captured in addition to
 * `res.getHeaders()` (Vite's static-file middleware sets `Content-Type` etc.
 * that way for non-JS assets), and multi-value headers such as `set-cookie` are
 * preserved as separate entries rather than comma-folded.
 *
 * Only `GET`/`HEAD` requests are bridged. A bare `IncomingMessage` carries no
 * request body, so any middleware that reads one would hang; requests with a
 * body (and other methods) return `null` so the caller handles them. This
 * matches Vite's asset/module/HMR surface, which is entirely `GET`/`HEAD`.
 *
 * @param vite - A Vite dev server created with `middlewareMode: true`.
 * @returns A function mapping a Web `Request` to a `Response` (Vite handled it)
 *   or `null` (a page route, a non-`GET`/`HEAD` request — pass through to SSR).
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
  return (request) => {
    // Asset-only contract: a bare IncomingMessage carries no request body, so a
    // middleware that reads one (e.g. Vite's proxy when `server.proxy` is set)
    // would hang. Asset/module/HMR requests are all GET/HEAD; pass anything else
    // through to the caller (page POSTs are server-rendered, not bridged).
    if (request.method !== "GET" && request.method !== "HEAD") {
      return Promise.resolve(null);
    }

    return new Promise<Response | null>((resolve, reject) => {
      const url = new URL(request.url);

      // A bare IncomingMessage needs a socket and a populated, lower-cased
      // headers object before Vite's middleware runs — Vite reads navigation
      // hints (e.g. `sec-fetch-mode`) and will throw on an empty header bag.
      const socket = new Socket();
      const req = new IncomingMessage(socket);
      req.url = url.pathname + url.search;
      req.method = request.method;

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
      const originalWriteHead = res.writeHead.bind(res);

      // Headers passed to writeHead(status, [statusMessage,] headers) are NOT
      // returned by res.getHeaders() unless also set via setHeader, so capture
      // them here. Vite's static (sirv) middleware sets Content-Type, ETag,
      // Cache-Control this way for non-JS assets (svg, fonts, images, maps).
      let writeHeadHeaders:
        | ReturnType<ServerResponse["getHeaders"]>
        | undefined;

      res.writeHead = ((statusCode: number, ...rest: unknown[]) => {
        const last = rest[rest.length - 1];
        if (last && typeof last === "object" && !Array.isArray(last)) {
          writeHeadHeaders = last as ReturnType<ServerResponse["getHeaders"]>;
        }
        return (
          originalWriteHead as unknown as (...args: unknown[]) => ServerResponse
        )(statusCode, ...rest);
      }) as ServerResponse["writeHead"];

      res.write = ((chunk: unknown, ...rest: unknown[]) => {
        chunks.push(Buffer.from(chunk as Uint8Array));
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

        // Merge setHeader() headers with writeHead() headers (the latter win),
        // and preserve multi-value headers (e.g. set-cookie) as separate
        // entries rather than comma-folding them via String().
        const responseHeaders = new Headers();
        const merged: Record<string, number | string | string[] | undefined> = {
          ...res.getHeaders(),
          ...writeHeadHeaders,
        };
        for (const [key, value] of Object.entries(merged)) {
          if (value == null) continue;
          if (Array.isArray(value)) {
            for (const item of value) responseHeaders.append(key, String(item));
          } else {
            responseHeaders.set(key, String(value));
          }
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
  };
}
