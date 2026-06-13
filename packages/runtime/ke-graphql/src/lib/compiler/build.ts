// =============================================================================
// Pass 2 — Build: RawExtraction → OntologyIR
//
// Pure. Constructs the typed class/property graph: transitive superclass
// closure (with cycle detection), subclass inversion, abstract detection from
// the Pass 1 instance stats, range resolution, SHACL cardinality (including
// sh:or most-permissive merging), inverse pair symmetry, and property
// inheritance.
// =============================================================================

import { XSD, XSD_SCALARS } from "./constants.js";
import getLocalName from "./getLocalName.js";
import getNamespace from "./getNamespace.js";
import isStandardVocab from "./isStandardVocab.js";
import type {
  CardinalitySpec,
  ClassNode,
  CustomMappings,
  Diagnostic,
  NamespaceInfo,
  OntologyIR,
  PassResult,
  PropertyNode,
  RangeSpec,
  RawExtraction,
  RawShaclConstraint,
  RawUnion,
} from "./types.js";

const PHASE = "build";

/**
 * Merge SHACL constraints for one (class, property) pair. Plain constraints
 * intersect (most specific wins); sh:or branches union to the most
 * permissive interpretation across alternatives (§4.2 step 5a).
 */
const mergeConstraints = (
  constraints: RawShaclConstraint[],
): { singular: boolean; required: boolean; omit: boolean } => {
  const direct = constraints.filter((c) => !c.fromOr);
  const branches = constraints.filter((c) => c.fromOr);

  let minCount: number | undefined;
  let maxCount: number | undefined;
  for (const c of direct) {
    if (c.minCount !== undefined) {
      minCount = Math.max(minCount ?? 0, c.minCount);
    }
    if (c.maxCount !== undefined) {
      maxCount = Math.min(maxCount ?? Number.POSITIVE_INFINITY, c.maxCount);
    }
  }
  if (branches.length > 0) {
    // Most permissive across branches: min of minCounts, max of maxCounts.
    const branchMin = Math.min(...branches.map((c) => c.minCount ?? 0));
    const branchMax = Math.max(
      ...branches.map((c) => c.maxCount ?? Number.POSITIVE_INFINITY),
    );
    minCount = Math.min(minCount ?? branchMin, branchMin);
    maxCount =
      maxCount === undefined
        ? branchMax === Number.POSITIVE_INFINITY
          ? undefined
          : branchMax
        : Math.max(
            maxCount,
            branchMax === Number.POSITIVE_INFINITY ? maxCount : branchMax,
          );
  }

  return {
    singular: maxCount === 1,
    required: (minCount ?? 0) >= 1,
    omit: maxCount === 0,
  };
};

/**
 * Build the typed OntologyIR from a RawExtraction (Pass 2): class graph
 * with ancestor closure and cycle detection (B001), abstract/embeddable
 * detection, range resolution, SHACL cardinality merging, inverse-pair
 * completion, and property inheritance. Pure.
 */
