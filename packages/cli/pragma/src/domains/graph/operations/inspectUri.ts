import type { Store } from "@canonical/ke";
import { PragmaError } from "#error";
import { buildQuery } from "../../shared/buildQuery.js";
import type {
  InspectResult,
  PredicateGroup,
} from "../../shared/types/index.js";
import resolveUri from "../helpers/resolveUri.js";

/**
 * Inspects a URI by retrieving all triples where it is the subject,
 * grouped by predicate.
 *
 * Resolves prefixed URIs (e.g. `ds:Button`) to full URIs before querying.
 *
 * @note Queries ke store
 *
 * @param store - The ke store to query.
 * @param uri - A full or prefixed URI to inspect.
 * @returns An {@link InspectResult} with the resolved URI and predicate groups.
 * @throws PragmaError.notFound if the URI has no triples in the store.
 */
export default async function inspectUri(
  store: Store,
  uri: string,
): Promise<InspectResult> {
  const resolvedUri = resolveUri(uri, store.prefixes);

  const result = await store.query(
    buildQuery(`
      SELECT ?predicate ?object
      WHERE {
        <${resolvedUri}> ?predicate ?object .
      }
      ORDER BY ?predicate ?object
    `),
  );

  if (result.type !== "select" || result.bindings.length === 0) {
    throw PragmaError.notFound("entity", uri, {
      recovery: {
        message:
          "Check the URI is correct and run a SPARQL query to find valid URIs.",
        cli: "pragma graph query 'SELECT ?s WHERE { ?s ?p ?o } LIMIT 10'",
        mcp: { tool: "graph_query" },
      },
    });
  }

  const groupMap = new Map<string, string[]>();
  for (const b of result.bindings) {
    const predicate = b.predicate ?? "";
    const object = b.object ?? "";
    const existing = groupMap.get(predicate) ?? [];
    existing.push(object);
    groupMap.set(predicate, existing);
  }

  const groups: PredicateGroup[] = [...groupMap.entries()].map(
    ([predicate, objects]) => ({ predicate, objects }),
  );

  return { uri: resolvedUri, groups };
}
