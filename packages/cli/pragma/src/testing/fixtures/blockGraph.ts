/**
 * A self-contained design-system fixture graph for the pack GraphQL engine and
 * the block lookup parity suites.
 *
 * Models the live ontology's shape faithfully but compactly: a `ds:UIBlock`
 * interface with `Component`/`Pattern`/`Subcomponent` subclasses, the block
 * detail properties (summary, whenToUse/whenNotToUse, guidelines, anatomy,
 * figmaLink), modifier families with values asserted ONLY in the reverse
 * `ds:modifierFamily` direction (so the compiled inverse-union resolver is
 * exercised), block properties, and `ds:hasSubcomponent` scoped to `ds:Component`
 * (reached via a subtype-scoped fragment). Two blocks — Button and Modal —
 * carry the full spec so block content-parity asserts on a graph that DECLARES
 * whenToUse/whenNotToUse (which the live graph superseded with ds:usage).
 */

/** The prefixes the fixture store is built and queried with. */
export const BLOCK_PREFIXES: Readonly<Record<string, string>> = {
  ds: "https://ds.canonical.com/",
  owl: "http://www.w3.org/2002/07/owl#",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  xsd: "http://www.w3.org/2001/XMLSchema#",
};

/** The fixture ontology + individuals as Turtle. */
export const BLOCK_TTL = `
@prefix ds: <https://ds.canonical.com/> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

# ---- Ontology (TBox) ----
ds:UIBlock a owl:Class .
ds:Component a owl:Class ; rdfs:subClassOf ds:UIBlock .
ds:Pattern a owl:Class ; rdfs:subClassOf ds:UIBlock .
ds:Subcomponent a owl:Class ; rdfs:subClassOf ds:UIBlock .
ds:Tier a owl:Class .
ds:ModifierFamily a owl:Class .
ds:Modifier a owl:Class .
ds:BlockProperty a owl:Class .

ds:name a owl:DatatypeProperty ;
  rdfs:domain ds:UIBlock ; rdfs:domain ds:ModifierFamily ;
  rdfs:domain ds:Modifier ; rdfs:domain ds:BlockProperty ; rdfs:range xsd:string .
ds:tier a owl:ObjectProperty, owl:FunctionalProperty ;
  rdfs:domain ds:UIBlock ; rdfs:range ds:Tier .
ds:summary a owl:DatatypeProperty ; rdfs:domain ds:UIBlock ; rdfs:range xsd:string .
ds:whenToUse a owl:DatatypeProperty ; rdfs:domain ds:UIBlock ; rdfs:range xsd:string .
ds:whenNotToUse a owl:DatatypeProperty ; rdfs:domain ds:UIBlock ; rdfs:range xsd:string .
ds:guidelines a owl:DatatypeProperty ; rdfs:domain ds:UIBlock ; rdfs:range xsd:string .
ds:anatomyDsl a owl:DatatypeProperty ; rdfs:domain ds:UIBlock ; rdfs:range xsd:string .
ds:anatomyClassic a owl:DatatypeProperty ; rdfs:domain ds:UIBlock ; rdfs:range xsd:string .
ds:figmaLink a owl:DatatypeProperty ; rdfs:domain ds:UIBlock ; rdfs:range xsd:string .

ds:hasModifierFamily a owl:ObjectProperty ; rdfs:domain ds:UIBlock ; rdfs:range ds:ModifierFamily .
ds:modifierFamily a owl:ObjectProperty ; rdfs:domain ds:Modifier ; rdfs:range ds:ModifierFamily .
ds:hasModifier a owl:ObjectProperty ; rdfs:domain ds:ModifierFamily ; rdfs:range ds:Modifier ;
  owl:inverseOf ds:modifierFamily ; rdfs:label "hasModifier" .

ds:hasProperty a owl:ObjectProperty ; rdfs:domain ds:UIBlock ; rdfs:range ds:BlockProperty .
ds:propertyType a owl:DatatypeProperty ; rdfs:domain ds:BlockProperty ; rdfs:range xsd:string .
ds:optional a owl:DatatypeProperty ; rdfs:domain ds:BlockProperty ; rdfs:range xsd:boolean .

# Domain is ds:Component (not ds:UIBlock) — reached via subtype scoping.
ds:hasSubcomponent a owl:ObjectProperty ; rdfs:domain ds:Component ; rdfs:range ds:Subcomponent .

# ---- Individuals (ABox) ----
ds:global a ds:Tier ; ds:name "global" .

ds:button a ds:Component ;
  ds:name "Button" ;
  ds:tier ds:global ;
  ds:summary "Primary action trigger with optional icon and label." ;
  ds:whenToUse "Use for the primary action on a view." ;
  ds:whenNotToUse "Do not use for navigation between pages." ;
  ds:guidelines "Keep labels short and action-oriented." ;
  ds:anatomyDsl "root: button; children: label, icon" ;
  ds:anatomyClassic "Button > Label, Icon" ;
  ds:figmaLink "https://figma.com/design/example/Button" ;
  ds:hasModifierFamily ds:family.importance, ds:family.density ;
  ds:hasProperty ds:button.prop.disabled ;
  ds:hasSubcomponent ds:button.icon .

ds:modal a ds:Component ;
  ds:name "Modal" ;
  ds:tier ds:global ;
  ds:summary "Focused overlay dialog for a single task." ;
  ds:whenToUse "Use to interrupt for a critical confirmation." ;
  ds:whenNotToUse "Do not use for non-blocking notifications." ;
  ds:guidelines "Always provide an explicit close affordance." ;
  ds:anatomyDsl "root: dialog; children: header, body, footer" ;
  ds:hasModifierFamily ds:family.size ;
  ds:hasProperty ds:modal.prop.open .

ds:button.icon a ds:Subcomponent ; ds:name "Button Icon" .

ds:button.prop.disabled a ds:BlockProperty ;
  ds:name "disabled" ; ds:propertyType "boolean" ; ds:optional true .
ds:modal.prop.open a ds:BlockProperty ;
  ds:name "open" ; ds:propertyType "boolean" ; ds:optional false .

# Families carry NO forward ds:hasModifier; values assert only the reverse
# ds:modifierFamily edge, so the inverse-union resolver must find them.
ds:family.importance a ds:ModifierFamily ; ds:name "importance" .
ds:family.density a ds:ModifierFamily ; ds:name "density" .
ds:family.size a ds:ModifierFamily ; ds:name "size" .

ds:mod.importance.primary a ds:Modifier ; ds:name "primary" ; ds:modifierFamily ds:family.importance .
ds:mod.importance.secondary a ds:Modifier ; ds:name "secondary" ; ds:modifierFamily ds:family.importance .
ds:mod.density.compact a ds:Modifier ; ds:name "compact" ; ds:modifierFamily ds:family.density .
ds:mod.size.small a ds:Modifier ; ds:name "small" ; ds:modifierFamily ds:family.size .
ds:mod.size.large a ds:Modifier ; ds:name "large" ; ds:modifierFamily ds:family.size .
`;
