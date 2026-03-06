#!/usr/bin/env bun

/**
 * Minimal static file server with live-reload for the typography example.
 *
 * Usage:
 *   bun --watch run example/serve.ts
 *
 * The --watch flag makes Bun restart the server on any file change.
 * A small SSE-based live-reload script is injected into HTML responses
 * so the browser refreshes automatically.
 *
 * Serves the package root so that both `example/` assets and
 * `src/index.css` resolve correctly via relative paths.
 */

import { extname, resolve } from "node:path";

const PORT = Number(process.env.PORT) || 3333;
const ROOT = resolve(import.meta.dir, "..");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

/**
 * Unique ID generated each time the server process starts.
 * The client polls /__reload_id – when the ID changes it means
 * Bun's --watch restarted the server, so the page should reload.
 */
const BOOT_ID = crypto.randomUUID();

const LIVE_RELOAD_SNIPPET = `
<script>
(function() {
  var id = null;
  setInterval(function() {
    fetch("/__reload_id").then(function(r) { return r.text(); }).then(function(newId) {
      if (id === null) { id = newId; return; }
      if (newId !== id) { location.reload(); }
    }).catch(function() {});
  }, 1000);
})();
</script>`;

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // Live-reload: return the server's boot ID
    if (url.pathname === "/__reload_id") {
      return new Response(BOOT_ID, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    // Redirect bare root to the example page
    if (url.pathname === "/") {
      return Response.redirect(
        `http://localhost:${PORT}/example/index.html`,
        302,
      );
    }

    const filePath = resolve(ROOT, `.${url.pathname}`);

    // Security: don't serve files outside ROOT
    if (!filePath.startsWith(ROOT)) {
      return new Response("Forbidden", { status: 403 });
    }

    const file = Bun.file(filePath);

    if (await file.exists()) {
      const ext = extname(filePath);
      const contentType = MIME[ext] || "application/octet-stream";

      // Inject live-reload snippet into HTML
      if (ext === ".html") {
        let html = await file.text();
        html = html.replace("</body>", `${LIVE_RELOAD_SNIPPET}\n</body>`);
        return new Response(html, {
          headers: { "Content-Type": contentType },
        });
      }

      return new Response(file, {
        headers: { "Content-Type": contentType },
      });
    }

    return new Response(`Not found: ${url.pathname}`, { status: 404 });
  },
});

console.log(`Typography example → http://localhost:${PORT}`);
console.log(
  "Watching for changes (run with: bun --watch run example/serve.ts)",
);
