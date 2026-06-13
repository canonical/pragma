// =============================================================================
// Demo dev server — the whole TTL → GraphQL story in one runnable file:
//
//   bun run demo        (from packages/runtime/ke-graphql)
//
// Boots a ke store from demo/graph.ttl, logs ke's load activity, compiles
// the schema, and serves GraphQL + GraphiQL on http://localhost:4000/graphql.
//
// demo/ is not part of the published package: it is type-checked and linted,
// but excluded from the build (tsconfig.build.json) and from the npm tarball
// (files: ["dist"]).
// =============================================================================

import {
  createStore,
  definePlugin,
  type Plugin,
  type SelectResult,
  sparql,
} from "@canonical/ke";
import { createGraphQLHandler } from "../src/http/index.js";
import { createSchemaPlugin, type SchemaPluginApi } from "../src/index.js";

const port = Number(process.env.PORT ?? 4000);
const started = performance.now();

/**
 * Log ke's lifecycle to the console: one line per loaded source, then
 * store-wide counts once the store is queryable.
 *
 * @note Impure — writes to the console and queries the store.
 */
const createActivityLogPlugin = (): Plugin =>
  definePlugin({
    name: "demo-activity-log",
    onLoad(source) {
      console.info(
        `[ke] loaded ${source.path} (${source.format}, ${source.content.length} bytes)`,
      );
    },
    async onReady(ctx) {
      const triples = (await ctx.query(
        sparql`SELECT (COUNT(*) AS ?total) WHERE { ?s ?p ?o }`,
      )) as SelectResult;
      const subjects = (await ctx.query(
        sparql`SELECT (COUNT(DISTINCT ?s) AS ?total) WHERE { ?s a ?type }`,
      )) as SelectResult;
      console.info(
        `[ke] store ready — ${triples.bindings[0]?.total} triples, ${subjects.bindings[0]?.total} typed subjects`,
      );
    },
  });

// The same mapping the README walks through: rename the mechanical plural
// on the inverse side of hasAuthor/authored.
const graphql = createSchemaPlugin({
  mappings: { "lib:authored": { graphqlName: "works" } },
  incremental: true,
});

// biome-ignore lint: Plugin generic variance requires explicit unknown
const plugins: Plugin<any>[] = [createActivityLogPlugin(), graphql];

const store = await createStore({
  sources: [new URL("./graph.ttl", import.meta.url).pathname],
  prefixes: { lib: "https://example.org/library/" },
  plugins,
});

const api = store.api<SchemaPluginApi>("ke-graphql");
if (!api) {
  throw new Error("ke-graphql plugin did not register its API");
}

const handler = createGraphQLHandler(api.schema, {
  context: () => api.createContext(store),
  graphiql: true,
  cors: true,
  incremental: true,
});

// Mounting is the host's job (the handler is path-agnostic by design):
// serve GraphQL + GraphiQL on /graphql, redirect / there, 404 the rest
// (browsers probe /favicon.ico on every visit).
Bun.serve({
  port,
  fetch(request) {
    const { pathname } = new URL(request.url);
    if (pathname === "/graphql") {
      return handler(request);
    }
    if (pathname === "/") {
      return Response.redirect(`http://localhost:${port}/graphql`, 302);
    }
    return new Response(null, { status: 404 });
  },
});

const boot = (performance.now() - started).toFixed(0);
console.info(
  `[demo] schema compiled (${api.diagnostics.length} diagnostics) — ready in ${boot} ms`,
);
console.info(`[demo] GraphiQL   http://localhost:${port}/graphql`);
console.info("[demo] try:");
console.info(
  `  curl -s http://localhost:${port}/graphql -H 'content-type: application/json' \\
    -d '{"query":"{ books(first: 3) { edges { node { id title pageCount authors { edges { node { name } } } } } } }"}'`,
);
