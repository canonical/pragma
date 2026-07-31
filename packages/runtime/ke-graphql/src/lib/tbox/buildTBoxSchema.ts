// =============================================================================
// TBox schema (hand-written): Ontology, OntologyClass,
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
  GraphQLID,
  GraphQLInt,
  type GraphQLInterfaceType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from "graphql";
import {
  connectionFromPage,
  paginateUriWindow,
  resolveLabel,
  resolveTitle,
  selectDescriptivePredicates,
  selectLexicals,
  unwrapEntities,
} from "../resolver/index.js";
import {
  type ClassNode,
  COMMENT_LOCAL_NAMES,
  CONNECTION_ARGS,
  type CompilerContext,
  DEFINITION_LOCAL_NAMES,
  type EntityValue,
  LABEL_LOCAL_NAMES,
  LANG_ARGS,
  type MappedIR,
  type NamespaceInfo,
  type PropertyNode,
  RDFS_COMMENT,
  RDFS_LABEL,
  SKOS_DEFINITION,
  SKOS_PREF_LABEL,
} from "../shared/index.js";

interface ClassPropertyValue {
  propertyUri: string;
  classUri: string;
}

/** The canonical (universal) predicate tier of each descriptive field. */
const LABEL_UNIVERSAL = [RDFS_LABEL, SKOS_PREF_LABEL];
const COMMENT_UNIVERSAL = [RDFS_COMMENT];
const DEFINITION_UNIVERSAL = [SKOS_DEFINITION];

/** The three predicate chains a single GraphQL type resolves through. */
interface DescriptiveChains {
  label: readonly string[];
  comment: readonly string[];
  definition: readonly string[];
}

/**
 * The chains used when a parent's typename is not a concrete mapped type.
 * `EntityValue.typename` can carry an INTERFACE name (resolveEmbeddedTypename
 * maps a blank node's rdf:type through the global name map, which also holds
 * abstract classes), and mapped.types is keyed by concrete types only. The
 * canonical tier is still exactly right there; only the class-specific
 * local-name tier is unknowable.
 */
const FALLBACK_CHAINS: DescriptiveChains = {
  label: LABEL_UNIVERSAL,
  comment: COMMENT_UNIVERSAL,
  definition: DEFINITION_UNIVERSAL,
};

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

  // Descriptive chains are computed ONCE per GraphQL type, here at build time.
  // selectDescriptivePredicates walks a class's whole allProperties list, so
  // calling it inside a resolver would repeat that walk for every descriptive
  // field of every node of every page.
  const chainsByType = new Map<string, DescriptiveChains>();
  for (const type of mapped.types.values()) {
    chainsByType.set(type.graphqlName, {
      label: selectDescriptivePredicates(
        type.owlUri,
        ir,
        LABEL_UNIVERSAL,
        LABEL_LOCAL_NAMES,
      ),
      comment: selectDescriptivePredicates(
        type.owlUri,
        ir,
        COMMENT_UNIVERSAL,
        COMMENT_LOCAL_NAMES,
      ),
      definition: selectDescriptivePredicates(
        type.owlUri,
        ir,
        DEFINITION_UNIVERSAL,
        DEFINITION_LOCAL_NAMES,
      ),
    });
  }
  const chainsFor = (typename: string): DescriptiveChains =>
    chainsByType.get(typename) ?? FALLBACK_CHAINS;

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
        type: new GraphQLNonNull(GraphQLID),
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
      // ID!, matching Node.uri: `uri` is the identity currency across the whole
      // base, and an asymmetry between the two TBox siblings would be a defect.
      // NOT `implements Node`: Node forces a non-null `_meta`, whose resolvers
      // all key off EntityValue.typename — an OntologyClass parent is a
      // ClassNode with no typename, so `_meta.type` would error at runtime.
      uri: { type: new GraphQLNonNull(GraphQLID), resolve: (c) => c.uri },
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
          // The loader's list is already in absolute-IRI currency — the same
          // currency the cursors encode and EntityValue.uri carries.
          const uris = await ctx.listLoader.load(c.uri);
          const page = paginateUriWindow(uris, args);
          const entities = await ctx.entityLoader.loadMany(page.window);
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
    description:
      "Self-describing TBox access attached to every generated type, plus the generic descriptive fields a lens renders without knowing the concrete type.",
    fields: () => ({
      title: {
        type: new GraphQLNonNull(GraphQLString),
        args: LANG_ARGS,
        description:
          "TOTAL display string: label(lang), else any-tag literal, else the IRI local name, else the IRI. Never null — render this.",
        resolve: (parent, args: { lang: string }) =>
          resolveTitle(
            selectLexicals(parent.triples, chainsFor(parent.typename).label),
            args.lang,
            parent.uri,
            parent.typename,
          ),
      },
      label: {
        type: GraphQLString,
        args: LANG_ARGS,
        description:
          "rdfs:label, else skos:prefLabel, else the class's own name/title predicate — exact language tag, else untagged. Null when none is asserted; `title` is the total alternative.",
        resolve: (parent, args: { lang: string }) =>
          resolveLabel(
            selectLexicals(parent.triples, chainsFor(parent.typename).label),
            args.lang,
          ),
      },
      comment: {
        type: GraphQLString,
        args: LANG_ARGS,
        description:
          "Incidental prose: rdfs:comment, else the class's own summary predicate. Null when none is asserted.",
        resolve: (parent, args: { lang: string }) =>
          resolveLabel(
            selectLexicals(parent.triples, chainsFor(parent.typename).comment),
            args.lang,
          ),
      },
      definition: {
        type: GraphQLString,
        args: LANG_ARGS,
        description:
          "Defining prose: skos:definition, else the class's own description predicate. Null when none is asserted.",
        resolve: (parent, args: { lang: string }) =>
          resolveLabel(
            selectLexicals(
              parent.triples,
              chainsFor(parent.typename).definition,
            ),
            args.lang,
          ),
      },
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
