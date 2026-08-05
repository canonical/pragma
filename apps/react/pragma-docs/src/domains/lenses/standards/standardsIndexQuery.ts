/**
 * The Standards index route's query contract (the components lens's
 * `catalogQuery.ts` sibling): the compiled `StandardsIndexQuery` operation
 * plus the one variables builder, shared by the server prepare step
 * (`routes.ts` meta), the client prefetch seam (`warmRouteQuery`), and the
 * page's hook — byte-identical variables everywhere. Artifact-only
 * imports: this module rides the server bricks' native import chain; the
 * tag lives in `StandardsPage.tsx`.
 */

import { GRAPH_BINDINGS } from "#lib/graphBindings/index.js";
import type { StandardsIndexQuery$variables } from "#relay/__generated__/StandardsIndexQuery.graphql.js";
import standardsIndexQueryNode from "#relay/__generated__/StandardsIndexQuery.graphql.js";
import type { RouteQueryEntry } from "#relay/routeQuery.js";

/**
 * One page of the standards connection. 100 is a size THIS APP chooses,
 * not a contract fact: ke-graphql clamps at `MAX_PAGE_SIZE = 100` and
 * silently truncates a larger ask, while the reference provider does not
 * clamp at all (it only defaults to 20 when neither `first` nor `last` is
 * given). 100 is therefore safe on both, but calling it "the schema's hard
 * maximum" would state one provider's hardening rule as though the
 * contract required it. The live graph carries slightly more standards
 * than one page (131 at capture time), so the view pairs this with an
 * explicit "Load more" (the components lens's ruling R1). NEVER a
 * hardcoded total: the graph's counts move.
 */
export const STANDARDS_PAGE_SIZE = 100;

/** The compiled operation (full text under `params.text`, `id: null`). */
export { standardsIndexQueryNode };

/**
 * The index page's variables — still a degenerate constant builder (the
 * route has no params and no search schema; filters stay out of v1,
 * mirroring the catalog's R2 posture), but the collection it enumerates is
 * now named by the app's committed binding rather than by a bespoke root
 * field. A fork repoints this lens by editing `#lib/graphBindings` and
 * nothing else.
 */
export const standardsIndexVariables = (): StandardsIndexQuery$variables => ({
  classUri: GRAPH_BINDINGS.standards.classUri,
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
