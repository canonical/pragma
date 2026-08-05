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
import { resolveGraphqlUrl } from "#relay/graphqlEndpoint.js";
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
 * user's preference, and runs the Relay prepare step so the preview bricks
 * server-render real data — all three ride the renderer's initial data.
 *
 * **The Oxigraph-bundle spike is CLOSED, and this is where it shows.** The
 * preview bricks used to carry no prepare step because preparing meant
 * importing an in-process ke-graphql backend, and nobody had verified that a
 * WASM store could be bundled into `dist/server`. Since the PRD-3 process
 * split, preparing means POSTing to the graph server — so this module's
 * import graph reaches `prepareRelayData` → `routeQueries` → the app's routes
 * and stops there. It never reaches the store or the schema-plugin packages,
 * and no WASM enters `dist/server`. The standing proof is to build the server
 * bundle and grep the emitted code for the store package's name: zero hits
 * (matches inside TSDoc do not count — this bundle preserves comments).
 *
 * Async because of that step: the two preview bricks await this factory.
 */
export default async function createAppRenderer(
  request: Request | IncomingMessage,
) {
  const url = getRequestUrl(request);
  const { theme } = extractPreferences(cookieHeader(request));
  // `relay` is omitted (not `undefined`) on unmapped routes so the embedded
  // JSON carries no dangling key.
  const relay = await prepareRelayData(url, resolveGraphqlUrl());
  const initialData: InitialData = {
    url,
    theme: theme === "light" || theme === "dark" ? theme : undefined,
    ...(relay ? { relay } : {}),
  };
  return new JSXRenderer(EntryServer, initialData, { htmlString });
}
