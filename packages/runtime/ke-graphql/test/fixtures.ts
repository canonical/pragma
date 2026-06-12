// =============================================================================
// Test fixtures (ADR §12): self-contained TTL documents, each exercising a
// specific compiler behavior. TBox + ABox together; minimal by design.
// =============================================================================

export const PREFIXES = {
  ex: "http://example.org/",
  ds: "https://ds.canonical.com/",
  cs: "http://pragma.canonical.com/codestandards#",
};

/** §12.2 — happy path: one class, two properties, one instance. */
export const MINIMAL_TTL = `
@prefix ex: <http://example.org/> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .

ex:Thing a owl:Class ;
  rdfs:label "Thing" ;
  skos:definition "A concrete thing." .

ex:name a owl:DatatypeProperty ;
  rdfs:domain ex:Thing ;
  rdfs:range xsd:string ;
  rdfs:label "name" .

ex:count a owl:DatatypeProperty ;
  rdfs:domain ex:Thing ;
  rdfs:range xsd:integer ;
  rdfs:label "count" .

ex:widget a ex:Thing ;
  ex:name "Widget" ;
  ex:count 42 .
`;

/** §12.3 — class hierarchy and interface generation. */
export const INHERITANCE_TTL = `
@prefix ex: <http://example.org/> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:Entity a owl:Class ; rdfs:label "Entity" .
ex:Tangible a owl:Class ; rdfs:subClassOf ex:Entity ; rdfs:label "Tangible" .
ex:Widget a owl:Class ; rdfs:subClassOf ex:Tangible ; rdfs:label "Widget" .
ex:Gadget a owl:Class ; rdfs:subClassOf ex:Tangible ; rdfs:label "Gadget" .

ex:name a owl:DatatypeProperty ; rdfs:domain ex:Entity ; rdfs:range xsd:string .
ex:weight a owl:DatatypeProperty ; rdfs:domain ex:Tangible ; rdfs:range xsd:integer .
ex:color a owl:DatatypeProperty ; rdfs:domain ex:Widget ; rdfs:range xsd:string .

ex:w1 a ex:Widget ; ex:name "Alpha" ; ex:weight 10 ; ex:color "red" .
ex:g1 a ex:Gadget ; ex:name "Beta" ; ex:weight 5 .
`;

/** §12.4 — inverse pair: forward/inverse placement, irregular plural. */
export const INVERSE_TTL = `
@prefix ex: <http://example.org/> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:Parent a owl:Class ; rdfs:label "Parent" .
ex:Child a owl:Class ; rdfs:label "Child" .

ex:hasChild a owl:ObjectProperty ;
  rdfs:domain ex:Parent ; rdfs:range ex:Child ;
  owl:inverseOf ex:childOf .

ex:childOf a owl:ObjectProperty , owl:FunctionalProperty ;
  rdfs:domain ex:Child ; rdfs:range ex:Parent .

ex:name a owl:DatatypeProperty ;
  rdfs:domain ex:Parent ; rdfs:range xsd:string .

# Data asserts ONLY the childOf direction — hasChild resolution must find
# the children via the reverse assertions (EC.05 dual-direction rule).
ex:p1 a ex:Parent ; ex:name "Alice" .
ex:c1 a ex:Child ; ex:childOf ex:p1 .
ex:c2 a ex:Child ; ex:childOf ex:p1 .
`;

/** §12.5 — embedded blank-node types. */
export const BLANK_NODES_TTL = `
@prefix ex: <http://example.org/> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:Standard a owl:Class ; rdfs:label "Standard" .
ex:Example a owl:Class ; rdfs:label "Example" .

ex:title a owl:DatatypeProperty ; rdfs:domain ex:Standard ; rdfs:range xsd:string .
ex:hasExample a owl:ObjectProperty ; rdfs:domain ex:Standard ; rdfs:range ex:Example .
ex:code a owl:DatatypeProperty ; rdfs:domain ex:Example ; rdfs:range xsd:string .
ex:language a owl:DatatypeProperty ; rdfs:domain ex:Example ; rdfs:range xsd:string .

ex:s1 a ex:Standard ;
  ex:title "Use const" ;
  ex:hasExample [
    a ex:Example ;
    ex:code "const x = 1;" ;
    ex:language "typescript"
  ] , [
    a ex:Example ;
    ex:code "const y = 2;"
  ] .
`;

/** §12.6 — domainless property (KG.14). */
export const DOMAINLESS_TTL = `
@prefix ex: <http://example.org/> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:Foo a owl:Class ; rdfs:label "Foo" .
ex:Bar a owl:Class ; rdfs:label "Bar" .

ex:label a owl:DatatypeProperty ; rdfs:domain ex:Foo ; rdfs:range xsd:string .
ex:description a owl:DatatypeProperty ; rdfs:range xsd:string .

ex:f1 a ex:Foo ; ex:label "foo" ; ex:description "a foo" .
ex:b1 a ex:Bar ; ex:description "a bar" .
`;

