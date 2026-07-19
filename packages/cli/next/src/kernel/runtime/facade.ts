/**
 * The query facade — the typed spine over the lazy store.
 *
 * `graphql` is the default surface: it executes a document against the pack's
 * precompiled schema via ke-graphql's in-process `executeLocal` (no HTTP, no
 * serialization). `sparql` is the escape hatch: a raw query against the store,
 * auto-prefixed by ke from the pack's prefix map. Both boot the store lazily on
 * first use through the same memoized `LazyStore.get()`. ke-graphql is
 * dynamic-imported so this module carries no static import of the heavy
 * runtime; the ke/graphql types are referenced inline.
 */

import type { LazyStore, QueryFacade } from "./types.js";

/**
 * Build the query facade over a lazy store.
 *
 * @param store - The lazy store to query through.
 * @returns The `{ graphql, sparql }` facade.
 */
export function createQueryFacade(store: LazyStore): QueryFacade {
  return {
    async graphql(
      document: string,
      variables?: Record<string, unknown> | null,
    ): Promise<import("graphql").ExecutionResult> {
      const session = await store.get();
      const { executeLocal } = await import("@canonical/ke-graphql");
      const result = await executeLocal({
        schema: session.schema,
        source: document,
        variableValues: variables ?? undefined,
        contextValue: session.createContext(session.store),
      });
      // Our packs compile without @defer/@stream, so this is always a plain
      // ExecutionResult (never an incremental stream).
      return result as import("graphql").ExecutionResult;
    },

    async sparql(text: string): Promise<import("@canonical/ke").QueryResult> {
      const session = await store.get();
      return session.store.query(text as never) as Promise<
        import("@canonical/ke").QueryResult
      >;
    },
  };
}
