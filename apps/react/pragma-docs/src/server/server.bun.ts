/**
 * Bun development server with SSR and streaming.
 *
 * Read this `fetch` handler top-to-bottom as a chain of small, independent
 * pieces snapped together — each tries to handle the request, and the first
 * that can, wins:
 *
 *   1. `handleAsset`     — Vite client assets + HMR (/@vite/client, /src/**,
 *                          /@id/**, /@fs/**, /@react-refresh, /node_modules/.vite/**).
 *   2. sitemap renderer  — `/sitemap.xml` → the XML `SitemapRenderer`.
 *   3. JSX app renderer  — everything else → the HTML app.
 *
 * The two renderers are separate Lego bricks: the sitemap renderer
 * (`src/sitemap/renderer.ts`) and the app renderer (`src/server/renderer.tsx`)
 * know nothing about each other or about routing — this server is the only
 * thing that looks at the URL and picks one. Swap a brick, add a `/robots.txt`
 * brick, or reorder them without touching the others. The same three pieces
 * appear in the same order in `server.express.ts` and in the compiled server
 * entrypoint (`src/server/index.ts`) the preview bins use, so dev and preview
 * behave identically.
 *
 * Bun.serve() is the HTTP layer; Vite runs in middleware mode for transforms +
 * HMR; server modules load via vite.ssrLoadModule() so edits are picked up
 * without a restart. Production deploys use platform adapters (Vercel,
 * Cloudflare, …), not this server.
 */
import fs from "node:fs";
import * as process from "node:process";
import { viteFetchMiddleware } from "@canonical/react-ssr/server";
import { createServer as createViteServer } from "vite";
import { getGraphqlBackend } from "./graphql.js";

const PORT = Number(process.env.PORT) || 5174;

const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: "custom",
});

// Serve Vite's client assets/HMR; returns null for page routes (→ SSR below).
const handleAsset = viteFetchMiddleware(vite);

Bun.serve({
  port: PORT,
  async fetch(req: Request) {
    const url = new URL(req.url);
    const requestUrl = url.pathname + url.search;

    try {
      // The graph endpoint comes first so it never reaches the Vite
      // middleware stack — the config-registered plugin instance would boot
      // a second store in this process otherwise.
      if (url.pathname === "/graphql") {
        const { handle } = await getGraphqlBackend();
        return handle(req);
      }

      const asset = await handleAsset(req);
      if (asset) return asset;

      if (url.pathname === "/sitemap.xml") {
        const { default: createSitemapRenderer } = await vite.ssrLoadModule(
          "/src/sitemap/renderer.ts",
        );
        const renderer = createSitemapRenderer();
        const stream = await renderer.renderToReadableStream(req.signal);

        return new Response(stream, {
          status: renderer.statusCode,
          headers: { "Content-Type": renderer.contentType },
        });
      }

      const template = fs.readFileSync("index.html", "utf-8");
      const html = await vite.transformIndexHtml(requestUrl, template);

      const { default: EntryServer } = await vite.ssrLoadModule(
        "/src/server/entry.tsx",
      );
      const { JSXRenderer } = await vite.ssrLoadModule(
        "@canonical/react-ssr/renderer",
      );
      const { extractPreferences } = await vite.ssrLoadModule(
        "@canonical/react-hooks",
      );

      const { theme } = extractPreferences(req.headers.get("cookie"));
      const renderer = new JSXRenderer(
        EntryServer,
        // The cookie is client-controlled, so only the known theme values reach
        // the SSR `<html class>` — anything else is dropped (matches the
        // compiled renderer in `renderer.tsx`).
        {
          url: requestUrl,
          theme: theme === "light" || theme === "dark" ? theme : undefined,
        },
        { htmlString: html },
      );
      const stream = await renderer.renderToReadableStream(req.signal);

      return new Response(stream, {
        status: renderer.statusCode,
        headers: { "Content-Type": renderer.contentType },
      });
    } catch (error) {
      vite.ssrFixStacktrace(error as Error);
      console.error(error);

      return new Response("Internal server error", { status: 500 });
    }
  },
});

console.log(`Bun dev server on http://localhost:${PORT}/`);
