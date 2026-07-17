/**
 * Expand every compact IRI in an {@link OntologyDetailed} structure back to
 * its full URI using the structure's own `prefixes` map.
 *
 * The data shape keeps compact IRIs as its canonical encoding; `--full-uris`
 * applies this pure transform once in the story's `toOutput`, so every
 * projection (plain, llm, json, MCP condensed) inherits the expansion from
 * the same place. Query hints are left untouched: their compact IRIs are
 * resolvable by `pragma graph query` regardless of the display encoding.
 */

import type {
  OntologyClass,
  OntologyClassFocus,
  OntologyDetailed,
  OntologyProperty,
} from "../../shared/types/index.js";

export default function expandOntologyIris(
  ontology: OntologyDetailed,
): OntologyDetailed {
  const expand = (iri: string): string => {
    const colon = iri.indexOf(":");
    if (colon <= 0) return iri;
    const namespace = ontology.prefixes[iri.slice(0, colon)];
    return namespace === undefined
      ? iri
      : `${namespace}${iri.slice(colon + 1)}`;
  };

  const expandProperty = (p: OntologyProperty): OntologyProperty => ({
    ...p,
    iri: expand(p.iri),
    ...(p.domain ? { domain: expand(p.domain) } : {}),
    ...(p.range ? { range: expand(p.range) } : {}),
  });

  const expandClass = (c: OntologyClass): OntologyClass => ({
    ...c,
    iri: expand(c.iri),
    subClassOf: c.subClassOf.map(expand),
    properties: c.properties.map(expandProperty),
  });

  const expandFocus = (f: OntologyClassFocus): OntologyClassFocus => ({
    ...f,
    iri: expand(f.iri),
    superChain: f.superChain.map(expand),
    subclasses: f.subclasses.map(expand),
    directProperties: f.directProperties.map(expandProperty),
    inheritedProperties: f.inheritedProperties.map(expandProperty),
    referencedBy: f.referencedBy.map(expandProperty),
    sampleInstances: f.sampleInstances.map(expand),
  });

  return {
    ...ontology,
    ...(ontology.meta?.imports
      ? {
          meta: {
            ...ontology.meta,
            imports: ontology.meta.imports.map(expand),
          },
        }
      : {}),
    classes: ontology.classes.map(expandClass),
    unattached: ontology.unattached.map(expandProperty),
    ...(ontology.constraints
      ? {
          constraints: ontology.constraints.map((c) => ({
            ...c,
            shape: expand(c.shape),
            ...(c.targetClass ? { targetClass: expand(c.targetClass) } : {}),
          })),
        }
      : {}),
    ...(ontology.focus ? { focus: expandFocus(ontology.focus) } : {}),
  };
}
