/**
 * Express development server with SSR and HMR.
 *
 * The request path is a chain of small, independent pieces snapped together —
 * the first that can handle the request wins:
 *
 *   1. `vite.middlewares` — Vite client assets, module transforms, HMR.
 *   2. sitemap renderer   — `/sitemap.xml` → the XML `SitemapRenderer`.
 *   3. JSX app renderer   — everything else → the HTML app.
 *
 * The two renderers are separate Lego bricks: the sitemap renderer
 * (`src/sitemap/renderer.ts`) and the app renderer (`src/server/renderer.tsx`)
 * know nothing about each other or about routing — this middleware is the only
 * thing that looks at the URL and picks one. Add a `/robots.txt` brick or swap
 * a renderer without touching the others. The same pieces, in the same order,
 * appear in `server.bun.ts` and in the compiled server entrypoint
 * (`src/server/index.ts`) the preview bins use, so dev and preview behave
 * identically — only the transport differs (express streams via
 * `renderToPipeableStream`, Bun via `renderToReadableStream`).
 *
 * Vite handles client HMR + module transforms; server modules load via
 * vite.ssrLoadModule() so edits are picked up without a restart. Production
 * deploys use platform adapters (Vercel, Cloudflare, …), not this server.
 */
import fs from "node:fs";
import * as process from "node:process";
import express from "express";
import { createServer as createViteServer } from "vite";

const PORT = Number(process.env.PORT) || 5174;

async function start() {
  const app = express();

  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "custom",
  });

  app.use(vite.middlewares);

  app.use(async (req, res, next) => {
    const url = req.originalUrl || "/";

    try {
      if (url.split("?")[0] === "/sitemap.xml") {
        const { default: createSitemapRenderer } = await vite.ssrLoadModule(
          "/src/sitemap/renderer.ts",
        );
        const renderer = createSitemapRenderer();
        const result = renderer.renderToPipeableStream();

        await renderer.statusReady;
        res.status(renderer.statusCode);
        res.setHeader("content-type", renderer.contentType);
        result.pipe(res);
        return;
      }

      const template = fs.readFileSync("index.html", "utf-8");
      const html = await vite.transformIndexHtml(url, template);

      const { default: EntryServer } = await vite.ssrLoadModule(
        "/src/server/entry.tsx",
      );
      const { JSXRenderer } = await vite.ssrLoadModule(
        "@canonical/react-ssr/renderer",
      );
      const { extractPreferences } = await vite.ssrLoadModule(
        "@canonical/react-hooks",
      );
      const { negotiateLocale } = await vite.ssrLoadModule(
        "/src/lib/i18n/index.ts",
      );

      const cookie = req.headers.cookie ?? null;
      const { theme } = extractPreferences(cookie);
      const locale = negotiateLocale(
        cookie,
        req.headers["accept-language"] ?? null,
      );
      const renderer = new JSXRenderer(
        EntryServer,
        // The cookie is client-controlled, so only the known theme values reach
        // the SSR `<html class>` — anything else is dropped (matches the
        // compiled renderer in `renderer.tsx`).
        {
          url,
          theme: theme === "light" || theme === "dark" ? theme : undefined,
          locale,
        },
        { htmlString: html, defaultLocale: locale },
      );
      const result = renderer.renderToPipeableStream();

      await renderer.statusReady;
      res.status(renderer.statusCode);
      res.setHeader("content-type", renderer.contentType);
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
