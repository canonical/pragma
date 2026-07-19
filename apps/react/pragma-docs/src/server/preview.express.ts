/**
 * Express preview server — serves the compiled production artifact.
 *
 * The request path is a chain of small, independent pieces snapped together —
 * the first that can handle the request wins:
 *
 *   1. graph endpoint   — `/graphql` → the COMPILED ke-graphql backend
 *                          (`dist/server/graphql.js`), same brick order as dev.
 *   2. static file      — any extension-bearing path that exists under
 *                          `dist/client` (`/robots.txt`, `/favicon.*`, the
 *                          hashed `/assets/*`); extensionless routes fall through.
 *   3. sitemap renderer — `/sitemap.xml` → the XML `SitemapRenderer`.
 *   4. JSX app renderer — everything else → the HTML app.
 *
 * The two renderers are separate Lego bricks, each built and imported
 * individually (`createAppRenderer` from the compiled `renderer.js`,
 * `createSitemapRenderer` from the compiled `sitemap/renderer.js`). They know
 * nothing about each other or about routing — this server is the only thing
 * that looks at the URL and picks one, hard-coded right here. The dev server
 * (`server.express.ts`) makes the same pick the same way; only the module
 * source differs (Vite `ssrLoadModule` there, compiled `dist` here), and only
 * the transport differs from `preview.bun.ts` (express streams via
 * `renderToPipeableStream`, Bun via `renderToReadableStream`).
 *
 * Run after `build:client` + `build:server` (the `preview:express` script does
 * both). Production itself uses platform adapters (Vercel, Cloudflare, …), not
 * this server.
 */
import * as process from "node:process";
import express from "express";
// The compiled bricks (built by `build:server`) — the same bundled artifacts
// a production deploy ships. The build output has no `.d.ts`; each export
// matches its source module.
// @ts-expect-error — importing a build artifact with no declarations
import { getGraphqlBackend } from "../../dist/server/graphql.js";
// @ts-expect-error — importing a build artifact with no declarations
import createAppRenderer from "../../dist/server/renderer.js";
// @ts-expect-error — importing a build artifact with no declarations
import createSitemapRenderer from "../../dist/server/sitemap.js";
// The Node→fetch adapter is a pure helper. Importing it does evaluate the
// SOURCE `graphql.ts` module alongside (graphqlPlugin re-exports nothing from
// it, but shares its import chain) — harmless, since the backend singleton
// there boots lazily and is never called from this process: the HANDLE the
// adapter receives below is always the compiled backend's.
import { handleNodeRequest } from "./graphqlPlugin.js";

type CreateAppRenderer = typeof import("./renderer.js").default;
type CreateSitemapRenderer = typeof import("../sitemap/renderer.js").default;
type GetGraphqlBackend = typeof import("./graphql.js").getGraphqlBackend;

const PORT = Number(process.env.PORT) || 5174;

// HTTP hits on the /graphql brick, logged per request so the e2e suite can
// assert that a server-rendered first load makes ZERO of them (the prepare
// step inside the compiled renderer executes in-process and never appears
// here). Keep the log line in sync with GRAPHQL_HIT_MARKER in
// test/e2e/servers.e2e.ts.
let graphqlHits = 0;

const app = express();

// The graph endpoint comes first, mirroring the dev server's brick order —
// served from the COMPILED backend (`dist/server/graphql.js`), the same store
// singleton the compiled renderer's prepare step uses (rollup hoists the
// shared module into one chunk).
app.use("/graphql", (req, res, next) => {
  (getGraphqlBackend as GetGraphqlBackend)()
    .then(({ handle }) => {
      graphqlHits += 1;
      console.info(`[graphql] http hit #${graphqlHits}`);
      return handleNodeRequest(req, res, handle);
    })
    .catch(next);
});

// Serve any real file under `dist/client` — `/robots.txt`, `/favicon.*`, the
// hashed `/assets/*`. `express.static` falls through (calls `next`) when the
// file does not exist, so extensionless routes and rendered ones like
// `/sitemap.xml` (never written to `dist`) reach the renderers below.
app.use(express.static("dist/client", { index: false }));

app.use(async (req, res, next) => {
  try {
    const renderer =
      req.path === "/sitemap.xml"
        ? (createSitemapRenderer as CreateSitemapRenderer)()
        : await (createAppRenderer as CreateAppRenderer)(req);
    const result = renderer.renderToPipeableStream();

    await renderer.statusReady;
    res.status(renderer.statusCode);
    res.setHeader("content-type", renderer.contentType);
    result.pipe(res);
  } catch (error) {
    next(error);
  }
});

app.listen(PORT, () => {
  console.log(`Express preview server on http://localhost:${PORT}/`);
});