export default function build(
  extraction: RawExtraction,
  mappings: CustomMappings = {},
): PassResult<OntologyIR> {
  const diagnostics: Diagnostic[] = [];
  const getPrefix = (uri: string): string =>
    extraction.namespaces.get(getNamespace(uri)) ?? "";

  // Custom mappings may be keyed by prefixed name (ds:tier) or full IRI.
  const prefixedToFull = new Map<string, string>();
  for (const [ns, prefix] of extraction.namespaces) {
    prefixedToFull.set(prefix, ns);
  }
  const findMapping = (uri: string) => {
    const direct = mappings[uri];
    if (direct) {
      return direct;
    }
    const prefix = getPrefix(uri);
    return prefix ? mappings[`${prefix}:${getLocalName(uri)}`] : undefined;
  };

  // ── 1. class map ──
  const classes = new Map<string, ClassNode>();
  const rawSuperclasses = new Map<string, string[]>();
  for (const raw of extraction.classes) {
    rawSuperclasses.set(raw.uri, raw.superclasses);
    classes.set(raw.uri, {
      uri: raw.uri,
      label: raw.label ?? getLocalName(raw.uri),
      definition: raw.definition,
      namespace: getPrefix(raw.uri),
      superclasses: raw.superclasses,
      ancestors: [],
      subclasses: [],
      isAbstract: false,
      embeddable: false,
      ownProperties: [],
      allProperties: [],
    });
  }

  // ── 2. transitive closure with cycle detection (B001) ──
  const ancestorCache = new Map<string, string[]>();
  const computeAncestors = (uri: string, trail: string[]): string[] => {
    const cached = ancestorCache.get(uri);
    if (cached) {
      return cached;
    }
    if (trail.includes(uri)) {
      diagnostics.push({
        severity: "error",
        code: "B001",
        message: `subClassOf cycle: ${[...trail, uri].map(getLocalName).join(" → ")}`,
        source: uri,
        phase: PHASE,
      });
      return [];
    }
    const result: string[] = [];
    for (const parent of rawSuperclasses.get(uri) ?? []) {
      if (!classes.has(parent)) {
        continue; // cross-vocabulary parents handled in Pass 3 (V009)
      }
      if (!result.includes(parent)) {
        result.push(parent);
      }
      for (const ancestor of computeAncestors(parent, [...trail, uri])) {
        if (!result.includes(ancestor)) {
          result.push(ancestor);
        }
      }
    }
    ancestorCache.set(uri, result);
    return result;
  };

  for (const node of classes.values()) {
    const ancestors = computeAncestors(node.uri, []);
    classes.set(node.uri, { ...node, ancestors });
  }

  // ── 3. invert subclass relationships ──
  const subclassesOf = new Map<string, string[]>();
  for (const node of classes.values()) {
    for (const parent of node.superclasses) {
      if (!classes.has(parent)) {
        continue;
      }
      const children = subclassesOf.get(parent) ?? [];
      children.push(node.uri);
      subclassesOf.set(parent, children);
    }
  }

  // ── 4. abstract + embeddable detection from instance stats (KG.Q1, KG.13) ──
  for (const node of classes.values()) {
    const stats = extraction.instanceStats.get(node.uri);
    const subclasses = subclassesOf.get(node.uri) ?? [];
    const mapping = findMapping(node.uri);
    const isAbstract =
      mapping?.abstract ?? ((stats?.total ?? 0) === 0 && subclasses.length > 0);
    // Embeddable: instances exist and none are named, or forced by mapping.
    const embeddable =
      mapping?.embeddable ??
      (stats !== undefined && stats.total > 0 && stats.named === 0);
    classes.set(node.uri, {
      ...node,
      ancestors: classes.get(node.uri)?.ancestors ?? [],
      subclasses,
      isAbstract,
      embeddable,
    });
  }

  // ── 5. property map with range resolution ──
  const datatypeByUri = new Map(extraction.datatypes.map((d) => [d.uri, d]));
  const namedUnionByUri = new Map<string, RawUnion>();
  const anonUnionByProperty = new Map<string, RawUnion>();
  for (const union of extraction.unions) {
    if (union.uri) {
      namedUnionByUri.set(union.uri, union);
    }
    if (union.property) {
      anonUnionByProperty.set(union.property, union);
    }
  }

  const resolveRange = (propertyUri: string, ranges: string[]): RangeSpec => {
    const anon = anonUnionByProperty.get(propertyUri);
    if (anon) {
      return { kind: "union", members: anon.members };
    }
    const range = ranges[0];
    if (!range) {
      // No declared range — safety net: treat as String.
      return { kind: "scalar", xsd: `${XSD}string`, graphqlScalar: "String" };
    }
    const scalar = XSD_SCALARS[range];
    if (scalar) {
      return { kind: "scalar", xsd: range, graphqlScalar: scalar };
    }
    const custom = datatypeByUri.get(range);
    if (custom) {
      const base = custom.baseType ?? `${XSD}string`;
      return {
        kind: "scalar",
        xsd: base,
        graphqlScalar: XSD_SCALARS[base] ?? "String",
        customDatatype: range,
      };
    }
    const namedUnion = namedUnionByUri.get(range);
    if (namedUnion) {
      return {
        kind: "union",
        name: getLocalName(range),
        members: namedUnion.members,
      };
    }
    if (classes.has(range)) {
      return { kind: "class", uri: range };
    }
    return { kind: "unknown", raw: range };
  };

  // ── 5a. SHACL cardinality per (class, property) ──
  const constraintsByPair = new Map<string, RawShaclConstraint[]>();
  for (const constraint of extraction.shaclConstraints) {
    const key = `${constraint.targetClass} ${constraint.property}`;
    const list = constraintsByPair.get(key) ?? [];
    list.push(constraint);
    constraintsByPair.set(key, list);
  }

  const properties = new Map<string, PropertyNode>();
  for (const raw of extraction.properties) {
    const classCardinality = new Map<string, CardinalitySpec>();
    let shaclSingularAnywhere = false;
    for (const [key, constraints] of constraintsByPair) {
      const [targetClass, property] = key.split(" ");
      if (property !== raw.uri) {
        continue;
      }
      const merged = mergeConstraints(constraints);
      shaclSingularAnywhere ||= merged.singular;
      if (!targetClass) {
        continue;
      }
      classCardinality.set(targetClass, {
        singular: merged.singular,
        required: merged.required,
        omit: merged.omit,
        source: "shacl",
      });
    }

    // KG.17 precedence: custom > owl:FunctionalProperty > owl:cardinality
    // (not present in current ontologies) > SHACL maxCount 1 > kind default.
    // Datatype properties default to SINGULAR (multi-valued literals are the
    // exception in RDF practice); only object properties default to list.
    const mapping = findMapping(raw.uri);
    const functional =
      mapping?.singular ??
      (extraction.functionals.has(raw.uri) ||
        shaclSingularAnywhere ||
        raw.kind !== "object");

    properties.set(raw.uri, {
      uri: raw.uri,
      label: raw.label ?? getLocalName(raw.uri),
      definition: raw.definition,
      namespace: getPrefix(raw.uri),
      kind: raw.kind,
      domains: raw.domains,
      range: resolveRange(raw.uri, raw.ranges),
      functional,
      classCardinality,
      isAnnotation: raw.kind === "annotation",
      annotations: extraction.annotations.get(raw.uri) ?? new Map(),
    });
  }

  // ── 6. inverse pairs with symmetry verification (V003 in Pass 3) ──
  for (const { property, inverse } of extraction.inverses) {
    const forward = properties.get(property);
    if (forward) {
      properties.set(property, { ...forward, inverse });
    }
    const backward = properties.get(inverse);
    if (backward && backward.inverse === undefined) {
      // Auto-complete asymmetric declarations; Pass 3 reports V003.
      properties.set(inverse, { ...backward, inverse: property });
    }
  }

  // ── 7+8. assign properties to classes, compute inheritance ──
  const ownProperties = new Map<string, string[]>();
  for (const property of properties.values()) {
    if (property.isAnnotation) {
      continue; // annotation properties route to the TBox schema (EC.07)
    }
    for (const domain of property.domains) {
      if (!classes.has(domain)) {
        continue; // unknown domains reported in Pass 3 (B002)
      }
      const list = ownProperties.get(domain) ?? [];
      list.push(property.uri);
      ownProperties.set(domain, list);
    }
    if (property.domains.length === 0) {
      // Domainless (KG.14): assign to every class in the property's namespace.
      for (const node of classes.values()) {
        if (node.namespace === property.namespace) {
          const list = ownProperties.get(node.uri) ?? [];
          list.push(property.uri);
          ownProperties.set(node.uri, list);
        }
      }
    }
  }

  for (const node of classes.values()) {
    const own = ownProperties.get(node.uri) ?? [];
    const all = [...own];
    for (const ancestor of node.ancestors) {
      for (const inherited of ownProperties.get(ancestor) ?? []) {
        if (!all.includes(inherited)) {
          all.push(inherited);
        }
      }
    }
    classes.set(node.uri, {
      ...node,
      ownProperties: own,
      allProperties: all,
    });
  }

  // ── namespaces ──
  const namespaces = new Map<string, NamespaceInfo>();
  for (const [uri, prefix] of extraction.namespaces) {
    if (isStandardVocab(uri)) {
      continue;
    }
    namespaces.set(prefix, {
      prefix,
      uri,
      classCount: [...classes.values()].filter((c) => c.namespace === prefix)
        .length,
      propertyCount: [...properties.values()].filter(
        (p) => p.namespace === prefix,
      ).length,
    });
  }

  return {
    output: { classes, properties, namespaces, extraction },
    diagnostics,
  };
}
