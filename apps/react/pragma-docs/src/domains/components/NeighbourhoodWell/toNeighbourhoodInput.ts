/**
 * Fragment data → the pure layout's input. All policy about WHICH nodes
 * exist and where they may link lives here (the RELATION_SPECS table
 * supplies the grammar); `buildNeighbourhood` only does geometry.
 *
 * Linking posture: a neighbour gets an href only when its relation row is
 * `linkable` — the entities whose canonical homes exist today (components
 * via `/components/:uri`, ontology terms via `/definitions/:term`, the
 * interim D31 map). Everything else renders as an inert chip: an unlinked
 * mention is honest; a dead link is not. The class (rdf:type) node's
 * definitions address derives from the class's own `namespace` field —
 * data the fragment carries, never a hardcoded namespace table (the
 * uris.ts doctrine); when the derivation fails the node stays, inert.
 */

import {
  detectKindInUri,
  type Kind,
  resolveChipHref,
} from "#lib/Chip/index.js";
import type { NeighbourhoodWell_component$data } from "#relay/__generated__/NeighbourhoodWell_component.graphql.js";
import { RELATION_SPECS, type RelationSpec } from "./constants.js";
import type { NeighbourhoodInput, NeighbourInput } from "./types.js";

/** The extraction's product: layout input plus the honesty payloads. */
export interface NeighbourhoodExtract {
  readonly input: NeighbourhoodInput;
  /** Predicates whose connection has more pages than the well shows. */
  readonly truncated: readonly string[];
}

const specByKey = new Map(RELATION_SPECS.map((spec) => [spec.key, spec]));

const getSpec = (key: RelationSpec["key"]): RelationSpec => {
  const spec = specByKey.get(key);
  if (spec === undefined) {
    throw new Error(`NeighbourhoodWell: no relation spec for "${key}"`);
  }
  return spec;
};

/** A connection's edge list, defensively: a store that never captured the
 * field yields no neighbours rather than a crash. */
interface EntityConnection {
  readonly edges: readonly ({
    readonly node: {
      readonly uri: string;
      readonly name?: string | null | undefined;
    };
  } | null)[];
  readonly pageInfo: { readonly hasNextPage: boolean };
}

/**
 * Kinds whose landing route EXISTS today (`routeQueries.tests.ts` pins the
 * set; `ROUTE_PREFIX_BY_KIND` anticipates the rest). A linkable relation
 * delivering, say, a pattern still renders inert until `/patterns` lives.
 */
const LIVE_ROUTE_KINDS: ReadonlySet<Kind> = new Set([
  "component",
  "term",
  "standard",
]);

const toNeighbours = (
  connection: EntityConnection | null | undefined,
  spec: RelationSpec,
): NeighbourInput[] =>
  (connection?.edges ?? [])
    .filter((edge) => edge !== null)
    .map((edge) => {
      // The URI's own kind segment outranks the relation's default: a
      // `subcomponents` edge can legally deliver a pattern, and the shape
      // channel must not lie about it.
      const kind = detectKindInUri(edge.node.uri) ?? spec.kind;
      return {
        uri: edge.node.uri,
        label: edge.node.name ?? edge.node.uri,
        spec,
        kind,
        href:
          spec.linkable && LIVE_ROUTE_KINDS.has(kind)
            ? resolveChipHref(edge.node.uri, kind)
            : undefined,
      };
    });

/**
 * The class node's prefixed definitions term (`ds:Component`).
 * `OntologyClass.namespace` carries the PREFIX (`"ds"` — verified live,
 * unlike `Ontology.namespace`, which is the full IRI), so the term is the
 * prefix joined to the class IRI's local name. `undefined` when either
 * half is underivable, and the caller keeps the node inert.
 */
export const deriveClassTerm = (
  classUri: string,
  prefix: string,
): string | undefined => {
  if (prefix.length === 0) return undefined;
  if (!classUri.includes("://")) {
    // Already compact: trust an existing prefixed form, refuse bare names.
    return classUri.includes(":") ? classUri : undefined;
  }
  const localName = classUri.split(/[#/]/).at(-1);
  if (localName === undefined || localName.length === 0) return undefined;
  return `${prefix}:${localName}`;
};

/**
 * Extracts the well's input from the fragment payload. Neighbours are
 * unique by URI (first relation wins — one entity, one node, one edge);
 * the connection caps surface as `truncated` predicates so the partial
 * state renders honestly (AX.8) instead of silently reading as complete.
 */
export const toNeighbourhoodInput = (
  data: NeighbourhoodWell_component$data,
): NeighbourhoodExtract => {
  const gathered: NeighbourInput[] = [];
  const truncated: string[] = [];

  const gather = (
    connection: EntityConnection | null | undefined,
    key: RelationSpec["key"],
  ): void => {
    const spec = getSpec(key);
    gathered.push(...toNeighbours(connection, spec));
    if (connection?.pageInfo.hasNextPage === true) {
      truncated.push(spec.predicate);
    }
  };

  const type = data._meta?.type;
  if (type !== undefined && type !== null) {
    const term = deriveClassTerm(type.uri, type.namespace);
    gathered.push({
      uri: term ?? type.uri,
      label: type.label ?? type.uri,
      spec: getSpec("type"),
      href: term === undefined ? undefined : resolveChipHref(term, "term"),
    });
  }
  if (data.tier !== null && data.tier !== undefined) {
    gathered.push({
      uri: data.tier.uri,
      label: data.tier.name ?? data.tier.uri,
      spec: getSpec("tier"),
    });
  }
  gather(data.inheritsFroms, "inheritsFrom");
  gather(data.specializedBies, "specializedBy");
  gather(data.variants, "variant");
  gather(data.variantOfs, "variantOf");
  gather(data.modifierFamilies, "modifierFamily");
  gather(data.subcomponents, "subcomponent");

  const seen = new Set<string>([data.uri]);
  const neighbours = gathered.filter((neighbour) => {
    if (seen.has(neighbour.uri)) return false;
    seen.add(neighbour.uri);
    return true;
  });

  return {
    input: {
      centreUri: data.uri,
      centreLabel: data.name ?? data.uri,
      neighbours,
    },
    truncated,
  };
};
