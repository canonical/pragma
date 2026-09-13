// =============================================================================
// RELAY — the app's GraphQL client domain.
//
// WHAT IS DELIBERATELY ABSENT. Two things this barrel does NOT re-export, both
// for reasons that would be silently undone by "completing" it:
//
// 1. `graphqlEndpoint.ts`. That module has ZERO imports on purpose: the graph
//    runs as its own process hosting ke-graphql's pinned graphql v17 RC, and
//    `src/server/graph.ts` reads the endpoint to pick its listen port. Routing
//    it through this barrel would pull `environment.js` — and with it
//    relay-runtime and the app's graphql v16 — into the v17 process, reopening
//    the two-versions tightrope its docblock exists to close. It keeps its own
//    alias, pointing straight at the file.
//
// 2. `__generated__/*`. Those are relay-compiler's output, one artifact per
//    query or fragment, and the compiler owns that directory. A barrel over
//    them would have to be regenerated on every codegen run to stay truthful,
//    so it would drift by construction; it would also make every consumer of
//    one artifact load all of them. Generated artifacts are implementation
//    detail of this domain, not part of its API.
// =============================================================================

export type { CreateEnvironmentOptions } from "./environment.js";
export { createEnvironment } from "./environment.js";
export {
  getPrefetchEnvironment,
  setPrefetchEnvironment,
} from "./prefetchEnvironment.js";
export type { RouteQueryEntry } from "./routeQuery.js";
export { ROUTE_QUERY_META_KEY, readRouteQueryEntry } from "./routeQuery.js";
export { warmRouteQuery } from "./warmRouteQuery.js";
