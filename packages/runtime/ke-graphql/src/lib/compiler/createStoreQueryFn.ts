import type { SPARQL, Store } from "@canonical/ke";
import type { QueryFn } from "#shared";

/**
 * Adapt a ke Store to the QueryFn surface (string → branded SPARQL), for
 * compiling directly against a store instead of a plugin context.
 *
 * @note Impure — the returned function executes SPARQL queries against the
 * store.
 */
export default function createStoreQueryFn(store: Store): QueryFn {
  return (query) => store.query(query as SPARQL<string>);
}
