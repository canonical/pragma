/**
 * Express development server with SSR and HMR.
 *
 * Vite handles client HMR and module transforms. Server modules are loaded
 * via vite.ssrLoadModule() — changes to routes, pages, or server code are
 * picked up without restarting the process.
 *
 * Production deployments use platform adapters (Vercel, Cloudflare, etc.),
 * not this server.
 */
import fs from "node:fs";
import * as process from "node:process";
import express from "express";
import { createServer as createViteServer } from "vite";

const PORT = Number(process.env.PORT) || 5173;

async function start() {
  const app = express();

  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "custom",
  });

  app.use(vite.middlewares);

  app.get("/sitemap.xml", async (_req, res) => {
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
    const { pipe } = renderer.renderToPipeableStream();

    await renderer.statusReady;
    res.setHeader("content-type", "application/xml; charset=utf-8");
    res.status(renderer.statusCode);
    pipe(res);
  });

  app.use(async (req, res, next) => {
    const url = req.originalUrl || "/";

    try {
      const template = fs.readFileSync("index.html", "utf-8");
      const html = await vite.transformIndexHtml(url, template);

      const { default: EntryServer } = await vite.ssrLoadModule(
        "/src/server/entry.tsx",
      );
      const { JSXRenderer } = await vite.ssrLoadModule(
        "@canonical/react-ssr/renderer",
      );

      const renderer = new JSXRenderer(
        EntryServer,
        { url },
        { htmlString: html },
      );
      const result = renderer.renderToPipeableStream();

      await renderer.statusReady;
      res.status(renderer.statusCode);
      res.setHeader("content-type", "text/html; charset=utf-8");
      result.pipe(res);
    } catch (error) {
      vite.ssrFixStacktrace(error as Error);
      next(error);
    }
  });

  app.listen(PORT, () => {
    console.log(`Express dev server on http://localhost:${PORT}/`);
  });
}

start();
