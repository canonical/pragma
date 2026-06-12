/**
 * @canonical/ke-graphql — OWL → GraphQL compiler for the ke triple store.
 *
 * The root export is schema + resolvers + local execution only (KG.22):
 * no server, no HTTP, no GraphiQL. The fetch handler lives behind the
 * `@canonical/ke-graphql/http` subpath export.
 *
 * @example
 * ```ts
 * import { createStore } from "@canonical/ke";
 * import { createSchemaPlugin, type SchemaPluginApi } from "@canonical/ke-graphql";
 *
 * const graphql = createSchemaPlugin();
 * const store = await createStore({
 *   sources: ["./ontology.ttl", "./data/*.ttl"],
 *   prefixes: { ds: "https://ds.canonical.com/" },
 *   plugins: [graphql],
 * });
 * const { schema, createContext } = store.api<SchemaPluginApi>("ke-graphql")!;
 * ```
 *
 * @module ke-graphql
 */

export * from "./lib/index.js";
