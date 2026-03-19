/**
 * List loaded ontology namespaces with class/property counts.
 *
 * Discovers namespaces by looking at owl:Class and owl:ObjectProperty /
 * owl:DatatypeProperty definitions, then maps namespace URIs to prefixes
 * via `store.prefixes`.
 */

import type { Store } from "@canonical/ke";
import { buildQuery } from "../shared/buildQuery.js";
import type { OntologySummary } from "../shared/types.js";
import findNamespace from "./findNamespace.js";

export default async function listOntologies(
  store: Store,
): Promise<OntologySummary[]> {
  const classResult = await store.query(
    buildQuery(`
      SELECT ?class
      WHERE { ?class a owl:Class }
    `),
  );

  const propResult = await store.query(
    buildQuery(`
      SELECT ?prop ?propType
      WHERE {
        ?prop a ?propType .
        VALUES ?propType { owl:ObjectProperty owl:DatatypeProperty }
      }
    `),
  );

  const prefixEntries = Object.entries(store.prefixes);
  const classCounts = new Map<string, Set<string>>();
  const propCounts = new Map<string, Set<string>>();

  if (classResult.type === "select") {
    for (const b of classResult.bindings) {
      const uri = b.class ?? "";
      const ns = findNamespace(uri, prefixEntries);
      if (ns) {
        const set = classCounts.get(ns.prefix) ?? new Set();
        set.add(uri);
        classCounts.set(ns.prefix, set);
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
      }
    }
  }

  const allPrefixes = new Set([...classCounts.keys(), ...propCounts.keys()]);

  return [...allPrefixes].sort().map((prefix) => {
    const namespace = prefixEntries.find(([p]) => p === prefix)?.[1] ?? "";
    return {
      prefix,
      namespace,
      classCount: classCounts.get(prefix)?.size ?? 0,
      propertyCount: propCounts.get(prefix)?.size ?? 0,
    };
  });
}
