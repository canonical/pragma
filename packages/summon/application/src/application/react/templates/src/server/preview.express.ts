/**
 * Express preview server — serves the compiled production artifact.
 *
 * Static files (anything with a file extension that exists under `dist/client`,
 * including `/robots.txt`, `/favicon.*`, and the hashed `/assets/*`) are served
 * directly; every other request is server-rendered through the compiled
 * renderer via `serveStream`. This mirrors a production deployment, so
 * `preview:express` is a faithful pre-deploy check.
 *
 * Run after `build:client` + `build:server` (the `preview:express` script does both).
 */
import fs from "node:fs";
import * as process from "node:process";
import { serveStream } from "@canonical/react-ssr/server";
import express from "express";
// The compiled renderer (built by `build:server`). Running under Node, this must
// be the bundled output: `@canonical/*` packages ship a `module` field with no
// `main`/`exports`, which Node's resolver rejects — `vite build --ssr` inlines
// them, so the compiled renderer loads where the source would not. The build
// output has no `.d.ts`; its default export matches `./renderer.tsx`.
// @ts-expect-error — importing a build artifact with no declarations
import createRenderer from "../../dist/server/renderer.js";
import { contentTypeFor, resolveStaticPath } from "./static.js";

type CreateRenderer = typeof import("./renderer.js").default;

const PORT = Number(process.env.PORT) || 5174;
const CLIENT_DIR = "dist/client";

const app = express();

// Extension-bearing paths resolve to a built static file when one exists;
// everything else falls through to the SSR handler below.
app.use((req, res, next) => {
  const filePath = resolveStaticPath(req.path, CLIENT_DIR);
  if (!filePath) return next();
  res.setHeader("content-type", contentTypeFor(filePath));
  fs.createReadStream(filePath).pipe(res);
});

app.use(serveStream(createRenderer as CreateRenderer));

app.listen(PORT, () => {
  console.log(`Express preview server on http://localhost:${PORT}/`);
});
