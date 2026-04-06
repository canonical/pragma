import { buildCacheControl, matchPattern } from "@canonical/react-ssr/adapter";
import type { VercelAdapterConfig } from "./types.js";

/**
 * Create a Vercel Edge Function handler.
 *
 * Returns a Web Standard `(request: Request) => Promise<Response>` handler
 * for Vercel's edge runtime. Uses `renderToReadableStream` — no Node.js APIs.
 *
 * Static assets are served by Vercel's CDN (configured in `config.json`),
 * not by this handler.
 *
 * @example
 * ```ts
 * import { createEdgeHandler } from "@canonical/ssr-adapter-vercel";
 *
 * export default createEdgeHandler({
 *   routes: [
 *     { pattern: "/*", factory: (req) => createRenderer(req) },
 *   ],
 * });
 * ```
 */
export function createEdgeHandler(config: VercelAdapterConfig) {
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);

    for (const route of config.routes) {
      if (matchPattern(route.pattern, url.pathname)) {
        const renderer = route.factory(request);
        const stream = await renderer.renderToReadableStream(
          request.signal,
        );

        const headers: Record<string, string> = {
          "Content-Type":
            route.contentType ?? "text/html; charset=utf-8",
        };
        if (route.cache) {
          headers["Cache-Control"] = buildCacheControl(route.cache);
        }

        return new Response(stream, {
          status: renderer.statusCode,
          headers,
        });
      }
    }

    return new Response("Not Found", { status: 404 });
  };
}
