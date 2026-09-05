/**
 * The route→query contract for server-side data preparation (P-2 track).
 *
 * A route that wants its data executed on the server parks a
 * {@link RouteQueryEntry} on its `meta` field under {@link ROUTE_QUERY_META_KEY}.
 * The router never serialises `meta` (`dehydrate()` emits only routing
 * state), so a compiled Relay `ConcreteRequest` is runtime-safe there — at
 * the acknowledged cost of `unknown`-typed access, which is why every read
 * goes through {@link readRouteQueryEntry}'s shape assertion.
 *
 * This module is deliberately dependency-light (relay-runtime types plus a
 * string constant): it is imported by route modules (client bundle) and by
 * the server-side collector alike.
 */

import type { ConcreteRequest, Variables } from "relay-runtime";

/** The `meta` key under which a route publishes its server query entry. */
export const ROUTE_QUERY_META_KEY = "ssrQuery";

/**
 * A route's server-executable query: the compiled operation (its `params.text`
 * carries the full operation text) plus a variables builder over the match's
 * `params` and `search`. For parameterless routes the builder is a degenerate
 * constant function.
 */
export interface RouteQueryEntry {
  readonly query: ConcreteRequest;
  readonly variables: (
    params: Readonly<Record<string, unknown>>,
    search: Readonly<Record<string, unknown>>,
  ) => Variables;
}

/**
 * Read a route's query entry off its `unknown`-typed `meta`, asserting the
 * shape. Returns `undefined` when the route declares no entry; throws when an
 * entry exists but is malformed — a mapped route with a broken entry is a
 * bug, not an absence.
 */
export const readRouteQueryEntry = (
  meta: Readonly<Record<string, unknown>> | undefined,
): RouteQueryEntry | undefined => {
  const entry = meta?.[ROUTE_QUERY_META_KEY];
  if (entry === undefined) return undefined;
  if (typeof entry !== "object" || entry === null) {
    throw new Error(`route meta ${ROUTE_QUERY_META_KEY} is not an object`);
  }
  const { query, variables } = entry as Record<string, unknown>;
  const operationText = (query as ConcreteRequest | undefined)?.params?.text;
  if (typeof operationText !== "string" || operationText.length === 0) {
    throw new Error(
      `route meta ${ROUTE_QUERY_META_KEY}.query carries no operation text — ` +
        "expected a compiled ConcreteRequest artifact (params.text)",
    );
  }
  if (typeof variables !== "function") {
    throw new Error(
      `route meta ${ROUTE_QUERY_META_KEY}.variables is not a function`,
    );
  }
  return entry as RouteQueryEntry;
};
