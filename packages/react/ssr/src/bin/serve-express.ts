#!/usr/bin/env node

/**
 * Standalone Express server for serving an SSR application.
 *
 * Dynamically imports a renderer module that default-exports a factory. The
 * factory receives a Node `IncomingMessage` and returns a renderer. Supports
 * both streaming (`--streaming`) and string rendering modes.
 *
 * Argument parsing and port resolution live in `@canonical/react-ssr/server`
 * (covered by unit tests); this bin is the thin Express-specific shell.
 *
 * @example
 * ```sh
 * # String rendering (default), one static directory
 * serve-express dist/server/renderer.js --static assets:dist/client/assets
 *
 * # Streaming, multiple static directories
 * serve-express dist/server/renderer.js --streaming \
 *   --static assets:dist/client/assets \
 *   --static public:dist/client/public
 *
 * # Custom port
 * serve-express dist/server/renderer.js -p 3000 --static assets:dist/client/assets
 * ```
 */

import path from "node:path";
import { parseArgs } from "node:util";
// Import via the public self-referential path (resolved through "exports" to
// dist/esm) rather than the "#server" internal alias, which points at the
// TypeScript source — the serve-express bin runs under Node (its shebang),
// which cannot load .ts.
import {
  parseStaticPair,
  resolvePort,
  serveStream,
  serveString,
} from "@canonical/react-ssr/server";
import express from "express";

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
    streaming: { type: "boolean", default: false },
  },
  strict: true,
  allowPositionals: true,
});

const rendererArg = positionals[0];
if (!rendererArg) {
  console.error(
    "Usage: serve-express <renderer-path> [--static route:path ...] [--streaming] [-p port]",
  );
  process.exit(1);
}

const port = resolvePort(values.port, process.env.PORT);
const rendererFilePath = path.join(process.cwd(), rendererArg);

const createRenderer = await import(rendererFilePath).then((m) => m.default);

if (typeof createRenderer !== "function") {
  throw new Error(
    "Renderer module must default-export a factory function (req) => Renderer.",
  );
}

const app = express();

for (const pair of values.static ?? []) {
  const { route, dir } = parseStaticPair(pair);
  app.use(route, express.static(dir));
}

app.use(
  values.streaming ? serveStream(createRenderer) : serveString(createRenderer),
);

app.listen(port, () => {
  console.log(`Server started on http://localhost:${port}/`);
});
