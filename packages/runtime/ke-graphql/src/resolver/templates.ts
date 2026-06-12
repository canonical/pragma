// =============================================================================
// The eight resolver templates (§5.2). Every generated field's resolve
// function is an instantiation of one of these. Parents are EntityValues;
// embedded blank-node children become EntityValues with uri: null and a
// per-value typename derived from the blank node's rdf:type when present
// (falling back to the field's declared range).
// =============================================================================

import type { GraphQLFieldResolver } from "graphql";
import type {
  CompilerContext,
  EntityValue,
  MappedField,
  TripleSet,
} from "../compiler/types.js";
import { RDF_TYPE } from "../compiler/vocab.js";
import { coerce, type ScalarName } from "./coerce.js";
import {
  type ConnectionArgs,
  emptyConnection,
  toConnection,
  unwrapEntities,
} from "./connection.js";

type Resolver = GraphQLFieldResolver<EntityValue, CompilerContext>;

const scalarOf = (field: MappedField): ScalarName =>
  field.type.kind === "scalar" ? (field.type.name as ScalarName) : "String";

/** Per-value typename for embedded values: rdf:type when present, else range. */
const embeddedTypename = (
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

export const datatypeResolver = (field: MappedField): Resolver => {
  const scalar = scalarOf(field);
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

export const datatypeListResolver = (field: MappedField): Resolver => {
  const scalar = scalarOf(field);
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

export const objectSingularResolver = (field: MappedField): Resolver => {
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

export const objectListResolver = (field: MappedField): Resolver => {
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
 * Inverse fields (declared pairs and synthetic inverses): union of forward
 * triples and reverse assertions, deduplicated by URI (EC.05 direction rule).
 */
export const inverseResolver = (
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

export const embeddedListResolver = (
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
          typename: embeddedTypename(blank.triples, rangeTypename, ctx),
          triples: blank.triples,
        } satisfies EntityValue;
      });
  };
};

export const embeddedSingularResolver = (
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
      typename: embeddedTypename(v.triples, rangeTypename, ctx),
      triples: v.triples,
    } satisfies EntityValue;
  };
};
