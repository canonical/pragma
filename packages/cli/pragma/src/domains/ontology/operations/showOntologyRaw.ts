import type { Store, Triple } from "@canonical/ke";
import { PragmaError } from "#error";
import { buildQuery } from "../../shared/buildQuery.js";
import resolvePrefix from "../helpers/resolvePrefix.js";

/**
 * Retrieves raw triples for a namespace via a SPARQL CONSTRUCT query.
 *
 * Returns all triples where the subject or predicate starts with the
 * resolved namespace URI.
 *
 * @note Queries ke store
 *
 * @param store - The ke store to query.
 * @param prefixOrUri - A short prefix or full namespace URI.
 * @returns An array of raw {@link Triple} objects.
 * @throws PragmaError.invalidInput if the prefix or namespace is unknown.
 * @throws PragmaError.notFound if the namespace yields no triples.
 */
export default async function showOntologyRaw(
  store: Store,
  prefixOrUri: string,
): Promise<Triple[]> {
  const { namespace } = resolvePrefix(prefixOrUri, store.prefixes);

  const result = await store.query(
    buildQuery(`
      CONSTRUCT { ?s ?p ?o }
      WHERE {
        ?s ?p ?o .
        FILTER(
          STRSTARTS(STR(?s), "${namespace}") ||
          STRSTARTS(STR(?p), "${namespace}")
        )
      }
    `),
  );

  if (result.type !== "construct" || result.triples.length === 0) {
    throw PragmaError.notFound("ontology", prefixOrUri, {
      recovery: {
        message: "List loaded ontologies.",
        cli: "pragma ontology list",
        mcp: { tool: "ontology_list" },
      },
    });
  }

  return result.triples;
}
