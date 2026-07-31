// =============================================================================
// TBox schema (hand-written): Ontology, OntologyClass,
// ClassProperty, OntologyProperty, PropertyKind, EntityMeta.
//
// Value conventions:
//   Ontology        → NamespaceInfo
//   OntologyClass   → ClassNode (IR, or the frozen owl:Class meta-node)
//   OntologyProperty→ PropertyNode (IR)
//   ClassProperty   → { propertyUri, classUri } (per-class scope)
//   EntityMeta      → EntityValue (the ABox parent, or the ClassNode adapter
//                     minted for OntologyClass._meta)
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
  emptyConnection,
  paginateUriWindow,
  resolveLabel,
  resolveTitle,
  selectAnnotatedSource,
  selectDescriptivePredicates,
  selectLexicals,
  toConnection,
  unwrapEntities,
} from "../resolver/index.js";
import {
  type ClassNode,
  COMMENT_LOCAL_NAMES,
  CONNECTION_ARGS,
  type CompilerContext,
  DEFAULT_LANG,
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
  type TripleSet,
} from "../shared/index.js";
import { OWL_CLASS_NODE, OWL_CLASS_PREFIXED } from "./metaClass.js";

interface ClassPropertyValue {
  propertyUri: string;
  classUri: string;
}

/** The canonical (universal) predicate tier of each descriptive field. */
const LABEL_UNIVERSAL = [RDFS_LABEL, SKOS_PREF_LABEL];
const COMMENT_UNIVERSAL = [RDFS_COMMENT];
const DEFINITION_UNIVERSAL = [SKOS_DEFINITION];

/** The argument shape every descriptive resolver receives. */
interface LangArgs {
  lang?: string | null;
}

/**
 * Normalize the `lang` argument at the resolver boundary. LANG_ARGS defaults
 * `lang` to "en" only when the argument is OMITTED — an EXPLICIT `lang: null`
 * bypasses the default and reaches the resolver as null, where unguarded tag
 * matching would throw (a request-killing error on the non-null `title`).
 * Null and undefined both mean "the default chain", exactly as omission does.
 */
const resolveLang = (args: LangArgs): string => args.lang ?? DEFAULT_LANG;

/**
 * The four predicate chains a single GraphQL type resolves through. `title`
 * is a chain of its own so graphql:titleFrom can head it independently; for
 * an unannotated class it IS the label chain, keeping the historical
 * title-reads-label behavior byte-identical.
 */
interface DescriptiveChains {
  title: readonly string[];
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
  title: LABEL_UNIVERSAL,
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
  /**
   * Identity predicate for Node.resolveType: is this runtime value one of
   * THIS build's TBox ClassNodes (or the meta-class), i.e. an OntologyClass
   * parent? Identity-based on purpose — resolvers only ever hand out the IR's
   * own instances, so no ABox EntityValue can satisfy it by shape.
   */
  isClassNode(value: unknown): boolean;
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
  //
  // An annotated source predicate (graphql:*From, nearest ancestor wins)
  // HEADS its chain — it must beat rdfs:label, or the override is useless
  // exactly when both exist. Absence on an instance still falls through the
  // fixed tiers, so `title` stays total. The title chain builds on the
  // EFFECTIVE label chain (labelFrom included): title's first tier is label
  // resolution, annotated or not.
  const headed = (
    head: string | undefined,
    chain: readonly string[],
  ): readonly string[] => (head ? [...new Set([head, ...chain])] : chain);

