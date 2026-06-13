/**
 * The shared leaf domain: the dependency-free surface the other domains build
 * on — standard vocabulary IRIs, the XSD → GraphQL scalar table, reserved
 * GraphQL names, the Relay connection arguments, the local-name helper, and
 * every IR/value/context type contract of the seven-pass pipeline. It imports
 * only `graphql`, `dataloader`, and `@canonical/ke` (types), never another
 * domain, so loaders, resolvers, and the TBox can depend on it without a cycle.
 *
 * @module shared
 */

export {
  CONNECTION_ARGS,
  OWL,
  RDF,
  RDF_TYPE,
  RDFS,
  RDFS_LABEL,
  RESERVED_FIELD_NAMES,
  RESERVED_TYPE_NAMES,
  SH,
  SKOS,
  STANDARD_NAMESPACES,
  XSD,
  XSD_SCALARS,
} from "./constants.js";
export { default as getLocalName } from "./getLocalName.js";
export type * from "./types.js";
