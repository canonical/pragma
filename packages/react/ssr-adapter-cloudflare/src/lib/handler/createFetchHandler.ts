import {
  buildCacheControl,
  getMimeType,
  matchPattern,
} from "@canonical/react-ssr/adapter";
import type { CloudflareAdapterConfig, CloudflareEnv } from "./types.js";

/**
 * Create a Cloudflare Workers fetch handler.
 *
 * Returns a function matching the Workers `fetch(request, env, ctx)` signature.
 * Serves static assets from R2, checks the Cloudflare Cache API for cached
 * SSR responses, and routes dynamic requests to renderer factories.
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
 *     staticAssets: [
 *       { urlPrefix: "/assets", directory: "assets" },
 *     ],
 *   }),
 * };
 * ```
 */
export function createFetchHandler(config: CloudflareAdapterConfig) {
  const useCache = config.enableCache !== false;

  return async (
    request: Request,
    env: CloudflareEnv,
    ctx: ExecutionContext,
  ): Promise<Response> => {
    const url = new URL(request.url);

    // 1. Static assets from R2
    for (const asset of config.staticAssets ?? []) {
      if (url.pathname.startsWith(asset.urlPrefix)) {
        const key = url.pathname
          .slice(asset.urlPrefix.length)
          .replace(/^\//, "");
        if (!key) continue;

        const object = await env.ASSETS.get(key);
        if (object) {
          return new Response(object.body as ReadableStream, {
            headers: {
              "Content-Type": getMimeType(key),
              "Cache-Control":
                "public, max-age=31536000, immutable",
            },
          });
        }
      }
    }

    // 2. Edge cache check
    if (useCache) {
      const cached = await caches.default.match(request);
      if (cached) return cached;
    }

    // 3. Route to renderer
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

        const response = new Response(stream, {
          status: renderer.statusCode,
          headers,
        });

        // Cache successful renders in background
        if (useCache && route.cache && renderer.statusCode === 200) {
          ctx.waitUntil(
            caches.default.put(request, response.clone()),
          );
        }

        return response;
      }
    }

    return new Response("Not Found", { status: 404 });
  };
}
