/**
 * Bun development server with SSR and streaming.
 *
 * Uses Bun.serve() for the HTTP layer and Vite in middleware mode for
 * module transforms and client HMR. Server modules are loaded via
 * vite.ssrLoadModule() — changes are picked up without restart.
 *
 * Production deployments use platform adapters (Vercel, Cloudflare, etc.),
 * not this server.
 */
import fs from "node:fs";
import * as process from "node:process";
import { createServer as createViteServer } from "vite";

const PORT = Number(process.env.PORT) || 5174;

const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: "custom",
});

Bun.serve({
  port: PORT,
  async fetch(req: Request) {
    const url = new URL(req.url);
    const requestUrl = url.pathname + url.search;

    try {
      if (url.pathname === "/sitemap.xml") {
        const { SitemapRenderer } = await vite.ssrLoadModule(
          "@canonical/react-ssr/renderer",
        );
        const { default: getSitemapItems } = await vite.ssrLoadModule(
          "/src/server/sitemap.ts",
        );

        const renderer = new SitemapRenderer([getSitemapItems], {
          baseUrl: `http://localhost:${PORT}`,
          defaultChangefreq: "monthly",
        });
        const sitemapStream = await renderer.renderToReadableStream();

        return new Response(sitemapStream, {
          status: renderer.statusCode,
          headers: { "Content-Type": "application/xml; charset=utf-8" },
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

      const renderer = new JSXRenderer(
        EntryServer,
        { url: requestUrl },
        { htmlString: html },
      );
      const stream = await renderer.renderToReadableStream(req.signal);

      return new Response(stream, {
        status: renderer.statusCode,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    } catch (error) {
      vite.ssrFixStacktrace(error as Error);
      console.error(error);

      return new Response("Internal server error", { status: 500 });
    }
  },
});

console.log(`Bun dev server on http://localhost:${PORT}/`);
