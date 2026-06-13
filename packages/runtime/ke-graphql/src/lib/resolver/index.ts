/**
 * The resolver domain: literal coercion, the Relay connection/pagination
 * helpers, the eight resolver templates the compiler instantiates per field,
 * and the value shapes they exchange.
 *
 * @module resolver
 */

export { coerce, mapXsdToScalar } from "./coerce.js";
export {
  connectionFromPage,
  emptyConnection,
  fromBase64,
  isEntity,
  paginateUriWindow,
  toBase64,
  toConnection,
  unwrapEntities,
} from "./connection.js";
export {
  createDatatypeListResolver,
  createDatatypeResolver,
  createEmbeddedListResolver,
  createEmbeddedSingularResolver,
  createInverseResolver,
  createObjectListResolver,
  createObjectSingularResolver,
} from "./templates.js";
export type * from "./types.js";
