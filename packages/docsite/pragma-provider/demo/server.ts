// =============================================================================
// A runnable endpoint for the pragma provider.
//
//   bun run serve                       # GraphiQL at http://127.0.0.1:5177/graphql
//   PRAGMA_REFS_DIR=… bun run serve     # against a cache somewhere else
//
// Port 5177 by default: the docsite's own graph holds 5175 and
// prism-graph-example holds 5176, so all three run at once and the same lenses
// can be pointed at any of them via the docsite's `VITE_GRAPHQL_URL`.
//
// ⚠ THIS WILL NOT BOOT WITHOUT A POPULATED PRAGMA REFS CACHE, and that is
// correct behaviour rather than a defect. `collectTtlSources` throws before an
// Oxigraph store is ever created, carrying the remedy ("run `pragma sources
// update`"). A demo that fabricated a graph to have something to serve would
// be demonstrating something other than this provider.
//
// It passes NO `sdlOutput`, so it writes no file. See
// `src/lib/provider/createPragmaProvider.ts` for why that is the default.
//
// Not part of the published build (tsconfig.build.json covers src/ only); it
// is type-checked and linted like everything else.
// =============================================================================

import { createPragmaProvider } from "../src/index.js";

const GRAPHQL_PATH = "/graphql";
const port = Number(process.env.PORT ?? 5177);

const provider = await createPragmaProvider().catch((error: unknown): never => {
  console.error(
    "[prism-pragma-provider] the provider failed to boot:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});

Bun.serve({
  port,
  fetch: async (request: Request): Promise<Response> => {
    const { pathname } = new URL(request.url);
    if (pathname !== GRAPHQL_PATH) {
      // JSON, never HTML: this process has no renderer and must never look
      // like one to a misconfigured client.
      return Response.json(
        {
          errors: [{ message: `Not found. The endpoint is ${GRAPHQL_PATH}.` }],
        },
        { status: 404 },
      );
    }
    return provider.handle(request);
  },
});

console.log(
  `prism-pragma-provider listening on http://127.0.0.1:${port}${GRAPHQL_PATH} (${provider.api.diagnostics.length} diagnostics)`,
);
