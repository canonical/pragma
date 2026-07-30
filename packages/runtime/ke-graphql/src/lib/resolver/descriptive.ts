// =============================================================================
// Generic descriptive fields: the predicate selection behind `label`,
// `comment`, and `definition`.
//
// Every non-embeddable node carries all three so a lens can render any
// provider's data without an inline fragment on a concrete type. Each field
// resolves through a FIXED chain decided once, at compile time:
//
//   1. the canonical rdfs/skos predicates, in the order given — the contract's
//      own currency, which must win whenever the instance asserts one;
//   2. then a fallback tier of the class's own String properties, matched by
//      lower-cased OWL LOCAL NAME so that a provider whose instances carry no
//      rdfs:label still renders human text.
//
// Local-name matching keeps this package provider-neutral: no ontology-specific
// predicate IRI appears here, and ds:name / cs:name / any future foo:name all
// resolve identically.
// =============================================================================

import type { GraphQLFieldResolver } from "graphql";
import {
  type CompilerContext,
  type EntityValue,
  getLocalName,
  type OntologyIR,
  type PropertyNode,
} from "../shared/index.js";

/**
 * Is this property a plain String datatype? Only String-valued predicates can
 * back a descriptive field — an Int or an object range would need coercion the
 * generic field deliberately does not perform.
 */
const isStringScalar = (property: PropertyNode | undefined): boolean =>
  property !== undefined &&
  property.range.kind === "scalar" &&
  property.range.graphqlScalar === "String";

/**
 * Select, in resolution order, the predicates that back a descriptive field
 * for one class: the `universal` canonical predicates verbatim and first, then
 * the class's own (and inherited) String properties whose lower-cased OWL local
 * name appears in `localNames`, ordered by that table. Unranked own properties
 * are dropped; duplicates collapse to their earliest position, so the canonical
 * tier always wins. Pure.
 */
export const selectDescriptivePredicates = (
  classUri: string | undefined,
  ir: OntologyIR,
  universal: readonly string[],
  localNames: readonly string[],
): string[] => {
  const node = classUri === undefined ? undefined : ir.classes.get(classUri);
  const ranked: Array<{ uri: string; rank: number }> = [];
  for (const uri of node?.allProperties ?? []) {
    if (!isStringScalar(ir.properties.get(uri))) {
      continue;
    }
    const rank = localNames.indexOf(getLocalName(uri).toLowerCase());
    if (rank !== -1) {
      ranked.push({ uri, rank });
    }
  }
  // Array#sort is stable, so equal ranks preserve declaration order.
  ranked.sort((a, b) => a.rank - b.rank);
  return [...new Set([...universal, ...ranked.map((entry) => entry.uri)])];
};

/**
 * Create the resolver for a descriptive field: walk the selected predicates in
 * order and return the first literal's lexical value verbatim, else null. No
 * coercion runs — the String arm of coerce is the identity, and a literal's
 * value already excludes its language tag. An empty string is a value, not a
 * miss, so it is returned as-is.
 */
export const createDescriptiveResolver = (
  predicates: readonly string[],
): GraphQLFieldResolver<EntityValue, CompilerContext> => {
  return (parent) => {
    for (const predicate of predicates) {
      for (const value of parent.triples.get(predicate) ?? []) {
        if (value.kind === "literal") {
          return value.value;
        }
      }
    }
    return null;
  };
};
