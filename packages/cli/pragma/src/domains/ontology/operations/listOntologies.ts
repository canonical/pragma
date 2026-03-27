import type { Store } from "@canonical/ke";
import { buildQuery } from "../../shared/buildQuery.js";
import { P } from "../../shared/prefixes.js";
import type { OntologySummary } from "../../shared/types/index.js";
import findNamespace from "../helpers/findNamespace.js";

/** Check whether a URI belongs to the anatomy namespace. */
function isAnatomyTerm(uri: string): boolean {
  return uri.toLowerCase().includes("anatomy");
}

/**
 * List all loaded ontology namespaces with their class, property, and anatomy counts.
 *
 * Discovers namespaces by querying for `owl:Class` and
 * `owl:ObjectProperty`/`owl:DatatypeProperty` definitions, then maps
 * namespace URIs back to prefixes via `store.prefixes`.
 *
 * @param store - The ke store to query.
 * @returns An array of {@link OntologySummary} sorted alphabetically by prefix.
 *
 * @note Queries ke store
 */
export default async function listOntologies(
  store: Store,
): Promise<OntologySummary[]> {
  const classResult = await store.query(
    buildQuery(`
      SELECT ?class
      WHERE { ?class a ${P.owl}Class }
    `),
  );

  const propResult = await store.query(
    buildQuery(`
      SELECT ?prop ?propType
      WHERE {
        ?prop a ?propType .
        VALUES ?propType { ${P.owl}ObjectProperty ${P.owl}DatatypeProperty }
      }
    `),
  );

  const prefixEntries = Object.entries(store.prefixes);
  const classCounts = new Map<string, Set<string>>();
  const propCounts = new Map<string, Set<string>>();
  const anatomyCounts = new Map<string, Set<string>>();

  if (classResult.type === "select") {
    for (const b of classResult.bindings) {
      const uri = b.class ?? "";
      const ns = findNamespace(uri, prefixEntries);
      if (ns) {
        const set = classCounts.get(ns.prefix) ?? new Set();
        set.add(uri);
        classCounts.set(ns.prefix, set);

        if (isAnatomyTerm(uri)) {
          const anatomySet = anatomyCounts.get(ns.prefix) ?? new Set();
          anatomySet.add(uri);
          anatomyCounts.set(ns.prefix, anatomySet);
        }
      }
    }
  }

  if (propResult.type === "select") {
    for (const b of propResult.bindings) {
      const uri = b.prop ?? "";
      const ns = findNamespace(uri, prefixEntries);
      if (ns) {
        const set = propCounts.get(ns.prefix) ?? new Set();
        set.add(uri);
        propCounts.set(ns.prefix, set);

        if (isAnatomyTerm(uri)) {
          const anatomySet = anatomyCounts.get(ns.prefix) ?? new Set();
          anatomySet.add(uri);
          anatomyCounts.set(ns.prefix, anatomySet);
        }
      }
    }
  }

  const allPrefixes = new Set([
    ...classCounts.keys(),
    ...propCounts.keys(),
    ...anatomyCounts.keys(),
  ]);

  return [...allPrefixes].sort().map((prefix) => {
    const namespace = prefixEntries.find(([p]) => p === prefix)?.[1] ?? "";
    return {
      prefix,
      namespace,
      classCount: classCounts.get(prefix)?.size ?? 0,
      propertyCount: propCounts.get(prefix)?.size ?? 0,
      anatomyCount: anatomyCounts.get(prefix)?.size ?? 0,
    };
  });
}
