import {
  buildCacheControl,
  getMimeType,
  IMMUTABLE_ASSET_CACHE_CONTROL,
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
      // Match on a path-segment boundary so "/assets" matches "/assets/x" but
      // not "/assets2/x". relativePath then always starts with "/".
      const prefix = asset.urlPrefix.replace(/\/$/, "");
      const relativePath = url.pathname.slice(prefix.length);
      if (url.pathname === prefix || relativePath.startsWith("/")) {
        const filePath = `${asset.directory}${relativePath}`;
        try {
          const body = await openFileStream(filePath);
          return new Response(body, {
            headers: {
              "Content-Type": getMimeType(filePath),
              "Cache-Control": IMMUTABLE_ASSET_CACHE_CONTROL,
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
 * Open a file as a streaming response body.
 *
 * On Deno (incl. Deno Deploy) this uses the platform-native `Deno.open().readable`,
 * so the file is streamed rather than buffered fully into memory — the
 * documented way to serve deployment files. Under Node.js test environments
 * (where `Deno` is undefined) it falls back to reading via `node:fs/promises`
 * and wrapping the bytes in a one-shot stream. Rejects when the file is absent.
 */
async function openFileStream(
  path: string,
): Promise<ReadableStream<Uint8Array>> {
  const deno = (
    globalThis as {
      Deno?: {
        open(p: string): Promise<{ readable: ReadableStream<Uint8Array> }>;
      };
    }
  ).Deno;
  if (deno) return (await deno.open(path)).readable;

  const { readFile: nodeReadFile } = await import("node:fs/promises");
  const bytes = new Uint8Array(await nodeReadFile(path));
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}
