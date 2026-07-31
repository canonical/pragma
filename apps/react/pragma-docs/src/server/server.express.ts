/**
 * Express development server with SSR and HMR.
 *
 * The request path is a chain of small, independent pieces snapped together —
 * the first that can handle the request wins:
 *
 *   1. `vite.middlewares`  — Vite client assets, module transforms, HMR.
 *   2. sitemap renderer    — `/sitemap.xml` → the XML `SitemapRenderer`.
 *   3. JSX app renderer    — everything else → the HTML app.
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
 * Vite handles client HMR + module transforms; server modules load via
 * vite.ssrLoadModule() so edits are picked up without a restart. Production
 * deploys use platform adapters (Vercel, Cloudflare, …), not this server.
 */
// NOTE: this server must run with `--import ./src/server/nodeCssNoop.ts`
// (after `--import tsx` — see the `dev:express` script). The reason is no
// longer the graph backend: it is that the prepare step imports the app's
// ROUTE modules natively (prepareRelayData → routeQueries → appRoutes →
// pages), and that chain carries client CSS side-effect imports Node cannot
// load. The .css no-op hook must register before this module's static
// import graph loads.
import fs from "node:fs";
import * as process from "node:process";
import express from "express";
import { createServer as createViteServer } from "vite";
import { resolveGraphqlUrl } from "#relay/graphqlEndpoint.js";
import { prepareRelayData } from "./prepareRelayData.js";

const PORT = Number(process.env.PORT) || 5174;

// The graph runs in its OWN process now (`graph.ts`, started by
// `withGraph.ts`); this server neither mounts nor proxies `/graphql`. Resolved
// once at module scope so every request uses the same endpoint.
const graphqlUrl = resolveGraphqlUrl();

async function start() {
  const app = express();

  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "custom",
  });

  // Malformed percent-encoding guard (P-5 review finding, pre-existing
  // class): Vite's middleware decodes the path before the app's handlers,
  // so a request like /components/%ZZ would 500 with a Vite stack trace.
  // Answer an honest 404 before `vite.middlewares` gets to throw.
  app.use((req, res, next) => {
    try {
      decodeURIComponent(req.path);
    } catch {
      res.status(404).type("text/plain").end("Not Found");
      return;
    }
    next();
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
      // Execute the matched route's query against the graph server and
      // serialise the store BEFORE the renderer is constructed — initialData
      // is embedded eagerly. `relay` is omitted (not `undefined`) on unmapped
      // routes so the embedded JSON carries no dangling key.
      const relay = await prepareRelayData(url, graphqlUrl);
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
    console.log(`  graph endpoint: ${graphqlUrl}`);
  });
}

start();
