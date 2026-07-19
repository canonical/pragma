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
import { extractPreferences } from "@canonical/react-hooks";
import { JSXRenderer } from "@canonical/react-ssr/renderer";
import { getRequestUrl } from "@canonical/react-ssr/server";
import EntryServer, { type InitialData } from "./entry.js";
import { prepareRelayData } from "./prepareRelayData.js";

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

/**
 * Per-request factory for the JSX app renderer. Accepts either a Web `Request`
 * (`serve-bun`) or a Node `IncomingMessage` (`serve-express`); it derives the
 * URL for routing and the cookie-backed theme so the first paint matches the
 * user's preference, passing both as the renderer's initial data.
 *
 * Like the dev bricks, it runs the `prepareRelayData` step before the
 * renderer is constructed (P-2 Stage 1): the matched route's query executes
 * in-process against the compiled graph backend (ke + ke-graphql stay
 * external in the server build, so Oxigraph loads from node_modules exactly
 * as in dev — see `ssr.external` in vite.config.ts) and the serialised store
 * rides `initialData.relay`. Unmapped routes omit `relay` entirely, and a
 * failed prepare degrades to a data-less render inside `prepareRelayData`.
 */
export default async function createAppRenderer(
  request: Request | IncomingMessage,
) {
  const { theme } = extractPreferences(cookieHeader(request));
  const url = getRequestUrl(request);
  const relay = await prepareRelayData(url);
  const initialData: InitialData = {
    url,
    theme: theme === "light" || theme === "dark" ? theme : undefined,
    ...(relay ? { relay } : {}),
  };
  return new JSXRenderer(EntryServer, initialData, { htmlString });
}
