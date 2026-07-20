/**
 * A foreign-namespace generic-pack proof.
 *
 * Every other fixture graph in this package lives under the `ds:`/`cs:`
 * design-system prefixes. This one is deliberately OUTSIDE that vocabulary —
 * `ex:` recipes with no relation to design systems at all — proving the pack
 * compiler and runtime are ontology-agnostic end-to-end: a pack over ANY
 * RDF graph registers its verbs/tools and resolves through the same one
 * compiler (`kernel/packs/compile.ts`) every bundled DS pack does. Complements
 * PR3's compiler-invariant UNIT tests with an e2e journey (compile → boot →
 * list/lookup on both the CLI and MCP surfaces).
 */

import type { PackDefinition } from "../../../kernel/packs/types.js";

/** The prefixes the recipe fixture store is built and queried with. */
export const RECIPE_PREFIXES: Readonly<Record<string, string>> = {
  ex: "https://example.com/recipes#",
  owl: "http://www.w3.org/2002/07/owl#",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  xsd: "http://www.w3.org/2001/XMLSchema#",
};

/** The recipe fixture ontology + individuals as Turtle. */
export const RECIPE_TTL = `
@prefix ex: <https://example.com/recipes#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:Recipe a owl:Class .
ex:title a owl:DatatypeProperty ; rdfs:domain ex:Recipe ; rdfs:range xsd:string .
ex:cuisine a owl:DatatypeProperty ; rdfs:domain ex:Recipe ; rdfs:range xsd:string .
ex:instructions a owl:DatatypeProperty ; rdfs:domain ex:Recipe ; rdfs:range xsd:string .

ex:pancakes a ex:Recipe ;
  ex:title "Pancakes" ;
  ex:cuisine "breakfast" ;
  ex:instructions "Whisk batter, pour onto a hot griddle, flip when bubbling." .

ex:gazpacho a ex:Recipe ;
  ex:title "Gazpacho" ;
  ex:cuisine "spanish" ;
  ex:instructions "Blend chilled tomatoes, peppers, and cucumber; chill again." .
`;

/** A declarative pack over the foreign `ex:` namespace — `list` + `lookup`. */
export const recipePack: PackDefinition = {
  noun: "recipe",
  description: "List recipes.",
  list: {
    query: [
      "SELECT ?uri ?name ?cuisine WHERE {",
      "  ?uri a ex:Recipe ;",
      "       ex:title ?name .",
      "  OPTIONAL { ?uri ex:cuisine ?cuisine }",
      "}",
      "ORDER BY ?name",
    ].join("\n"),
    columns: [
      { field: "uri", label: "IRI" },
      { field: "name", label: "Name" },
      { field: "cuisine", label: "Cuisine" },
    ],
  },
  lookup: {
    by: "ex:title",
    type: "ex:Recipe",
    fields: [{ name: "cuisine", property: "ex:cuisine", label: "Cuisine" }],
    sections: [
      {
        name: "instructions",
        property: "ex:instructions",
        label: "Instructions",
      },
    ],
  },
};
