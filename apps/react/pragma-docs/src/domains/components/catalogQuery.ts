/**
 * The catalog route's query contract (the `entityQuery.ts` sibling): the
 * compiled `ComponentsCatalogQuery` operation plus the one variables
 * builder, shared by the server prepare step, the client prefetch seam,
 * and the page's hook. Artifact-only imports — this module rides the
 * server bricks' native import chain; the tag lives in
 * `ComponentsCatalogPage.tsx`.
 */

import type { ComponentsCatalogQuery$variables } from "#relay/__generated__/ComponentsCatalogQuery.graphql.js";
import componentsCatalogQueryNode from "#relay/__generated__/ComponentsCatalogQuery.graphql.js";
import type { RouteQueryEntry } from "#relay/routeQuery.js";

/**
 * One page of the catalog connection — the schema's hard per-page maximum
 * (ke-graphql MAX_PAGE_SIZE, not configurable; asking for more silently
 * clamps). The live graph carries slightly more components than one page,
 * so the view pairs this with an explicit "Load more" (ruling R1). NEVER
 * a hardcoded total: the graph moved 111→108 during planning alone.
 */
export const CATALOG_PAGE_SIZE = 100;

/** The compiled operation (full text under `params.text`, `id: null`). */
export { componentsCatalogQueryNode };

/**
 * The catalog page's variables — a degenerate constant builder (the route
 * has no params and no search schema; filters are ruled out for v1, R2).
 */
export const componentsCatalogVariables =
  (): ComponentsCatalogQuery$variables => ({
    count: CATALOG_PAGE_SIZE,
    cursor: null,
  });

/**
 * The route's one query entry — parked under BOTH `meta` (the P-2 server
 * prepare contract) and `prefetch` (the P-5 warm-up seam) by `routes.ts`.
 */
export const componentsCatalogRouteEntry: RouteQueryEntry = {
  query: componentsCatalogQueryNode,
  variables: componentsCatalogVariables,
};
