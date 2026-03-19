/**
 * Sample TTL data strings for testing.
 */

export const PEOPLE_TTL = `
@prefix schema: <http://schema.org/> .
@prefix ex: <http://example.org/> .

ex:alice a schema:Person ;
  schema:name "Alice" ;
  schema:age 30 ;
  schema:email "alice@example.org" .

ex:bob a schema:Person ;
  schema:name "Bob" ;
  schema:age 25 ;
  schema:knows ex:alice .

ex:charlie a schema:Person ;
  schema:name "Charlie" ;
  schema:age 35 ;
  schema:knows ex:alice, ex:bob .
`;

export const ORGANIZATIONS_TTL = `
@prefix schema: <http://schema.org/> .
@prefix ex: <http://example.org/> .

ex:canonical a schema:Organization ;
  schema:name "Canonical" ;
  schema:employee ex:alice, ex:bob .

ex:acme a schema:Organization ;
  schema:name "ACME Corp" ;
  schema:employee ex:charlie .
`;

export const MINIMAL_TTL = `
@prefix ex: <http://example.org/> .
ex:subject ex:predicate "object" .
`;

export const EMPTY_TTL = "";

/**
 * Ontology-style TTL — class and property definitions (TBox).
 * Typically loaded into the default graph.
 */
export const ONTOLOGY_TTL = `
@prefix ds: <https://ds.canonical.com/> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .

ds:UIBlock a owl:Class ;
  rdfs:label "UI Block" .

ds:Component a owl:Class ;
  rdfs:subClassOf ds:UIBlock ;
  rdfs:label "Component" .

ds:name a owl:DatatypeProperty ;
  rdfs:domain ds:UIBlock ;
  rdfs:label "name" .

ds:tier a owl:ObjectProperty ;
  rdfs:domain ds:UIBlock ;
  rdfs:label "tier" .
`;

/**
 * Component instance data — individuals referencing ontology classes.
 * Typically loaded into a named graph like urn:test:components.
 */
export const COMPONENTS_TTL = `
@prefix ds: <https://ds.canonical.com/> .

ds:button a ds:Component ;
  ds:name "Button" ;
  ds:tier ds:global .

ds:card a ds:Component ;
  ds:name "Card" ;
  ds:tier ds:global .

ds:tile a ds:Component ;
  ds:name "Tile" ;
  ds:tier ds:apps .
`;

/**
 * Standards data — code standard instances.
 * Typically loaded into a named graph like urn:test:standards.
 */
export const STANDARDS_TTL = `
@prefix cso: <http://pragma.canonical.com/codestandards#> .

cso:react-folder a cso:CodeStandard ;
  cso:name "react/component/folder-structure" ;
  cso:description "Components must follow the standard folder layout" .

cso:react-props a cso:CodeStandard ;
  cso:name "react/component/props" ;
  cso:description "Props must extend the base HTML element type" .
`;

/**
 * Stats-oriented ontology — class hierarchy for stats plugin testing.
 *
 * Hierarchy:
 *   UIElement
 *   └── UIBlock
 *       ├── Component
 *       ├── Pattern
 *       ├── Layout
 *       └── Subcomponent
 */
export const STATS_ONTOLOGY_TTL = `
@prefix ds: <https://ds.canonical.com/> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .

ds:UIElement a owl:Class .
ds:UIBlock a owl:Class ; rdfs:subClassOf ds:UIElement .
ds:Component a owl:Class ; rdfs:subClassOf ds:UIBlock .
ds:Pattern a owl:Class ; rdfs:subClassOf ds:UIBlock .
ds:Layout a owl:Class ; rdfs:subClassOf ds:UIBlock .
ds:Subcomponent a owl:Class ; rdfs:subClassOf ds:UIBlock .
`;

/**
 * Stats-oriented instances — typed individuals for stats plugin testing.
 *
 * Counts: 3 Component, 2 Pattern, 1 Layout, 0 Subcomponent
 * Rollup: UIBlock = 6, UIElement = 6
 */
export const STATS_INSTANCES_TTL = `
@prefix ds: <https://ds.canonical.com/> .

ds:button a ds:Component .
ds:card a ds:Component .
ds:input a ds:Component .
ds:accordion a ds:Pattern .
ds:tabs a ds:Pattern .
ds:sidebar a ds:Layout .
`;

export const MULTI_TYPE_TTL = `
@prefix ex: <http://example.org/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:resource1 ex:stringProp "hello" .
ex:resource1 ex:intProp "42"^^xsd:integer .
ex:resource1 ex:boolProp "true"^^xsd:boolean .
ex:resource1 ex:dateProp "2025-01-01"^^xsd:date .
ex:resource1 ex:uriProp ex:other .
`;
