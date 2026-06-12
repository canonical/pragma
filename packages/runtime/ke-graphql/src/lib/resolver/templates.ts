// =============================================================================
// The eight resolver templates (§5.2). Every generated field's resolve
// function is an instantiation of one of these. Parents are EntityValues;
// embedded blank-node children become EntityValues with uri: null and a
// per-value typename derived from the blank node's rdf:type when present
// (falling back to the field's declared range).
// =============================================================================

import type { GraphQLFieldResolver } from "graphql";
import {
  type CompilerContext,
  type EntityValue,
  type MappedField,
  RDF_TYPE,
  type TripleSet,
} from "../compiler/index.js";
import { coerce } from "./coerce.js";
import { emptyConnection, toConnection, unwrapEntities } from "./connection.js";
import type { ConnectionArgs, ScalarName } from "./types.js";

type Resolver = GraphQLFieldResolver<EntityValue, CompilerContext>;

/** Get the scalar name a field coerces to (String for non-scalar fields). */
const getScalarName = (field: MappedField): ScalarName =>
  field.type.kind === "scalar" ? (field.type.name as ScalarName) : "String";

/** Resolve an embedded value's typename: rdf:type when present, else the range. */
const resolveEmbeddedTypename = (
  triples: TripleSet,
  fallback: string,
  ctx: CompilerContext,
): string => {
  const typeTriples = triples.get(RDF_TYPE);
  for (const t of typeTriples ?? []) {
    if (t.kind === "uri") {
      const name = ctx.nameMap.toGraphQL(t.value);
      if (name) {
        return name;
      }
    }
  }
  return fallback;
};

/**
 * Create a Template 1 resolver (singular datatype field): coerces the first
 * literal value to the field's scalar; URI values surface as strings on
 * B003 String fallbacks.
 */
export const createDatatypeResolver = (field: MappedField): Resolver => {
  const scalar = getScalarName(field);
  return (parent, _args, ctx) => {
    const values = parent.triples.get(field.propertyUri);
    if (!values?.length) {
      return null;
    }
    const v = values[0];
    if (v?.kind === "literal") {
      return coerce(v.value, scalar, field.propertyUri, ctx.warn);
    }
    // Object property with an unknown range mapped to String (B003): the
    // value is a URI — honor the "mapped to String" contract.
    if (v?.kind === "uri" && scalar === "String") {
      return v.value;
    }
    return null;
  };
};

/**
 * Create a Template 2 resolver (datatype list field): coerces every literal
 * value, dropping the ones that fail coercion (KG.07).
 */
export const createDatatypeListResolver = (field: MappedField): Resolver => {
  const scalar = getScalarName(field);
  return (parent, _args, ctx) => {
    const values = parent.triples.get(field.propertyUri);
    if (!values?.length) {
      return [];
    }
    return values
      .map((v) => {
        if (v.kind === "literal") {
          return coerce(v.value, scalar, field.propertyUri, ctx.warn);
        }
        // B003 String fallback: URI values surface as their IRI strings.
        if (v.kind === "uri" && scalar === "String") {
          return v.value;
        }
        return null;
      })
      .filter((v) => v !== null);
  };
};

/**
 * Create a Template 3 resolver (singular object field): loads the referenced
 * entity; declared inverse pairs fall back to the reverse assertion (EC.05).
 */
export const createObjectSingularResolver = (field: MappedField): Resolver => {
  return async (parent, _args, ctx) => {
    const values = parent.triples.get(field.propertyUri);
    const v = values?.find((value) => value.kind === "uri");
    if (v?.kind === "uri") {
      return ctx.entityLoader.load(v.value);
    }
    // Declared inverse pair: fall back to the reverse assertion (EC.05).
    if (field.inverseOf && parent.uri) {
      const reverse = await ctx.inverseLoader.load(
        `${field.inverseOf} ${parent.uri}`,
      );
      if (reverse[0]) {
        return ctx.entityLoader.load(reverse[0]);
      }
    }
    return null;
  };
};

/**
 * Create a Template 5 resolver (object list field): loads every referenced
 * entity and returns a Relay connection.
 */
export const createObjectListResolver = (field: MappedField): Resolver => {
  return async (parent, args, ctx) => {
    const values = parent.triples.get(field.propertyUri);
    if (!values?.length) {
      return emptyConnection();
    }
    const uris = values
      .filter((v) => v.kind === "uri")
      .map((v) => (v as { value: string }).value);
    const entities = await ctx.entityLoader.loadMany(uris);
    return toConnection(unwrapEntities(entities), args as ConnectionArgs);
  };
};

/**
 * Create a Template 4 resolver (inverse fields — declared pairs and
 * synthetic inverses): union of forward triples and reverse assertions,
 * deduplicated by URI (EC.05 direction rule), as a Relay connection.
 */
export const createInverseResolver = (
  field: MappedField,
  /** Encoded inverse key prefix: the forward property whose assertions point at the parent. */
  forwardProperty: string,
): Resolver => {
  return async (parent, args, ctx) => {
    const forward = (parent.triples.get(field.propertyUri) ?? [])
      .filter((v) => v.kind === "uri")
      .map((v) => (v as { value: string }).value);
    const reverse = parent.uri
      ? await ctx.inverseLoader.load(`${forwardProperty} ${parent.uri}`)
      : [];
    const uris = [...new Set([...forward, ...reverse])];
    if (uris.length === 0) {
      return emptyConnection();
    }
    const entities = await ctx.entityLoader.loadMany(uris);
    return toConnection(unwrapEntities(entities), args as ConnectionArgs);
  };
};

/**
 * Create a Template 7 resolver (embedded list field): materializes the
 * parent's blank-node children as EntityValues with uri: null.
 */
export const createEmbeddedListResolver = (
  field: MappedField,
  rangeTypename: string,
): Resolver => {
  return (parent, _args, ctx) => {
    const values = parent.triples.get(field.propertyUri);
    if (!values?.length) {
      return [];
    }
    return values
      .filter((v) => v.kind === "blank")
      .map((v) => {
        const blank = v as { triples: TripleSet };
        return {
          uri: null,
          typename: resolveEmbeddedTypename(blank.triples, rangeTypename, ctx),
          triples: blank.triples,
        } satisfies EntityValue;
      });
  };
};

/**
 * Create a Template 6 resolver (embedded singular field): materializes the
 * parent's first blank-node child as an EntityValue with uri: null.
 */
export const createEmbeddedSingularResolver = (
  field: MappedField,
  rangeTypename: string,
): Resolver => {
  return (parent, _args, ctx) => {
    const values = parent.triples.get(field.propertyUri);
    const v = values?.find((value) => value.kind === "blank");
    if (!v || v.kind !== "blank") {
      return null;
    }
    return {
      uri: null,
      typename: resolveEmbeddedTypename(v.triples, rangeTypename, ctx),
      triples: v.triples,
    } satisfies EntityValue;
  };
};
