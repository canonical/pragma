// =============================================================================
// Pass 3 — Validate: OntologyIR → OntologyIR (+ diagnostics)
//
// Pure. Reads the IR and the Pass 1 probes, emits the V-series diagnostics.
// Never mutates the IR.
// =============================================================================

import { XSD } from "./constants.js";
import getLocalName from "./getLocalName.js";
import isStandardVocab from "./isStandardVocab.js";
import type { Diagnostic, OntologyIR, PassResult } from "./types.js";

const PHASE = "validate";

/** A class is blank-node-only when it has instances but none are named. */
const isBlankOnly = (ir: OntologyIR, classUri: string): boolean => {
  const stats = ir.extraction.instanceStats.get(classUri);
  return stats !== undefined && stats.total > 0 && stats.named === 0;
};

/**
 * Validate the OntologyIR against the Pass 1 ABox probes (Pass 3): emits
 * the V-series diagnostics (blank-node-only classes, domainless properties,
 * asymmetric inverses, functional violations, SHACL specifics, …) without
 * mutating the IR. Pure.
 */
export default function validate(ir: OntologyIR): PassResult<OntologyIR> {
  const diagnostics: Diagnostic[] = [];
  const push = (d: Omit<Diagnostic, "phase">) =>
    diagnostics.push({ ...d, phase: PHASE });

  for (const node of ir.classes.values()) {
    // V001 — blank-node-only class
    if (isBlankOnly(ir, node.uri)) {
      push({
        severity: "warning",
        code: "V001",
        message: `${getLocalName(node.uri)} instances are exclusively blank nodes — embeddable type`,
        source: node.uri,
      });
    }
    // V015 — class forced abstract (by mapping) yet has direct instances.
    // Those instances' only asserted type is now an interface, so they cannot
    // resolve and are filtered at runtime — the data contradicts the mapping.
    // (The automatic abstract heuristic can't trigger this: it only marks a
    // class abstract when it has zero instances.)
    const abstractStats = ir.extraction.instanceStats.get(node.uri);
    if (node.isAbstract && (abstractStats?.total ?? 0) > 0) {
      push({
        severity: "warning",
        code: "V015",
        message: `${getLocalName(node.uri)} is marked abstract but has ${abstractStats?.total} direct instance(s) — those instances will not resolve`,
        source: node.uri,
      });
    }
    // V016 — concrete class with subclasses (instantiable supertype). A field
    // typed as this class can hold a subclass instance, but graphql-js calls
    // no resolveType on a concrete object type, so the subclass's __typename
    // and fields are unreachable through it. Mark it abstract if it has no
    // direct instances; the interface+companion fix is deferred (A.10 §13).
    if (!node.isAbstract && !node.embeddable && node.subclasses.length > 0) {
      push({
        severity: "warning",
        code: "V016",
        message: `${getLocalName(node.uri)} is a concrete type with ${node.subclasses.length} subclass(es) — values returned through a ${getLocalName(node.uri)} field expose only its own fields, not the subclass's`,
        source: node.uri,
      });
    }
    // V009 — cross-vocabulary subClassOf
    for (const parent of node.superclasses) {
      if (!ir.classes.has(parent) && isStandardVocab(parent)) {
        push({
          severity: "warning",
          code: "V009",
          message: `${getLocalName(node.uri)} subClassOf standard-vocabulary ${parent} — treated as root class`,
          source: node.uri,
        });
      } else if (!ir.classes.has(parent)) {
        push({
          severity: "warning",
          code: "B002",
          message: `${getLocalName(node.uri)} references unknown superclass ${parent}`,
          source: node.uri,
        });
      }
    }
  }

  for (const property of ir.properties.values()) {
    // B002 — unknown domain
    for (const domain of property.domains) {
      if (!ir.classes.has(domain) && !isStandardVocab(domain)) {
        push({
          severity: "warning",
          code: "B002",
          message: `${getLocalName(property.uri)} has unknown domain ${domain}`,
          source: property.uri,
        });
      }
    }
    // B003 — unknown range
    if (property.range.kind === "unknown") {
      push({
        severity: "warning",
        code: "B003",
        message: `${getLocalName(property.uri)} has unknown range ${property.range.raw} — mapped to String`,
        source: property.uri,
      });
    }
    // B004 — unknown inverse
    if (property.inverse && !ir.properties.has(property.inverse)) {
      push({
        severity: "warning",
        code: "B004",
        message: `${getLocalName(property.uri)} declares unknown inverse ${property.inverse}`,
        source: property.uri,
      });
    }
    // V002 — domainless
    if (property.domains.length === 0 && !property.isAnnotation) {
      push({
        severity: "warning",
        code: "V002",
        message: `${getLocalName(property.uri)} has no rdfs:domain — assigned to all ${property.namespace}: classes`,
        source: property.uri,
      });
    }
    // V003 — conflicting inverse declarations (A declares inverse B while
    // B declares inverse C). One-sided declarations are normal OWL and are
    // silently completed in Pass 2 — only contradictions warrant a warning.
    if (property.inverse) {
      const other = ir.properties.get(property.inverse);
      if (other && other.inverse !== property.uri) {
        push({
          severity: "warning",
          code: "V003",
          message: `asymmetric owl:inverseOf between ${getLocalName(property.uri)} and ${getLocalName(property.inverse)}`,
          source: property.uri,
        });
      }
    }
    // V004 — self-referential assertions
    if (ir.extraction.selfReferential.has(property.uri)) {
      push({
        severity: "warning",
        code: "V004",
        message: `${getLocalName(property.uri)} has a self-referential assertion in the data`,
        source: property.uri,
      });
    }
    // V005 — functional violations
    if (ir.extraction.functionalViolations.has(property.uri)) {
      push({
        severity: "warning",
        code: "V005",
        message: `functional property ${getLocalName(property.uri)} has multiple values on some instance`,
        source: property.uri,
      });
    }
    // V006 — boolean range (data stores strings; resolver coerces)
    if (
      property.range.kind === "scalar" &&
      property.range.xsd === `${XSD}boolean`
    ) {
      push({
        severity: "info",
        code: "V006",
        message: `${getLocalName(property.uri)} is xsd:boolean — resolver coerces string literals`,
        source: property.uri,
      });
    }
    // V007 — annotation property routed to TBox
    if (property.isAnnotation) {
      push({
        severity: "info",
        code: "V007",
        message: `annotation property ${getLocalName(property.uri)} routed to TBox schema`,
        source: property.uri,
      });
    }
    // V008 — custom datatype mapped to base scalar
    if (property.range.kind === "scalar" && property.range.customDatatype) {
      push({
        severity: "info",
        code: "V008",
        message: `custom datatype ${getLocalName(property.range.customDatatype)} mapped to ${property.range.graphqlScalar}`,
        source: property.uri,
      });
    }
    // V010/V011/V012 — SHACL specifics
    for (const [classUri, spec] of property.classCardinality) {
      if (spec.omit) {
        push({
          severity: "warning",
          code: "V010",
          message: `${getLocalName(property.uri)} has sh:maxCount 0 on ${getLocalName(classUri)} — field omitted`,
          source: property.uri,
        });
      }
    }
    const fromOr = ir.extraction.shaclConstraints.some(
      (c) => c.property === property.uri && c.fromOr,
    );
    if (fromOr) {
      push({
        severity: "info",
        code: "V011",
        message: `${getLocalName(property.uri)} constrained via sh:or — most permissive interpretation applied`,
        source: property.uri,
      });
    }
    const inConstraint = ir.extraction.shaclConstraints.find(
      (c) => c.property === property.uri && c.inValues?.length,
    );
    if (inConstraint) {
      push({
        severity: "info",
        code: "V012",
        message: `${getLocalName(property.uri)} has sh:in (${inConstraint.inValues?.join(", ")}) — mapped to String, enum deferred`,
        source: property.uri,
      });
    }
    // V013 — multi-domain
    if (property.domains.length > 1) {
      push({
        severity: "warning",
        code: "V013",
        message: `${getLocalName(property.uri)} declares ${property.domains.length} domains — OWL means intersection; field generated on each`,
        source: property.uri,
      });
    }
  }

  // V014 — undeclared ABox predicates
  for (const predicate of ir.extraction.undeclaredPredicates) {
    push({
      severity: "info",
      code: "V014",
      message: `ABox predicate ${predicate} is not declared in any loaded TBox — no field generated`,
      source: predicate,
    });
  }

  return { output: ir, diagnostics };
}
