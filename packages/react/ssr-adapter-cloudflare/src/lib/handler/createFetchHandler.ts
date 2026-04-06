import {
  buildCacheControl,
  getMimeType,
  IMMUTABLE_ASSET_CACHE_CONTROL,
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
    // cache.put rejects on non-GET requests, so the edge cache is GET-only.
    const cacheable = useCache && request.method === "GET";

    // 1. Static assets from R2
    for (const asset of config.staticAssets ?? []) {
      if (url.pathname.startsWith(asset.urlPrefix)) {
        const tail = url.pathname
          .slice(asset.urlPrefix.length)
          .replace(/^\//, "");
        if (!tail) continue;

        // R2 is a flat keyspace: prepend the configured directory prefix so
        // objects uploaded under e.g. "assets/main.js" are found.
        const prefix = asset.directory.replace(/\/$/, "");
        const key = prefix ? `${prefix}/${tail}` : tail;

        const object = await env.ASSETS.get(key);
        if (object) {
          // Apply the object's stored HTTP metadata (Content-Type, etc.) and
          // ETag, then override Cache-Control with the immutable asset policy.
          const headers = new Headers();
          object.writeHttpMetadata(headers);
          headers.set("etag", object.httpEtag);
          if (!object.httpMetadata?.contentType) {
            headers.set("Content-Type", getMimeType(key));
          }
          headers.set("Cache-Control", IMMUTABLE_ASSET_CACHE_CONTROL);
          return new Response(object.body, { headers });
        }
      }
    }

    // 2. Edge cache check
    if (cacheable) {
      const cached = await caches.default.match(request);
      if (cached) return cached;
    }

    // 3. Route to renderer
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
