import {
  buildCacheControl,
  getMimeType,
  matchPattern,
} from "@canonical/react-ssr/adapter";
import type { DenoAdapterConfig } from "./types.js";

/**
 * Create a request handler for Deno Deploy.
 *
 * Returns a function compatible with `Deno.serve()` that serves static assets
 * from the filesystem and routes dynamic requests to renderer factories.
 *
 * Static assets are served with immutable caching headers. Dynamic routes are
 * matched in order — the first matching route handles the request.
 *
 * @example
 * ```ts
 * import { createHandler } from "@canonical/ssr-adapter-deno";
 *
 * Deno.serve({ port: 5173 }, createHandler({
 *   routes: [
 *     { pattern: "/*", factory: (req) => createRenderer(req) },
 *   ],
 *   staticAssets: [
 *     { urlPrefix: "/assets", directory: "./dist/client/assets" },
 *   ],
 * }));
 * ```
 */
export function createHandler(config: DenoAdapterConfig) {
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);

    for (const asset of config.staticAssets ?? []) {
      if (url.pathname.startsWith(asset.urlPrefix)) {
        const relativePath = url.pathname.slice(asset.urlPrefix.length);
        const filePath = `${asset.directory}${relativePath}`;
        try {
          const file = await readFile(filePath);
          return new Response(file, {
            headers: {
              "Content-Type": getMimeType(filePath),
              "Cache-Control": "public, max-age=31536000, immutable",
            },
          });
        } catch {
          // File not found — fall through to next asset or routes
        }
      }
    }

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

        return new Response(stream, {
          status: renderer.statusCode,
          headers,
        });
      }
    }

    return new Response("Not Found", { status: 404 });
  };
}

/**
 * Read a file from the filesystem.
 *
 * Abstracted to a function for testability — tests can mock this import.
 * In Deno, this uses `Deno.readFile`. In Node.js test environments,
 * it uses `node:fs/promises`.
 */
async function readFile(path: string): Promise<Uint8Array> {
  const { readFile: nodeReadFile } = await import("node:fs/promises");
  return new Uint8Array(await nodeReadFile(path));
}
