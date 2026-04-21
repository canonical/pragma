import fs from "node:fs/promises";
import path from "node:path";
import * as process from "node:process";
import { JSXRenderer, SitemapRenderer } from "@canonical/react-ssr/renderer";
import { createServerAppRouter, getAuthRedirectHref } from "../routes.js";
import EntryServer, { type InitialData } from "./entry.js";
import getSitemapItems from "./sitemap.js";

const PORT = Number(process.env.PORT) || 5173;
const STATIC_DIR = path.join(process.cwd(), "dist", "client", "assets");

const htmlString = await fs.readFile(
  path.join(process.cwd(), "dist", "client", "index.html"),
  "utf-8",
);

Bun.serve({
  port: PORT,
  async fetch(req: Request) {
    const url = new URL(req.url);

    if (url.pathname.startsWith("/assets")) {
      const filePath = path.join(
        STATIC_DIR,
        url.pathname.slice("/assets".length),
      );
      const file = Bun.file(filePath);

      if (await file.exists()) {
        return new Response(file);
      }
    }

    if (url.pathname === "/sitemap.xml") {
      const renderer = new SitemapRenderer([getSitemapItems], {
        baseUrl: `http://localhost:${PORT}`,
        defaultChangefreq: "monthly",
      });
      const sitemapStream = await renderer.renderToReadableStream();

      return new Response(sitemapStream, {
        status: renderer.statusCode,
        headers: { "Content-Type": "application/xml; charset=utf-8" },
      });
    }

    const requestUrl = url.pathname + url.search;
    const authRedirect = getAuthRedirectHref(requestUrl);

    if (authRedirect) {
      return Response.redirect(new URL(authRedirect, url.origin), 302);
    }

    const router = createServerAppRouter(requestUrl);
    const renderer = new JSXRenderer(
      EntryServer,
      { router } as unknown as InitialData,
      {
        htmlString,
      },
    );
    const stream = await renderer.renderToReadableStream(req.signal);

    return new Response(stream, {
      status: renderer.statusCode,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  },
});

console.log(`Bun server started on http://localhost:${PORT}/`);
