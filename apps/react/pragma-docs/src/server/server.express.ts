/**
 * Express development server with SSR and HMR.
 *
 * The request path is a chain of small, independent pieces snapped together —
 * the first that can handle the request wins:
 *
 *   1. `/graphql` brick    — the in-process graph endpoint (native backend).
 *   2. `vite.middlewares`  — Vite client assets, module transforms, HMR.
 *   3. sitemap renderer    — `/sitemap.xml` → the XML `SitemapRenderer`.
 *   4. JSX app renderer    — everything else → the HTML app.
 *
 * The renderers are separate Lego bricks: the sitemap renderer
 * (`src/sitemap/renderer.ts`) and the app renderer (`src/server/renderer.tsx`)
 * know nothing about each other or about routing — this middleware is the only
 * thing that looks at the URL and picks one. Add a `/robots.txt` brick or swap
 * a renderer without touching the others. The same pieces, in the same order,
 * appear in `server.bun.ts` and in the compiled server entrypoint
 * (`src/server/index.ts`) the preview bins use, so dev and preview behave
 * identically — only the transport differs (express streams via
 * `renderToPipeableStream`, Bun via `renderToReadableStream`).
 *
 * The graph backend is imported NATIVELY at the top of this file (mirroring
 * `server.bun.ts`), never via `vite.ssrLoadModule` — an SSR-graph import
 * would boot a second Oxigraph store in this process. Mounting `/graphql`
 * before `vite.middlewares` keeps the config-registered plugin instance (a
 * separate module registry) from ever booting its own store either. The same
 * native singleton serves the prepare step (`prepareRelayData`), which
 * executes the matched route's query in-process and serialises the store
 * into `initialData.relay` before rendering (P-2 Stage 1).
 *
 * Vite handles client HMR + module transforms; server modules load via
 * vite.ssrLoadModule() so edits are picked up without a restart. Production
 * deploys use platform adapters (Vercel, Cloudflare, …), not this server.
 */
// NOTE: this server must run with `--import ./src/server/nodeCssNoop.ts`
// (after `--import tsx` — see the `dev:express` script): the native
// route-module chain below (prepareRelayData → appRoutes → pages) carries
// client CSS side-effect imports, and the .css no-op hook must register
// before this module's static import graph loads.
import fs from "node:fs";
import * as process from "node:process";
import express from "express";
import { createServer as createViteServer } from "vite";
import { getGraphqlBackend } from "./graphql.js";
import { handleNodeRequest } from "./graphqlPlugin.js";
import { prepareRelayData } from "./prepareRelayData.js";

const PORT = Number(process.env.PORT) || 5174;

// HTTP hits on the /graphql brick, logged per request so the e2e suite can
// assert that a server-rendered first load makes ZERO of them (the prepare
// step executes in-process and never appears here). Keep the log line in
// sync with GRAPHQL_HIT_MARKER in test/e2e/servers.e2e.ts.
let graphqlHits = 0;

async function start() {
  const app = express();

  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "custom",
  });

  // The graph endpoint comes first so it never reaches the Vite middleware
  // stack — the config-registered plugin instance would boot a second store
  // in this process otherwise (same ordering as server.bun.ts).
  app.use("/graphql", (req, res) => {
    getGraphqlBackend()
      .then(({ handle }) => {
        graphqlHits += 1;
        console.info(`[graphql] http hit #${graphqlHits}`);
        return handleNodeRequest(req, res, handle);
      })
      .catch((error: unknown) => {
        console.error("[graphql] request failed", error);
        if (!res.headersSent) {
          res.writeHead(500, { "content-type": "application/json" });
        }
        res.end(JSON.stringify({ errors: [{ message: "Internal error" }] }));
      });
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

      const { theme } = extractPreferences(req.headers.cookie ?? null);
      // Execute the matched route's query in-process and serialise the store
      // BEFORE the renderer is constructed — initialData is embedded eagerly
      // (P-2 Stage 1). `relay` is omitted (not `undefined`) on unmapped
      // routes so the embedded JSON carries no dangling key.
      const relay = await prepareRelayData(url);
      const renderer = new JSXRenderer(
        EntryServer,
        // The cookie is client-controlled, so only the known theme values reach
        // the SSR `<html class>` — anything else is dropped (matches the
        // compiled renderer in `renderer.tsx`).
        {
          url,
          theme: theme === "light" || theme === "dark" ? theme : undefined,
          ...(relay ? { relay } : {}),
        },
        { htmlString: html },
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
