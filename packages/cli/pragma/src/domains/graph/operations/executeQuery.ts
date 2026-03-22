/**
 * Execute a raw SPARQL query against the store.
 *
 * @throws PragmaError with code STORE_ERROR on query failure.
 */

import type { QueryResult, Store } from "@canonical/ke";
import { PragmaError } from "#error";
import { buildQuery } from "../../shared/buildQuery.js";

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
