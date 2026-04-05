import type { IncomingMessage, ServerResponse } from "node:http";

/**
 * Convenience wrapper that adapts a renderer factory into a Node.js `(req, res)` handler
 * for string rendering.
 *
 * Calls the factory with each incoming request. The factory is expected to construct
 * a renderer (with per-request context like locale, auth, theme) and call
 * `renderToString()` on it. This wrapper then writes headers with the renderer's
 * `statusCode` and sends the HTML string as the response body.
 *
 * Does not set `Content-Type` — defaults to `text/html; charset=utf-8`.
 *
 * @note This function is impure — it writes to the HTTP response.
 *
 * @param factory - A function that receives the request and returns a renderer.
 *   The renderer must have `renderToString()` and `statusCode`.
 * @returns A Node.js request handler suitable for `app.use()` or `http.createServer()`.
 *
 * @example
 * ```ts
 * import { JSXRenderer } from "@canonical/react-ssr/renderer";
 * import { serveString } from "@canonical/react-ssr/server";
 *
 * app.use(serveString((req) => {
 *   return new JSXRenderer(
 *     EntryServer,
 *     { locale: getLocale(req), user: getUser(req) },
 *     { htmlString },
 *   );
 * }));
 * ```
 */
export function serveString(
  factory: (req: IncomingMessage) => {
    renderToString: () => string;
    statusCode: number;
  },
) {
  return (req: IncomingMessage, res: ServerResponse) => {
    try {
      const renderer = factory(req);
      const body = renderer.renderToString();
      res.writeHead(renderer.statusCode, {
        "Content-Type": "text/html; charset=utf-8",
      });
      res.end(body);
    } catch (error) {
      console.error("Error during rendering:", error);
      res.statusCode = 500;
      res.end("Internal server error");
    }
  };
}
