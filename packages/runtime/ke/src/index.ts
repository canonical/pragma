/**
 * @canonical/ke — Headless triple store runtime
 *
 * @example
 * ```ts
 * import { createStore, sparql } from "@canonical/ke";
 *
 * const store = await createStore({
 *   sources: ["./ontology.ttl"],
 *   prefixes: { schema: "http://schema.org/" },
 * });
 *
 * const result = await store.query(sparql`SELECT ?name WHERE { ?s schema:name ?name }`);
 * ```
 */

export * from "./lib/index.js";
