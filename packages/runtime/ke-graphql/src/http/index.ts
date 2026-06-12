/**
 * @canonical/ke-graphql/http — the fetch-compatible GraphQL handler and
 * GraphiQL (KG.12/KG.22). Kept out of the root export so that consumers of
 * the schema (SSR, static extraction, tests) never load HTTP code.
 *
 * @module http
 */

export {
  default as createGraphQLHandler,
  type GraphQLHandlerOptions,
  type OperationEvent,
} from "./createGraphQLHandler.js";
export { default as graphiqlHtml } from "./graphiqlHtml.js";
