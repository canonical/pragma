// =============================================================================
// Pass 1 — Extract: ke store → RawExtraction
//
// The only pass that touches the store. Twelve SPARQL queries: eight TBox
// queries plus four ABox probes that keep Passes 2–7 pure. Queries use
// absolute IRIs so they are independent of registered prefixes, and consume
// ke's term-preserving results (termBindings) so that NamedNodes, literals,
// and blank nodes are distinguishable.
// =============================================================================

import type { SelectResult, Term } from "@canonical/ke";
import {
  type Diagnostic,
  type InstanceStats,
  type PassResult,
  type QueryFn,
  type RawClass,
  type RawDatatype,
  type RawExtraction,
  type RawProperty,
  type RawPropertyKind,
  type RawShaclConstraint,
  type RawUnion,
  RDF_TYPE,
  RDFS_LABEL,
} from "#shared";
import {
  OWL_ANNOTATION_PROPERTY,
  OWL_CLASS,
  OWL_DATATYPE_PROPERTY,
  OWL_FUNCTIONAL_PROPERTY,
  OWL_INVERSE_OF,
  OWL_OBJECT_PROPERTY,
  OWL_ON_DATATYPE,
  OWL_UNION_OF,
  OWL_WITH_RESTRICTIONS,
  RDF_FIRST,
  RDF_REST,
  RDFS_COMMENT,
  RDFS_DOMAIN,
  RDFS_RANGE,
  RDFS_SUBCLASS_OF,
  SH_IN,
  SH_MAX_COUNT,
  SH_MIN_COUNT,
  SH_OR,
  SH_PATH,
  SH_PROPERTY,
  SH_TARGET_CLASS,
  SKOS_DEFINITION,
  XSD_PATTERN,
} from "./constants.js";
import getNamespace from "./getNamespace.js";
import isStandardVocab from "./isStandardVocab.js";

const PHASE = "extract";

/**
 * Run a SELECT and return its term-preserving rows, or [] plus an E001
 * diagnostic when the query fails or returns a non-SELECT result.
 *
 * @note Impure — executes a SPARQL query against the store through the
 * provided query function.
 */
const select = async (
  query: QueryFn,
  sparqlText: string,
  diagnostics: Diagnostic[],
  label: string,
): Promise<SelectResult["termBindings"]> => {
  try {
    const result = await query(sparqlText);
    if (result.type !== "select") {
      diagnostics.push({
        severity: "error",
        code: "E001",
        message: `${label}: expected SELECT result, got ${result.type}`,
        phase: PHASE,
      });
      return [];
    }
    return result.termBindings;
  } catch (error) {
    diagnostics.push({
      severity: "error",
      code: "E001",
      message: `${label}: ${error instanceof Error ? error.message : String(error)}`,
      phase: PHASE,
    });
    return [];
  }
};

/** Get a term's IRI when it is a NamedNode, undefined otherwise. */
const getNamedValue = (term: Term | undefined): string | undefined =>
  term?.termType === "NamedNode" ? term.value : undefined;

/** Get a term's lexical value when it is a Literal, undefined otherwise. */
const getLiteralValue = (term: Term | undefined): string | undefined =>
  term?.termType === "Literal" ? term.value : undefined;

/** Get a literal term parsed as a base-10 integer, undefined when not parseable. */
const getIntValue = (term: Term | undefined): number | undefined => {
  const value = getLiteralValue(term);
  if (value === undefined) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
};

/**
 * Extract the TBox structure and ABox probes from a ke store as a
 * RawExtraction (Pass 1) — the only pipeline step that queries the store.
 *
 * @note Impure — executes the twelve extraction SPARQL queries against the
 * store through the provided query function.
 */
