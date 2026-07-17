import type { Store } from "@canonical/ke";
import { buildQuery } from "../../shared/buildQuery.js";
import { P } from "../../shared/prefixes.js";
import type { OntologySummary } from "../../shared/types/index.js";
import findNamespace from "../helpers/findNamespace.js";

const SH = "http://www.w3.org/ns/shacl#";

/** Check whether a URI belongs to the anatomy namespace. */
function isAnatomyTerm(uri: string): boolean {
  return uri.toLowerCase().includes("anatomy");
}

/** Per-namespace URI accumulator. */
function add(
  map: Map<string, Set<string>>,
  namespace: string,
  uri: string,
): void {
  const set = map.get(namespace) ?? new Set();
  set.add(uri);
  map.set(namespace, set);
}

/**
 * Derive a namespace from a URI when no registered prefix matches: cut
 * after the last `#`, else after the last `/`. Keeps ontologies loaded
 * without a declared prefix (e.g. a package that has not yet published
 * its `pragma.prefixes`) visible in the listing instead of silently
 * dropping their whole TBox.
 */
function deriveNamespace(uri: string): string | undefined {
  const hash = uri.lastIndexOf("#");
  if (hash > 0) return uri.slice(0, hash + 1);
  const slash = uri.lastIndexOf("/");
  if (slash > "https://".length) return uri.slice(0, slash + 1);
  return undefined;
}

/**
 * List all loaded ontology namespaces with their header metadata (title,
 * version) and counts: classes, relations (object properties), attributes
 * (datatype properties), SHACL shapes, and anatomy terms.
 *
 * Discovers namespaces by querying for `owl:Class` and
 * `owl:ObjectProperty`/`owl:DatatypeProperty` definitions, then maps
 * namespace URIs back to prefixes via `store.prefixes`. Four whole-store
 * queries regardless of how many namespaces are loaded.
 *
 * @param store - The ke store to query.
 * @returns An array of {@link OntologySummary} sorted alphabetically by prefix.
 *
 * @note Queries ke store
 */
export default async function listOntologies(
  store: Store,
): Promise<OntologySummary[]> {
  const classResult = await store.query(
    buildQuery(`
      SELECT ?class
      WHERE { ?class a ${P.owl}Class }
    `),
  );

  const propResult = await store.query(
    buildQuery(`
      SELECT ?prop ?propType
      WHERE {
        ?prop a ?propType .
        VALUES ?propType { ${P.owl}ObjectProperty ${P.owl}DatatypeProperty }
      }
    `),
  );

  const shapeResult = await store.query(
    buildQuery(`
      SELECT ?shape ?target
      WHERE {
        ?shape a <${SH}NodeShape> .
        OPTIONAL { ?shape <${SH}targetClass> ?target }
      }
    `),
  );

  const metaResult = await store.query(
    buildQuery(`
      SELECT ?ont ?title ?version
      WHERE {
        ?ont a ${P.owl}Ontology .
        OPTIONAL { ?ont ${P.rdfs}label ?title }
        OPTIONAL { ?ont ${P.owl}versionInfo ?version }
      }
      ORDER BY ?ont
    `),
  );

  const prefixEntries = Object.entries(store.prefixes);
  // Everything below is keyed by namespace URI so ontologies without a
  // registered prefix still surface in the listing.
  const nsOf = (uri: string): string | undefined =>
    findNamespace(uri, prefixEntries)?.namespace ?? deriveNamespace(uri);
  const classCounts = new Map<string, Set<string>>();
  const relationCounts = new Map<string, Set<string>>();
  const attributeCounts = new Map<string, Set<string>>();
  const shapeCounts = new Map<string, Set<string>>();
  const anatomyCounts = new Map<string, Set<string>>();
  const meta = new Map<string, { title?: string; version?: string }>();

  if (classResult.type === "select") {
    for (const b of classResult.bindings) {
      const uri = b.class ?? "";
      const ns = nsOf(uri);
      if (ns) {
        add(classCounts, ns, uri);
        if (isAnatomyTerm(uri)) add(anatomyCounts, ns, uri);
      }
    }
  }

  if (propResult.type === "select") {
    for (const b of propResult.bindings) {
      const uri = b.prop ?? "";
      const ns = nsOf(uri);
      if (ns) {
        const kind = b.propType?.includes("ObjectProperty")
          ? relationCounts
          : attributeCounts;
        add(kind, ns, uri);
        if (isAnatomyTerm(uri)) add(anatomyCounts, ns, uri);
      }
    }
  }

  if (shapeResult.type === "select") {
    for (const b of shapeResult.bindings) {
      // Same attribution as `ontology show`: a shape counts for the
      // namespace of the shape itself or of its target class.
      const ns = b.shape ? nsOf(b.shape) : undefined;
      const targetNs = b.target ? nsOf(b.target) : undefined;
      const owner = ns ?? targetNs;
      if (owner && b.shape) add(shapeCounts, owner, b.shape);
    }
  }

  if (metaResult.type === "select") {
    for (const b of metaResult.bindings) {
      const ns = b.ont ? nsOf(b.ont) : undefined;
      if (ns && !meta.has(ns)) {
        meta.set(ns, {
          ...(b.title ? { title: b.title } : {}),
          ...(b.version ? { version: b.version } : {}),
        });
      }
    }
  }

  const allNamespaces = new Set([
    ...classCounts.keys(),
    ...relationCounts.keys(),
    ...attributeCounts.keys(),
    ...anatomyCounts.keys(),
  ]);

  const summaries = [...allNamespaces].map((namespace) => {
    const prefix = prefixEntries.find(([, ns]) => ns === namespace)?.[0] ?? "";
    const header = meta.get(namespace);
    return {
      prefix,
      namespace,
      ...(header?.title ? { title: header.title } : {}),
      ...(header?.version ? { version: header.version } : {}),
      classCount: classCounts.get(namespace)?.size ?? 0,
      relationCount: relationCounts.get(namespace)?.size ?? 0,
      attributeCount: attributeCounts.get(namespace)?.size ?? 0,
      shapeCount: shapeCounts.get(namespace)?.size ?? 0,
      anatomyCount: anatomyCounts.get(namespace)?.size ?? 0,
    };
  });

  // Prefixed namespaces first (alphabetical), unprefixed after by URI.
  return summaries.sort((a, b) =>
    a.prefix && b.prefix
      ? a.prefix.localeCompare(b.prefix)
      : a.prefix
        ? -1
        : b.prefix
          ? 1
          : a.namespace.localeCompare(b.namespace),
  );
}
