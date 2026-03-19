/**
 * Brand an internally-constructed query string as SPARQL.
 *
 * The `sparql` tagged template cannot interpolate raw SPARQL fragments
 * (it would escape them as string literals). Operations that include
 * dynamic filter clauses construct the query as a plain string and
 * brand it via this helper.
 *
 * Safe because filter content is generated internally, never from
 * user input. User-supplied values (e.g., component names) are
 * escaped via `escapeSparqlValue()` before interpolation.
 */

import type { SPARQL } from "@canonical/ke";

export function buildQuery(query: string): SPARQL<string> {
  return query as SPARQL<string>;
}
