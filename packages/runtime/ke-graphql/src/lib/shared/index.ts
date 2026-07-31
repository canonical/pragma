/**
 * The shared leaf domain: the dependency-free surface the other domains build
 * on — standard vocabulary IRIs, the XSD → GraphQL scalar table, the reserved
 * type names, the Relay connection and language arguments, the local-name helper, and
 * every IR/value/context type contract of the seven-pass pipeline. It imports
 * only `graphql`, `dataloader`, and `@canonical/ke` (types), never another
 * domain, so loaders, resolvers, and the TBox can depend on it without a cycle.
 *
 * @module shared
 */

export {
  COMMENT_LOCAL_NAMES,
  CONNECTION_ARGS,
  DEFAULT_LANG,
  DEFINITION_LOCAL_NAMES,
  LABEL_LOCAL_NAMES,
  LANG_ARGS,
  OWL,
  RDF,
  RDF_TYPE,
  RDFS,
  RDFS_COMMENT,
  RDFS_LABEL,
  RESERVED_TYPE_NAMES,
  SH,
  SKOS,
  SKOS_DEFINITION,
  SKOS_PREF_LABEL,
  STANDARD_NAMESPACES,
  XSD,
  XSD_SCALARS,
} from "./constants.js";
export { default as getLocalName } from "./getLocalName.js";
export type * from "./types.js";
