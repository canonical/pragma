import { buildCacheControl, matchPattern } from "@canonical/react-ssr/adapter";
import type { CloudflareAdapterConfig, CloudflareEnv } from "./types.js";

/**
 * Create a Cloudflare Workers fetch handler.
 *
 * Returns a function matching the Workers `fetch(request, env, ctx)` signature.
 * Checks the Cloudflare Cache API for cached SSR responses and routes dynamic
 * requests to renderer factories.
 *
 * Static assets are NOT served here — configure Workers Static Assets (the
 * `[assets]` block in `wrangler.toml`) so the edge serves matching files
 * before the Worker runs. See this package's README.
 *
 * @example
 * ```ts
 * import { createFetchHandler } from "@canonical/ssr-adapter-cloudflare";
 *
 * export default {
 *   fetch: createFetchHandler({
 *     routes: [
 *       { pattern: "/*", factory: (req) => createRenderer(req) },
 *     ],
 *   }),
 * };
 * ```
 */
export function createFetchHandler(config: CloudflareAdapterConfig) {
  const useCache = config.enableCache !== false;

  return async (
    request: Request,
    _env: CloudflareEnv,
    ctx: ExecutionContext,
  ): Promise<Response> => {
    const url = new URL(request.url);
    // cache.put rejects on non-GET requests, so the edge cache is GET-only.
    const cacheable = useCache && request.method === "GET";

    // Edge cache check
    if (cacheable) {
      const cached = await caches.default.match(request);
      if (cached) return cached;
    }

    // Route to renderer
    for (const route of config.routes) {
      if (matchPattern(route.pattern, url.pathname)) {
        const renderer = route.factory(request);
        const stream = await renderer.renderToReadableStream(request.signal);

        const headers: Record<string, string> = {
          "Content-Type": route.contentType ?? "text/html; charset=utf-8",
        };
        if (route.cache) {
          headers["Cache-Control"] = buildCacheControl(route.cache);
        }

        const response = new Response(stream, {
          status: renderer.statusCode,
          headers,
        });

        // Cache successful renders in background (GET only — put rejects
        // on other methods).
        if (cacheable && route.cache && renderer.statusCode === 200) {
          ctx.waitUntil(caches.default.put(request, response.clone()));
        }

        return response;
      }
    }

    return new Response("Not Found", { status: 404 });
  };
}
