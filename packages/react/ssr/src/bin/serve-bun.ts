#!/usr/bin/env bun

/**
 * Standalone Bun server for serving an SSR application with stream rendering.
 *
 * Uses `Bun.serve()` for the HTTP layer and `Bun.file()` for zero-copy
 * static file serving. The renderer module must export a factory function
 * that accepts a `Request` and returns a renderer with `renderToReadableStream`.
 *
 * @example
 * ```sh
 * # Single static directory
 * serve-bun dist/server/renderer.js --static assets:dist/client/assets
 *
 * # Multiple static directories, custom port
 * serve-bun dist/server/renderer.js -p 3000 \
 *   --static assets:dist/client/assets \
 *   --static public:dist/client/public
 * ```
 */

import path from "node:path";
import { parseArgs } from "node:util";

/**
 * Parse a `route:filepath` string into its constituent parts.
 *
 * @param pair - A string in the format `"route:filepath"`, e.g. `"assets:dist/client/assets"`.
 * @returns An object with the route prefix and the absolute filesystem path.
 */
function parseStaticPair(pair: string): { route: string; dir: string } {
  const separatorIndex = pair.indexOf(":");
  if (separatorIndex === -1) {
    return { route: `/${pair}`, dir: path.join(process.cwd(), pair) };
  }
  const route = pair.slice(0, separatorIndex);
  const filepath = pair.slice(separatorIndex + 1);
  return {
    route: `/${route}`,
    dir: path.join(process.cwd(), filepath),
  };
}

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    port: {
      type: "string",
      alias: "p",
      default: "5173",
    },
    static: {
      type: "string",
      alias: "s",
      multiple: true,
      default: ["assets:dist/client/assets"],
    },
  },
  strict: true,
  allowPositionals: true,
});

const port = Number(values.port) || 5173;
const rendererFilePath = path.join(process.cwd(), positionals[0]);

if (!rendererFilePath) {
  console.error(
    "Usage: serve-bun <renderer-path> [--static route:path ...] [-p port]",
  );
  process.exit(1);
}

const createRenderer = await import(rendererFilePath).then(
  (m) =>
    m.default as (req: Request) => {
      renderToReadableStream: (signal?: AbortSignal) => Promise<ReadableStream>;
      statusCode: number;
    },
);

if (typeof createRenderer !== "function") {
  throw new Error(
    "Renderer module must default-export a factory function (req: Request) => Renderer.",
  );
}

const staticMounts = (values.static ?? []).map(parseStaticPair);

Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);

    for (const { route, dir } of staticMounts) {
      if (url.pathname.startsWith(route)) {
        const filePath = path.join(dir, url.pathname.slice(route.length));
        const file = Bun.file(filePath);
        if (await file.exists()) {
          return new Response(file);
        }
      }
    }

    const renderer = createRenderer(req);
    const stream = await renderer.renderToReadableStream(req.signal);
    return new Response(stream, {
      status: renderer.statusCode,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  },
});

console.log(`Server started on http://localhost:${port}/`);
