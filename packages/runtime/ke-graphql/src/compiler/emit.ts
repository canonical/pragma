// =============================================================================
// Pass 5 — Emit: MappedIR → SchemaPlan
//
// Pure. Produces *plans* (field descriptors with resolvers and string type
// references), not graphql-js objects: graphql-js types are immutable, so
// Pass 6 augments plans and Pass 7 constructs every GraphQL*Type exactly
// once, with thunks for circular references.
// =============================================================================

import type { GraphQLFieldResolver } from "graphql";
import {
  datatypeListResolver,
  datatypeResolver,
  embeddedListResolver,
  embeddedSingularResolver,
  inverseResolver,
  objectListResolver,
  objectSingularResolver,
} from "../resolver/templates.js";
import type {
  CompilerContext,
  Diagnostic,
  EntityValue,
  MappedField,
  MappedIR,
  PassResult,
} from "./types.js";

// A reference to a (possibly not-yet-constructed) GraphQL type.
export interface TypeRef {
  /** Scalar name, object/interface/union name, or connection base name. */
  base: string;
  kind: "scalar" | "named" | "connection";
  list: boolean;
  nonNull: boolean;
}

export interface FieldPlan {
  name: string;
  type: TypeRef;
  /** Attach the four Relay connection args. */
  connectionArgs?: boolean;
  /** Static args spec: name → scalar type name + required flag. */
  args?: Record<string, { type: "String" | "Int" | "ID"; required: boolean }>;
  resolve?: GraphQLFieldResolver<EntityValue, CompilerContext>;
  description?: string;
}

export interface TypePlan {
  name: string;
  owlUri?: string;
  interfaces: string[];
  fields: Map<string, FieldPlan>;
  embeddable: boolean;
  description?: string;
}

export interface InterfacePlan {
  name: string;
  owlUri?: string;
  parents: string[];
  fields: Map<string, FieldPlan>;
  /** All concrete implementors are embeddable (no Node membership). */
  embeddableOnly: boolean;
  description?: string;
}

export interface UnionPlan {
  name: string;
  members: string[];
}

export interface SchemaPlan {
  types: Map<string, TypePlan>;
  interfaces: Map<string, InterfacePlan>;
  unions: Map<string, UnionPlan>;
  queryFields: Map<string, FieldPlan>;
  mapped: MappedIR;
}

const refFor = (field: MappedField): TypeRef => ({
  base: field.type.name,
  kind: field.type.kind === "scalar" ? "scalar" : "named",
  list: field.list,
  nonNull: field.nonNull || !field.nullable,
});

const resolverFor = (
  field: MappedField,
): GraphQLFieldResolver<EntityValue, CompilerContext> => {
  switch (field.resolverTemplate) {
    case "datatype":
      return datatypeResolver(field);
    case "datatype-list":
      return datatypeListResolver(field);
    case "object-singular":
      return objectSingularResolver(field);
    case "object-list":
      return objectListResolver(field);
    case "embedded-singular":
      return embeddedSingularResolver(field, field.type.name);
    case "embedded-list":
      return embeddedListResolver(field, field.type.name);
    case "inverse":
      return inverseResolver(field, field.inverseOf ?? field.propertyUri);
    case "meta":
      return (parent) => parent;
  }
};

export const emit = (mapped: MappedIR): PassResult<SchemaPlan> => {
  const diagnostics: Diagnostic[] = [];
  const types = new Map<string, TypePlan>();
  const interfaces = new Map<string, InterfacePlan>();
  const unions = new Map<string, UnionPlan>();

  const planFields = (
    fields: ReadonlyMap<string, MappedField>,
  ): Map<string, FieldPlan> => {
    const plans = new Map<string, FieldPlan>();
    for (const field of fields.values()) {
      const description = mapped.ir.properties.get(
        field.propertyUri,
      )?.definition;
      plans.set(field.graphqlName, {
        name: field.graphqlName,
        type: refFor(field),
        resolve: resolverFor(field),
        description,
      });
    }
    return plans;
  };

  for (const mappedInterface of mapped.interfaces.values()) {
    const node = mapped.ir.classes.get(mappedInterface.owlUri);
    interfaces.set(mappedInterface.graphqlName, {
      name: mappedInterface.graphqlName,
      owlUri: mappedInterface.owlUri,
      parents: [...mappedInterface.parentInterfaces],
      fields: planFields(mappedInterface.fields),
      embeddableOnly: allImplementorsEmbeddable(mapped, mappedInterface.owlUri),
      description: node?.definition,
    });
  }

  for (const mappedType of mapped.types.values()) {
    const node = mapped.ir.classes.get(mappedType.owlUri);
    types.set(mappedType.graphqlName, {
      name: mappedType.graphqlName,
      owlUri: mappedType.owlUri,
      interfaces: [...mappedType.interfaces],
      fields: planFields(mappedType.fields),
      embeddable: mappedType.embeddable,
      description: node?.definition,
    });
  }

  for (const union of mapped.unions.values()) {
    unions.set(union.name, { name: union.name, members: [...union.members] });
  }

  return {
    output: { types, interfaces, unions, queryFields: new Map(), mapped },
    diagnostics,
  };
};

const allImplementorsEmbeddable = (
  mapped: MappedIR,
  interfaceUri: string,
): boolean => {
  const node = mapped.ir.classes.get(interfaceUri);
  if (!node) {
    return false;
  }
  const concrete: boolean[] = [];
  const walk = (uri: string) => {
    const current = mapped.ir.classes.get(uri);
    if (!current) {
      return;
    }
    if (!current.isAbstract) {
      concrete.push(current.embeddable);
    }
    for (const sub of current.subclasses) {
      walk(sub);
    }
  };
  walk(interfaceUri);
  return concrete.length > 0 && concrete.every(Boolean);
};
