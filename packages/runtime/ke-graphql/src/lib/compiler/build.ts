// =============================================================================
// Pass 2 — Build: RawExtraction → OntologyIR
//
// Pure. Resolves the graphql: annotation overlay first (annotations.ts, the
// A-band diagnostics), then constructs the typed class/property graph:
// transitive superclass closure (with cycle detection), subclass inversion,
// abstract detection from the Pass 1 instance stats, range resolution, SHACL
// cardinality (including sh:or most-permissive merging), inverse pair
// symmetry, and property inheritance. Every knob the overlay carries is read
// as `config ?? overlay ?? heuristic` — the consumer's config survives,
// deprecated, and wins per key (A005 names the shadowing).
// =============================================================================

import {
  type CardinalitySpec,
  type ClassNode,
  type Diagnostic,
  getLocalName,
  type NamespaceInfo,
  type OntologyIR,
  type PassResult,
  type PropertyNode,
  type RangeSpec,
  type RawExtraction,
  type RawShaclConstraint,
  type RawUnion,
  XSD,
  XSD_SCALARS,
} from "../shared/index.js";
import resolveGraphqlAnnotations from "./annotations.js";
import { DEFAULT_MODE } from "./constants.js";
import getNamespace from "./getNamespace.js";
import isStandardVocab from "./isStandardVocab.js";
import type { CustomMappings, ProjectionMode } from "./types.js";

const PHASE = "build";

