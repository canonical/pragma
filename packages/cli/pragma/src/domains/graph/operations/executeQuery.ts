import type { QueryResult, Store } from "@canonical/ke";
import { PragmaError } from "#error";
import { buildQuery } from "../../shared/buildQuery.js";

/**
 * Executes a raw SPARQL query against the ke store.
 *
 * @note Queries ke store
 *
 * @param store - The ke store to query.
 * @param sparql - A raw SPARQL query string.
 * @returns The query result (select bindings, ask boolean, or construct triples).
 * @throws PragmaError with code `STORE_ERROR` on query failure.
 */
export default async function executeQuery(
  store: Store,
  sparql: string,
): Promise<QueryResult> {
  try {
    return await store.query(buildQuery(sparql));
  } catch (error) {
    throw new PragmaError({
      code: "STORE_ERROR",
      message: `Failed to execute query. ${error instanceof Error ? error.message : String(error)}`,
      recovery: {
        message: "Check your SPARQL syntax and see loaded namespaces.",
        cli: "pragma ontology list",
        mcp: { tool: "ontology_list" },
      },
    });
  }
}
