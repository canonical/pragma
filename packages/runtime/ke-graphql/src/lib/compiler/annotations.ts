// =============================================================================
// Annotation resolution (the head of Pass 2): RawExtraction.graphqlAnnotations
// → GraphqlOverlay (+ the A-band diagnostics).
//
// Pure. Validates every captured `graphql:` assertion — target (A002), value
// kind (A003), term recognition and applicability (A004), conflicts (A001,
// never tiebroken per the no-arbitrary-tiebreak rule), and consumer-config
// shadowing (A005, config wins — the deliberate draft-locally asymmetry) —
// and produces one typed overlay that every consumption site reads as
// `config ?? overlay ?? heuristic`.
//
// Self-annotation is enforced in its strongest CHECKABLE form: the A002
// target rules reject standard-vocabulary targets, unknown namespaces, and
// nonexistent terms of known namespaces. A loaded package annotating another
// LOADED package's term is not distinguishable from that package annotating
// itself (the store merges everything into the default graph — there is no
// per-source provenance); full enforcement is a per-source named-graphs
// follow-up, not this module.
// =============================================================================

import {
  type Diagnostic,
  GRAPHQL_TERMS,
  type GraphqlAnnotationRow,
  type GraphqlClassOverlay,
  type GraphqlOverlay,
  type GraphqlPropertyOverlay,
  getLocalName,
  type PassResult,
  type RawExtraction,
} from "../shared/index.js";
import getNamespace from "./getNamespace.js";
import isStandardVocab from "./isStandardVocab.js";
import type { CustomMapping, CustomMappings } from "./types.js";

// The overlay is resolved at the head of the build pass, so its diagnostics
// carry the build phase — the A band is the annotation-resolution letter.
const PHASE = "build";

/** Which kind of compiled term a vocabulary term may annotate. */
type TargetKind = "class" | "property";

/** One vocabulary term's validation contract: legal targets + value shape. */
interface TermSpec {
  targets: readonly TargetKind[];
  value: "string" | "boolean" | "iri";
}

/**
 * The recognized term table. `graphql:prefix` is absent on purpose: its
 * target is the ontology/namespace subject, not a compiled class/property,
 * and it is routed through the dedicated prefix path before this table is
 * consulted. An IRI in the namespace but missing here is A004.
 */
const TERM_SPECS: Readonly<Record<string, TermSpec>> = {
  [GRAPHQL_TERMS.name]: { targets: ["class", "property"], value: "string" },
  [GRAPHQL_TERMS.singular]: { targets: ["property"], value: "boolean" },
  [GRAPHQL_TERMS.nonNull]: { targets: ["property"], value: "boolean" },
  [GRAPHQL_TERMS.abstract]: { targets: ["class"], value: "boolean" },
  [GRAPHQL_TERMS.embeddable]: { targets: ["class"], value: "boolean" },
  [GRAPHQL_TERMS.inverse]: { targets: ["property"], value: "iri" },
  [GRAPHQL_TERMS.titleFrom]: { targets: ["class"], value: "iri" },
  [GRAPHQL_TERMS.labelFrom]: { targets: ["class"], value: "iri" },
  [GRAPHQL_TERMS.commentFrom]: { targets: ["class"], value: "iri" },
  [GRAPHQL_TERMS.definitionFrom]: { targets: ["class"], value: "iri" },
  [GRAPHQL_TERMS.expose]: { targets: ["class"], value: "boolean" },
  [GRAPHQL_TERMS.searchable]: { targets: ["property"], value: "boolean" },
};

/**
 * Parse the xsd:boolean lexical space — the same four lexicals the runtime
 * coercion accepts (resolver/coerce.ts), so an annotation and a data literal
 * agree on what a boolean is. Undefined = unparseable (A003).
 */
const parseBoolean = (value: string): boolean | undefined => {
  if (value === "true" || value === "1") {
    return true;
  }
  if (value === "false" || value === "0") {
    return false;
  }
  return undefined;
};

/** One (target, term) group of captured rows, in extraction (sorted) order. */
interface Group {
  target: string;
  term: string;
  first: GraphqlAnnotationRow;
  rows: GraphqlAnnotationRow[];
}

