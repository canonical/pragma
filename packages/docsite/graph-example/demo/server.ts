// =============================================================================
// A runnable endpoint for the example provider.
//
//   bun run serve                       # GraphiQL at http://127.0.0.1:5176/graphql
//   NODE_ENV=production bun run serve   # no GraphiQL, no CORS
//
// Port 5176 by default so it never collides with the docsite's own graph on
// 5175 — the point is to run BOTH and see the same lenses render against
// either one.
//
// Not part of the published build (tsconfig.build.json covers src/ only); it
// is type-checked and linted like everything else.
// =============================================================================

import {
  createExampleHandler,
  createExampleProvider,
  GRAPHQL_PATH,
} from "../src/index.js";

const port = Number(process.env.PORT ?? 5176);
const provider = createExampleProvider();
const handler = createExampleHandler(provider, {
  endpoint: `http://127.0.0.1:${port}${GRAPHQL_PATH}`,
});

/**
 * Operations served since boot, logged per hit as
 * `[graphql] http hit #N ssr|client` — the SAME line shape the docsite's own
 * graph server emits (`apps/react/pragma-docs/src/server/graph.ts`).
 *
 * It is here so a consumer's e2e harness can tally WHO asked. The
 * despecialisation proof turns on that tally: a page fetched with plain
 * `fetch` (no browser, no client JS) that renders real metro data must have
 * been filled by many `ssr` hits and zero `client` ones. Without this line
 * the proof can only say the HTML looked right, not that the server is what
 * fetched it.
 *
 * `x-pragma-ssr: 1` is the consumer's own marker for infrastructure traffic;
 * this provider never reads it for anything but the log word. CORS
 * preflights are skipped — the browser sends one per cross-origin POST and
 * counting them would double every client hit.
 */
let hits = 0;

Bun.serve({
  port,
  fetch: async (request: Request): Promise<Response> => {
    const { pathname } = new URL(request.url);
    if (pathname !== GRAPHQL_PATH) {
      return Response.json(
        {
          errors: [{ message: `Not found. The endpoint is ${GRAPHQL_PATH}.` }],
        },
        { status: 404 },
      );
    }
    if (request.method !== "OPTIONS") {
      hits += 1;
      const source =
        request.headers.get("x-pragma-ssr") === "1" ? "ssr" : "client";
      console.info(`[graphql] http hit #${hits} ${source}`);
    }
    return handler(request);
  },
});

console.log(
  `prism-graph-example listening on http://127.0.0.1:${port}${GRAPHQL_PATH}`,
);
