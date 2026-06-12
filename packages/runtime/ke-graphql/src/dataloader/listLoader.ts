// =============================================================================
// List loader (§5.3). Batches instance-of queries per class with a per-class
// name predicate (paired VALUES) so the default name-sort works across
// ontologies. Rows are deduplicated per instance (multi-valued names would
// otherwise duplicate rows).
// =============================================================================

import DataLoader from "dataloader";
import type { MappedIR, QueryFn } from "../compiler/types.js";
import { localName, RDF_TYPE, RDFS_LABEL } from "../compiler/vocab.js";

/**
 * Resolve the name predicate for a class: a declared property in the class's
 * own namespace with local name "name", else rdfs:label.
 */
export const namePredicateFor = (
  mapped: MappedIR,
  classUri: string,
): string => {
  const node = mapped.ir.classes.get(classUri);
  if (node) {
    for (const propertyUri of node.allProperties) {
      if (localName(propertyUri) === "name") {
        return propertyUri;
      }
    }
  }
  return RDFS_LABEL;
};

export const createListLoader = (
  query: QueryFn,
  mapped: MappedIR,
): DataLoader<string, string[]> =>
  new DataLoader(async (classUris) => {
    const pairs = classUris
      .map((uri) => `(<${uri}> <${namePredicateFor(mapped, uri)}>)`)
      .join(" ");
    const result = await query(
      `SELECT ?class ?instance ?name WHERE {
         VALUES (?class ?nameProp) { ${pairs} }
         ?instance <${RDF_TYPE}> ?class .
         FILTER(isIRI(?instance))
         OPTIONAL { ?instance ?nameProp ?name }
       }
       ORDER BY LCASE(STR(?name)) ?instance`,
    );
    const byClass = new Map<string, string[]>();
    if (result.type === "select") {
      const seen = new Set<string>();
      for (const row of result.termBindings) {
        const classUri = row.class;
        const instance = row.instance;
        if (
          classUri?.termType !== "NamedNode" ||
          instance?.termType !== "NamedNode"
        ) {
          continue;
        }
        const key = `${classUri.value} ${instance.value}`;
        if (seen.has(key)) {
          continue; // multi-valued names duplicate rows
        }
        seen.add(key);
        const list = byClass.get(classUri.value) ?? [];
        list.push(instance.value);
        byClass.set(classUri.value, list);
      }
    }
    return classUris.map((uri) => byClass.get(uri) ?? []);
  });
