/**
 * The GraphQL lookup path — what a `source: "graphql"` pack story executes
 * once SPARQL has resolved its name to an entity IRI.
 *
 * The three files here are one function split for testability, not three
 * services: the naming rules derive schema field names from the RDF properties
 * a pack declares, the document generator turns a lookup declaration plus
 * those names into the single query to run, and the fetcher executes it and
 * unwraps the Relay envelope into the same flat entity shape the SPARQL path
 * produces. Only the last of those is something a caller does.
 *
 * So the barrel is one export, and the narrowness is the point. The document
 * generator's contract is that the entity IRI travels as a query VARIABLE and
 * never as interpolated text, and that a document is composed only from
 * validated pack terms and compiled schema names. Handing out the generator on
 * its own would hand out a way to build a document and execute it by some
 * other route; handing out the fetcher hands out the guarantee with it.
 */

export { fetchGraphqlLookup } from "./fetchGraphqlLookup.js";
