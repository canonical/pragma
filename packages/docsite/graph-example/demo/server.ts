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
    return handler(request);
  },
});

console.log(
  `prism-graph-example listening on http://127.0.0.1:${port}${GRAPHQL_PATH}`,
);
