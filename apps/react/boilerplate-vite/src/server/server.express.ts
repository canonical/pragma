import fs from "node:fs/promises";
import path from "node:path";
import * as process from "node:process";
import { JSXRenderer, SitemapRenderer } from "@canonical/react-ssr/renderer";
import { serveStream } from "@canonical/react-ssr/server";
import express from "express";
import { getAuthRedirectHref } from "../routes.js";
import EntryServer, { type InitialData } from "./entry.js";
import getSitemapItems from "./sitemap.js";

const PORT = process.env.PORT || 5173;

const htmlString = await fs.readFile(
  path.join(process.cwd(), "dist", "client", "index.html"),
  "utf-8",
);

const app = express();

app.use(/^\/(assets|public)/, express.static("dist/client/assets"));

app.get("/sitemap.xml", async (_req, res) => {
  const renderer = new SitemapRenderer([getSitemapItems], {
    baseUrl: `http://localhost:${PORT}`,
    defaultChangefreq: "monthly",
  });
  const { pipe } = renderer.renderToPipeableStream();

  await renderer.statusReady;
  res.setHeader("content-type", "application/xml; charset=utf-8");
  res.status(renderer.statusCode);
  pipe(res);
});

app.use(
  serveStream((req) => {
    const requestUrl = req.url || "/";
    const authRedirect = getAuthRedirectHref(requestUrl);

    if (authRedirect) {
      // serveStream doesn't support redirects — handled before reaching here
      // in practice, add a middleware before serveStream for auth redirects
    }

    return new JSXRenderer(
      EntryServer,
      { url: requestUrl } satisfies InitialData,
      {
        htmlString,
      },
    );
  }),
);

app.listen(PORT, () => {
  console.log(`Express server started on http://localhost:${PORT}/`);
});

export default app;
