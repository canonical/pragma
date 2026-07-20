/**
 * The Standards index route's query contract (the components lens's
 * `catalogQuery.ts` sibling): the compiled `StandardsIndexQuery` operation
 * plus the one variables builder, shared by the server prepare step
 * (`routes.ts` meta), the client prefetch seam (`warmRouteQuery`), and the
 * page's hook — byte-identical variables everywhere. Artifact-only
 * imports: this module rides the server bricks' native import chain; the
 * tag lives in `StandardsPage.tsx`.
 */

import type { StandardsIndexQuery$variables } from "#relay/__generated__/StandardsIndexQuery.graphql.js";
import standardsIndexQueryNode from "#relay/__generated__/StandardsIndexQuery.graphql.js";
import type { RouteQueryEntry } from "#relay/routeQuery.js";

/**
 * One page of the standards connection — the schema's hard per-page
 * maximum (ke-graphql MAX_PAGE_SIZE, not configurable; asking for more
 * silently clamps). The live graph carries slightly more standards than
 * one page (131 at capture time), so the view pairs this with an explicit
 * "Load more" (the components lens's ruling R1). NEVER a hardcoded total:
 * the graph's counts move.
 */
export const STANDARDS_PAGE_SIZE = 100;

/** The compiled operation (full text under `params.text`, `id: null`). */
export { standardsIndexQueryNode };

/**
 * The index page's variables — a degenerate constant builder (the route
 * has no params and no search schema; filters stay out of v1, mirroring
 * the catalog's R2 posture).
 */
export const standardsIndexVariables = (): StandardsIndexQuery$variables => ({
  count: STANDARDS_PAGE_SIZE,
  cursor: null,
});

/**
 * The route's one query entry — parked under BOTH `meta` (the P-2 server
 * prepare contract) and `prefetch` (the P-5 warm-up seam) by `routes.ts`.
 */
export const standardsIndexRouteEntry: RouteQueryEntry = {
  query: standardsIndexQueryNode,
  variables: standardsIndexVariables,
};
