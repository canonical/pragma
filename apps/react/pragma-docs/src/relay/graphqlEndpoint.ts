/**
 * Where the graph GraphQL endpoint lives — the ONE place that decides the URL.
 *
 * The graph now runs as its OWN process (`src/server/graph.ts`), so every
 * consumer — browser bundle, SSR prepare step, launcher — has to agree on one
 * absolute address. This module is that agreement, and it deliberately has
 * **zero imports**: `src/server/graph.ts` reads it to pick its listen port, and
 * that process hosts ke-graphql's pinned graphql v17 RC. Importing anything
 * from `#relay/environment.js` here would drag relay-runtime (and the app's
 * graphql v16) into the v17 process and reopen the two-versions tightrope.
 *
 * The port literal appears exactly ONCE, in {@link DEFAULT_GRAPHQL_URL};
 * `graph.ts` and `withGraph.ts` derive the number via `new URL(...).port`.
 *
 * ## The six-runtime matrix
 *
 * {@link resolveGraphqlUrl} has to answer in six different runtimes, which is
 * why it reads TWO sources before falling back:
 *
 * 1. **Vite dev (browser)** — `import.meta.env` is a live object Vite
 *    populates from `VITE_*` env vars and `.env` files.
 * 2. **Vite client build (`dist/client`)** — `import.meta.env.VITE_*` is
 *    statically replaced at build time. The client build deliberately does
 *    NOT see `VITE_GRAPHQL_URL`, so this arm compiles to the empty string /
 *    `undefined` and the browser falls through to the default. That is on
 *    purpose: the built bundle must not have a machine's dev port baked in.
 * 3. **Vite SSR build (`dist/server/renderer.js`)** — same static
 *    replacement, same deliberate miss; the compiled renderer therefore reads
 *    `process.env.VITE_GRAPHQL_URL` at RUNTIME, which is exactly how
 *    `withGraph.ts` hands the preview bricks the live graph port. Do not
 *    "fix" the build to inject the variable — that would freeze one port into
 *    a deployable artifact.
 * 4. **Bun native** (`bun src/server/server.bun.ts`, `graph.ts`) —
 *    `import.meta.env` IS defined (Bun populates it from `process.env`), so
 *    the first arm already answers.
 * 5. **Node + tsx** (`server.express.ts`, `preview.express.ts`) — no Vite
 *    transform, no `import.meta.env`; the `?.` is load-bearing and the
 *    `process.env` arm answers.
 * 6. **Vitest (node environment)** — `import.meta.env` exists and Vitest
 *    keeps it in step with `process.env`, so either arm may answer with the
 *    same value.
 */

/**
 * The graph server's address when nothing configures one.
 *
 * ABSOLUTE, not the same-origin `/graphql` this app used while the endpoint
 * was mounted on the web server: the graph is a separate process on its own
 * port now, and the SSR prepare step (which has no origin to resolve a
 * relative URL against) must be able to reach it.
 *
 * The port literal `5175` lives here and nowhere else — one digit above the
 * web servers' 5174, so the pair reads as a set.
 */
export const DEFAULT_GRAPHQL_URL = "http://127.0.0.1:5175/graphql";

/**
 * The env var that overrides {@link DEFAULT_GRAPHQL_URL}.
 *
 * The `VITE_` prefix is MANDATORY, not decorative: Vite only exposes
 * `VITE_*`-prefixed variables to the browser bundle, and the browser is one
 * of this endpoint's consumers.
 */
export const GRAPHQL_URL_ENV_VAR = "VITE_GRAPHQL_URL";

/**
 * Resolve the graph endpoint for the current runtime: Vite's env, then the
 * process env, then {@link DEFAULT_GRAPHQL_URL}. An empty string counts as
 * unset in both sources (a bare `VITE_GRAPHQL_URL=` in a `.env` file must not
 * resolve to `""`).
 *
 * @note Impure — reads the ambient environment.
 */
export const resolveGraphqlUrl = (): string => {
  // The LITERAL member access is required: Vite's static replacement only
  // matches `import.meta.env.VITE_GRAPHQL_URL` spelled out. A computed key
  // (`import.meta.env[GRAPHQL_URL_ENV_VAR]`) would keep working in dev and
  // silently resolve to nothing in a build.
  const fromVite: unknown = import.meta.env?.VITE_GRAPHQL_URL;
  if (typeof fromVite === "string" && fromVite.length > 0) return fromVite;
  // The `typeof process` guard is NOT optional: a bare `process.env.X` is a
  // ReferenceError in the browser bundle, which would take the client entry
  // down before React mounts.
  const fromProcess: string | undefined =
    /* v8 ignore next -- runtime detection: the browser bundle has no `process`, unreachable under the node test environment */
    typeof process === "undefined" ? undefined : process.env.VITE_GRAPHQL_URL;
  if (typeof fromProcess === "string" && fromProcess.length > 0) {
    return fromProcess;
  }
  return DEFAULT_GRAPHQL_URL;
};
