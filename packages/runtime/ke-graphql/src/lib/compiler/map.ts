// =============================================================================
// Pass 4 — Map: OntologyIR → MappedIR
//
// Pure. OWL names → GraphQL names (custom overrides, has/is stripping, case
// convention, pluralization, collision resolution), range → field type specs,
// resolver template assignment, embeddable/interface interaction, synthetic
// inverse fields, standard-vocab fields, non-null overrides.
// =============================================================================

import {
  type ClassNode,
  type Diagnostic,
  type FieldTypeSpec,
  getLocalName,
  type MappedField,
  type MappedInterface,
  type MappedIR,
  type MappedType,
  type MappedUnion,
  type OntologyIR,
  type PassResult,
  type PropertyNode,
  RESERVED_TYPE_NAMES,
  type ResolverTemplate,
} from "../shared/index.js";
import BidirectionalNameMap from "./BidirectionalNameMap.js";
import { DEFAULT_PREFIXING } from "./constants.js";
import {
  camelize,
  pluralize,
  sanitizeGraphQLName,
  stripVerbPrefix,
} from "./nameMap.js";
import type { CustomMapping, SchemaPluginOptions } from "./types.js";

const PHASE = "map";

/**
 * The field names wireRelay injects on every non-embeddable type (Pass 6).
 * An ontology property that maps onto one of them is DROPPED with an M005
 * error rather than renamed: a same-named ontology field would take the
 * structural field's slot in the merged map and break the Node interface at
 * validateSchema — silently, because the merge keeps the first POSITION but
 * the last VALUE.
 */
const STRUCTURAL_FIELD_NAMES: ReadonlySet<string> = new Set(["uri", "_meta"]);

/** Embeddable types get `_meta` but no `uri` — they have no identity to expose. */
const EMBEDDABLE_STRUCTURAL_FIELD_NAMES: ReadonlySet<string> = new Set([
  "_meta",
]);

/**
 * Under `relay: false` Pass 6 is skipped entirely, so NOTHING structural is
 * ever grafted on and the compiler owns no field names at all. Dropping a
 * property for colliding with `uri` would delete it in favour of a field that
 * never arrives — and M005's message ("a structural field the compiler owns")
 * would be false in that mode.
 */
const NO_STRUCTURAL_FIELD_NAMES: ReadonlySet<string> = new Set();

/** How a consumer resolves an M001/M005 collision — named in both messages. */
const COLLISION_REMEDIES =
  'add a custom mapping (mappings: { "<iri>": { graphqlName: "…" } }) or namespace-prefix every field with prefixing: "all"';

interface MapperState {
  ir: OntologyIR;
  options: SchemaPluginOptions;
  diagnostics: Diagnostic[];
  nameMap: BidirectionalNameMap;
  typeNames: Map<string, string>; // class URI → resolved GraphQL type name
}

/** Find the custom mapping for a URI (full-IRI key first, prefixed key second). */
const findMapping = (
  state: MapperState,
  uri: string,
): CustomMapping | undefined => {
  const direct = state.options.mappings?.[uri];
  if (direct) {
    return direct;
  }
  const ns =
    state.ir.classes.get(uri)?.namespace ??
    state.ir.properties.get(uri)?.namespace;
  return ns
    ? state.options.mappings?.[`${ns}:${getLocalName(uri)}`]
    : undefined;
};

/** Resolve every class URI to its GraphQL type name with collision handling. */
const resolveTypeNames = (state: MapperState): void => {
  const taken = new Set<string>(RESERVED_TYPE_NAMES);
  for (const node of state.ir.classes.values()) {
    const custom = findMapping(state, node.uri)?.graphqlName;
    let name = custom ?? getLocalName(node.uri);
    const sanitized = sanitizeGraphQLName(name);
    if (sanitized !== name) {
      state.diagnostics.push({
        severity: "warning",
        code: "M002",
        message: `class local name "${name}" is not a legal GraphQL name - sanitized to ${sanitized}`,
        source: node.uri,
        phase: PHASE,
      });
      name = sanitized;
    }
    if (taken.has(name) && !custom) {
      // Rule 6a: prefix with PascalCase namespace prefix (M004 info).
      const prefixed =
        node.namespace.charAt(0).toUpperCase() + node.namespace.slice(1) + name;
      state.diagnostics.push({
        severity: "info",
        code: "M004",
        message: `type name ${name} collides with a reserved name — renamed to ${prefixed}`,
        source: node.uri,
        phase: PHASE,
      });
      name = prefixed;
    }
    if (taken.has(name)) {
      state.diagnostics.push({
        severity: "error",
        code: "M001",
        message: `type name ${name} (${node.uri}) collides and cannot be auto-resolved — add a custom mapping`,
        source: node.uri,
        phase: PHASE,
      });
    }
    taken.add(name);
    state.typeNames.set(node.uri, name);
    state.nameMap.set(node.uri, name);
  }
};

