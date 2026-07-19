/**
 * Bun preview server — serves the compiled production artifact.
 *
 * Read this `fetch` handler top-to-bottom as a chain of small, independent
 * pieces snapped together — the first that can handle the request wins:
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
 * (`server.bun.ts`) makes the same pick the same way; only the module source
 * differs (Vite `ssrLoadModule` there, compiled `dist` here).
 *
 * Run after `build:client` + `build:server` (the `preview:bun` script does
 * both). This mirrors how a production deploy serves the same build, so
 * `preview:bun` is a faithful pre-deploy check. Production itself uses platform
 * adapters (Vercel, Cloudflare, …), not this server.
 */
import * as process from "node:process";
import {
  parseStaticPair,
  resolveStaticFile,
} from "@canonical/react-ssr/server";
// The compiled bricks (built by `build:server`) — the same bundled artifacts
// a production deploy ships. The build output has no `.d.ts`; each export
// matches its source module.
// @ts-expect-error — importing a build artifact with no declarations
import { getGraphqlBackend } from "../../dist/server/graphql.js";
// @ts-expect-error — importing a build artifact with no declarations
import createAppRenderer from "../../dist/server/renderer.js";
// @ts-expect-error — importing a build artifact with no declarations
import createSitemapRenderer from "../../dist/server/sitemap.js";

type CreateAppRenderer = typeof import("./renderer.js").default;
type CreateSitemapRenderer = typeof import("../sitemap/renderer.js").default;
type GetGraphqlBackend = typeof import("./graphql.js").getGraphqlBackend;

const PORT = Number(process.env.PORT) || 5174;
const staticMount = parseStaticPair(":dist/client");

// HTTP hits on the /graphql brick, logged per request so the e2e suite can
// assert that a server-rendered first load makes ZERO of them (the prepare
// step inside the compiled renderer executes in-process and never appears
// here). Keep the log line in sync with GRAPHQL_HIT_MARKER in
// test/e2e/servers.e2e.ts.
let graphqlHits = 0;

declare const Bun: {
  serve(options: {
    port: number;
    fetch: (req: Request) => Response | Promise<Response>;
  }): unknown;
  file(path: string): Blob & { exists(): Promise<boolean> };
};

Bun.serve({
  port: PORT,
  async fetch(req: Request) {
    const url = new URL(req.url);

    // The graph endpoint comes first, mirroring the dev server's brick
    // order — served from the COMPILED backend (`dist/server/graphql.js`),
    // the same store singleton the compiled renderer's prepare step uses
    // (rollup hoists the shared module into one chunk).
    if (url.pathname === "/graphql") {
      const { handle } = await (getGraphqlBackend as GetGraphqlBackend)();
      graphqlHits += 1;
      console.info(`[graphql] http hit #${graphqlHits}`);
      return handle(req);
    }

    const filePath = resolveStaticFile(url.pathname, staticMount);
    if (filePath) {
      const file = Bun.file(filePath);
      if (await file.exists()) {
        return new Response(file);
      }
    }

    const renderer =
      url.pathname === "/sitemap.xml"
        ? (createSitemapRenderer as CreateSitemapRenderer)()
        : await (createAppRenderer as CreateAppRenderer)(req);
    const stream = await renderer.renderToReadableStream(req.signal);

    return new Response(stream, {
      status: renderer.statusCode,
      headers: { "Content-Type": renderer.contentType },
    });
  },
});

console.log(`Bun preview server on http://localhost:${PORT}/`);
