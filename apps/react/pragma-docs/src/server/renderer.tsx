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
 * No `relay` prepare step here yet: the preview servers carry no graph
 * backend, and bundling the Oxigraph WASM store into the compiled
 * `dist/server` output is an unverified spike that gates them (P-2 design
 * note §3) — the dev bricks integrate `prepareRelayData` first.
 */
export default function createAppRenderer(request: Request | IncomingMessage) {
  const { theme } = extractPreferences(cookieHeader(request));
  const initialData: InitialData = {
    url: getRequestUrl(request),
    theme: theme === "light" || theme === "dark" ? theme : undefined,
  };
  return new JSXRenderer(EntryServer, initialData, { htmlString });
}
