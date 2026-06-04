/**
 * Compiled SSR renderer for production / preview.
 *
 * Read once at module load, the built `dist/client/index.html` shell carries
 * the hashed `<script>`/`<link>` tags Vite injected at build time; the renderer
 * extracts them and injects them into the streamed output. Built with
 * `vite build --ssr src/server/renderer.tsx` and served by the
 * `serve-bun` / `serve-express` bins (see the `preview:*` scripts).
 *
 * This reuses the same `EntryServer` (`src/server/entry.tsx`) the dev servers
 * load via `ssrLoadModule` — the renderer is the invariant across dev and
 * production; only the HTML shell source differs.
 */
import fs from "node:fs";
import type { IncomingMessage } from "node:http";
import path from "node:path";
import { JSXRenderer } from "@canonical/react-ssr/renderer";
import { getRequestUrl } from "@canonical/react-ssr/server";
import EntryServer from "./entry.js";
import { resolveInitialData } from "./preferences.js";

const htmlString = fs.readFileSync(
  path.join(process.cwd(), "dist", "client", "index.html"),
  "utf-8",
);

/**
 * Per-request renderer factory consumed by the `serve-*` bins. Accepts either a
 * Web `Request` (`serve-bun`) or a Node `IncomingMessage` (`serve-express`),
 * deriving the URL so the static router resolves the right route and reading the
 * cookie-backed theme so the first paint matches the user's preference.
 */
export default function createRenderer(request: Request | IncomingMessage) {
  const initialData = resolveInitialData(request, getRequestUrl(request));
  return new JSXRenderer(EntryServer, initialData, { htmlString });
}
