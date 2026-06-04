/**
 * Bun preview server — serves the compiled production artifact.
 *
 * Static files (anything with a file extension that exists under `dist/client`,
 * including `/robots.txt`, `/favicon.*`, and the hashed `/assets/*`) are served
 * directly; every other request is server-rendered through the compiled
 * renderer. This mirrors how a production deployment serves the same build, so
 * `preview:bun` is a faithful pre-deploy check.
 *
 * Run after `build:client` + `build:server` (the `preview:bun` script does both).
 */
import * as process from "node:process";
// The compiled renderer (built by `build:server`) — the same bundled artifact a
// production deploy ships, so `preview` is a faithful pre-deploy check. The
// build output has no `.d.ts`; its default export matches `./renderer.tsx`.
// @ts-expect-error — importing a build artifact with no declarations
import createRenderer from "../../dist/server/renderer.js";
import { contentTypeFor, resolveStaticPath } from "./static.js";

type CreateRenderer = typeof import("./renderer.js").default;

const PORT = Number(process.env.PORT) || 5174;
const CLIENT_DIR = "dist/client";

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

    const filePath = resolveStaticPath(url.pathname, CLIENT_DIR);
    if (filePath) {
      return new Response(Bun.file(filePath), {
        headers: { "Content-Type": contentTypeFor(filePath) },
      });
    }

    const renderer = (createRenderer as CreateRenderer)(req);
    const stream = await renderer.renderToReadableStream(req.signal);
    return new Response(stream, {
      status: renderer.statusCode,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  },
});

console.log(`Bun preview server on http://localhost:${PORT}/`);
