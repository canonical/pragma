// =============================================================================
// SERVER — the node/bun execution domain.
//
// Only the four modules that export anything appear here. `graph.ts`,
// `server.bun.ts`, `server.express.ts`, `preview.bun.ts`, `preview.express.ts`,
// `withGraph.ts` and `nodeCssNoop.ts` export NOTHING: they are process entry
// points and a bundler shim, executed rather than imported. Adding them to this
// barrel would make importing any server helper start a server.
// =============================================================================

export type { InitialData } from "./entry.js";
export { default as EntryServer } from "./entry.js";
export type { PreparedRelayData } from "./prepareRelayData.js";
export { prepareRelayData } from "./prepareRelayData.js";
export { default as createAppRenderer } from "./renderer.js";
export type { ResolvedRouteQuery } from "./routeQueries.js";
export {
  collectRouteQueries,
  matchRouteQuery,
  resolveRouteStatus,
} from "./routeQueries.js";