/**
 * Merge SHACL constraints for one (class, property) pair. Plain constraints
 * intersect (most specific wins); sh:or branches union to the most
 * permissive interpretation across alternatives.
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
  mode: ProjectionMode = DEFAULT_MODE,
): PassResult<OntologyIR> {
  const diagnostics: Diagnostic[] = [];

  // ── 0. resolve the graphql: annotation overlay (A-band diagnostics) ──
  // Under mode "auto" the resolver DOES NOT RUN — that is the mode's
  // escape-hatch value: an ontology with broken annotations must still
  // compile here, so even A001/A002/A003 stay unraised. Only the honest
  // A006 note fires when assertions are present but unconsulted.
  const resolved =
    mode === "auto"
      ? {
          output: {
            classes: new Map(),
            properties: new Map(),
            prefixes: new Map(),
          },
          diagnostics:
            extraction.graphqlAnnotations.length > 0
              ? [
                  {
                    severity: "info" as const,
                    code: "A006" as const,
                    message: `mode "auto": ${extraction.graphqlAnnotations.length} graphql: annotation assertion(s) present but the overlay is not consulted — heuristics only; use mode "annotated" to bind them`,
                    phase: PHASE,
                  },
                ]
              : [],
        }
      : resolveGraphqlAnnotations(extraction, mappings);
  diagnostics.push(...resolved.diagnostics);
  const overlay = resolved.output;

  // ── the effective namespace → prefix map ──
  // Pass 1 resolves registered > synthetic ONLY; a graphql:prefix declaration
  // binds here, where the mode is known. Under mode "auto" the overlay is
  // empty by construction, so prefixes resolve exactly as they would if the
  // ontology carried no annotation at all — which is what that mode promises.
  // One authority for every prefix reader below: node namespaces, the
  // prefixed-key mapping table, the injectivity guard, and NamespaceInfo.
  const effectiveNamespaces = new Map(extraction.namespaces);
  for (const [ns, prefix] of overlay.prefixes) {
    effectiveNamespaces.set(ns, prefix);
  }

  const getPrefix = (uri: string): string =>
    effectiveNamespaces.get(getNamespace(uri)) ?? "";

  // ── prefix injectivity ──
  // NamespaceInfo is keyed by prefix, so a collision silently last-write-wins
  // and drops a namespace whole. The report turns on the CAUSE. A bound
  // declaration colliding with anything is an annotation conflict the
  // ontology itself can fix: A001, fatal, per the no-arbitrary-tiebreak rule.
  // A collision among registered and serial synthetic prefixes needs no
  // annotation at all — registering the prefix "ns" is enough — so calling it
  // an ANNOTATION conflict would send an operator hunting for graphql:
  // assertions that do not exist, and refusing the compile would reject input
  // that compiled before the vocabulary landed. That case is B005: a warning
  // naming the registration remedy.
  const namespacesByPrefix = new Map<string, string[]>();
  for (const [ns, prefix] of effectiveNamespaces) {
    const list = namespacesByPrefix.get(prefix) ?? [];
    list.push(ns);
    namespacesByPrefix.set(prefix, list);
  }
  for (const [prefix, nsList] of [...namespacesByPrefix].sort(([a], [b]) =>
    a < b ? -1 : 1,
  )) {
    if (nsList.length < 2) {
      continue;
    }
    const claimants = [...nsList].sort().join(", ");
    const shared = `prefix "${prefix}" is claimed by ${nsList.length} namespaces (${claimants}) — the namespace→prefix map must be injective`;
    diagnostics.push(
      nsList.some((ns) => overlay.prefixes.has(ns))
        ? {
            severity: "error",
            code: "A001",
            message: `${shared}; declare distinct graphql:prefix values`,
            source: prefix,
            phase: PHASE,
          }
        : {
            severity: "warning",
            code: "B005",
            message: `${shared}; register a distinct prefix for each in StoreConfig.prefixes`,
            source: prefix,
            phase: PHASE,
          },
    );
  }

  // Custom mappings may be keyed by prefixed name (ds:tier) or full IRI.
  const prefixedToFull = new Map<string, string>();
  for (const [ns, prefix] of effectiveNamespaces) {
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
    /* v8 ignore next -- every uri reaching here is a known class, so it always has a rawSuperclasses entry; the empty-array fallback is unreachable */
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

  // The DFS yields the complete ancestor set, but in pre-order: a parent's
  // whole chain is emitted before the next sibling parent, so in a diamond a
  // grandparent can precede a not-yet-visited sibling parent. Re-walk the
  // closure breadth-first to restore the "most specific first" contract
  // (ancestors ordered by ascending distance from the class).
  const orderByProximity = (
    uri: string,
    members: ReadonlySet<string>,
  ): string[] => {
    const ordered: string[] = [];
    const seen = new Set<string>([uri]);
    let frontier: string[] = [uri];
    while (frontier.length > 0) {
      const next: string[] = [];
      for (const current of frontier) {
        /* v8 ignore next -- current is the class itself or a known-class member, both of which carry a rawSuperclasses entry; the empty-array fallback is unreachable */
        for (const parent of rawSuperclasses.get(current) ?? []) {
          if (seen.has(parent) || !members.has(parent)) {
            continue;
          }
          seen.add(parent);
          ordered.push(parent);
          next.push(parent);
        }
      }
      frontier = next;
    }
    return ordered;
  };

  for (const node of classes.values()) {
    const closure = computeAncestors(node.uri, []);
    const ancestors = orderByProximity(node.uri, new Set(closure));
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

  // ── 4. abstract + embeddable detection from instance stats ──
  // Tri-state per source: config > annotation > heuristic — an explicit
  // `false` at either override level forces the heuristic off.
  for (const node of classes.values()) {
    const stats = extraction.instanceStats.get(node.uri);
    const subclasses = subclassesOf.get(node.uri) ?? [];
    const mapping = findMapping(node.uri);
    const classOverlay = overlay.classes.get(node.uri);
    const isAbstract =
      mapping?.abstract ??
      classOverlay?.abstract ??
      ((stats?.total ?? 0) === 0 && subclasses.length > 0);
    // Embeddable: instances exist and none are named, or forced by
    // mapping/annotation.
    const embeddable =
      mapping?.embeddable ??
      classOverlay?.embeddable ??
      (stats !== undefined && stats.total > 0 && stats.named === 0);
    /* v8 ignore next -- node.uri was populated with its ancestors in the prior closure pass and is still present in the map, so the empty-array fallback is unreachable */
    const ancestors = classes.get(node.uri)?.ancestors ?? [];
    classes.set(node.uri, {
      ...node,
      ancestors,
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

    // Cardinality precedence: custom > graphql:singular annotation >
    // owl:FunctionalProperty > owl:cardinality (not present in current
    // ontologies) > SHACL maxCount 1 > kind default. Datatype properties
    // default to SINGULAR (multi-valued literals are the exception in RDF
    // practice); only object properties default to list.
    const mapping = findMapping(raw.uri);
    // The two EXPLICIT tiers are recorded as such: a per-class SHACL shape is
    // free to override the heuristics below them, but not a value the
    // consumer's config or the ontology's own vocabulary stated outright —
    // otherwise the precedence above holds for a property's default and
    // silently inverts on every class that happens to carry a shape.
    const explicitSingular =
      mapping?.singular ?? overlay.properties.get(raw.uri)?.singular;
    const functional =
      explicitSingular ??
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
      explicitSingular,
      classCardinality,
      isAnnotation: raw.kind === "annotation",
      annotations: extraction.annotations.get(raw.uri) ?? new Map(),
    });
  }

  // ── 6. inverse pairs with symmetry verification (V003 in Pass 3) ──
  // graphql:inverse declarations join the owl:inverseOf pairs with identical
  // declared-pair semantics (dual-direction union at resolve time). They are
  // appended AFTER the owl pairs, so an annotation refines the forward side
  // when both speak; a value that is no declared property rides the same
  // dangling path owl:inverseOf does (B004 in Pass 3, ignored at mapping).
  const annotationInverses = [...overlay.properties].flatMap(
    ([property, propertyOverlay]) =>
      propertyOverlay.inverse !== undefined
        ? [{ property, inverse: propertyOverlay.inverse }]
        : [],
  );
  for (const { property, inverse } of [
    ...extraction.inverses,
    ...annotationInverses,
  ]) {
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
      continue; // annotation properties route to the TBox schema
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
      // Domainless: assign to every class in the property's namespace.
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
  // The overlay's validated prefix leads (same fold as getPrefix), so the
  // NamespaceInfo keying and every node's `namespace` agree on one prefix.
  const namespaces = new Map<string, NamespaceInfo>();
  for (const [uri, prefix] of extraction.namespaces) {
    if (isStandardVocab(uri)) {
      continue;
    }
    const effective = overlay.prefixes.get(uri) ?? prefix;
    namespaces.set(effective, {
      prefix: effective,
      uri,
      classCount: [...classes.values()].filter((c) => c.namespace === effective)
        .length,
      propertyCount: [...properties.values()].filter(
        (p) => p.namespace === effective,
      ).length,
    });
  }

  return {
    output: { classes, properties, namespaces, graphql: overlay, extraction },
    diagnostics,
  };
}
