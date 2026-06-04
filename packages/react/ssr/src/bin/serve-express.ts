#!/usr/bin/env node

/**
 * Standalone Express server for serving an SSR application.
 *
 * Dynamically imports a renderer module that exports a factory function.
 * The factory receives a Node `IncomingMessage` and returns a renderer.
 * Supports both streaming and string rendering modes.
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
import { serveStream, serveString } from "@canonical/react-ssr/server";
import express from "express";

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
      short: "p",
    },
    static: {
      type: "string",
      short: "s",
      multiple: true,
      default: ["assets:dist/client/assets"],
    },
    streaming: {
      type: "boolean",
      default: false,
    },
  },
  strict: true,
  allowPositionals: true,
});

// Precedence: --port / -p flag, then the PORT env var, then 5173.
const port = Number(values.port ?? process.env.PORT) || 5173;
const rendererFilePath = path.join(process.cwd(), positionals[0]);

if (!rendererFilePath) {
  console.error(
    "Usage: serve-express <renderer-path> [--static route:path ...] [--streaming] [-p port]",
  );
  process.exit(1);
}

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
