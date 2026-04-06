import type { IncomingMessage, ServerResponse } from "node:http";
import { buildCacheControl, matchPattern } from "@canonical/react-ssr/adapter";
import type { VercelAdapterConfig } from "./types.js";

/**
 * Create a Vercel Serverless Function handler.
 *
 * Returns a Node.js `(req, res)` handler for Vercel's serverless runtime.
 * Converts `IncomingMessage` to Web Standard `Request` before calling the
 * renderer factory, then uses `renderToReadableStream` and pipes the result
 * back through the `ServerResponse`.
 *
 * Static assets are served by Vercel's CDN (configured in `config.json`),
 * not by this handler.
 *
 * @example
 * ```ts
 * import { createNodeHandler } from "@canonical/ssr-adapter-vercel";
 *
 * export default createNodeHandler({
 *   routes: [
 *     { pattern: "/*", factory: (req) => createRenderer(req) },
 *   ],
 * });
 * ```
 */
export function createNodeHandler(config: VercelAdapterConfig) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const url = new URL(
      req.url ?? "/",
      `http://${req.headers.host ?? "localhost"}`,
    );

    for (const route of config.routes) {
      if (matchPattern(route.pattern, url.pathname)) {
        const request = incomingMessageToRequest(req, url);
        const renderer = route.factory(request);
        const stream = await renderer.renderToReadableStream();

        const headers: Record<string, string> = {
          "Content-Type":
            route.contentType ?? "text/html; charset=utf-8",
        };
        if (route.cache) {
          headers["Cache-Control"] = buildCacheControl(route.cache);
        }

        res.writeHead(renderer.statusCode, headers);
        await writeReadableStreamToResponse(stream, res);
        return;
      }
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  };
}

/**
 * Convert a Node.js `IncomingMessage` to a Web Standard `Request`.
 */
function incomingMessageToRequest(
  req: IncomingMessage,
  url: URL,
): Request {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value != null) {
      headers.set(key, Array.isArray(value) ? value.join(", ") : value);
    }
  }
  return new Request(url.toString(), {
    method: req.method ?? "GET",
    headers,
  });
}

/**
 * Pipe a Web `ReadableStream` to a Node.js `ServerResponse`.
 */
async function writeReadableStreamToResponse(
  stream: ReadableStream,
  res: ServerResponse,
): Promise<void> {
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
  } finally {
    reader.releaseLock();
    res.end();
  }
}
