import type { Store } from "@canonical/ke";
import { PragmaError } from "#error";
import findNamespace from "../../domains/ontology/helpers/findNamespace.js";
import { buildQuery } from "../../domains/shared/buildQuery.js";
import compactUri from "../../domains/shared/compactUri.js";
import classifyEntity from "./classifyEntity.js";
import { RDF_TYPE, RDFS_DOMAIN, RDFS_SUBCLASS_OF } from "./constants.js";
import {
  resolveDescriptionPredicates,
  resolveLabelPredicates,
} from "./displayPredicates.js";
import pickFirstValue from "./pickFirstValue.js";
import type {
  GraphIndex,
  PropertyGroup,
  PropertyValue,
  ResourceEntity,
} from "./types.js";

/** Query the compacted subjects of `?x <predicate> <object>`. */
async function fetchReferencingSubjects(
  store: Store,
  predicate: string,
  object: string,
  prefixes: Readonly<Record<string, string>>,
): Promise<string[]> {
  const result = await store.query(
    buildQuery(`SELECT ?x WHERE { ?x <${predicate}> <${object}> } ORDER BY ?x`),
  );
  if (result.type !== "select") return [];
  return result.termBindings
    .filter((t) => t.x?.termType === "NamedNode")
    .map((t) => compactUri(t.x?.value ?? "", prefixes));
}

/**
 * Read a single entity into a box-aware payload.
 *
 * Object values are classified by RDF term type (via `termBindings`), so a
 * URL-shaped literal stays a literal and a foreign IRI is recognised as a URI.
 * A class read is enriched with its superclasses, direct subclasses, asserted
 * instance count, and declared properties; an individual read carries a
 * pointer to its primary class. Object URIs are labelled from the prebuilt
 * index — no per-object query.
 *
 * @param store - The ke store to query.
 * @param fullUri - The fully resolved subject URI.
 * @param prefixes - The store's merged prefix map.
 * @param index - The prebuilt graph index for label and count lookups.
 * @returns The entity payload.
 * @throws PragmaError.notFound when the subject has no triples.
 *
 * @note Queries ke store
 */
export default async function readEntity(
  store: Store,
  fullUri: string,
  prefixes: Readonly<Record<string, string>>,
  index: GraphIndex,
): Promise<ResourceEntity> {
  const result = await store.query(
    buildQuery(`SELECT ?p ?o WHERE { <${fullUri}> ?p ?o } ORDER BY ?p ?o`),
  );

  if (result.type !== "select" || result.bindings.length === 0) {
    throw PragmaError.notFound("entity", compactUri(fullUri, prefixes), {
      recovery: {
        message:
          "Check the URI is correct and run a SPARQL query to find valid URIs.",
        cli: "pragma graph query 'SELECT ?s WHERE { ?s ?p ?o } LIMIT 10'",
        mcp: { tool: "graph_query" },
      },
    });
  }

  const fullTypes: string[] = [];
  const types: string[] = [];
  const groupMap = new Map<string, PropertyValue[]>();
  const valuesByPredicate = new Map<string, string[]>();

  for (const term of result.termBindings) {
    const predicate = term.p?.value ?? "";
    const objectTerm = term.o;
    if (objectTerm === undefined) continue;

    const rawValues = valuesByPredicate.get(predicate) ?? [];
    rawValues.push(objectTerm.value);
    valuesByPredicate.set(predicate, rawValues);

    if (predicate === RDF_TYPE) {
      fullTypes.push(objectTerm.value);
      types.push(compactUri(objectTerm.value, prefixes));
      continue;
    }

    const compactPred = compactUri(predicate, prefixes);
    const existing = groupMap.get(compactPred) ?? [];
    if (objectTerm.termType === "NamedNode") {
      existing.push({
        type: "uri",
        uri: objectTerm.value,
        prefixed: compactUri(objectTerm.value, prefixes),
        label: index.labelByUri.get(objectTerm.value) ?? null,
      });
    } else if (objectTerm.termType === "BlankNode") {
      existing.push({ type: "bnode", id: objectTerm.value });
    } else {
      existing.push({ type: "literal", value: objectTerm.value });
    }
    groupMap.set(compactPred, existing);
  }

  const classification = classifyEntity(fullTypes) ?? {
    box: "abox" as const,
    category: "individual" as const,
  };
  const prefix = findNamespace(fullUri, Object.entries(prefixes))?.prefix;
  const label = pickFirstValue(
    valuesByPredicate,
    resolveLabelPredicates(prefix),
  );
  const description = pickFirstValue(
    valuesByPredicate,
    resolveDescriptionPredicates(prefix),
  );

  const properties: PropertyGroup[] = [...groupMap.entries()].map(
    ([predicate, values]) => ({ predicate, values }),
  );

  const base: ResourceEntity = {
    uri: fullUri,
    prefixed: compactUri(fullUri, prefixes),
    box: classification.box,
    category: classification.category,
    types,
    label,
    description,
    properties,
  };

  if (classification.category === "class") {
    const [subClasses, declaredProperties] = await Promise.all([
      fetchReferencingSubjects(store, RDFS_SUBCLASS_OF, fullUri, prefixes),
      fetchReferencingSubjects(store, RDFS_DOMAIN, fullUri, prefixes),
    ]);
    return {
      ...base,
      superClasses: (valuesByPredicate.get(RDFS_SUBCLASS_OF) ?? []).map((u) =>
        compactUri(u, prefixes),
      ),
      subClasses,
      instanceCount: index.instanceCountByType.get(fullUri) ?? 0,
      declaredProperties,
    };
  }

  if (classification.category === "individual") {
    const primaryTypeFull = [...fullTypes]
      .sort((a, b) => a.localeCompare(b))
      .at(0);
    return {
      ...base,
      instanceOf:
        primaryTypeFull === undefined
          ? null
          : compactUri(primaryTypeFull, prefixes),
    };
  }

  return base;
}