/**
 * Apply the `prefixing` policy to a generated field name: under
 * `prefixing: "all"` every field carries its property's namespace prefix
 * (`ex:uri` → `exUri`), which is the schema-wide remedy for M001/M005. The
 * `"x"` fallback covers a predicate that is not a known ontology property
 * (a standard-vocab field's predicate, typically).
 */
const applyPrefixing = (
  state: MapperState,
  owlUri: string,
  name: string,
): string => {
  if ((state.options.prefixing ?? DEFAULT_PREFIXING) !== "all") {
    return name;
  }
  const namespace = state.ir.properties.get(owlUri)?.namespace ?? "x";
  return `${namespace}${name.charAt(0).toUpperCase()}${name.slice(1)}`;
};

/** Compute the GraphQL field name for a property. */
const computeFieldName = (
  state: MapperState,
  property: PropertyNode,
  isList: boolean,
): string => {
  const custom = findMapping(state, property.uri)?.graphqlName;
  if (custom) {
    return custom; // an explicit graphqlName is authoritative — never prefixed
  }
  let name = stripVerbPrefix(getLocalName(property.uri));
  if (isList) {
    name = pluralize(name);
  }
  return applyPrefixing(state, property.uri, sanitizeGraphQLName(name));
};

/** Compute the GraphQL field type spec for a property's resolved range. */
const computeFieldType = (
  state: MapperState,
  property: PropertyNode,
): FieldTypeSpec => {
  switch (property.range.kind) {
    case "scalar":
      return { kind: "scalar", name: property.range.graphqlScalar };
    case "class": {
      const name = state.typeNames.get(property.range.uri);
      return name ? { kind: "type", name } : { kind: "scalar", name: "String" };
    }
    case "union": {
      const name =
        property.range.name ??
        `${getLocalName(property.uri).charAt(0).toUpperCase()}${getLocalName(property.uri).slice(1)}Union`;
      // Abstract members expand to concrete descendants.
      const members: string[] = [];
      for (const member of property.range.members) {
        const node = state.ir.classes.get(member);
        if (!node) {
          continue;
        }
        if (node.isAbstract) {
          for (const sub of collectConcreteDescendants(state.ir, node)) {
            const subName = state.typeNames.get(sub);
            if (subName && !members.includes(subName)) {
              members.push(subName);
            }
          }
        } else {
          const memberName = state.typeNames.get(member);
          if (memberName && !members.includes(memberName)) {
            members.push(memberName);
          }
        }
      }
      return { kind: "union", name, members };
    }
    case "unknown":
      return { kind: "scalar", name: "String" };
  }
};

/** Collect the URIs of a class's concrete (non-abstract) descendants, cycle-safe. */
const collectConcreteDescendants = (
  ir: OntologyIR,
  node: ClassNode,
): string[] => {
  const result: string[] = [];
  const visited = new Set<string>();
  const walk = (uri: string) => {
    if (visited.has(uri)) {
      return; // subClassOf cycles (B001) must not overflow the stack
    }
    visited.add(uri);
    const current = ir.classes.get(uri);
    if (!current) {
      return;
    }
    if (!current.isAbstract) {
      result.push(uri);
    }
    for (const sub of current.subclasses) {
      walk(sub);
    }
  };
  walk(node.uri);
  return result;
};

/** Is the property's range an embeddable class? */
const isEmbeddedRange = (state: MapperState, property: PropertyNode): boolean =>
  property.range.kind === "class" &&
  (state.ir.classes.get(property.range.uri)?.embeddable ?? false);

/** Cardinality of a property on a specific class (per-class SHACL first). */
const isSingularOn = (
  property: PropertyNode,
  classUri: string,
  ancestors: readonly string[],
): { singular: boolean; required: boolean; omit: boolean } => {
  for (const uri of [classUri, ...ancestors]) {
    const spec = property.classCardinality.get(uri);
    if (spec) {
      return spec;
    }
  }
  return { singular: property.functional, required: false, omit: false };
};

/** Choose the resolver template for a field from its kind, cardinality, and type. */
const chooseTemplate = (
  property: PropertyNode,
  singular: boolean,
  embedded: boolean,
  fieldType: FieldTypeSpec,
): ResolverTemplate => {
  // Decide from the RESOLVED type: an object property whose range fell back
  // to String (unknown range, B003) must resolve its URI values as strings,
  // not hand Connection shapes to a String field.
  if (property.kind !== "object" || fieldType.kind === "scalar") {
    return singular ? "datatype" : "datatype-list";
  }
  if (embedded) {
    return singular ? "embedded-singular" : "embedded-list";
  }
  return singular ? "object-singular" : "object-list";
};

