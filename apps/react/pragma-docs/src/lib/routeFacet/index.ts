/**
 * The route-facet helper: how a route annotates itself, and how anything
 * reads those annotations back off the route table.
 *
 * NOT barrelled from `#lib/index.js` — that barrel carries the app's
 * COMPONENTS, and this renders nothing (the same reason `graphBindings` and
 * `WellGeometry` stay out of it). Import from `#lib/routeFacet/index.js`.
 */

export type { FacetBearer } from "./collectFacet.js";
export { collectFacet } from "./collectFacet.js";
export type { RouteFacet, RouteMeta } from "./defineFacet.js";
export { defineFacet } from "./defineFacet.js";
