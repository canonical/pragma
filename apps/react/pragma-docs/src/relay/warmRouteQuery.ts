/**
 * Warm the client Relay store for a route's query — the execution half of
 * the P-5 prefetch seam. A route module builds its `RouteQueryEntry` once
 * and parks it under BOTH `meta[ROUTE_QUERY_META_KEY]` (the server prepare
 * contract, P-2) and `prefetch: (params, search) => warmRouteQuery(entry,
 * params, search)` (this seam), so hover-prefetch (router-react's `Link`
 * calls `router.prefetch()` on mouseenter) and the initial hydration load
 * both funnel through one code path.
 */

import {
  createOperationDescriptor,
  fetchQuery,
  getRequest,
} from "relay-runtime";
import { getPrefetchEnvironment } from "./prefetchEnvironment.js";
import type { RouteQueryEntry } from "./routeQuery.js";

/**
 * Execute `entry`'s query into the published prefetch environment,
 * fire-and-forget, unless the store can already fulfil it.
 *
 * - No published environment (SSR, tests that never hydrate) → no-op.
 * - `environment.check(operation)` "available" → no-op. LOAD-BEARING: the
 *   browser router's initial `performLoad` fires this hook for the very URL
 *   the server just seeded — without the guard, hydration would refetch the
 *   SSR-delivered page over HTTP (the hydration fetch-spy tests catch
 *   exactly that regression).
 * - Otherwise fetch, swallowing errors: a failed warm-up costs nothing —
 *   the route's own `useLazyLoadQuery` refetches and owns error surfacing.
 *
 * Caveat, documented not fixed: nothing retains the fetched operation, so
 * the warmed records live in the store's release buffer. That comfortably
 * covers the hover→click window; a pinned-retain scheme is deliberately
 * deferred until a real eviction shows up.
 *
 * `params`/`search` arrive `unknown` from the router's prefetch surface;
 * the entry's own `variables` builder is the single place that asserts
 * their shape (same contract as the server collector in `routeQueries.ts`).
 */
export const warmRouteQuery = (
  entry: RouteQueryEntry,
  params: unknown,
  search: unknown,
): void => {
  const environment = getPrefetchEnvironment();
  if (!environment) return;
  const variables = entry.variables(
    (params ?? {}) as Readonly<Record<string, unknown>>,
    (search ?? {}) as Readonly<Record<string, unknown>>,
  );
  const operation = createOperationDescriptor(
    getRequest(entry.query),
    variables,
  );
  if (environment.check(operation).status === "available") return;
  // relay-runtime's fetchQuery de-dupes identical in-flight operations per
  // environment, so rapid repeat hovers cost one request, not many.
  fetchQuery(environment, entry.query, variables).subscribe({
    error: () => {},
  });
};
