/**
 * The `graph query` run body (lazily imported, off the fast path).
 *
 * Delegates to the `rt.query.sparql` facade (which the dispatcher has already
 * booted the store for) and translates a query failure into the v2 error
 * kernel. The old shell raised `STORE_ERROR`; v2 has no such code, so a SPARQL
 * syntax/execution failure becomes INVALID_INPUT (exit 2) with a recovery
 * pointer to the loaded namespaces. A `PragmaError` that already carries a
 * precise code (e.g. STORE_UNAVAILABLE from a cold boot) is re-thrown unchanged.
 *
 * Between the caller and the parser sits {@link queryText}: pragma's own names
 * are handed out in a prefixed form the SPARQL grammar cannot carry
 * (`ds:global.component.button`, `dt:s4/web/--color-text`), so they are
 * expanded to the IRIs they stand for BEFORE the parser sees them, and a parse
 * failure is reported at the position in the text the CALLER wrote rather than
 * in the prefix-prepended text only the store ever sees.
 */

import type { QueryResult } from "@canonical/ke";
import { cliRecovery, PragmaError } from "../../kernel/error/index.js";
import type { PragmaRuntime } from "../../kernel/runtime/index.js";
import { expandPrefixedNames, trimQueryError } from "./queryText.js";

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
  // The store's own prefix map: what the facade prepends to the query (one
  // PREFIX line each, which is the offset a reported line number carries), and
  // what a prefixed name in the caller's text will be resolved against.
  const { prefixes } = await rt.store.get();
  const query = expandPrefixedNames(sparql, prefixes);
  try {
    return await rt.query.sparql(query.text);
  } catch (error) {
    if (error instanceof PragmaError) throw error;
    // Keep the parser's own message — the WHY (bad token, an unknown prefix) —
    // instead of an opaque "(query)" placeholder, but positioned in the
    // caller's text and without the Unicode-range dump.
    const raw = (error instanceof Error ? error.message : String(error)).trim();
    const detail = raw
      ? trimQueryError(raw, Object.keys(prefixes).length, query.rewritten)
      : "";
    throw new PragmaError({
      code: "INVALID_INPUT",
      message: detail
        ? `Invalid SPARQL query: ${detail}`
        : "Invalid SPARQL query.",
      recovery: cliRecovery(
        "ontology list",
        "Check your SPARQL syntax and the loaded namespaces.",
        {
          tool: "ontology_list",
        },
      ),
    });
  }
}
