/**
 * The standard reading route's query contract, lifted to the route level
 * (the P-2 D3 pattern): the compiled `StandardEntityQuery` operation plus
 * the one variables builder, exported from one module so the server
 * prepare step (`routes.ts` meta), the client prefetch seam
 * (`warmRouteQuery`), and the page's hook all execute the same operation
 * with byte-identical variables.
 *
 * This module imports the GENERATED artifact rather than declaring a tag:
 * it sits on the server bricks' native import chain (via `appRoutes`),
 * where no Vite transform rewrites tags. The tag lives next to the page
 * component (`StandardReadingPage.tsx`) as relay-compiler's source of
 * truth.
 *
 * URI shape, verified live: unlike the ontology surface (full IRIs, the
 * definitions lens's `uris.ts` codec), the cs: surface speaks PREFIXED
 * URIs natively — `codeStandards` returns `cs:code.array.safe_access`
 * style URIs and `codeStandard(uri:)` accepts them — so no codec rides
 * this lens; the route param IS the graph's address.
 */

import type { StandardEntityQuery$variables } from "#relay/__generated__/StandardEntityQuery.graphql.js";
import standardEntityQueryNode from "#relay/__generated__/StandardEntityQuery.graphql.js";
import type { RouteQueryEntry } from "#relay/routeQuery.js";

/** The compiled operation (full text under `params.text`, `id: null`). */
export { standardEntityQueryNode };

/**
 * The reading page's variables from the matched route params. `uri`
 * arrives percent-decoded from the router codec; `String()` asserts the
 * shape at the one boundary where params are `unknown`-typed records.
 */
export const standardEntityVariables = (
  params: Readonly<Record<string, unknown>>,
): StandardEntityQuery$variables => ({
  uri: String(params.uri),
});

/**
 * The route's one query entry — parked under BOTH `meta` (the P-2 server
 * prepare contract) and `prefetch` (the P-5 warm-up seam) by `routes.ts`.
 */
export const standardEntityRouteEntry: RouteQueryEntry = {
  query: standardEntityQueryNode,
  variables: standardEntityVariables,
};