/** §12.7 — synthetic triggers for the V-series diagnostics. */
export const EDGE_CASES_TTL = `
@prefix ex: <http://example.org/> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix sh: <http://www.w3.org/ns/shacl#> .

# EC.03 — boolean-as-string
ex:Item a owl:Class .
ex:active a owl:DatatypeProperty ; rdfs:domain ex:Item ; rdfs:range xsd:boolean .
ex:i1 a ex:Item ; ex:active "true" .

# EC.04 — self-referential relationship
ex:extends a owl:ObjectProperty ; rdfs:domain ex:Item ; rdfs:range ex:Item .
ex:i2 a ex:Item ; ex:extends ex:i2 .

# EC.06 — language-tagged literal
ex:label a owl:DatatypeProperty ; rdfs:domain ex:Item ; rdfs:range xsd:string .
ex:i3 a ex:Item ; ex:label "Tagged"@en .

# EC.07 — annotation property on rdf:Property
ex:guidance a owl:AnnotationProperty ; rdfs:domain rdf:Property ; rdfs:range xsd:string .
ex:active ex:guidance "Must be boolean" .

# EC.08 — custom datatype
ex:Version a rdfs:Datatype ; owl:onDatatype xsd:string .
ex:ver a owl:DatatypeProperty ; rdfs:domain ex:Item ; rdfs:range ex:Version .
ex:i4 a ex:Item ; ex:ver "1.0.0" .

# EC.13 — cross-vocabulary subClassOf
ex:Category a owl:Class ; rdfs:subClassOf skos:Concept .
ex:c1 a ex:Category .

# EC.14 — empty string value
ex:summary a owl:DatatypeProperty ; rdfs:domain ex:Item ; rdfs:range xsd:string .
ex:i5 a ex:Item ; ex:summary "" .

# V012 — SHACL sh:in enum constraint
ex:ItemShape a sh:NodeShape ;
  sh:targetClass ex:Item ;
  sh:property [
    sh:path ex:mode ;
    sh:in ("fast" "slow" "auto") ;
  ] .
ex:mode a owl:DatatypeProperty ; rdfs:domain ex:Item ; rdfs:range xsd:string .

# V014 / EC.16 — ABox predicate not declared in the TBox
ex:i6 a ex:Item ; ex:undeclaredThing "x" .

# V005 — functional property with multiple values
ex:rank a owl:DatatypeProperty , owl:FunctionalProperty ;
  rdfs:domain ex:Item ; rdfs:range xsd:integer .
ex:i7 a ex:Item ; ex:rank 1 , 2 .
`;

/** §12.10 — SHACL cardinality, sh:or XOR, maxCount 0. */
export const SHACL_TTL = `
@prefix ex: <http://example.org/> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix sh: <http://www.w3.org/ns/shacl#> .

ex:Spec a owl:Class . ex:Hop a owl:Class . ex:Sw a owl:Class .

ex:root a owl:ObjectProperty ; rdfs:domain ex:Spec ; rdfs:range ex:Hop .
ex:hopTarget a owl:ObjectProperty ; rdfs:domain ex:Hop ; rdfs:range ex:Spec .
ex:hopSwitch a owl:ObjectProperty ; rdfs:domain ex:Hop ; rdfs:range ex:Sw .
ex:legacy a owl:DatatypeProperty ; rdfs:domain ex:Spec ; rdfs:range xsd:string .

ex:SpecShape a sh:NodeShape ; sh:targetClass ex:Spec ;
  sh:property [ sh:path ex:root ; sh:minCount 1 ; sh:maxCount 1 ] ;
  sh:property [ sh:path ex:legacy ; sh:maxCount 0 ] .

ex:HopShape a sh:NodeShape ; sh:targetClass ex:Hop ;
  sh:or (
    [ sh:property [ sh:path ex:hopTarget ; sh:minCount 1 ; sh:maxCount 1 ] ;
      sh:property [ sh:path ex:hopSwitch ; sh:maxCount 0 ] ]
    [ sh:property [ sh:path ex:hopTarget ; sh:maxCount 0 ] ;
      sh:property [ sh:path ex:hopSwitch ; sh:minCount 1 ; sh:maxCount 1 ] ]
  ) .

ex:s1 a ex:Spec . ex:h1 a ex:Hop . ex:sw1 a ex:Sw .
`;

