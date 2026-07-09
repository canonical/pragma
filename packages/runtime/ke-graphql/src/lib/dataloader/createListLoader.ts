// =============================================================================
// List loader. Batches instance-of queries per class with a per-class
// name predicate (paired VALUES) so the default name-sort works across
// ontologies. Rows are deduplicated per instance (multi-valued names would
// otherwise duplicate rows).
// =============================================================================

import DataLoader from "dataloader";
import {
  getLocalName,
  type MappedIR,
  type QueryFn,
  RDF_TYPE,
  RDFS_LABEL,
} from "../shared/index.js";

/**
 * Resolve the name predicate for a class: a declared property in the class's
 * own namespace with local name "name", else rdfs:label.
 */
const resolveNamePredicate = (mapped: MappedIR, classUri: string): string => {
  const node = mapped.ir.classes.get(classUri);
  if (node) {
    for (const propertyUri of node.allProperties) {
      if (getLocalName(propertyUri) === "name") {
        return propertyUri;
      }
    }
  }
  return RDFS_LABEL;
};

/**
 * Create the class-listing DataLoader: batches class URIs into one SELECT
 * and yields each class's named instance URIs, name-sorted via the class's
 * name predicate. An optional cacheMap shares the cache across contexts
 * ("process" mode); failed batches evict their keys so errors are never
 * memoized.
 *
 * @note Impure — the returned loader executes SPARQL queries against the
 * store.
 */
export default function createListLoader(
  query: QueryFn,
  mapped: MappedIR,
  cacheMap?: Map<string, Promise<string[]>>,
): DataLoader<string, string[]> {
  const loader: DataLoader<string, string[]> = new DataLoader(
    (classUris) =>
      batch(classUris).catch((error) => {
        for (const uri of classUris) {
          loader.clear(uri);
        }
        throw error;
      }),
    cacheMap ? { cacheMap } : undefined,
  );
  const batch = async (classUris: ReadonlyArray<string>) => {
    const pairs = classUris
      .map((uri) => `(<${uri}> <${resolveNamePredicate(mapped, uri)}>)`)
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
  };

  return loader;
}
