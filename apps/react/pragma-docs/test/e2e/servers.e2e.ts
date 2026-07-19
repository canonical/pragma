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
  /**
   * Whether this cell serves `/playground` with server-executed Relay data
   * (P-2 Stage 1). Only the two dev SSR cells so far: the preview cells have
   * no graph backend until the Oxigraph-bundle spike closes. Requires the
   * pragma refs cache (`pragma sources update`), like the `/graphql`
   * endpoint those cells already mount.
   */
  probe?: boolean;
}

const MATRIX: Cell[] = [
  { script: "dev", timeoutMs: DEV_READY_MS, ssr: false },
  { script: "dev:bun", timeoutMs: DEV_READY_MS, ssr: true, probe: true },
  { script: "dev:express", timeoutMs: DEV_READY_MS, ssr: true, probe: true },
  { script: "preview", timeoutMs: PREVIEW_READY_MS, ssr: false },
  { script: "preview:bun", timeoutMs: PREVIEW_READY_MS, ssr: true },
  { script: "preview:express", timeoutMs: PREVIEW_READY_MS, ssr: true },
];

/** A JS/TS module or CSS-as-JS asset must never come back as the HTML page. */
const JS_CONTENT_TYPE = /javascript/;

/**
 * The per-request line the dev servers' `/graphql` bricks log — keep in sync
 * with `server.bun.ts` / `server.express.ts`. Its absence after a page load
 * is the "zero HTTP hits" proof; its appearance after a direct POST proves
 * the counter (and the endpoint) still works.
 */
const GRAPHQL_HIT_MARKER = "[graphql] http hit";

/** Poll the server log until `marker` appears (child stdout is async). */
async function waitForLog(
  server: { logs: () => string },
  marker: string,
  timeoutMs = 5_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!server.logs().includes(marker)) {
    if (Date.now() > deadline) {
      throw new Error(
        `log marker ${JSON.stringify(marker)} not seen within ${timeoutMs}ms`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

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

            // 4b. The shell frame SSRs through the real pipeline (P-4.1):
            //     the page fetched in step 1 already carries the rail and
            //     the canvas plate's structural identity. SPA cells serve
            //     the empty HTML shell, so they are exempt.
            expect(html).toContain('data-region="primary-nav"');
            expect(html).toContain('data-region="canvas"');
          }

          // 5. P-2 Stage 1: /playground carries the probe's REAL graph data in
          //    the raw HTML (no client JS ran), the serialised store rides
          //    __INITIAL_DATA__.relay, and the whole load made ZERO HTTP
          //    /graphql requests — the query executed in-process.
          if (cell.probe) {
            const playground = await fetch(`${server.base}/playground`);
            expect(playground.status).toBe(200);
            const playgroundHtml = await playground.text();
            // Server-rendered probe content: heading, URI, summary text.
            expect(playgroundHtml).toContain("<h2>Button</h2>");
            expect(playgroundHtml).toContain("ds:global.component.button");
            expect(playgroundHtml).toContain(
              "Buttons trigger actions within an interface",
            );
            // Modifier families too: every field the unit fixture
            // (componentProbeRecords) freezes is asserted against the live
            // graph here, so an upstream rename rots loudly, not silently.
            expect(playgroundHtml).toContain("Anticipation");
            expect(playgroundHtml).toContain("Importance");
            // The serialised record map is embedded for hydration.
            expect(playgroundHtml).toContain("__INITIAL_DATA__");
            expect(playgroundHtml).toContain('"relay"');
            expect(playgroundHtml).toContain('"records"');
            // Zero /graphql HTTP hits during everything above.
            expect(server.logs()).not.toContain(GRAPHQL_HIT_MARKER);

            // Teeth: a direct POST does reach the endpoint and the counter
            // records it — the zero-assertion above is not vacuous.
            const graphqlResponse = await fetch(`${server.base}/graphql`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ query: "{ __typename }" }),
            });
            expect(graphqlResponse.status).toBe(200);
            const graphqlBody = (await graphqlResponse.json()) as {
              data?: { __typename?: string };
            };
            expect(graphqlBody.data?.__typename).toBe("Query");
            await waitForLog(server, `${GRAPHQL_HIT_MARKER} #1`);
            // `logs()` grows from async pipe chunks, so a stray `#2` (a page
            // load counted after the POST) could still sit undelivered when
            // `#1` lands — give trailing chunks a beat to flush before the
            // zero-#2 assertion.
            await new Promise((resolve) => setTimeout(resolve, 50));
            // …and it is the ONLY hit: had the page load reached /graphql
            // over HTTP (with its log line lagging past the assertion
            // above), this POST would have been counted as #2.
            expect(server.logs()).not.toContain(`${GRAPHQL_HIT_MARKER} #2`);
          }
        } finally {
          await server.stop();
        }
      },
      TEST_TIMEOUT_MS,
    );
  }
});
