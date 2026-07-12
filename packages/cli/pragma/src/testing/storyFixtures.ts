/**
 * Story-pack test fixtures — a foreign (non-DS) recipe ontology plus a
 * matching pack definition.
 *
 * The `ex:` namespace is deliberately outside PREFIX_MAP: tests register
 * it via config `prefixes`, proving the DS-agnostic path end to end.
 */

import type { StoryPackDefinition } from "../domains/shared/stories/pack/types.js";

/** Namespace of the foreign recipe ontology. */
export const RECIPE_NAMESPACE = "http://example.org/recipes/";

/** Prefix map entry tests merge into config `prefixes`. */
export const RECIPE_PREFIXES = { ex: RECIPE_NAMESPACE } as const;

/** A tiny foreign ontology with two recipe instances. */
export const RECIPE_TTL = `
@prefix ex: <${RECIPE_NAMESPACE}> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

ex:Recipe a rdfs:Class .

ex:pancakes a ex:Recipe ;
  ex:name "Pancakes" ;
  ex:category "breakfast" ;
  ex:instructions "Mix, fry, flip." .

ex:gazpacho a ex:Recipe ;
  ex:name "Gazpacho" ;
  ex:category "soup" ;
  ex:instructions "Blend everything cold." .
`;

/** A valid pack definition for the recipe ontology. */
export const RECIPE_STORY: StoryPackDefinition = {
  noun: "recipe",
  description: "List recipes",
  list: {
    query:
      "SELECT ?uri ?name ?category WHERE { ?uri a ex:Recipe ; ex:name ?name ; ex:category ?category } ORDER BY ?name",
    columns: [
      { field: "name" },
      { field: "category" },
      { field: "uri", label: "IRI" },
    ],
  },
  lookup: {
    type: "ex:Recipe",
    by: "ex:name",
    fields: [{ name: "category", property: "ex:category" }],
    sections: [
      { name: "instructions", property: "ex:instructions", kind: "field" },
    ],
  },
};
