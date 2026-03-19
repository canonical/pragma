/**
 * Ontology shared operations.
 *
 * Pure functions: Store → typed data.
 * Queries the TBox (schema layer) — classes, properties, namespace statistics.
 */

import type { Store } from "@canonical/ke";
import { PragmaError } from "../../error/index.js";
import { buildQuery } from "../shared/buildQuery.js";
import type {
  OntologyClass,
  OntologyDetailed,
  OntologyProperty,
  OntologySummary,
} from "../shared/types.js";

/**
 * List loaded ontology namespaces with class/property counts.
 *
 * Discovers namespaces by looking at owl:Class and owl:ObjectProperty /
 * owl:DatatypeProperty definitions, then maps namespace URIs to prefixes
 * via `store.prefixes`.
 */
export async function listOntologies(
  store: Store,
): Promise<OntologySummary[]> {
  // Query all classes and properties, extract their namespace
  const classResult = await store.query(
    buildQuery(`
      SELECT ?class
      WHERE { ?class a owl:Class }
    `),
  );

  const propResult = await store.query(
    buildQuery(`
      SELECT ?prop ?propType
      WHERE {
        ?prop a ?propType .
        VALUES ?propType { owl:ObjectProperty owl:DatatypeProperty }
      }
    `),
  );

  const prefixEntries = Object.entries(store.prefixes);
  const classCounts = new Map<string, Set<string>>();
  const propCounts = new Map<string, Set<string>>();

  if (classResult.type === "select") {
    for (const b of classResult.bindings) {
      const uri = b.class ?? "";
      const ns = findNamespace(uri, prefixEntries);
      if (ns) {
        const set = classCounts.get(ns.prefix) ?? new Set();
        set.add(uri);
        classCounts.set(ns.prefix, set);
      }
    }
  }

  if (propResult.type === "select") {
    for (const b of propResult.bindings) {
      const uri = b.prop ?? "";
      const ns = findNamespace(uri, prefixEntries);
      if (ns) {
        const set = propCounts.get(ns.prefix) ?? new Set();
        set.add(uri);
        propCounts.set(ns.prefix, set);
      }
    }
  }

  // Collect all prefixes that have at least one class or property
  const allPrefixes = new Set([
    ...classCounts.keys(),
    ...propCounts.keys(),
  ]);

  const summaries: OntologySummary[] = [...allPrefixes]
    .sort()
    .map((prefix) => {
      const namespace =
        prefixEntries.find(([p]) => p === prefix)?.[1] ?? "";
      return {
        prefix,
        namespace,
        classCount: classCounts.get(prefix)?.size ?? 0,
        propertyCount: propCounts.get(prefix)?.size ?? 0,
      };
    });

  return summaries;
}

/**
 * Show detailed schema for a namespace — classes and properties.
 *
 * Accepts a short prefix (`ds`) or full namespace URI.
 *
 * @throws PragmaError.notFound if the prefix is unknown.
 */
export async function showOntology(
  store: Store,
  prefixOrUri: string,
): Promise<OntologyDetailed> {
  const { prefix, namespace } = resolvePrefix(prefixOrUri, store.prefixes);

  const classes = await queryClasses(store, namespace);
  const properties = await queryProperties(store, namespace);

  if (classes.length === 0 && properties.length === 0) {
    throw PragmaError.notFound("ontology", prefixOrUri, {
      recovery: "Run `pragma ontology list` to see loaded ontologies.",
    });
  }

  return { prefix, namespace, classes, properties };
}

/**
 * Get raw Turtle triples for a namespace via CONSTRUCT.
 *
 * Returns triples where the subject or predicate starts with the namespace URI.
 *
 * @throws PragmaError.notFound if the prefix is unknown or yields no triples.
 */
