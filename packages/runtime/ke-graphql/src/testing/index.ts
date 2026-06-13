/**
 * Internal test-support surface: the shared TTL fixtures the compiler,
 * pipeline, execution, and handler tests compile against. Reachable through
 * the `#testing` subpath alias. Excluded from the build — nothing in dist
 * imports it, and it is never published.
 *
 * @module testing
 */

export {
  BLANK_NODES_TTL,
  DOMAINLESS_TTL,
  DS_REALISTIC_TTL,
  EDGE_CASES_TTL,
  INHERITANCE_TTL,
  INVERSE_TTL,
  MINIMAL_TTL,
  PREFIXES,
  SHACL_TTL,
} from "./fixtures.js";
