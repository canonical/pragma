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
 * URI SHAPE — THE ONE USER-VISIBLE COST OF DESPECIALISATION. The route
 * param used to be the compact form: `codeStandard(uri:)` accepted
 * `cs:react.component.props`, so `/standards/cs%3Areact.component.props`
 * was the graph's address spelled straight into the URL. The contract has
 * no `codeStandard` field, and its one entity lookup — `node(id:)` — takes
 * the ABSOLUTE IRI and nothing else (ke-graphql returns null for anything
 * failing `isAbsoluteIri`; the reference provider keys its index on the
 * absolute IRI; `EntityMeta.curie`'s own contract docstring says the curie
 * "is not accepted by `node(id:)`"). So the route param is now
 * `http%3A%2F%2Fpragma.canonical.com%2Fcodestandards%23react.component.props`.
 *
 * Keeping the curie in the URL and expanding it client-side via `toFullUri`
 * + `Query.ontologies` was considered and rejected: it needs the namespace
 * inventory SYNCHRONOUSLY, on both server and client, before routing —
 * `RouteQueryEntry.variables` is a synchronous pure function the SSR
 * prepare step calls directly. That means a namespace-inventory bootstrap,
 * its SSR serialisation and its client hydration path: a second source of
 * truth about namespaces. It is strictly additive later (only this builder
 * changes), so if compact addresses are wanted back, that bootstrap is the
 * shape of the work.
 */

import { GRAPH_BINDINGS } from "#lib/graphBindings/index.js";
import type { StandardEntityQuery$variables } from "#relay/__generated__/StandardEntityQuery.graphql.js";
import standardEntityQueryNode from "#relay/__generated__/StandardEntityQuery.graphql.js";
import type { RouteQueryEntry } from "#relay/routeQuery.js";

/** The compiled operation (full text under `params.text`, `id: null`). */
export { standardEntityQueryNode };

/**
 * The reading page's variables from the matched route params. `uri`
 * arrives percent-decoded from the router codec and is the entity's
 * ABSOLUTE IRI; `String()` asserts the shape at the one boundary where
 * params are `unknown`-typed records. `classUri` is the app's committed
 * binding — the page cannot tell a standard from a component without it,
 * because `node(id:)` will happily return either.
 */
export const standardEntityVariables = (
  params: Readonly<Record<string, unknown>>,
): StandardEntityQuery$variables => ({
  uri: String(params.uri),
  classUri: GRAPH_BINDINGS.standards.classUri,
});

/**
 * The route's one query entry — parked under BOTH `meta` (the P-2 server
 * prepare contract) and `prefetch` (the P-5 warm-up seam) by `routes.ts`.
 */
export const standardEntityRouteEntry: RouteQueryEntry = {
  query: standardEntityQueryNode,
  variables: standardEntityVariables,
};
