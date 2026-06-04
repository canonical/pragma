import type { IncomingMessage } from "node:http";

/**
 * Extract the request path (`pathname` + `search`) from either a Web `Request`
 * or a Node `IncomingMessage`.
 *
 * The `serve-bun` and `serve-express` bins call a renderer factory with
 * different request shapes — `serve-bun` passes a Web `Request` (whose `url` is
 * absolute, e.g. `https://host/a/b?x=1`), while `serve-express` (via
 * `serveStream`) passes a Node `IncomingMessage` (whose `url` is already a path,
 * e.g. `/a/b?x=1`). A renderer factory that needs the URL for routing must
 * handle both; this helper normalises them to a single path string.
 *
 * @param request - A Web `Request` or a Node `IncomingMessage`.
 * @returns The request path including query string, e.g. `/a/b?x=1`. Defaults to
 *   `/` when no URL is present.
 *
 * @example
 * ```ts
 * import { JSXRenderer } from "@canonical/react-ssr/renderer";
 * import { getRequestUrl } from "@canonical/react-ssr/server";
 *
 * export default function createRenderer(request: Request | IncomingMessage) {
 *   const url = getRequestUrl(request);
 *   return new JSXRenderer(EntryServer, { url }, { htmlString });
 * }
 * ```
 */
export function getRequestUrl(request: Request | IncomingMessage): string {
  const raw = request.url;
  if (!raw) return "/";
  // A Web Request `url` is absolute (parses as a URL); a Node IncomingMessage
  // `url` is already a path (relative → URL parsing throws).
  try {
    const parsed = new URL(raw);
    return parsed.pathname + parsed.search;
  } catch {
    return raw;
  }
}
