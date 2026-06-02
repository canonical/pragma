/**
 * Lightweight name queries for each domain.
 *
 * Used by suggestNames to fetch candidate lists when a lookup fails.
 * Each query returns only names (no detail) for minimal overhead.
 */

import type { SPARQL, Store } from "@canonical/ke";
import { buildQuery } from "../buildQuery.js";
import { P } from "../prefixes.js";

type Domain = "block" | "token" | "modifier" | "standard" | "ontology";

const QUERIES: Record<Domain, SPARQL<string>> = {
  block: buildQuery(`
    SELECT DISTINCT ?name WHERE {
      VALUES ?type { ${P.ds}Component ${P.ds}Pattern ${P.ds}Layout ${P.ds}Subcomponent }
      ?s a ?type ; ${P.ds}name ?name .
    }
  `),
  token: buildQuery(`
    SELECT DISTINCT ?name WHERE {
      ?s a ${P.ds}Token ; ${P.ds}tokenId ?name .
    }
  `),
  modifier: buildQuery(`
    SELECT DISTINCT ?name WHERE {
      ?s a ${P.ds}ModifierFamily ; ${P.ds}name ?name .
    }
  `),
  standard: buildQuery(`
    SELECT DISTINCT ?name WHERE {
      ?s a ${P.cs}CodeStandard ; ${P.cs}name ?name .
    }
  `),
  ontology: buildQuery(`
    SELECT DISTINCT ?name WHERE {
      ?s a owl:Ontology .
      BIND(STR(?s) AS ?name)
    }
  `),
};

/**
 * Fetch all entity names for a domain from the store.
 *
 * @note - This function is impure — it queries the ke store.
 */
export default async function listDomainNames(
  store: Store,
  domain: Domain,
): Promise<string[]> {
  const query = QUERIES[domain];
  const result = await store.query(query);
  if (result.type !== "select") return [];
  return result.bindings
    .map((b) => b.name)
    .filter((n): n is string => typeof n === "string" && n !== "");
}

export type { Domain };
