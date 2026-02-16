#!/usr/bin/env node

import path from "node:path";
import { parseArgs } from "node:util";
import express from "express";
import type { RenderHandler } from "../renderer/index.js";
import { serveStream } from "./serve.js";

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    port: {
      type: "string",
      alias: "p",
      default: "5173",
    },
    staticFilepath: {
      type: "string",
      alias: "s",
      default: "dist/client/assets",
    },
    staticRoute: {
      type: "string",
      alias: "r",
      default: "assets",
    },
    streaming: {
      type: "boolean",
      default: false,
    }
  },
  strict: true,
  allowPositionals: true,
});

const port = values.port || 5173;
const cwd = process.cwd();
const rendererFilePath = path.join(cwd, positionals[0]);
const staticDir = path.join(cwd, values.staticFilepath || "assets");
const staticRoute = values.staticRoute || "assets";

if (!rendererFilePath) {
  console.error("Usage: node server.js <renderer-path>");
  process.exit(1);
}

const handler: RenderHandler = await import(rendererFilePath).then(
  (module) => {
    if (values.streaming) {
      return module.default.renderToStream;
    } else {
      return module.default.renderToString;
    }
  },
);

if (typeof handler !== "function") {
  throw new Error("Renderer file must default-export a renderer function.");
}

const app = express();

app.use(`/${staticRoute}`, express.static(staticDir));
app.use(serveStream(handler));

app.listen(port, () => {
  console.log(`Server started on http://localhost:${port}/`);
});
