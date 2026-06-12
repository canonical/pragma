// =============================================================================
// TBox loader (§5.3). Batches label/definition/annotation lookups for class
// and property URIs. Structural TBox data (hierarchy, domains, cardinality)
// comes from the frozen IR via resolver closures — this loader only fetches
// the annotations that live in the store.
// =============================================================================

import DataLoader from "dataloader";
import type { QueryFn, TBoxEntityData } from "../compiler/types.js";
import {
  RDFS_COMMENT,
  RDFS_LABEL,
  SKOS_DEFINITION,
} from "../compiler/vocab.js";

/** Annotation predicates with rdf:Property domain (EC.07), by convention. */
const ACCEPTANCE_CRITERIA_LOCAL = "acceptanceCriteria";
const COMPLETION_GUIDANCE_LOCAL = "completionGuidance";

export const createTBoxLoader = (
  query: QueryFn,
  annotationPredicates: {
    acceptanceCriteria?: string;
    completionGuidance?: string;
  },
): DataLoader<string, TBoxEntityData | null> =>
  new DataLoader(async (uris) => {
    const values = uris.map((uri) => `<${uri}>`).join(" ");
    const acceptance = annotationPredicates.acceptanceCriteria;
    const guidance = annotationPredicates.completionGuidance;
    const result = await query(
      `SELECT ?entity ?label ?definition ?comment ?acceptanceCriteria ?completionGuidance WHERE {
         VALUES ?entity { ${values} }
         OPTIONAL { ?entity <${RDFS_LABEL}> ?label }
         OPTIONAL { ?entity <${SKOS_DEFINITION}> ?definition }
         OPTIONAL { ?entity <${RDFS_COMMENT}> ?comment }
         ${acceptance ? `OPTIONAL { ?entity <${acceptance}> ?acceptanceCriteria }` : ""}
         ${guidance ? `OPTIONAL { ?entity <${guidance}> ?completionGuidance }` : ""}
       }`,
    );
    const byUri = new Map<string, TBoxEntityData>();
    if (result.type === "select") {
      for (const row of result.termBindings) {
        const entity = row.entity;
        if (entity?.termType !== "NamedNode") {
          continue;
        }
        const existing = byUri.get(entity.value) ?? { uri: entity.value };
        existing.label ??=
          row.label?.termType === "Literal" ? row.label.value : undefined;
        existing.definition ??=
          row.definition?.termType === "Literal"
            ? row.definition.value
            : row.comment?.termType === "Literal"
              ? row.comment.value
              : undefined;
        existing.acceptanceCriteria ??=
          row.acceptanceCriteria?.termType === "Literal"
            ? row.acceptanceCriteria.value
            : undefined;
        existing.completionGuidance ??=
          row.completionGuidance?.termType === "Literal"
            ? row.completionGuidance.value
            : undefined;
        byUri.set(entity.value, existing);
      }
    }
    return uris.map((uri) => byUri.get(uri) ?? null);
  });

/** Find the annotation predicates among the IR's annotation properties. */
export const findAnnotationPredicates = (
  propertyUris: Iterable<string>,
): { acceptanceCriteria?: string; completionGuidance?: string } => {
  const result: { acceptanceCriteria?: string; completionGuidance?: string } =
    {};
  for (const uri of propertyUris) {
    if (uri.endsWith(ACCEPTANCE_CRITERIA_LOCAL)) {
      result.acceptanceCriteria = uri;
    }
    if (uri.endsWith(COMPLETION_GUIDANCE_LOCAL)) {
      result.completionGuidance = uri;
    }
  }
  return result;
};
