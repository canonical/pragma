// =============================================================================
// Inverse loader (§5.3). Batches reverse-assertion lookups. Keys are encoded
// as "<propertyUri> <objectFullUri>" strings (DataLoader cache keys must be
// primitives without a custom cacheKeyFn).
// =============================================================================

import DataLoader from "dataloader";
import type { MappedIR, QueryFn } from "#shared";
import { toFull } from "./uris.js";

/** Encode an inverse-loader cache key from its property and object parts. */
const encodeInverseKey = (property: string, object: string): string =>
  `${property} ${object}`;

/**
 * Create the inverse DataLoader: batches "<propertyUri> <objectUri>" keys
 * into one SELECT over reverse assertions and yields the subject URIs
 * pointing at each object. An optional cacheMap shares the cache across
 * contexts ("process" mode); failed batches evict their keys so errors are
 * never memoized.
 *
 * @note Impure — the returned loader executes SPARQL queries against the
 * store.
 */
export default function createInverseLoader(
  query: QueryFn,
  mapped: MappedIR,
  cacheMap?: Map<string, Promise<string[]>>,
): DataLoader<string, string[]> {
  const loader: DataLoader<string, string[]> = new DataLoader(
    (keys) =>
      batch(keys).catch((error) => {
        for (const key of keys) {
          loader.clear(key);
        }
        throw error;
      }),
    cacheMap ? { cacheMap } : undefined,
  );
  const batch = async (keys: ReadonlyArray<string>) => {
    const pairs: string[] = [];
    for (const key of keys) {
      const space = key.indexOf(" ");
      const property = key.slice(0, space);
      const object = key.slice(space + 1);
      // EntityValue.uri carries the prefixed form; expand for SPARQL.
      const full = toFull(object, mapped.namespaces) ?? object;
      pairs.push(`(<${property}> <${full}>)`);
    }
    const result = await query(
      `SELECT ?property ?object ?subject WHERE {
         VALUES (?property ?object) { ${pairs.join(" ")} }
         ?subject ?property ?object .
         FILTER(isIRI(?subject))
       }
       ORDER BY ?subject`,
    );
    const byKey = new Map<string, string[]>();
    if (result.type === "select") {
      for (const row of result.termBindings) {
        const property = row.property;
        const object = row.object;
        const subject = row.subject;
        if (
          property?.termType !== "NamedNode" ||
          object?.termType !== "NamedNode" ||
          subject?.termType !== "NamedNode"
        ) {
          continue;
        }
        const key = encodeInverseKey(property.value, object.value);
        const list = byKey.get(key) ?? [];
        list.push(subject.value);
        byKey.set(key, list);
      }
    }
    return keys.map((key) => {
      const space = key.indexOf(" ");
      const property = key.slice(0, space);
      const object = key.slice(space + 1);
      const full = toFull(object, mapped.namespaces) ?? object;
      return byKey.get(encodeInverseKey(property, full)) ?? [];
    });
  };

  return loader;
}
