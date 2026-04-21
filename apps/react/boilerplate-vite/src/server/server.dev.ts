/**
 * Development server with HMR for both client and server.
 *
 * Vite's dev server handles client HMR. Server modules are loaded via
 * vite.ssrLoadModule() which transforms them on the fly and invalidates
 * on change — no manual rebuild needed.
 *
 * Usage: bun run dev:ssr
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

  // Vite's dev middleware handles client HMR, module transforms, and static assets
  app.use(vite.middlewares);

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      // Read and transform the HTML template on every request (HMR-aware)
      const template = fs.readFileSync("index.html", "utf-8");
      const html = await vite.transformIndexHtml(url, template);

      // Load the server entry via Vite's SSR transform pipeline.
      // This gives us HMR on the server — module changes are picked up
      // without restarting the process.
      const { default: EntryServer } = await vite.ssrLoadModule(
        "/src/server/entry.tsx",
      );
      const { type: InitialDataType } = await vite.ssrLoadModule(
        "/src/server/entry.tsx",
      );

      const { JSXRenderer } = await vite.ssrLoadModule(
        "@canonical/react-ssr/renderer",
      );

      const renderer = new JSXRenderer(
        EntryServer,
        { url } as Record<string, unknown>,
        { htmlString: html },
      );

      const { renderToPipeableStream } =
        await vite.ssrLoadModule("react-dom/server");

      // Use JSXRenderer's pipeable stream for Express
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
    console.log(`Dev server started on http://localhost:${PORT}/`);
  });
}

start();