export async function showOntologyRaw(
  store: Store,
  prefixOrUri: string,
): Promise<{ subject: string; predicate: string; object: string }[]> {
  const { namespace } = resolvePrefix(prefixOrUri, store.prefixes);

  const result = await store.query(
    buildQuery(`
      CONSTRUCT { ?s ?p ?o }
      WHERE {
        ?s ?p ?o .
        FILTER(
          STRSTARTS(STR(?s), "${namespace}") ||
          STRSTARTS(STR(?p), "${namespace}")
        )
      }
    `),
  );

  if (result.type !== "construct" || result.triples.length === 0) {
    throw PragmaError.notFound("ontology", prefixOrUri, {
      recovery: "Run `pragma ontology list` to see loaded ontologies.",
    });
  }

  return result.triples;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Find the namespace prefix for a given URI by matching against registered
 * prefix entries.
 */
function findNamespace(
  uri: string,
  prefixEntries: [string, string][],
): { prefix: string; namespace: string } | undefined {
  // Match the longest namespace that is a prefix of the URI
  let best: { prefix: string; namespace: string } | undefined;
  for (const [prefix, namespace] of prefixEntries) {
    if (uri.startsWith(namespace)) {
      if (!best || namespace.length > best.namespace.length) {
        best = { prefix, namespace };
      }
    }
  }
  return best;
}

/**
 * Resolve a prefix string or namespace URI to both prefix and namespace.
 *
 * @throws PragmaError.invalidInput if the prefix is unknown.
 */
function resolvePrefix(
  prefixOrUri: string,
  prefixes: Readonly<Record<string, string>>,
): { prefix: string; namespace: string } {
  // Check if it's a full namespace URI
  if (
    prefixOrUri.startsWith("http://") ||
    prefixOrUri.startsWith("https://")
  ) {
    const entry = Object.entries(prefixes).find(
      ([, ns]) => ns === prefixOrUri,
    );
    if (entry) return { prefix: entry[0], namespace: entry[1] };

    throw PragmaError.invalidInput("namespace", prefixOrUri, {
      validOptions: Object.values(prefixes),
      recovery: "Run `pragma ontology list` to see loaded namespaces.",
    });
  }

  // It's a short prefix
  const namespace = prefixes[prefixOrUri];
  if (namespace === undefined) {
    throw PragmaError.invalidInput("prefix", prefixOrUri, {
      validOptions: Object.keys(prefixes),
      recovery: "Run `pragma ontology list` to see loaded ontologies.",
    });
  }

  return { prefix: prefixOrUri, namespace };
}

/**
 * Query all classes in a namespace.
 */
async function queryClasses(
  store: Store,
  namespace: string,
): Promise<OntologyClass[]> {
  const result = await store.query(
    buildQuery(`
      SELECT ?class ?label ?superclass
      WHERE {
        ?class a owl:Class .
        FILTER(STRSTARTS(STR(?class), "${namespace}"))
        OPTIONAL { ?class rdfs:label ?label }
        OPTIONAL { ?class rdfs:subClassOf ?superclass }
      }
      ORDER BY ?class
    `),
  );

  if (result.type !== "select") return [];

  return result.bindings.map((b) => {
    const entry: OntologyClass = {
      uri: b.class ?? "",
      label: b.label ?? extractLocalName(b.class ?? ""),
      ...(b.superclass ? { superclass: b.superclass } : {}),
    };
    return entry;
  });
}

/**
 * Query all properties in a namespace.
 */
async function queryProperties(
  store: Store,
  namespace: string,
): Promise<OntologyProperty[]> {
  const result = await store.query(
    buildQuery(`
      SELECT ?prop ?label ?domain ?range ?propType
      WHERE {
        ?prop a ?propType .
        VALUES ?propType { owl:ObjectProperty owl:DatatypeProperty }
        FILTER(STRSTARTS(STR(?prop), "${namespace}"))
        OPTIONAL { ?prop rdfs:label ?label }
        OPTIONAL { ?prop rdfs:domain ?domain }
        OPTIONAL { ?prop rdfs:range ?range }
      }
      ORDER BY ?prop
    `),
  );

  if (result.type !== "select") return [];

  return result.bindings.map((b) => ({
    uri: b.prop ?? "",
    label: b.label ?? extractLocalName(b.prop ?? ""),
    ...(b.domain ? { domain: b.domain } : {}),
    ...(b.range ? { range: b.range } : {}),
    type: b.propType?.includes("ObjectProperty")
      ? ("object" as const)
      : ("datatype" as const),
  }));
}

/**
 * Extract the local name from a full URI.
 * `"https://ds.canonical.com/UIBlock"` → `"UIBlock"`
 */
function extractLocalName(uri: string): string {
  const hashIdx = uri.lastIndexOf("#");
  if (hashIdx !== -1) return uri.slice(hashIdx + 1);
  const slashIdx = uri.lastIndexOf("/");
  if (slashIdx !== -1) return uri.slice(slashIdx + 1);
  return uri;
}
