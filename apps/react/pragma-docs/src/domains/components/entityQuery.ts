/**
 * The component entity route's query contract, lifted to the route level
 * (the P-2 D3 pattern `probeQuery.ts` established): the compiled
 * `ComponentEntityQuery` operation plus the one variables builder, exported
 * from one module so the server prepare step (`routes.ts` meta), the client
 * prefetch seam (`warmRouteQuery`), and the page's hook all execute the
 * same operation with byte-identical variables.
 *
 * This module imports the GENERATED artifact rather than declaring a tag:
 * it sits on the server bricks' native import chain (via `appRoutes`),
 * where no Vite transform rewrites tags. The tag lives next to the page
 * component (`ComponentEntityPage.tsx`) as relay-compiler's source of
 * truth.
 */

import type { ComponentEntityQuery$variables } from "#relay/__generated__/ComponentEntityQuery.graphql.js";
import componentEntityQueryNode from "#relay/__generated__/ComponentEntityQuery.graphql.js";
import type { RouteQueryEntry } from "#relay/routeQuery.js";

/** How many related entities each relation list shows (v1: no paging UI). */
export const RELATION_PAGE_SIZE = 24;

/** The compiled operation (full text under `params.text`, `id: null`). */
export { componentEntityQueryNode };

/**
 * The entity page's variables from the matched route params. `uri` arrives
 * percent-decoded from the router codec; `String()` asserts the shape at
 * the one boundary where params are `unknown`-typed records.
 */
export const componentEntityVariables = (
  params: Readonly<Record<string, unknown>>,
): ComponentEntityQuery$variables => ({
  uri: String(params.uri),
  count: RELATION_PAGE_SIZE,
});

/**
 * The route's one query entry — parked under BOTH `meta` (the P-2 server
 * prepare contract) and `prefetch` (the P-5 warm-up seam) by `routes.ts`.
 */
export const componentEntityRouteEntry: RouteQueryEntry = {
  query: componentEntityQueryNode,
  variables: componentEntityVariables,
};