  const chainsByType = new Map<string, DescriptiveChains>();
  for (const type of mapped.types.values()) {
    const label = headed(
      selectAnnotatedSource(type.owlUri, ir, "labelFrom"),
      selectDescriptivePredicates(
        type.owlUri,
        ir,
        LABEL_UNIVERSAL,
        LABEL_LOCAL_NAMES,
      ),
    );
    chainsByType.set(type.graphqlName, {
      title: headed(selectAnnotatedSource(type.owlUri, ir, "titleFrom"), label),
      label,
      comment: headed(
        selectAnnotatedSource(type.owlUri, ir, "commentFrom"),
        selectDescriptivePredicates(
          type.owlUri,
          ir,
          COMMENT_UNIVERSAL,
          COMMENT_LOCAL_NAMES,
        ),
      ),
      definition: headed(
        selectAnnotatedSource(type.owlUri, ir, "definitionFrom"),
        selectDescriptivePredicates(
          type.owlUri,
          ir,
          DEFINITION_UNIVERSAL,
          DEFINITION_LOCAL_NAMES,
        ),
      ),
    });
  }
  const getChainsFor = (typename: string): DescriptiveChains =>
    chainsByType.get(typename) ?? FALLBACK_CHAINS;

  // ── OntologyClass as a Node ──
  // The identity set behind Node.resolveType's TBox branch: exactly this
  // build's class nodes plus the meta-class. Membership is by identity, never
  // by shape — the resolvers only ever hand out these instances.
  const classNodeIdentities = new Set<unknown>(ir.classes.values());
  classNodeIdentities.add(OWL_CLASS_NODE);
  const isClassNode = (value: unknown): boolean =>
    classNodeIdentities.has(value);

  // Population guard: a class is projected when its URI resolves to a minted
  // type or interface. Under mode "explicit" a class outside the expose
  // allowlist stays browsable in the TBox (the browser is complete on
  // purpose), but its `instances`/`instanceCount` answer empty/0 —
  // `instanceCount` is DEFINED as the population `instances` paginates, and
  // an unprojected class's instances cannot be typed into the emitted
  // schema. In every other mode a compiled schema has all classes projected
  // (an unregistered class means a fatal M001), so the guard changes
  // nothing.
  const isProjected = (classUri: string): boolean => {
    const name = mapped.nameMap.toGraphQL(classUri);
    return (
      name !== undefined &&
      (mapped.types.has(name) || mapped.interfaces.has(name))
    );
  };

