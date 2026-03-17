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

export const MULTI_TYPE_TTL = `
@prefix ex: <http://example.org/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:resource1 ex:stringProp "hello" .
ex:resource1 ex:intProp "42"^^xsd:integer .
ex:resource1 ex:boolProp "true"^^xsd:boolean .
ex:resource1 ex:dateProp "2025-01-01"^^xsd:date .
ex:resource1 ex:uriProp ex:other .
`;
