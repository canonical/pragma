// =============================================================================
// TBox schema (hand-written, §1.6/§11.4): Ontology, OntologyClass,
// ClassProperty, OntologyProperty, PropertyKind, EntityMeta.
//
// Value conventions:
//   Ontology        → NamespaceInfo
//   OntologyClass   → ClassNode (IR)
//   OntologyProperty→ PropertyNode (IR)
//   ClassProperty   → { propertyUri, classUri } (per-class scope)
//   EntityMeta      → EntityValue (the ABox parent)
//
// Structural facts come from the frozen IR (resolver closures); only the
// instances connection hits the loaders.
// =============================================================================

import {
  GraphQLBoolean,
  GraphQLEnumType,
  type GraphQLFieldConfigMap,
  GraphQLInt,
  type GraphQLInterfaceType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from "graphql";
import { toFull, toPrefixed } from "#dataloader";
import {
  connectionFromPage,
  paginateUriWindow,
  unwrapEntities,
} from "#resolver";
import {
  type ClassNode,
  CONNECTION_ARGS,
  type CompilerContext,
  type EntityValue,
  type MappedIR,
  type NamespaceInfo,
  type PropertyNode,
} from "#shared";

interface ClassPropertyValue {
  propertyUri: string;
  classUri: string;
}

/**
 * Get an annotation value on a property by the annotation property's local
 * name suffix. Annotation values live on PropertyNode (extracted in Pass 1)
 * — the TBox schema is fully store-free at request time. Matched by local
 * name so the convention works for any namespace's annotation properties.
 */
const getAnnotationValue = (
  property: PropertyNode,
  localSuffix: string,
): string | null => {
  for (const [uri, value] of property.annotations) {
    if (uri.endsWith(localSuffix)) {
      return value;
    }
  }
  return null;
};

/** The hand-written TBox types plus the root query fields that serve them. */
export interface TBoxSchema {
  ontology: GraphQLObjectType;
  ontologyClass: GraphQLObjectType;
  classProperty: GraphQLObjectType;
  ontologyProperty: GraphQLObjectType;
  entityMeta: GraphQLObjectType;
  queryFields: GraphQLFieldConfigMap<unknown, CompilerContext>;
}

/**
 * Build the hand-written TBox schema types (Ontology, OntologyClass,
 * ClassProperty, OntologyProperty, EntityMeta) and their root query fields
 * from the compiled IR. Resolvers read the frozen IR — only the instances
 * connection touches the store, through the context's loaders.
 */
export default function buildTBoxSchema(
  mapped: MappedIR,
  nodeInterface: GraphQLInterfaceType,
  nodeConnection: () => GraphQLObjectType,
): TBoxSchema {
  const { ir } = mapped;

  const propertyKind = new GraphQLEnumType({
    name: "PropertyKind",
    values: {
      DATATYPE: { value: "datatype" },
      OBJECT: { value: "object" },
      ANNOTATION: { value: "annotation" },
    },
  });

  /** Per-class cardinality, consulting the class then its ancestors. */
  const resolveCardinality = (property: PropertyNode, classUri: string) => {
    const node = ir.classes.get(classUri);
    for (const uri of [classUri, ...(node?.ancestors ?? [])]) {
      const spec = property.classCardinality.get(uri);
      if (spec) {
        return spec;
      }
    }
    return { singular: property.functional, required: false, omit: false };
  };

  const ontologyProperty: GraphQLObjectType = new GraphQLObjectType<
    PropertyNode,
    CompilerContext
  >({
    name: "OntologyProperty",
    fields: () => ({
      uri: {
        type: new GraphQLNonNull(GraphQLString),
        resolve: (p) => p.uri,
      },
      label: { type: GraphQLString, resolve: (p) => p.label },
      definition: { type: GraphQLString, resolve: (p) => p.definition },
      domain: {
        type: ontologyClass,
        resolve: (p) => (p.domains[0] ? ir.classes.get(p.domains[0]) : null),
      },
      range: {
        type: new GraphQLNonNull(GraphQLString),
        resolve: (p) => {
          switch (p.range.kind) {
            case "scalar":
              return p.range.customDatatype ?? p.range.xsd;
            case "class":
              return p.range.uri;
            case "union":
              return p.range.members.join(" | ");
            case "unknown":
              return p.range.raw;
          }
        },
      },
      kind: { type: new GraphQLNonNull(propertyKind), resolve: (p) => p.kind },
      functional: {
        type: new GraphQLNonNull(GraphQLBoolean),
        resolve: (p) => p.functional,
      },
      inverse: {
        type: ontologyProperty,
        resolve: (p) => (p.inverse ? ir.properties.get(p.inverse) : null),
      },
      acceptanceCriteria: {
        type: GraphQLString,
        resolve: (p) => getAnnotationValue(p, "acceptanceCriteria"),
      },
      completionGuidance: {
        type: GraphQLString,
        resolve: (p) => getAnnotationValue(p, "completionGuidance"),
      },
      namespace: {
        type: new GraphQLNonNull(GraphQLString),
        resolve: (p) => p.namespace,
      },
    }),
  });

  const classProperty: GraphQLObjectType = new GraphQLObjectType<
    ClassPropertyValue,
    CompilerContext
  >({
    name: "ClassProperty",
    description:
      "Class-scoped view of a property: SHACL cardinality is a fact about a (class, property) pair.",
    fields: () => ({
      property: {
        type: new GraphQLNonNull(ontologyProperty),
        resolve: (cp) => ir.properties.get(cp.propertyUri),
      },
      required: {
        type: new GraphQLNonNull(GraphQLBoolean),
        resolve: (cp) => {
          const property = ir.properties.get(cp.propertyUri);
          return property
            ? resolveCardinality(property, cp.classUri).required
            : false;
        },
      },
      singular: {
        type: new GraphQLNonNull(GraphQLBoolean),
        resolve: (cp) => {
          const property = ir.properties.get(cp.propertyUri);
          return property
            ? resolveCardinality(property, cp.classUri).singular
            : false;
        },
      },
      inherited: {
        type: new GraphQLNonNull(GraphQLBoolean),
        resolve: (cp) =>
          !(
            ir.classes
              .get(cp.classUri)
              ?.ownProperties.includes(cp.propertyUri) ?? false
          ),
      },
    }),
  });

  const listClassProperties = (node: ClassNode): ClassPropertyValue[] =>
    node.allProperties
      .filter((uri) => !(ir.properties.get(uri)?.isAnnotation ?? false))
      .map((propertyUri) => ({ propertyUri, classUri: node.uri }));

  const ontologyClass: GraphQLObjectType = new GraphQLObjectType<
    ClassNode,
    CompilerContext
  >({
    name: "OntologyClass",
    fields: () => ({
      uri: { type: new GraphQLNonNull(GraphQLString), resolve: (c) => c.uri },
      label: { type: GraphQLString, resolve: (c) => c.label },
      definition: { type: GraphQLString, resolve: (c) => c.definition },
      superclass: {
        type: ontologyClass,
        resolve: (c) =>
          c.superclasses[0] ? ir.classes.get(c.superclasses[0]) : null,
      },
      superclasses: {
        type: new GraphQLNonNull(
          new GraphQLList(new GraphQLNonNull(ontologyClass)),
        ),
        resolve: (c) =>
          c.ancestors
            .map((uri) => ir.classes.get(uri))
            .filter((n): n is ClassNode => n !== undefined),
      },
      subclasses: {
        type: new GraphQLNonNull(
          new GraphQLList(new GraphQLNonNull(ontologyClass)),
        ),
        resolve: (c) =>
          c.subclasses
            .map((uri) => ir.classes.get(uri))
            .filter((n): n is ClassNode => n !== undefined),
      },
      properties: {
        type: new GraphQLNonNull(
          new GraphQLList(new GraphQLNonNull(classProperty)),
        ),
        resolve: (c) => listClassProperties(c),
      },
      instances: {
        type: new GraphQLNonNull(nodeConnection()),
        args: CONNECTION_ARGS,
        description:
          "Named instances of this class (blank-node instances are embeddable and not standalone-resolvable).",
        resolve: async (c, args, ctx) => {
          const fullUris = await ctx.listLoader.load(c.uri);
          const prefixed = fullUris.map((uri) =>
            toPrefixed(uri, mapped.namespaces),
          );
          const page = paginateUriWindow(prefixed, args);
          const entities = await ctx.entityLoader.loadMany(
            page.window.map((uri) => toFull(uri, mapped.namespaces) ?? uri),
          );
          return connectionFromPage(unwrapEntities(entities), page);
        },
      },
      instanceCount: {
        type: new GraphQLNonNull(GraphQLInt),
        description: "Count of NAMED instances (matches `instances`).",
        resolve: (c) => ir.extraction.instanceStats.get(c.uri)?.named ?? 0,
      },
      isAbstract: {
        type: new GraphQLNonNull(GraphQLBoolean),
        resolve: (c) => c.isAbstract,
      },
      namespace: {
        type: new GraphQLNonNull(GraphQLString),
        resolve: (c) => c.namespace,
      },
    }),
  });

  const ontology = new GraphQLObjectType<NamespaceInfo, CompilerContext>({
    name: "Ontology",
    fields: () => ({
      prefix: {
        type: new GraphQLNonNull(GraphQLString),
        resolve: (n) => n.prefix,
      },
      namespace: {
        type: new GraphQLNonNull(GraphQLString),
        resolve: (n) => n.uri,
      },
      label: { type: GraphQLString, resolve: (n) => n.prefix },
      classes: {
        type: new GraphQLNonNull(
          new GraphQLList(new GraphQLNonNull(ontologyClass)),
        ),
        resolve: (n) =>
          [...ir.classes.values()].filter((c) => c.namespace === n.prefix),
      },
      properties: {
        type: new GraphQLNonNull(
          new GraphQLList(new GraphQLNonNull(ontologyProperty)),
        ),
        resolve: (n) =>
          [...ir.properties.values()].filter((p) => p.namespace === n.prefix),
      },
    }),
  });

  const entityMeta = new GraphQLObjectType<EntityValue, CompilerContext>({
    name: "EntityMeta",
    description: "Self-describing TBox access attached to ABox types (KG.03).",
    fields: () => ({
      type: {
        type: new GraphQLNonNull(ontologyClass),
        resolve: (parent) => {
          const classUri = mapped.nameMap.toOWL(parent.typename);
          return classUri ? ir.classes.get(classUri) : null;
        },
      },
      field: {
        type: classProperty,
        args: { name: { type: new GraphQLNonNull(GraphQLString) } },
        resolve: (parent, args: { name: string }) => {
          const classUri = mapped.nameMap.toOWL(parent.typename);
          const mappedType = mapped.types.get(parent.typename);
          const field = mappedType?.fields.get(args.name);
          if (!classUri || !field || !ir.properties.has(field.propertyUri)) {
            return null;
          }
          return { propertyUri: field.propertyUri, classUri };
        },
      },
      fields: {
        type: new GraphQLNonNull(
          new GraphQLList(new GraphQLNonNull(classProperty)),
        ),
        resolve: (parent) => {
          const classUri = mapped.nameMap.toOWL(parent.typename);
          const node = classUri ? ir.classes.get(classUri) : undefined;
          return node ? listClassProperties(node) : [];
        },
      },
    }),
  });

  const queryFields: GraphQLFieldConfigMap<unknown, CompilerContext> = {
    ontologies: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(ontology))),
      resolve: () => [...mapped.namespaces.values()],
    },
    ontology: {
      type: ontology,
      args: { prefix: { type: new GraphQLNonNull(GraphQLString) } },
      resolve: (_parent, args: { prefix: string }) =>
        mapped.namespaces.get(args.prefix) ?? null,
    },
    ontologyClass: {
      type: ontologyClass,
      args: { uri: { type: new GraphQLNonNull(GraphQLString) } },
      resolve: (_parent, args: { uri: string }) =>
        ir.classes.get(args.uri) ??
        [...ir.classes.values()].find(
          (c) => `${c.namespace}:${c.uri.split(/[#/]/).pop()}` === args.uri,
        ) ??
        null,
    },
    ontologyProperty: {
      type: ontologyProperty,
      args: { uri: { type: new GraphQLNonNull(GraphQLString) } },
      resolve: (_parent, args: { uri: string }) =>
        ir.properties.get(args.uri) ??
        [...ir.properties.values()].find(
          (p) => `${p.namespace}:${p.uri.split(/[#/]/).pop()}` === args.uri,
        ) ??
        null,
    },
  };

  // The Node interface is referenced through nodeConnection (lazily); the
  // parameter is accepted to make the dependency explicit at the call site.
  void nodeInterface;

  return {
    ontology,
    ontologyClass,
    classProperty,
    ontologyProperty,
    entityMeta,
    queryFields,
  };
}