  // Every EntityMeta resolver takes an EntityValue parent. A ClassNode is
  // TBox IR, not an ABox value, so `OntologyClass._meta` adapts one into the
  // other: the node's own label/definition become literal triples under the
  // canonical predicates, and the existing descriptive-resolution chain
  // (title fallback, exact-tag-else-untagged language handling) treats them
  // exactly like asserted data. "OntologyClass" is a reserved type name, so
  // the typename can never collide with a generated type's chain entry — the
  // canonical FALLBACK_CHAINS tier answers, which is precisely right here.
  // Minted values are remembered by identity so `_meta.type` can answer the
  // meta-class without trusting anything spoofable.
  const tboxMetaParents = new WeakSet<EntityValue>();
  const classNodeEntityValue = (node: ClassNode): EntityValue => {
    const triples: TripleSet = new Map();
    triples.set(RDFS_LABEL, [{ kind: "literal", value: node.label }]);
    if (node.definition !== undefined) {
      triples.set(SKOS_DEFINITION, [
        { kind: "literal", value: node.definition },
      ]);
    }
    const value: EntityValue = {
      uri: node.uri,
      typename: "OntologyClass",
      triples,
    };
    tboxMetaParents.add(value);
    return value;
  };

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
    // A real Node: identity (uri: ID!) plus self-description (_meta), like
    // every generated type. The old blocker — EntityMeta resolvers key off
    // EntityValue and a ClassNode is not one — is closed by the
    // classNodeEntityValue adapter above; `_meta.type` answers the
    // meta-class owl:Class. OntologyProperty deliberately does NOT get the
    // same treatment (kept as scope, not principle): it keeps uri: ID! and
    // stays a non-Node.
    interfaces: () => [nodeInterface],
    fields: () => ({
      uri: { type: new GraphQLNonNull(GraphQLID), resolve: (c) => c.uri },
      _meta: {
        type: new GraphQLNonNull(entityMeta),
        description: "Self-describing TBox access for this class.",
        resolve: (c) => classNodeEntityValue(c),
      },
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
          // META BRANCH: the meta-class's instances are the classes
          // themselves, straight from the frozen IR — no store round-trip.
          // Each edge node is a ClassNode, which Node.resolveType's
          // identity branch sends to OntologyClass. toConnection sorts by
          // URI, so cursors are stable across requests.
          if (c === OWL_CLASS_NODE) {
            return toConnection([...ir.classes.values()], args);
          }
          // Unprojected class (mode "explicit" outside the allowlist): the
          // population is empty by definition — see isProjected.
          if (!isProjected(c.uri)) {
            return emptyConnection();
          }
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
        // The meta-class counts ir.classes — the exact set its `instances`
        // connection yields — NOT instanceStats(owl:Class), which counts
        // every `a owl:Class` subject in the store, including declarations
        // the compiler filtered (standard-vocabulary classes). The two must
        // never drift: `instances` and `instanceCount` are one promise —
        // which is also why an unprojected class answers 0 (its `instances`
        // connection is empty by definition; see isProjected).
        resolve: (c) =>
          c === OWL_CLASS_NODE
            ? ir.classes.size
            : isProjected(c.uri)
              ? (ir.extraction.instanceStats.get(c.uri)?.named ?? 0)
              : 0,
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
          "TOTAL display string: label(lang), else any-tag literal, else the IRI local name, else the IRI, else the GraphQL type name when the value has no IRI at all (an embedded blank node). Never null — render this.",
        resolve: (parent, args: LangArgs) =>
          resolveTitle(
            selectLexicals(parent.triples, getChainsFor(parent.typename).title),
            resolveLang(args),
            parent.uri,
            parent.typename,
          ),
      },
      label: {
        type: GraphQLString,
        args: LANG_ARGS,
        description:
          "rdfs:label, else skos:prefLabel, else the class's own name/title predicate — exact language tag, else untagged. Null when none is asserted; `title` is the total alternative.",
        resolve: (parent, args: LangArgs) =>
          resolveLabel(
            selectLexicals(parent.triples, getChainsFor(parent.typename).label),
            resolveLang(args),
          ),
      },
      comment: {
        type: GraphQLString,
        args: LANG_ARGS,
        description:
          "Incidental prose: rdfs:comment, else the class's own summary predicate. Null when none is asserted.",
        resolve: (parent, args: LangArgs) =>
          resolveLabel(
            selectLexicals(
              parent.triples,
              getChainsFor(parent.typename).comment,
            ),
            resolveLang(args),
          ),
      },
      definition: {
        type: GraphQLString,
        args: LANG_ARGS,
        description:
          "Defining prose: skos:definition, else the class's own description predicate. Null when none is asserted.",
        resolve: (parent, args: LangArgs) =>
          resolveLabel(
            selectLexicals(
              parent.triples,
              getChainsFor(parent.typename).definition,
            ),
            resolveLang(args),
          ),
      },
      type: {
        type: new GraphQLNonNull(ontologyClass),
        resolve: (parent) => {
          // TBox branch: an OntologyClass parent's class is the meta-class.
          // Identity-based — only the adapter mints members of the set.
          if (tboxMetaParents.has(parent)) {
            return OWL_CLASS_NODE;
          }
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
      // The meta-class round-trips through the same two spellings every IR
      // class does — the absolute IRI and the `${namespace}:${localName}`
      // convenience form — checked after the IR map so the IR always wins.
      resolve: (_parent, args: { uri: string }) =>
        ir.classes.get(args.uri) ??
        (args.uri === OWL_CLASS_NODE.uri || args.uri === OWL_CLASS_PREFIXED
          ? OWL_CLASS_NODE
          : null) ??
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

  return {
    ontology,
    ontologyClass,
    classProperty,
    ontologyProperty,
    entityMeta,
    queryFields,
    isClassNode,
  };
}
