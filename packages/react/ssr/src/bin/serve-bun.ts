#!/usr/bin/env bun

/**
 * Standalone Bun server for serving an SSR application with stream rendering.
 *
 * Uses `Bun.serve()` for the HTTP layer and `Bun.file()` for zero-copy static
 * file serving. The renderer module must default-export a factory that accepts a
 * `Request` and returns a renderer with `renderToReadableStream`.
 *
 * Argument parsing, port resolution, and static-file matching live in
 * `@canonical/react-ssr/server` (covered by unit tests); this bin is the thin
 * Bun-specific shell around them.
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
import {
  parseStaticPair,
  resolvePort,
  resolveStaticFile,
} from "@canonical/react-ssr/server";

// Minimal local declaration of the Bun globals this bin uses. Declaring them
// here (rather than pulling in `bun-types` globally) keeps Bun's type overrides
// from clashing with `@types/node` in the rest of the package, while still
// type-checking this Bun-only entry point. The file runs under `bun`.
declare const Bun: {
  serve(options: {
    port: number;
    fetch: (req: Request) => Response | Promise<Response>;
  }): unknown;
  // BunFile extends Blob, so it is a valid Response BodyInit.
  file(path: string): Blob & { exists(): Promise<boolean> };
};

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    port: { type: "string", short: "p" },
    static: {
      type: "string",
      short: "s",
      multiple: true,
      default: ["assets:dist/client/assets"],
    },
  },
  strict: true,
  allowPositionals: true,
});

const rendererArg = positionals[0];
if (!rendererArg) {
  console.error(
    "Usage: serve-bun <renderer-path> [--static route:path ...] [-p port]",
  );
  process.exit(1);
}

const port = resolvePort(values.port, process.env.PORT);
const rendererFilePath = path.join(process.cwd(), rendererArg);

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

const staticMounts = (values.static ?? []).map((pair) => parseStaticPair(pair));

Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);

    for (const mount of staticMounts) {
      const filePath = resolveStaticFile(url.pathname, mount);
      if (filePath) {
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
