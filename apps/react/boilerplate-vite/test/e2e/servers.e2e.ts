// @vitest-environment node

/**
 * End-to-end test of the build: boot each of the 2×3 server scripts and assert
 * it serves correctly over HTTP. The defects this guards against live at the
 * HTTP/content-type layer (assets served as text/html; a 500 page), so
 * fetch-level assertions catch them — no browser needed.
 *
 * Each cell runs its real package.json script — including the build that
 * `preview:*` performs — so the test mirrors the actual user experience. The
 * `dev*` cells boot in a second or two (tight readiness budget); the
 * `preview*` cells build the client + compile the renderer first, so they get a
 * larger budget. Kept out of the default `test` run via the `*.e2e.ts` name;
 * invoke with `bun run test:e2e`.
 */
import { describe, expect, it } from "vitest";
import { startServer } from "./serverHarness.js";

const CWD = process.cwd();

// Readiness budgets: dev* boots straight away; preview* builds the client +
// renderer before serving, so it needs a larger budget.
const DEV_READY_MS = 20_000;
const PREVIEW_READY_MS = 90_000;
const TEST_TIMEOUT_MS = PREVIEW_READY_MS + 30_000;

interface Cell {
  /** package.json script to run. */
  script: string;
  /** Readiness budget for this cell's boot (and build, for preview*). */
  timeoutMs: number;
  /**
   * Whether this cell server-renders. The plain `dev`/`preview` cells are the
   * Vite SPA path (no SSR), so they have no `/sitemap.xml` route; the four
   * `*:bun`/`*:express` cells render it from the sitemap renderer.
   */
  ssr: boolean;
}

const MATRIX: Cell[] = [
  { script: "dev", timeoutMs: DEV_READY_MS, ssr: false },
  { script: "dev:bun", timeoutMs: DEV_READY_MS, ssr: true },
  { script: "dev:express", timeoutMs: DEV_READY_MS, ssr: true },
  { script: "preview", timeoutMs: PREVIEW_READY_MS, ssr: false },
  { script: "preview:bun", timeoutMs: PREVIEW_READY_MS, ssr: true },
  { script: "preview:express", timeoutMs: PREVIEW_READY_MS, ssr: true },
];

/** A JS/TS module or CSS-as-JS asset must never come back as the HTML page. */
const JS_CONTENT_TYPE = /javascript/;

describe("server matrix (2×3) serves correctly", () => {
  for (const cell of MATRIX) {
    it(
      `${cell.script} serves an HTML page and JS assets (not HTML)`,
      async () => {
        const server = await startServer(cell.script, CWD, {
          timeoutMs: cell.timeoutMs,
        });
        try {
          // 1. The document renders.
          const page = await fetch(`${server.base}/`);
          expect(page.status).toBe(200);
          expect(page.headers.get("content-type")).toMatch(/text\/html/);
          const html = await page.text();
          expect(html).toContain('id="root"');

          // 2. The HTML references at least one client script.
          const scriptSrc = html.match(/<script[^>]+src="([^"]+)"/)?.[1];
          expect(
            scriptSrc,
            "page should reference a client script",
          ).toBeTruthy();

          // 3. That script is served as JavaScript — never the HTML page.
          //    (This is the exact defect: assets returned with a text/html MIME.)
          const asset = await fetch(new URL(scriptSrc as string, server.base));
          expect(asset.status).toBe(200);
          expect(asset.headers.get("content-type")).toMatch(JS_CONTENT_TYPE);

          // 4. SSR cells render /sitemap.xml as XML from the sitemap renderer —
          //    the second renderer, picked by path, never the HTML app. (The SPA
          //    dev/preview cells have no SSR route, so they are exempt.)
          if (cell.ssr) {
            const sitemap = await fetch(`${server.base}/sitemap.xml`);
            expect(sitemap.status).toBe(200);
            expect(sitemap.headers.get("content-type")).toMatch(/xml/);
            const xml = await sitemap.text();
            expect(xml).toContain("<urlset");
            expect(xml).toContain("<loc>");
          }
        } finally {
          await server.stop();
        }
      },
      TEST_TIMEOUT_MS,
    );
  }
});
