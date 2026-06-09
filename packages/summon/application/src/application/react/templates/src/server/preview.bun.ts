/**
 * Bun preview server — serves the compiled production artifact.
 *
 * Read this `fetch` handler top-to-bottom as a chain of small, independent
 * pieces snapped together — the first that can handle the request wins:
 *
 *   1. static file      — any extension-bearing path that exists under
 *                          `dist/client` (`/robots.txt`, `/favicon.*`, the
 *                          hashed `/assets/*`); extensionless routes fall through.
 *   2. sitemap renderer — `/sitemap.xml` → the XML `SitemapRenderer`.
 *   3. JSX app renderer — everything else → the HTML app.
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
// The compiled renderers (built by `build:server`) — the same bundled artifacts
// a production deploy ships. The build output has no `.d.ts`; each default
// export matches its source factory.
// @ts-expect-error — importing a build artifact with no declarations
import createAppRenderer from "../../dist/server/renderer.js";
// @ts-expect-error — importing a build artifact with no declarations
import createSitemapRenderer from "../../dist/server/sitemap.js";

type CreateAppRenderer = typeof import("./renderer.js").default;
type CreateSitemapRenderer = typeof import("../sitemap/renderer.js").default;

const PORT = Number(process.env.PORT) || 5174;
const staticMount = parseStaticPair(":dist/client");

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
        : (createAppRenderer as CreateAppRenderer)(req);
    const stream = await renderer.renderToReadableStream(req.signal);

    return new Response(stream, {
      status: renderer.statusCode,
      headers: { "Content-Type": renderer.contentType },
    });
  },
});

console.log(`Bun preview server on http://localhost:${PORT}/`);
