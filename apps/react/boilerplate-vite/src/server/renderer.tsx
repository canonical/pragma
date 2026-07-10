/**
 * Compiled JSX app renderer for production / preview.
 *
 * Read once at module load, the built `dist/client/index.html` shell carries
 * the hashed `<script>`/`<link>` tags Vite injected at build time; the renderer
 * extracts them and injects them into the streamed output.
 *
 * This is one Lego brick — a pure renderer. It knows nothing about routing or
 * about the sitemap renderer; it just turns a request into the rendered app.
 * The server (`src/server/index.ts` for preview, `server.bun.ts` /
 * `server.express.ts` for dev) is what looks at the URL and picks a renderer.
 *
 * It reuses the same `EntryServer` (`src/server/entry.tsx`) the dev servers
 * load via `ssrLoadModule` — the renderer is the invariant across dev and
 * production; only the HTML shell source differs.
 */
import fs from "node:fs";
import type { IncomingMessage } from "node:http";
import path from "node:path";
import { negotiateLocale } from "@canonical/i18n-core";
import { extractPreferences } from "@canonical/react-hooks";
import { JSXRenderer } from "@canonical/react-ssr/renderer";
import { getRequestUrl } from "@canonical/react-ssr/server";
import { i18nConfig } from "#i18n/config.js";
import EntryServer, { type InitialData } from "./entry.js";

const htmlString = fs.readFileSync(
  path.join(process.cwd(), "dist", "client", "index.html"),
  "utf-8",
);

/** Read the `Cookie` header from either a Web `Request` or a Node request. */
function cookieHeader(request: Request | IncomingMessage): string | null {
  return typeof (request as Request).headers?.get === "function"
    ? (request as Request).headers.get("cookie")
    : ((request as IncomingMessage).headers?.cookie ?? null);
}

/** Read the `Accept-Language` header from a Web `Request` or a Node request. */
function acceptLanguageHeader(
  request: Request | IncomingMessage,
): string | null {
  if (typeof (request as Request).headers?.get === "function") {
    return (request as Request).headers.get("accept-language");
  }
  const header = (request as IncomingMessage).headers?.["accept-language"];
  // Node joins repeated header lines for most headers but can surface arrays;
  // negotiation expects the single comma-separated wire format.
  return Array.isArray(header) ? header.join(",") : (header ?? null);
}

/**
 * Per-request factory for the JSX app renderer. Accepts either a Web `Request`
 * (`serve-bun`) or a Node `IncomingMessage` (`serve-express`); it derives the
 * URL for routing and the cookie-backed theme so the first paint matches the
 * user's preference, passing both as the renderer's initial data.
 */
export default function createAppRenderer(request: Request | IncomingMessage) {
  const cookie = cookieHeader(request);
  const { theme } = extractPreferences(cookie);
  const locale = negotiateLocale(i18nConfig, {
    cookieHeader: cookie,
    acceptLanguage: acceptLanguageHeader(request),
  });
  const initialData: InitialData = {
    url: getRequestUrl(request),
    theme: theme === "light" || theme === "dark" ? theme : undefined,
    locale,
  };
  return new JSXRenderer(EntryServer, initialData, {
    htmlString,
    defaultLocale: locale,
  });
}
