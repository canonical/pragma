import type { IncomingMessage, ServerResponse } from "node:http";
import * as process from "node:process";
import { JSXRenderer } from "@canonical/react-ssr/renderer";
import { serveStream } from "@canonical/react-ssr/server";
import express from "express";
import EntryServer from "./entry-server.js";
import render, { htmlString } from "./renderer.js";

const PORT = process.env.PORT || 5174;

const app = express();

app.use(/^\/(assets|public)/, express.static("dist/client/assets"));

app.get("/stream", (req, res, next) => {
  const renderer = new JSXRenderer(
    EntryServer,
    {},
    {
      htmlString,
      renderToPipeableStreamOptions: {
        onShellReady: (_req: IncomingMessage, res: ServerResponse): void => {
          console.log("Shell ready");
          if (!res.headersSent) {
            res.setHeader("Example-Header", "demo callbacks");
          }
        },
        // pass any error to Express's error handling
        onShellError: (error, _req, _res) => next(error),
      },
    },
  );
  renderer.renderToStream(req, res);
});

app.use(serveStream(render));

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}/`);
});

export default app;