/** Build the MappedFields for one class (own + inherited). */
const buildFields = (
  state: MapperState,
  node: ClassNode,
  typeName: string,
): Map<string, MappedField> => {
  const fields = new Map<string, MappedField>();
  const structural =
    state.options.relay === false
      ? NO_STRUCTURAL_FIELD_NAMES
      : node.embeddable
        ? EMBEDDABLE_STRUCTURAL_FIELD_NAMES
        : STRUCTURAL_FIELD_NAMES;

  const addField = (field: MappedField) => {
    // A silent rename is worse than a loud drop: the consumer's query breaks
    // either way, but only the drop tells them which IRI caused it.
    if (structural.has(field.graphqlName)) {
      state.diagnostics.push({
        severity: "error",
        code: "M005",
        message: `${field.owlUri} maps to ${typeName}.${field.graphqlName}, a structural field the compiler owns — the field is DROPPED. To keep it, ${COLLISION_REMEDIES}`,
        source: field.owlUri,
        phase: PHASE,
      });
      return;
    }
    const existing = fields.get(field.graphqlName);
    if (existing) {
      state.diagnostics.push({
        severity: "error",
        code: "M001",
        message: `${existing.owlUri} and ${field.owlUri} both map to ${typeName}.${field.graphqlName} — the second is DROPPED. To keep both, ${COLLISION_REMEDIES}`,
        source: field.owlUri,
        phase: PHASE,
      });
      return;
    }
    fields.set(field.graphqlName, field);
    state.nameMap.set(field.owlUri, field.graphqlName);
  };

  // Declared + inherited properties.
  for (const propertyUri of node.allProperties) {
    const property = state.ir.properties.get(propertyUri);
    if (!property || property.isAnnotation) {
      continue;
    }
    const { singular, omit } = isSingularOn(property, node.uri, node.ancestors);
    if (omit) {
      continue; // SHACL sh:maxCount 0 (V010)
    }
    const required = isSingularOn(property, node.uri, node.ancestors).required;
    const embedded = isEmbeddedRange(state, property);
    const list = !singular;
    const name = computeFieldName(state, property, list);
    const nonNull =
      state.options.nonNullOverrides?.[typeName]?.includes(name) ?? false;
    // Declared owl:inverseOf pair: the ABox may assert either direction, so
    // each side resolves the union of forward + reverse assertions.
    // List sides switch to the inverse template; singular sides keep their
    // template but carry inverseOf for the reverse fallback.
    const fieldType = computeFieldType(state, property);
    const declaredInverse =
      property.kind === "object" && fieldType.kind === "type" && !embedded
        ? property.inverse
        : undefined;
    addField({
      owlUri: property.uri,
      graphqlName: name,
      type: fieldType,
      nullable: !nonNull,
      list,
      resolverTemplate:
        declaredInverse && list
          ? "inverse"
          : chooseTemplate(property, singular, embedded, fieldType),
      propertyUri: property.uri,
      inverseOf: declaredInverse,
      shaclRequired: required,
      nonNull,
    });
  }

  // Synthetic + declared inverse fields (Template 4).
  for (const property of state.ir.properties.values()) {
    if (property.kind !== "object" || property.range.kind !== "class") {
      continue;
    }
    const rangeUri = property.range.uri;
    const appliesHere =
      rangeUri === node.uri || node.ancestors.includes(rangeUri);
    if (!appliesHere) {
      continue;
    }
    const synthetic = findMapping(state, property.uri)?.inverse;
    const declared = property.inverse
      ? state.ir.properties.get(property.inverse)
      : undefined;
    // Declared pairs: each side keeps its own forward field — the
    // dual-direction union happens in the resolver, not via an extra field.
    if (declared || !synthetic) {
      continue;
    }
    const name = synthetic.graphqlName;
    addField({
      owlUri: `${property.uri}#inverse`,
      graphqlName: name,
      type: {
        kind: "type",
        name: state.typeNames.get(property.domains[0] ?? "") ?? "Node",
      },
      nullable: false,
      list: true,
      resolverTemplate: "inverse",
      propertyUri: property.uri,
      inverseOf: property.uri,
      shaclRequired: false,
      nonNull: true,
    });
  }

  // Opt-in instance-level standard-vocab fields (deprecated — superseded by
  // the graphql:*From annotations). They share the prefixing policy and the
  // collision rules with every other field: no special case.
  const vocabFields = state.options.standardVocabFields?.[typeName];
  if (vocabFields) {
    for (const [predicate, name] of Object.entries(vocabFields)) {
      addField({
        owlUri: predicate,
        graphqlName: applyPrefixing(state, predicate, name),
        type: { kind: "scalar", name: "String" },
        nullable: true,
        list: false,
        resolverTemplate: "datatype",
        propertyUri: predicate,
        shaclRequired: false,
        nonNull: false,
      });
    }
  }

  return fields;
};

