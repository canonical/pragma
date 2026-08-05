/**
 * The graph GraphQL server — its own process, serving ONLY `/graphql`.
 *
 * Until PRD-3 the ke-graphql backend was mounted inside whichever web server
 * happened to be running (a Vite plugin, a Bun brick, an Express middleware).
 * That put an Oxigraph WASM store and ke-graphql's pinned graphql v17 RC into
 * the same process as the app's graphql v16 and the render world. This file
 * is the split: one process boots the store, compiles the schema, and answers
 * HTTP. Everything else — dev servers, preview servers, the browser, the SSR
 * prepare step — talks to it over the wire at
 * {@link DEFAULT_GRAPHQL_URL} (or `GRAPH_PORT`).
 *
 * **The provider is no longer assembled here.** It comes from
 * `@canonical/prism-pragma-provider`, which owns pragma's ref-package list,
 * its semantic-package list, the shim-concept exclusion, the `anatomy:uri`
 * mapping and the compiler options — every fact about pragma's specific
 * ontologies that used to live in this app's `src/server/graphql.ts`. What is
 * left in this file is TRANSPORT: the port, the hostname, the `/graphql`-only
 * routing and the per-request hit log. This app depends on no knowledge engine
 * at all: neither `@canonical/ke` nor `@canonical/ke-graphql` appears in its
 * dependencies. Point it at any provider implementing
 * `@canonical/prism-contract` with `VITE_GRAPHQL_URL` and none of this
 * changes.
 *
 * **Named `graph.ts`, not `graph.bun.ts`.** The `.bun` / `.express` suffix in
 * this directory encodes the 2×3 server matrix (two modes × three targets).
 * The graph has no matrix: there is exactly one of it, it always runs under
 * Bun, and neither the mode nor the web target changes it.
 *
 * **Boots EAGERLY.** `createPragmaProvider()` is awaited BEFORE `Bun.serve`,
 * so "listening" means "schema compiled" — a launcher that races readiness
 * gets an honest answer instead of a socket that accepts and then spends
 * thirty seconds parsing Turtle. A boot failure exits non-zero carrying the
 * provider's own actionable message (the refs-cache hint), rather than
 * serving 500s forever. The provider used to memoise itself behind a lazy
 * `getGraphqlBackend()`; there is exactly one boot and this line is it, so
 * the singleton went away with the module it lived in.
 *
 * **Serves only `/graphql`.** Every other path is a JSON 404 — never HTML.
 * A consumer that has been misconfigured to point at the web server (or vice
 * versa) then fails on content type instead of silently parsing a page.
 */
import { fileURLToPath } from "node:url";
import { createPragmaProvider } from "@canonical/prism-pragma-provider";
import { DEFAULT_GRAPHQL_URL } from "#relay/graphqlEndpoint.js";

/**
 * The emitted SDL destination — the file relay-compiler reads.
 *
 * It lives HERE, not in the provider package: the path belongs to THIS app's
 * source tree, and a provider that derived it from its own `import.meta.url`
 * would resolve it inside the package (or inside `node_modules`) with no type
 * error, no lint error and no test failure — only a boot would reveal it, and
 * a boot needs a populated refs cache. So `sdlOutput` is an argument with no
 * default: the provider takes a path or it writes nothing at all.
 */
const SDL_OUTPUT_PATH = fileURLToPath(
  new URL("../relay/schema.graphql", import.meta.url),
);

/** The listen port: `GRAPH_PORT`, else the one port literal in the app. */
const PORT =
  Number(process.env.GRAPH_PORT) || Number(new URL(DEFAULT_GRAPHQL_URL).port);

/** The only path this server answers. */
const GRAPHQL_ROUTE = new URL(DEFAULT_GRAPHQL_URL).pathname;

/**
 * The listen address, from the same literal the logged URL is built from.
 * Stated explicitly because `Bun.serve` defaults to ALL interfaces while
 * self-reporting `localhost` — so without this the process would put the
 * graph on the LAN for the two Vite-hosted cells, which used to mount it on
 * a loopback-bound Vite server, and both the log line below and
 * {@link DEFAULT_GRAPHQL_URL} would be misstating where it listens.
 */
const HOSTNAME = new URL(DEFAULT_GRAPHQL_URL).hostname;

// HTTP hits on the endpoint, logged per request so the e2e suite can tell a
// server-rendered load (`ssr`) from a browser one (`client`). Keep the log
// line in sync with GRAPHQL_HIT_MARKER in test/e2e/servers.e2e.ts.
let hits = 0;

const backend = await createPragmaProvider({
  sdlOutput: SDL_OUTPUT_PATH,
}).catch((error: unknown): never => {
  console.error(
    "[graph] the GraphQL backend failed to boot:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});

console.info(
  `[graph] schema ready (${backend.api.diagnostics.length} diagnostics)`,
);

Bun.serve({
  port: PORT,
  hostname: HOSTNAME,
  fetch(req: Request) {
    const url = new URL(req.url);
    if (url.pathname !== GRAPHQL_ROUTE) {
      // JSON, never HTML: this process has no renderer and must never look
      // like one to a misconfigured client.
      return new Response(
        JSON.stringify({
          errors: [
            {
              message: `${url.pathname} is not served here — the graph server serves only ${GRAPHQL_ROUTE}`,
            },
          ],
        }),
        { status: 404, headers: { "content-type": "application/json" } },
      );
    }
    // CORS preflights are not operations, so they are not counted — the
    // browser sends one per cross-origin POST and it would double every
    // client hit. Counts requests reaching the endpoint, not successful
    // executions: a malformed-JSON 400 still increments, since this runs
    // before `handle` sees the request.
    if (req.method !== "OPTIONS") {
      hits += 1;
      // `x-pragma-ssr: 1` marks a request made by this app's own
      // infrastructure (the SSR prepare step, the launcher's readiness
      // probe) rather than by a browser.
      const source = req.headers.get("x-pragma-ssr") === "1" ? "ssr" : "client";
      console.info(`[graphql] http hit #${hits} ${source}`);
    }
    return backend.handle(req);
  },
});

console.info(`[graph] serving http://${HOSTNAME}:${PORT}${GRAPHQL_ROUTE}`);