/** Render a row's value for a diagnostic: IRIs bracketed, literals quoted. */
const renderValue = ([, , value, kind]: GraphqlAnnotationRow): string =>
  kind === "iri" ? `<${value}>` : JSON.stringify(value);

/**
 * Resolve the captured `graphql:` vocabulary assertions into the typed
 * overlay, validating targets, value kinds, and conflicts (A001–A005). Pure.
 */
export default function resolveGraphqlAnnotations(
  extraction: RawExtraction,
  mappings: CustomMappings = {},
): PassResult<GraphqlOverlay> {
  const diagnostics: Diagnostic[] = [];
  const classes = new Map<string, GraphqlClassOverlay>();
  const properties = new Map<string, GraphqlPropertyOverlay>();
  const prefixes = new Map<string, string>();

  const classUris = new Set(extraction.classes.map((c) => c.uri));
  const propertyUris = new Set(extraction.properties.map((p) => p.uri));

  const forClass = (uri: string): GraphqlClassOverlay => {
    let entry = classes.get(uri);
    if (!entry) {
      entry = {};
      classes.set(uri, entry);
    }
    return entry;
  };
  const forProperty = (uri: string): GraphqlPropertyOverlay => {
    let entry = properties.get(uri);
    if (!entry) {
      entry = {};
      properties.set(uri, entry);
    }
    return entry;
  };

  // ── group rows by (target, term) ──
  // Extraction rows are deduplicated and sorted, so a group's rows are the
  // DISTINCT values asserted for one (target, term) — more than one row IS
  // a conflict — and group order is deterministic.
  const groups = new Map<string, Group>();
  for (const row of extraction.graphqlAnnotations) {
    const key = `${row[0]}\u0000${row[1]}`;
    const group = groups.get(key);
    if (group) {
      group.rows.push(row);
    } else {
      groups.set(key, {
        target: row[0],
        term: row[1],
        first: row,
        rows: [row],
      });
    }
  }

  // graphql:prefix rows are re-keyed by RESOLVED namespace before conflict
  // detection: two subject spellings of one namespace are one declaration
  // set, agreeing or conflicting as a unit.
  const prefixRowsByNs = new Map<string, GraphqlAnnotationRow[]>();

  for (const group of groups.values()) {
    const { target, term } = group;
    const local = getLocalName(term);

    // ── graphql:prefix — namespace-subject routing ──
    if (term === GRAPHQL_TERMS.prefix) {
      const ns = [target, `${target}#`, `${target}/`].find((candidate) =>
        extraction.namespaces.has(candidate),
      );
      if (!ns) {
        diagnostics.push({
          severity: "error",
          code: "A002",
          message: `graphql:prefix subject ${target} does not resolve to a discovered namespace (tried verbatim, +'#', +'/') — declare it on the namespace IRI or the ontology subject`,
          source: target,
          phase: PHASE,
        });
        continue;
      }
      const list = prefixRowsByNs.get(ns) ?? [];
      list.push(...group.rows);
      prefixRowsByNs.set(ns, list);
      continue;
    }

    // ── term recognition (A004) ──
    const spec = TERM_SPECS[term];
    if (!spec) {
      diagnostics.push({
        severity: "warning",
        code: "A004",
        message: `graphql:${local} is not a v1 vocabulary term — the annotation on ${target} is ignored`,
        source: target,
        phase: PHASE,
      });
      continue;
    }

    // ── target validation (A002) ──
    const kind: TargetKind | undefined = classUris.has(target)
      ? "class"
      : propertyUris.has(target)
        ? "property"
        : undefined;
    if (kind === undefined) {
      const reason = isStandardVocab(target)
        ? "is a standard-vocabulary term — the vocabulary cannot rebind what the ontology does not own"
        : extraction.namespaces.has(getNamespace(target))
          ? "is not a declared class or property of the compiled ontology"
          : "is in a namespace hosting no compiled class or property";
      diagnostics.push({
        severity: "error",
        code: "A002",
        message: `graphql:${local} targets ${target}, which ${reason}`,
        source: target,
        phase: PHASE,
      });
      continue;
    }

    // ── applicability (A004) ──
    if (!spec.targets.includes(kind)) {
      const why =
        term === GRAPHQL_TERMS.expose
          ? "graphql:expose applies to classes only — an exposed class emits its full field set, so a field-level form is not minted"
          : `graphql:${local} applies to ${spec.targets.join("/")} targets only`;
      diagnostics.push({
        severity: "warning",
        code: "A004",
        message: `${why}; ${target} is a ${kind} — the annotation is ignored`,
        source: target,
        phase: PHASE,
      });
      continue;
    }

    // ── conflicts (A001) — never tiebroken ──
    // Boolean terms are compared on the PARSED value, not the lexical:
    // xsd:boolean has four lexicals for two values, so `true` and "1" are one
    // assertion twice, not two sources disagreeing — the same "agreeing
    // spellings are one declaration" rule the prefix path applies to subject
    // spellings below. R-9 scopes A001 to genuine DISAGREEMENT.
    // Non-boolean terms and unparseable lexicals keep their kind-qualified
    // lexical identity, so nothing else is merged and the A003 arm still
    // sees the malformed value.
    const distinct = new Map<string | boolean, GraphqlAnnotationRow>();
    for (const row of group.rows) {
      const parsed =
        spec.value === "boolean" && row[3] === "literal"
          ? parseBoolean(row[2])
          : undefined;
      distinct.set(parsed ?? `${row[3]}\u0000${row[2]}`, row);
    }
    const values = [...distinct.values()];
    if (values.length > 1) {
      diagnostics.push({
        severity: "error",
        code: "A001",
        message: `conflicting graphql:${local} values on ${target}: ${values.map(renderValue).join(", ")} — the compiler never picks one; remove all but one assertion`,
        source: target,
        phase: PHASE,
      });
      continue;
    }

    // ── value validation (A003) ──
    const [, , value, valueKind] = group.first;
    if (spec.value === "iri" && valueKind !== "iri") {
      diagnostics.push({
        severity: "error",
        code: "A003",
        message: `graphql:${local} on ${target} needs an IRI value, got the literal ${JSON.stringify(value)}`,
        source: target,
        phase: PHASE,
      });
      continue;
    }
    if (spec.value !== "iri" && valueKind !== "literal") {
      diagnostics.push({
        severity: "error",
        code: "A003",
        message: `graphql:${local} on ${target} needs a ${spec.value} literal, got the IRI <${value}>`,
        source: target,
        phase: PHASE,
      });
      continue;
    }
    let resolved: string | boolean = value;
    if (spec.value === "boolean") {
      const parsed = parseBoolean(value);
      if (parsed === undefined) {
        diagnostics.push({
          severity: "error",
          code: "A003",
          message: `graphql:${local} on ${target} needs a boolean, got ${JSON.stringify(value)} — use true or false`,
          source: target,
          phase: PHASE,
        });
        continue;
      }
      resolved = parsed;
    }

    // ── apply ──
    // The casts are sound by the TERM_SPECS invariant: a term's value shape
    // decided which validation arm `resolved` came through.
    switch (term) {
      case GRAPHQL_TERMS.name:
        if (kind === "class") {
          forClass(target).name = resolved as string;
        } else {
          forProperty(target).name = resolved as string;
        }
        break;
      case GRAPHQL_TERMS.singular:
        forProperty(target).singular = resolved as boolean;
        break;
      case GRAPHQL_TERMS.nonNull:
        forProperty(target).nonNull = resolved as boolean;
        break;
      case GRAPHQL_TERMS.searchable:
        // Overlay capture only — nothing schema-visible reads it in this
        // release (see GraphqlPropertyOverlay.searchable for the boundary).
        forProperty(target).searchable = resolved as boolean;
        break;
      case GRAPHQL_TERMS.abstract:
        forClass(target).abstract = resolved as boolean;
        break;
      case GRAPHQL_TERMS.embeddable:
        forClass(target).embeddable = resolved as boolean;
        break;
      case GRAPHQL_TERMS.expose:
        forClass(target).expose = resolved as boolean;
        break;
      case GRAPHQL_TERMS.inverse:
        // A value that is not a declared property keeps parity with a
        // dangling owl:inverseOf: the pair still joins the IR and Pass 3
        // reports the existing B004 warning.
        forProperty(target).inverse = resolved as string;
        break;
      case GRAPHQL_TERMS.titleFrom:
        forClass(target).titleFrom = resolved as string;
        break;
      case GRAPHQL_TERMS.labelFrom:
        forClass(target).labelFrom = resolved as string;
        break;
      case GRAPHQL_TERMS.commentFrom:
        forClass(target).commentFrom = resolved as string;
        break;
      default:
        // definitionFrom — the last recognized class-descriptive term.
        forClass(target).definitionFrom = resolved as string;
        break;
    }
  }

  // ── graphql:prefix per namespace: conflicts, value kind, application ──
  for (const [ns, rows] of prefixRowsByNs) {
    // Distinct (kind, value) pairs across every subject spelling: two
    // spellings AGREEING on one prefix are one declaration, not a conflict.
    const distinct = new Map<string, GraphqlAnnotationRow>();
    for (const row of rows) {
      distinct.set(`${row[3]}\u0000${row[2]}`, row);
    }
    const values = [...distinct.values()];
    if (values.length > 1) {
      diagnostics.push({
        severity: "error",
        code: "A001",
        message: `conflicting graphql:prefix values for namespace ${ns}: ${values.map(renderValue).join(", ")} — the compiler never picks one; remove all but one assertion`,
        source: ns,
        phase: PHASE,
      });
      continue;
    }
    // Exactly one distinct value remains (every ns entry came from a row).
    for (const [, , value, valueKind] of values) {
      if (valueKind !== "literal") {
        diagnostics.push({
          severity: "error",
          code: "A003",
          message: `graphql:prefix for namespace ${ns} needs a string literal, got the IRI <${value}>`,
          source: ns,
          phase: PHASE,
        });
        continue;
      }
      if (value === "") {
        // The empty prefix is not a declaration in either pass: Pass 1 skips
        // it when collecting declarations (so the registered/synthetic
        // fallback and its E001 apply as if the assertion were absent), and
        // binding it here would key NamespaceInfo — and every node's
        // `namespace` — on "", which `??` cannot tell from "unset".
        diagnostics.push({
          severity: "error",
          code: "A003",
          message: `graphql:prefix for namespace ${ns} is the empty string — declare a non-empty prefix or remove the assertion; the namespace falls back to its registered or synthetic prefix`,
          source: ns,
          phase: PHASE,
        });
        continue;
      }
      prefixes.set(ns, value);
    }
  }

  // ── consumer-config shadowing (A005) ──
  // The R-9 asymmetry, deliberately: the consumer's config is the only
  // workspace-local layer ke has (no per-source provenance), so a config key
  // shadowing an annotation with a DIFFERENT value is the draft-locally
  // workflow — a warning naming both values and the migration, never an
  // error. Same-value duplication is harmless and silent.
  const findMapping = (uri: string): CustomMapping | undefined =>
    mappings[uri] ??
    mappings[
      `${extraction.namespaces.get(getNamespace(uri))}:${getLocalName(uri)}`
    ];
  const shadow = (
    uri: string,
    term: string,
    config: string | boolean | undefined,
    annotation: string | boolean | undefined,
  ): void => {
    if (
      config === undefined ||
      annotation === undefined ||
      config === annotation
    ) {
      return;
    }
    diagnostics.push({
      severity: "warning",
      code: "A005",
      message: `consumer config shadows graphql:${term} on ${uri}: config ${JSON.stringify(config)} wins over the annotation ${JSON.stringify(annotation)} — upstream the value into the ontology and delete the config key`,
      source: uri,
      phase: PHASE,
    });
  };
  for (const [uri, overlay] of classes) {
    const mapping = findMapping(uri);
    if (!mapping) {
      continue;
    }
    shadow(uri, "name", mapping.graphqlName, overlay.name);
    shadow(uri, "abstract", mapping.abstract, overlay.abstract);
    shadow(uri, "embeddable", mapping.embeddable, overlay.embeddable);
  }
  for (const [uri, overlay] of properties) {
    const mapping = findMapping(uri);
    if (!mapping) {
      continue;
    }
    shadow(uri, "name", mapping.graphqlName, overlay.name);
    shadow(uri, "singular", mapping.singular, overlay.singular);
  }

  return { output: { classes, properties, prefixes }, diagnostics };
}
