/**
 * TTL fixtures for graphql domain tests.
 *
 * Three compile outcomes: a clean ontology (no diagnostics), an ontology
 * with an unresolvable field-name collision (M001 error diagnostic, schema
 * still composes), and an ontology whose reserved `__` field name fails
 * schema composition entirely (C003 → CompilationError).
 */

/** Namespace used by all graphql fixtures. */
export const EX_NAMESPACE = "http://example.org/";

/** `--prefix` entry registering {@link EX_NAMESPACE}. */
export const EX_PREFIX_ENTRY = `ex=${EX_NAMESPACE}`;

const prefixBlock = `@prefix ex: <${EX_NAMESPACE}> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .`;

/** Compiles to `type Thing` with zero diagnostics. */
export const GRAPHQL_CLEAN_TTL = `${prefixBlock}

ex:Thing a owl:Class ;
  rdfs:label "Thing" .

ex:name a owl:DatatypeProperty ;
  rdfs:domain ex:Thing ;
  rdfs:range xsd:string ;
  rdfs:label "name" .

ex:widget a ex:Thing ;
  ex:name "Widget" .
`;

/**
 * Produces an M001 error diagnostic (three properties collapse to
 * `Thing.name` and the namespace-prefixed rename collides too), but the
 * schema still composes — no CompilationError.
 */
export const GRAPHQL_ERROR_TTL = `${prefixBlock}

ex:Thing a owl:Class ;
  rdfs:label "Thing" .

ex:name a owl:DatatypeProperty ;
  rdfs:domain ex:Thing ;
  rdfs:range xsd:string .

ex:hasName a owl:DatatypeProperty ;
  rdfs:domain ex:Thing ;
  rdfs:range xsd:string .

ex:isName a owl:DatatypeProperty ;
  rdfs:domain ex:Thing ;
  rdfs:range xsd:string .
`;

/**
 * Fails schema composition (C003): `__bad` survives name sanitization but
 * `__` is reserved by GraphQL introspection, so compile() throws
 * CompilationError.
 */
export const GRAPHQL_FATAL_TTL = `${prefixBlock}

ex:Thing a owl:Class ;
  rdfs:label "Thing" .

ex:__bad a owl:DatatypeProperty ;
  rdfs:domain ex:Thing ;
  rdfs:range xsd:string .
`;
