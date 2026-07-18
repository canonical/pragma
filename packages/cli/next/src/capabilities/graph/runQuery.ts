/**
 * The `graph query` run body (lazily imported, off the fast path).
 *
 * Delegates to the `rt.query.sparql` facade (which the dispatcher has already
 * booted the store for) and translates a query failure into the v2 error
 * kernel. The old shell raised `STORE_ERROR`; v2 has no such code, so a SPARQL
 * syntax/execution failure becomes INVALID_INPUT (exit 2) with a recovery
 * pointer to the loaded namespaces. A `PragmaError` that already carries a
 * precise code (e.g. STORE_UNAVAILABLE from a cold boot) is re-thrown unchanged.
 */

import type { QueryResult } from "@canonical/ke";
import { PragmaError } from "../../kernel/error/PragmaError.js";
import type { PragmaRuntime } from "../../kernel/runtime/types.js";

/**
 * Execute a raw SPARQL query against the booted store.
 *
 * @param rt - The per-invocation runtime (its store is booted by the dispatcher).
 * @param sparql - The raw SPARQL query text.
 * @returns The select bindings / ask boolean / construct triples.
 * @throws PragmaError INVALID_INPUT on a query failure (with a recovery hint).
 */
export async function runQuery(
  rt: PragmaRuntime,
  sparql: string,
): Promise<QueryResult> {
  try {
    return await rt.query.sparql(sparql);
  } catch (error) {
    if (error instanceof PragmaError) throw error;
    // Keep the parser's own message — the WHY (bad token, line/column, an
    // unknown prefix) — instead of an opaque "(query)" placeholder.
    const detail = (
      error instanceof Error ? error.message : String(error)
    ).trim();
    throw new PragmaError({
      code: "INVALID_INPUT",
      message: detail
        ? `Invalid SPARQL query: ${detail}`
        : "Invalid SPARQL query.",
      recovery: {
        message: "Check your SPARQL syntax and the loaded namespaces.",
        cli: "pragma ontology list",
        mcp: { tool: "ontology_list" },
      },
    });
  }
}
