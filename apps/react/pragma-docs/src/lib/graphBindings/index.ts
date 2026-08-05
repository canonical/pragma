/**
 * WHICH CLASS POWERS WHICH LENS — the app's one binding table.
 *
 * The contract's entire root surface is five structural fields (`node`,
 * `ontologies`, `ontology`, `ontologyClass`, `ontologyProperty`) and NONE
 * of them names a subject. A lens that enumerates things therefore needs a
 * class URI supplied from OUTSIDE the graph, and this module is that
 * outside. A fork points the docsite at its own ontology by adding a
 * deployment to `deployments.ts` and nothing else — no query, no component,
 * no route, no test.
 *
 * This generalises an answer the app had already reached rather than
 * inventing one: `domains/marketing/lobbyQuery.ts` has shipped its three
 * class URIs as plain module constants since the lobby landed, and
 * `HomePage.tsx` has rooted at `ontologyClass(uri:)` all along. Those
 * three names now re-export from here.
 *
 * ── Three traps, each of which this module's shape exists to avoid ──
 *
 * PREFIXED FORM, ALWAYS. `ontologyClass(uri:)` takes `String!` and accepts
 * the prefixed convenience form on both known providers (ke-graphql
 * `wireRelay.ts`; graph-example `createExampleProvider.ts`, `expandUri`).
 * But it ECHOES BACK THE ABSOLUTE IRI, so nothing may compare a value from
 * this module against a `uri` the graph returned. Compare
 * server-normalised IRIs against each other, or run the string through
 * `toPrefixedUri` first.
 *
 * A CLOSED TABLE, SELECTED BY NAME — NEVER A URI FROM THE ENVIRONMENT.
 * These strings become GraphQL *variables*, and the SSR prepare step and the
 * client hydration must compute byte-identical variables or the warmed store
 * does not fulfil the client's operation. That is why the environment may
 * name a KEY of {@link DEPLOYMENTS} and may never supply a class: a typo
 * cannot produce a *wrong* binding, only the default, and no value from
 * outside the build can point a lens at a class this repo never declared.
 *
 * The paragraph this replaces said "NOT AN ENV VAR, DELIBERATELY", on the
 * grounds that `VITE_*` resolves differently in the client build and in the
 * SSR renderer. That failure mode is real but narrower than it read, and it
 * is worth stating exactly where it does and does not bite:
 *
 * - In `dev:*`, Vite injects `VITE_*` into the transformed client module
 *   straight from `process.env` (measured: the served
 *   `/src/relay/graphqlEndpoint.ts` carries the value inline), and Bun
 *   populates `import.meta.env` from `process.env` too. All three registries
 *   — Bun native prepare, Vite SSR render, Vite dev client — read one value.
 * - In `preview:*`, the client build and the server run in ONE process
 *   environment (`bun run build:client && … bun preview.bun.ts`), so the
 *   build-time replacement and the runtime read see the same value.
 * - THE RESIDUAL HAZARD is "build in environment A, run in environment B":
 *   the built bundle froze A's value while the renderer reads B's, and the
 *   two registries diverge. This repo has no pipeline that does that, so the
 *   hazard is documented rather than pretended away. The fix, when a real
 *   deployment appears, is to stop resolving this per registry: have the
 *   server resolve once and transport the answer on `__INITIAL_DATA__`, with
 *   `entry.tsx` and `hydrateApp.tsx` setting it before the router, exactly as
 *   they already do for the prefetch environment.
 *
 * Divergence is OBSERVABLE, not silent: `test/e2e/metro.e2e.ts` asserts, for
 * each Standards route, both that the warmed store carries the provider's
 * records AND that the rendered HTML carries them. If the two registries ever
 * disagree the store fills, the render misses, `entry.tsx`'s `fetchFn`
 * rejects, and the page serves its suspense fallback — which is precisely the
 * records-present-content-absent pair that test turns red.
 *
 * THE ACCEPTANCE GATE MUST NEVER READ IT. `packages/docsite/graph-example`
 * supplies its own binding (`metro:Station`) through
 * `LENS_OPERATION_VARIABLES`. The two never meet, and that is the point:
 * the gate proves the OPERATION is neutral, this module proves the
 * DEPLOYMENT is pointed somewhere. Coupling them would make the gate go
 * green because the app agreed with itself.
 */

import {
  DEPLOYMENT_ENV_VAR,
  type DeploymentBindings,
  selectDeployment,
} from "./deployments.js";

// The table itself, its default and its selector stay in `deployments.js`;
// this module re-exports only the TYPES, which were part of its surface
// before deployments existed. Re-exporting the values too would give every
// consumer two names for one thing.
export type { DeploymentBindings, LensBinding } from "./deployments.js";

/**
 * Which deployment this runtime was started as, or `undefined` for the
 * default.
 *
 * Reads the two sources for the same six-runtime reason
 * `#relay/graphqlEndpoint.js` documents at length: `import.meta.env` is a
 * Vite/Bun construct that plain Node does not have, and `process` does not
 * exist in a browser bundle.
 *
 * @note Impure — reads the ambient environment.
 */
const readDeploymentName = (): string | undefined => {
  // The LITERAL member access is required: Vite's static replacement only
  // matches `import.meta.env.VITE_PRISM_DEPLOYMENT` spelled out. A computed
  // key (`import.meta.env[DEPLOYMENT_ENV_VAR]`) would keep working in dev and
  // silently resolve to nothing in a build — which, for a query VARIABLE,
  // means the client asks for a different class than the server prepared.
  const fromVite: unknown = import.meta.env?.VITE_PRISM_DEPLOYMENT;
  if (typeof fromVite === "string" && fromVite.length > 0) return fromVite;
  // The `typeof process` guard is NOT optional: a bare `process.env.X` is a
  // ReferenceError in the browser bundle, which would take the client entry
  // down before React mounts.
  const fromProcess: string | undefined =
    /* v8 ignore next -- runtime detection: the browser bundle has no `process`, unreachable under the node test environment */
    typeof process === "undefined"
      ? undefined
      : process.env[DEPLOYMENT_ENV_VAR];
  return typeof fromProcess === "string" && fromProcess.length > 0
    ? fromProcess
    : undefined;
};

/**
 * The deployment's lens → class table.
 *
 * `pragma` unless {@link DEPLOYMENT_ENV_VAR} names another entry of
 * {@link DEPLOYMENTS} — so an unset environment yields byte-identical values
 * to the ones this module exported before deployments existed.
 *
 * `standards` is the only entry a lens roots at today; `components` and
 * `patterns` are read by the lobby's counted doors, and `components`
 * additionally by the term inspector's D31 landing rule (an instance links
 * to `/components/:uri` only when its own class IS the components class).
 */
export const GRAPH_BINDINGS: DeploymentBindings = selectDeployment(
  readDeploymentName(),
);
