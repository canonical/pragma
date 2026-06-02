import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
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
        // Cancel the render if the client disconnects. The Node runtime
        // signals this via the request 'aborted'/'close'/'error' events.
        const controller = new AbortController();
        const abort = () => controller.abort();
        req.on("aborted", abort);
        req.on("close", abort);
        req.on("error", abort);

        const request = incomingMessageToRequest(req, url, controller.signal);
        const renderer = route.factory(request);
        const stream = await renderer.renderToReadableStream(controller.signal);

        const headers: Record<string, string> = {
          "Content-Type": route.contentType ?? "text/html; charset=utf-8",
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
  signal: AbortSignal,
): Request {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value != null) {
      headers.set(key, Array.isArray(value) ? value.join(", ") : value);
    }
  }

  const method = req.method ?? "GET";
  // GET/HEAD must not carry a body; for other methods stream the Node request
  // body through so renderers (form posts, API routes) see it, matching the
  // other adapters that pass the original Request. `duplex: "half"` is required
  // when a Request is constructed with a stream body.
  const hasBody = method !== "GET" && method !== "HEAD";
  const init: RequestInit & { duplex?: "half" } = { method, headers, signal };
  if (hasBody) {
    init.body = Readable.toWeb(req) as ReadableStream<Uint8Array>;
    init.duplex = "half";
  }

  return new Request(url.toString(), init);
}

/**
 * Pipe a Web `ReadableStream` to a Node.js `ServerResponse`.
 *
 * Uses `stream.pipeline` so backpressure, stream end, and error/abort
 * propagation are handled correctly rather than draining manually.
 */
async function writeReadableStreamToResponse(
  stream: ReadableStream,
  res: ServerResponse,
): Promise<void> {
  await pipeline(
    Readable.fromWeb(stream as Parameters<typeof Readable.fromWeb>[0]),
    res,
  );
}