/** §12.8 — realistic ds: subset: hierarchy, inverses, blank nodes, booleans. */
export const DS_REALISTIC_TTL = `
@prefix ds: <https://ds.canonical.com/> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .

ds:Entity a owl:Class ; rdfs:label "Entity" .
ds:UIElement a owl:Class ; rdfs:subClassOf ds:Entity ; rdfs:label "UIElement" .
ds:UIBlock a owl:Class ; rdfs:subClassOf ds:UIElement ; rdfs:label "UIBlock" .
ds:Component a owl:Class ; rdfs:subClassOf ds:UIBlock ; rdfs:label "Component" ;
  skos:definition "A reusable UI component." .
ds:Subcomponent a owl:Class ; rdfs:subClassOf ds:UIBlock ; rdfs:label "Subcomponent" .
ds:Modifier a owl:Class ; rdfs:subClassOf ds:UIElement ; rdfs:label "Modifier" .
ds:ModifierFamily a owl:Class ; rdfs:subClassOf ds:UIElement ; rdfs:label "ModifierFamily" .
ds:Tier a owl:Class ; rdfs:subClassOf ds:Entity ; rdfs:label "Tier" .
ds:Property a owl:Class ; rdfs:subClassOf ds:Entity ; rdfs:label "Property" .
ds:ImplementationObject a owl:Class ; rdfs:subClassOf ds:Entity ; rdfs:label "ImplementationObject" .

ds:name a owl:DatatypeProperty ; rdfs:domain ds:Entity ; rdfs:range xsd:string ;
  rdfs:label "name" ; skos:definition "Display name." .
ds:summary a owl:DatatypeProperty ; rdfs:domain ds:Entity ; rdfs:range xsd:string .
ds:tier a owl:ObjectProperty , owl:FunctionalProperty ;
  rdfs:domain ds:UIBlock ; rdfs:range ds:Tier .
ds:hasModifierFamily a owl:ObjectProperty ;
  rdfs:domain ds:UIBlock ; rdfs:range ds:ModifierFamily .
ds:hasSubcomponent a owl:ObjectProperty ;
  rdfs:domain ds:Component ; rdfs:range ds:Subcomponent ;
  owl:inverseOf ds:parentComponent .
ds:parentComponent a owl:ObjectProperty , owl:FunctionalProperty ;
  rdfs:domain ds:Subcomponent ; rdfs:range ds:Component .
ds:modifierFamily a owl:ObjectProperty , owl:FunctionalProperty ;
  rdfs:domain ds:Modifier ; rdfs:range ds:ModifierFamily ;
  owl:inverseOf ds:hasModifier .
ds:hasModifier a owl:ObjectProperty ;
  rdfs:domain ds:ModifierFamily ; rdfs:range ds:Modifier .
ds:hasProperty a owl:ObjectProperty ;
  rdfs:domain ds:UIBlock ; rdfs:range ds:Property .
ds:propertyType a owl:DatatypeProperty ; rdfs:domain ds:Property ; rdfs:range xsd:string .
ds:optional a owl:DatatypeProperty , owl:FunctionalProperty ;
  rdfs:domain ds:Property ; rdfs:range xsd:boolean .
ds:standalone a owl:DatatypeProperty , owl:FunctionalProperty ;
  rdfs:domain ds:Subcomponent ; rdfs:range xsd:boolean .
ds:implementsBlock a owl:ObjectProperty , owl:FunctionalProperty ;
  rdfs:domain ds:ImplementationObject ; rdfs:range ds:UIBlock .

ds:acceptanceCriteria a owl:AnnotationProperty ;
  rdfs:domain <http://www.w3.org/1999/02/22-rdf-syntax-ns#Property> ;
  rdfs:range xsd:string .
ds:name ds:acceptanceCriteria "Must be a human-readable display name." .

ds:global a ds:Tier ; ds:name "global" .

ds:global.component.button a ds:Component ;
  ds:name "Button" ;
  ds:summary "Primary action trigger." ;
  ds:tier ds:global ;
  ds:hasModifierFamily ds:modifier_family.importance ;
  ds:hasSubcomponent ds:global.subcomponent.button_icon ;
  ds:hasProperty [
    a ds:Property ;
    ds:name "disabled" ;
    ds:propertyType "boolean" ;
    ds:optional "false"
  ] .

ds:global.subcomponent.button_icon a ds:Subcomponent ;
  ds:name "Button.Icon" ;
  ds:tier ds:global ;
  ds:parentComponent ds:global.component.button ;
  ds:standalone "false" .

ds:modifier_family.importance a ds:ModifierFamily ;
  ds:name "importance" .

ds:mod_importance_primary a ds:Modifier ;
  ds:name "primary" ;
  ds:modifierFamily ds:modifier_family.importance .

ds:react_button a ds:ImplementationObject ;
  ds:name "react button" ;
  ds:implementsBlock ds:global.component.button .
`;
