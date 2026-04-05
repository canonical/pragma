import type { IncomingMessage, ServerResponse } from "node:http";

/**
 * Convenience wrapper that adapts a renderer factory into a Node.js `(req, res)` handler
 * for pipeable stream rendering.
 *
 * Calls the factory with each incoming request. The factory is expected to construct
 * a renderer (with per-request context like locale, auth, theme) and call
 * `renderToPipeableStream()` on it. This wrapper then awaits `statusReady`, writes
 * headers with the renderer's `statusCode`, and pipes the stream to the response.
 *
 * Does not set `Content-Type` — the consumer controls headers through the factory
 * or by wrapping this handler. Defaults to `text/html; charset=utf-8`.
 *
 * @note This function is impure — it writes to the HTTP response.
 *
 * @param factory - A function that receives the request and returns a renderer.
 *   The renderer must have `renderToPipeableStream()`, `statusCode`, and `statusReady`.
 * @returns A Node.js request handler suitable for `app.use()` or `http.createServer()`.
 *
 * @example
 * ```ts
 * import { JSXRenderer } from "@canonical/react-ssr/renderer";
 * import { serveStream } from "@canonical/react-ssr/server";
 *
 * app.use(serveStream((req) => {
 *   return new JSXRenderer(
 *     EntryServer,
 *     { locale: getLocale(req), user: getUser(req) },
 *     { htmlString },
 *   );
 * }));
 * ```
 */
export function serveStream(
  factory: (req: IncomingMessage) => {
    renderToPipeableStream: () => {
      pipe: <W extends NodeJS.WritableStream>(destination: W) => W;
    };
    statusCode: number;
    statusReady: Promise<void>;
  },
) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    try {
      const renderer = factory(req);
      const result = renderer.renderToPipeableStream();
      await renderer.statusReady;
      res.writeHead(renderer.statusCode, {
        "Content-Type": "text/html; charset=utf-8",
      });
      result.pipe(res);
      /* v8 ignore next -- finish event fires after stream completes; not triggered in unit tests */
      res.on("finish", () => res.end());
    } catch (error) {
      console.error("Error during rendering:", error);
      res.statusCode = 500;
      res.end("Internal server error");
    }
  };
}
