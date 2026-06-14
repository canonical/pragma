/**
 * The public library surface of @canonical/ke-graphql, composed from the
 * domain barrels. This layer exposes the hardening domain and the resolution
 * layer (URI prefixing and the Relay connection helpers); the compiler, ke
 * plugin, and execution helpers are layered on top.
 *
 * @module lib
 */

export { toFull, toPrefixed } from "./dataloader/index.js";
export {
  clampConnectionArgs,
  createDepthLimitRule,
  DEFAULT_MAX_QUERY_DEPTH,
  DEFAULT_PAGE_SIZE,
  DEFAULT_PROCESS_CACHE_SIZE,
  isSafeIri,
  MAX_PAGE_SIZE,
  maskError,
} from "./hardening/index.js";
export {
  type Connection,
  type ConnectionArgs,
  connectionFromPage,
  emptyConnection,
  fromBase64,
  isEntity,
  paginateUriWindow,
  toBase64,
  toConnection,
  type UriPage,
  unwrapEntities,
} from "./resolver/index.js";