export default async function extract(
  query: QueryFn,
  prefixes: Readonly<Record<string, string>>,
): Promise<PassResult<RawExtraction>> {
  const diagnostics: Diagnostic[] = [];

  // ── Q1: classes with labels, definitions, superclasses ──
  // Blank-node superclasses (owl:Restriction) are excluded with isIRI.
  const classRows = await select(
    query,
    `SELECT ?class ?label ?definition ?comment ?superclass WHERE {
      ?class <${RDF_TYPE}> <${OWL_CLASS}> .
      FILTER(isIRI(?class))
      OPTIONAL { ?class <${RDFS_LABEL}> ?label }
      OPTIONAL { ?class <${SKOS_DEFINITION}> ?definition }
      OPTIONAL { ?class <${RDFS_COMMENT}> ?comment }
      OPTIONAL { ?class <${RDFS_SUBCLASS_OF}> ?superclass . FILTER(isIRI(?superclass)) }
    }`,
    diagnostics,
    "Q1 classes",
  );

  const classMap = new Map<string, RawClass>();
  for (const row of classRows) {
    const uri = getNamedValue(row.class);
    if (!uri || isStandardVocab(uri)) {
      continue;
    }
    const entry = classMap.get(uri) ?? { uri, superclasses: [] };
    entry.label ??= getLiteralValue(row.label);
    entry.definition ??=
      getLiteralValue(row.definition) ?? getLiteralValue(row.comment);
    const superclass = getNamedValue(row.superclass);
    if (superclass && !entry.superclasses.includes(superclass)) {
      entry.superclasses.push(superclass);
    }
    classMap.set(uri, entry);
  }

  // ── Q2: properties with kind, domains, ranges ──
  const propertyRows = await select(
    query,
    `SELECT ?prop ?kind ?label ?definition ?comment ?domain ?range WHERE {
      ?prop <${RDF_TYPE}> ?kind .
      VALUES ?kind { <${OWL_OBJECT_PROPERTY}> <${OWL_DATATYPE_PROPERTY}> <${OWL_ANNOTATION_PROPERTY}> }
      OPTIONAL { ?prop <${RDFS_LABEL}> ?label }
      OPTIONAL { ?prop <${SKOS_DEFINITION}> ?definition }
      OPTIONAL { ?prop <${RDFS_COMMENT}> ?comment }
      OPTIONAL { ?prop <${RDFS_DOMAIN}> ?domain }
      OPTIONAL { ?prop <${RDFS_RANGE}> ?range . FILTER(isIRI(?range)) }
    }`,
    diagnostics,
    "Q2 properties",
  );

  const resolveKind = (kindUri: string | undefined): RawPropertyKind => {
    if (kindUri === OWL_DATATYPE_PROPERTY) {
      return "datatype";
    }
    if (kindUri === OWL_ANNOTATION_PROPERTY) {
      return "annotation";
    }
    return "object";
  };

  const propertyMap = new Map<string, RawProperty>();
  for (const row of propertyRows) {
    const uri = getNamedValue(row.prop);
    if (!uri || isStandardVocab(uri)) {
      continue;
    }
    const entry = propertyMap.get(uri) ?? {
      uri,
      kind: resolveKind(getNamedValue(row.kind)),
      domains: [],
      ranges: [],
    };
    entry.label ??= getLiteralValue(row.label);
    entry.definition ??=
      getLiteralValue(row.definition) ?? getLiteralValue(row.comment);
    const domain = getNamedValue(row.domain);
    if (domain && !entry.domains.includes(domain)) {
      entry.domains.push(domain);
    }
    const range = getNamedValue(row.range);
    if (range && !entry.ranges.includes(range)) {
      entry.ranges.push(range);
    }
    propertyMap.set(uri, entry);
  }

  // ── Q3: inverse declarations ──
  const inverseRows = await select(
    query,
    `SELECT ?prop ?inverse WHERE { ?prop <${OWL_INVERSE_OF}> ?inverse }`,
    diagnostics,
    "Q3 inverses",
  );
  const inverses = inverseRows.flatMap((row) => {
    const property = getNamedValue(row.prop);
    const inverse = getNamedValue(row.inverse);
    return property && inverse ? [{ property, inverse }] : [];
  });

  // ── Q4: functional property markers ──
  const functionalRows = await select(
    query,
    `SELECT ?prop WHERE { ?prop <${RDF_TYPE}> <${OWL_FUNCTIONAL_PROPERTY}> }`,
    diagnostics,
    "Q4 functionals",
  );
  const functionals = new Set(
    functionalRows.flatMap((row) => getNamedValue(row.prop) ?? []),
  );

  // ── Q5: custom datatypes ──
  // Keyed on the structural marker owl:onDatatype rather than the rdf:type:
  // the published cs: ontology types its datatype `a owl:Datatype` (a
  // non-standard term) while ds: uses `a rdfs:Datatype` — the restriction
  // structure is what actually identifies a custom datatype. The
  // owl:withRestrictions RDF list is walked with rdf:rest*/rdf:first so a
  // pattern facet is found at any list position.
  const datatypeRows = await select(
    query,
    `SELECT ?dt ?base ?pattern WHERE {
      ?dt <${OWL_ON_DATATYPE}> ?base .
      FILTER(isIRI(?dt))
      OPTIONAL {
        ?dt <${OWL_WITH_RESTRICTIONS}> ?list .
        ?list <${RDF_REST}>*/<${RDF_FIRST}> ?restriction .
        ?restriction <${XSD_PATTERN}> ?pattern .
      }
    }`,
    diagnostics,
    "Q5 datatypes",
  );
  const datatypeMap = new Map<string, RawDatatype>();
  for (const row of datatypeRows) {
    const uri = getNamedValue(row.dt);
    if (!uri || isStandardVocab(uri)) {
      continue;
    }
    const entry = datatypeMap.get(uri) ?? { uri };
    entry.baseType ??= getNamedValue(row.base);
    entry.pattern ??= getLiteralValue(row.pattern);
    datatypeMap.set(uri, entry);
  }

  // ── Q6: namespace discovery (in code, from Q1+Q2, cross-referenced with
  //        the store's registered prefixes) ──
  const namespaces = new Map<string, string>();
  const uriToPrefix = new Map<string, string>();
  for (const [prefix, ns] of Object.entries(prefixes)) {
    uriToPrefix.set(ns, prefix);
  }
  const discovered = new Set<string>();
  for (const uri of [...classMap.keys(), ...propertyMap.keys()]) {
    discovered.add(getNamespace(uri));
  }
  let anonymous = 0;
  for (const ns of discovered) {
    let prefix = uriToPrefix.get(ns);
    if (!prefix) {
      prefix = `ns${anonymous++ || ""}`;
      diagnostics.push({
        severity: "warning",
        code: "E001",
        message: `namespace ${ns} has no registered prefix — assigned synthetic "${prefix}". Register it in StoreConfig.prefixes: it drives global IDs (KG.10)`,
        source: ns,
        phase: PHASE,
      });
    }
    namespaces.set(ns, prefix);
  }

  // ── Q7a: direct SHACL cardinality constraints ──
  const shaclConstraints: RawShaclConstraint[] = [];
  const directShaclRows = await select(
    query,
    `SELECT ?targetClass ?path ?minCount ?maxCount ?inList WHERE {
      ?shape <${SH_TARGET_CLASS}> ?targetClass ;
             <${SH_PROPERTY}> ?propShape .
      ?propShape <${SH_PATH}> ?path .
      OPTIONAL { ?propShape <${SH_MIN_COUNT}> ?minCount }
      OPTIONAL { ?propShape <${SH_MAX_COUNT}> ?maxCount }
      OPTIONAL { ?propShape <${SH_IN}> ?inList }
    }`,
    diagnostics,
    "Q7a shacl direct",
  );

  // sh:in values are an RDF list; resolve them per constraint.
  const shIn = new Map<string, string[]>();
  const inListRows = await select(
    query,
    `SELECT ?path ?value WHERE {
      ?propShape <${SH_PATH}> ?path ;
                 <${SH_IN}> ?list .
      ?list <${RDF_REST}>*/<${RDF_FIRST}> ?value .
    }`,
    diagnostics,
    "Q7a sh:in values",
  );
  for (const row of inListRows) {
    const path = getNamedValue(row.path);
    const value = getLiteralValue(row.value) ?? getNamedValue(row.value);
    if (!path || value === undefined) {
      continue;
    }
    const values = shIn.get(path) ?? [];
    values.push(value);
    shIn.set(path, values);
  }

  for (const row of directShaclRows) {
    const targetClass = getNamedValue(row.targetClass);
    const path = getNamedValue(row.path);
    if (!targetClass || !path) {
      continue;
    }
    shaclConstraints.push({
      targetClass,
      property: path,
      minCount: getIntValue(row.minCount),
      maxCount: getIntValue(row.maxCount),
      inValues: row.inList ? shIn.get(path) : undefined,
    });
  }

  // ── Q7b: SHACL sh:or branches ──
  // sh:or points at an RDF list of branch blank nodes; each branch carries
  // its own sh:property shapes. The direct pattern in Q7a cannot see them.
  const orShaclRows = await select(
    query,
    `SELECT ?targetClass ?path ?minCount ?maxCount WHERE {
      ?shape <${SH_TARGET_CLASS}> ?targetClass ;
             <${SH_OR}> ?orList .
      ?orList <${RDF_REST}>*/<${RDF_FIRST}> ?branch .
      ?branch <${SH_PROPERTY}> ?propShape .
      ?propShape <${SH_PATH}> ?path .
      OPTIONAL { ?propShape <${SH_MIN_COUNT}> ?minCount }
      OPTIONAL { ?propShape <${SH_MAX_COUNT}> ?maxCount }
    }`,
    diagnostics,
    "Q7b shacl sh:or",
  );
  for (const row of orShaclRows) {
    const targetClass = getNamedValue(row.targetClass);
    const path = getNamedValue(row.path);
    if (!targetClass || !path) {
      continue;
    }
    shaclConstraints.push({
      targetClass,
      property: path,
      minCount: getIntValue(row.minCount),
      maxCount: getIntValue(row.maxCount),
      fromOr: true,
    });
  }

  // ── Q8: union declarations (named classes and anonymous ranges) ──
  const unions: RawUnion[] = [];
  const namedUnionRows = await select(
    query,
    `SELECT ?class ?member WHERE {
      ?class <${RDF_TYPE}> <${OWL_CLASS}> ;
             <${OWL_UNION_OF}> ?list .
      FILTER(isIRI(?class))
      ?list <${RDF_REST}>*/<${RDF_FIRST}> ?member .
    }`,
    diagnostics,
    "Q8 named unions",
  );
  const namedUnions = new Map<string, string[]>();
  for (const row of namedUnionRows) {
    const uri = getNamedValue(row.class);
    const member = getNamedValue(row.member);
    if (!uri || !member) {
      continue;
    }
    const members = namedUnions.get(uri) ?? [];
    members.push(member);
    namedUnions.set(uri, members);
  }
  for (const [uri, members] of namedUnions) {
    unions.push({ uri, members });
  }

  const anonUnionRows = await select(
    query,
    `SELECT ?property ?member WHERE {
      ?property <${RDFS_RANGE}> ?range .
      FILTER(isBlank(?range))
      ?range <${OWL_UNION_OF}> ?list .
      ?list <${RDF_REST}>*/<${RDF_FIRST}> ?member .
    }`,
    diagnostics,
    "Q8 anonymous unions",
  );
  const anonUnions = new Map<string, string[]>();
  for (const row of anonUnionRows) {
    const property = getNamedValue(row.property);
    const member = getNamedValue(row.member);
    if (!property || !member) {
      continue;
    }
    const members = anonUnions.get(property) ?? [];
    members.push(member);
    anonUnions.set(property, members);
  }
  for (const [property, members] of anonUnions) {
    unions.push({ property, members });
  }

  // ── Q9: instance stats per class (abstract + embeddable detection) ──
  const statsRows = await select(
    query,
    `SELECT ?class (COUNT(?i) AS ?total) (SUM(IF(isBlank(?i), 0, 1)) AS ?named) WHERE {
      ?i <${RDF_TYPE}> ?class .
    } GROUP BY ?class`,
    diagnostics,
    "Q9 instance stats",
  );
  const instanceStats = new Map<string, InstanceStats>();
  for (const row of statsRows) {
    const uri = getNamedValue(row.class);
    const total = getIntValue(row.total);
    if (!uri || total === undefined) {
      continue;
    }
    instanceStats.set(uri, { total, named: getIntValue(row.named) ?? 0 });
  }

  // ── Q10: self-referential assertions (V004) ──
  const selfRows = await select(
    query,
    `SELECT DISTINCT ?p WHERE { ?s ?p ?s }`,
    diagnostics,
    "Q10 self-referential",
  );
  const selfReferential = new Set(
    selfRows.flatMap((row) => getNamedValue(row.p) ?? []),
  );

  // ── Q11: functional property violations (V005) ──
  const functionalViolations = new Set<string>();
  if (functionals.size > 0) {
    const values = [...functionals].map((uri) => `<${uri}>`).join(" ");
    const violationRows = await select(
      query,
      `SELECT DISTINCT ?p WHERE {
        VALUES ?p { ${values} }
        ?s ?p ?o1 , ?o2 .
        FILTER(?o1 != ?o2)
      }`,
      diagnostics,
      "Q11 functional violations",
    );
    for (const row of violationRows) {
      const uri = getNamedValue(row.p);
      if (uri) {
        functionalViolations.add(uri);
      }
    }
  }

  // ── Q12: undeclared ABox predicates (V014) ──
  const predicateRows = await select(
    query,
    `SELECT DISTINCT ?p WHERE { ?s ?p ?o }`,
    diagnostics,
    "Q12 predicates",
  );
  const undeclaredPredicates = new Set<string>();
  for (const row of predicateRows) {
    const uri = getNamedValue(row.p);
    if (!uri || isStandardVocab(uri) || propertyMap.has(uri)) {
      continue;
    }
    // Predicates inside a declared namespace but missing from the TBox.
    if (namespaces.has(getNamespace(uri))) {
      undeclaredPredicates.add(uri);
    }
  }

  // ── Annotation assertions (acceptanceCriteria/completionGuidance — EC.07).
  //    Extracted so the TBox schema is fully store-free at request time. ──
  const annotations = new Map<string, Map<string, string>>();
  const annotationProps = [...propertyMap.values()]
    .filter((prop) => prop.kind === "annotation")
    .map((prop) => prop.uri);
  if (annotationProps.length > 0) {
    const values = annotationProps.map((uri) => `<${uri}>`).join(" ");
    const rows = await select(
      query,
      `SELECT ?target ?prop ?value WHERE {
        VALUES ?prop { ${values} }
        ?target ?prop ?value .
      }`,
      diagnostics,
      "annotation assertions",
    );
    for (const row of rows) {
      const target = getNamedValue(row.target);
      const prop = getNamedValue(row.prop);
      const value = getLiteralValue(row.value);
      if (!target || !prop || value === undefined) {
        continue;
      }
      const forTarget = annotations.get(target) ?? new Map<string, string>();
      forTarget.set(prop, value);
      annotations.set(target, forTarget);
    }
  }

  // ── Depth guard: blank nodes whose objects are themselves blank (§5.3) ──
  let deepBlankNesting = false;
  try {
    const deep = await query(
      `ASK { ?a ?p ?b . ?b ?q ?c . FILTER(isBlank(?b) && isBlank(?c)) }`,
    );
    deepBlankNesting = deep.type === "ask" && deep.result;
    if (deepBlankNesting) {
      diagnostics.push({
        severity: "warning",
        code: "E001",
        message:
          "blank nodes nest deeper than 1 level in the store — the entity loader's single-hop closure (§5.3) will truncate them; extend the closure depth",
        phase: PHASE,
      });
    }
  } catch (error) {
    diagnostics.push({
      severity: "error",
      code: "E001",
      message: `depth guard: ${error instanceof Error ? error.message : String(error)}`,
      phase: PHASE,
    });
  }

  return {
    output: {
      classes: [...classMap.values()],
      properties: [...propertyMap.values()],
      inverses,
      functionals,
      datatypes: [...datatypeMap.values()],
      namespaces,
      shaclConstraints,
      unions,
      instanceStats,
      selfReferential,
      functionalViolations,
      undeclaredPredicates,
      annotations,
      deepBlankNesting,
    },
    diagnostics,
  };
}