/**
 * An interface qualifies for embeddable implementors only when every
 * concrete descendant is embeddable (no uri/_meta on the interface then).
 */
const isInterfaceEmbeddable = (ir: OntologyIR, node: ClassNode): boolean =>
  collectConcreteDescendants(ir, node).every((uri) => {
    /* v8 ignore next -- descendant URIs come from the class map, so the lookup always resolves and the false fallback is unreachable */
    return ir.classes.get(uri)?.embeddable ?? false;
  });

/**
 * Map the OntologyIR to the GraphQL-shaped MappedIR (Pass 4): resolved type
 * and field names, field type specs, resolver template assignments, and the
 * bidirectional name map. Pure.
 */
export default function map(
  ir: OntologyIR,
  options: SchemaPluginOptions = {},
): PassResult<MappedIR> {
  const diagnostics: Diagnostic[] = [];
  const state: MapperState = {
    ir,
    options,
    diagnostics,
    nameMap: new BidirectionalNameMap(),
    typeNames: new Map(),
  };

  // Report custom mappings that reference nothing (M003).
  for (const key of Object.keys(options.mappings ?? {})) {
    const full = ir.classes.has(key) || ir.properties.has(key);
    const prefixed = [...ir.classes.values(), ...ir.properties.values()].some(
      (n) => `${n.namespace}:${getLocalName(n.uri)}` === key,
    );
    if (!full && !prefixed) {
      diagnostics.push({
        severity: "warning",
        code: "M003",
        message: `custom mapping ${key} references no known class or property`,
        source: key,
        phase: PHASE,
      });
    }
  }

  resolveTypeNames(state);

  const types = new Map<string, MappedType>();
  const interfaces = new Map<string, MappedInterface>();
  const unions = new Map<string, MappedUnion>();

  for (const node of ir.classes.values()) {
    const typeName = state.typeNames.get(node.uri);
    /* v8 ignore next 3 -- resolveTypeNames assigns a name to every class in this same map, so a class without a resolved type name is unreachable */
    if (!typeName) {
      continue;
    }
    const fields = buildFields(state, node, typeName);
    // Field-name reverse lookups are scoped per type and served from
    // MappedType.fields (EntityMeta.field resolves through it) — the
    // global NameMap carries type names plus a best-effort property entry.

    if (node.isAbstract) {
      const parentInterfaces = node.ancestors
        .map((a) => state.typeNames.get(a))
        .filter((n): n is string => n !== undefined)
        .filter((n) => {
          /* v8 ignore next -- every resolved type name was registered in the name map alongside its URI, so the reverse lookup always resolves and the empty-string fallback is unreachable */
          const ownerUri = state.nameMap.toOWL(n) ?? "";
          return ir.classes.get(ownerUri)?.isAbstract;
        });
      interfaces.set(typeName, {
        owlUri: node.uri,
        graphqlName: typeName,
        parentInterfaces,
        fields,
      });
      continue;
    }

    // Embeddable types implement an ancestor interface only when that
    // interface itself is embeddable-safe (all implementors embeddable).
    const implemented = node.ancestors
      .map((a) => ir.classes.get(a))
      .filter((a): a is ClassNode => Boolean(a?.isAbstract))
      .filter((a) => !node.embeddable || isInterfaceEmbeddable(ir, a))
      .map((a) => state.typeNames.get(a.uri))
      .filter((n): n is string => n !== undefined);

    types.set(typeName, {
      owlUri: node.uri,
      graphqlName: typeName,
      interfaces: implemented,
      fields,
      embeddable: node.embeddable,
      namespace: node.namespace,
      singularName: camelize(typeName),
      pluralName: pluralize(camelize(typeName)),
    });
  }

  // Collect union specs from field types.
  for (const container of [...types.values(), ...interfaces.values()]) {
    for (const field of container.fields.values()) {
      if (field.type.kind === "union" && !unions.has(field.type.name)) {
        unions.set(field.type.name, {
          name: field.type.name,
          members: field.type.members,
        });
        diagnostics.push({
          severity: "info",
          code: field.type.name.endsWith("Union") ? "X003" : "X002",
          message: `union ${field.type.name} = ${field.type.members.join(" | ")}`,
          phase: PHASE,
        });
      }
    }
  }

  return {
    output: {
      types,
      interfaces,
      unions,
      nameMap: state.nameMap,
      namespaces: ir.namespaces,
      ir,
    },
    diagnostics,
  };
}
