/**
 * A realistic multi-typed OWL / Protégé-export fixture graph.
 *
 * The embedded `sample.ttl` (Button/Card/Dialog, each typed by exactly ONE
 * domain class, every block tiered, every label untagged) is a TOY: it never
 * exercises the counters/classifiers the way a real vocabulary does. This graph
 * deliberately carries the shapes that only bite real packs (audit backlog A):
 *
 * - Protégé DUAL-typing: an individual asserted as its domain class AND
 *   `owl:NamedIndividual` — the multiset that made `entityTotal` run ~2× (A1).
 * - A MULTI-DOMAIN individual (`ex:toggle`: two domain classes) — so the
 *   primary-type tie-break must be deterministic, not store-order (A3).
 * - An UNTIERED block (`ds:datePicker`: a `ds:Component` with no `ds:tier`) —
 *   which `block list --all-tiers` must surface, not hide (A2).
 * - A blank-node `rdf:type` (`ex:field`'s anonymous SHACL-style class) — which
 *   must NOT become a `type:"_:b0"` primary key (A6).
 * - An OWL-PUNNED subject (`ex:Slider`: a class that is ALSO a metaclass
 *   individual) — whose abox facet must survive alongside its tbox one (A8).
 * - MULTILINGUAL labels (`"Button"@en` / `"Bouton"@fr`) — resolved to a stable
 *   language, never whichever row the store returned first (A7).
 *
 * The `ds:` half is a compact but faithful design-system slice (so `block list`
 * runs against it); the `ex:` half is generic OWL, proving the index is
 * ontology-agnostic. One document, so a single store answers every read.
 */

/** The prefixes the OWL-export fixture store is built and queried with. */
export const OWL_EXPORT_PREFIXES: Readonly<Record<string, string>> = {
  ds: "https://ds.canonical.com/",
  ex: "https://ex.test/vocab#",
  rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  owl: "http://www.w3.org/2002/07/owl#",
  xsd: "http://www.w3.org/2001/XMLSchema#",
};

/** The multi-typed OWL-export fixture ontology + individuals as Turtle. */
export const OWL_EXPORT_TTL = `
@prefix ds:   <https://ds.canonical.com/> .
@prefix ex:   <https://ex.test/vocab#> .
@prefix rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix owl:  <http://www.w3.org/2002/07/owl#> .
@prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .

# ---- Design-system TBox (so \`block list\` has real block types) ----
ds:UIBlock a owl:Class .
ds:Component a owl:Class ; rdfs:subClassOf ds:UIBlock ; rdfs:label "Component" .
ds:Tier a owl:Class .
ds:name a owl:DatatypeProperty ; rdfs:domain ds:UIBlock ; rdfs:range xsd:string .
ds:tier a owl:ObjectProperty ; rdfs:domain ds:UIBlock ; rdfs:range ds:Tier .
ds:global a owl:NamedIndividual, ds:Tier ; ds:name "global" .

# ---- Generic OWL domain classes (multi-typing lives here) ----
ex:Interactive a owl:Class ; rdfs:label "Interactive" .
ex:FormControl a owl:Class ; rdfs:label "Form Control" .
ex:Category a owl:Class ; rdfs:label "Category" .

# ---- A tiered block, Protégé-style DUAL-typed (domain class + owl:NamedIndividual),
#      with a multilingual label (A1 + A7). ----
ds:button a owl:NamedIndividual, ds:Component ;
  ds:name "Button" ;
  ds:tier ds:global ;
  rdfs:label "Button"@en , "Bouton"@fr .

# ---- An UNTIERED block: a ds:Component with NO ds:tier (A2). ----
ds:datePicker a owl:NamedIndividual, ds:Component ;
  ds:name "Date Picker" ;
  rdfs:label "Date Picker"@en , "Sélecteur de date"@fr .

# ---- A MULTI-DOMAIN individual: two domain classes + owl:NamedIndividual (A1 + A3).
#      The abox primary must be the lexically-smallest: ex:FormControl < ex:Interactive. ----
ex:toggle a owl:NamedIndividual, ex:Interactive, ex:FormControl ;
  rdfs:label "Toggle"@en , "Bascule"@fr .

# ---- An OWL-PUNNED subject: a class that is ALSO a metaclass individual (A8).
#      Must emit BOTH a tbox facet (owl:Class) and an abox facet (ex:Category). ----
ex:Slider a owl:Class, owl:NamedIndividual, ex:Category ;
  rdfs:label "Slider" .

# ---- A subject with a BLANK-NODE rdf:type: an anonymous class (A6).
#      The blank node must NOT become ex:field's primary type. ----
ex:field a owl:NamedIndividual, ex:FormControl, [ a owl:Class ] ;
  rdfs:label "Field" .
`;

/** The distinct abox individuals this fixture declares (the `entityTotal` oracle). */
export const OWL_EXPORT_ABOX_SUBJECTS: readonly string[] = [
  "ds:button",
  "ds:datePicker",
  "ds:global",
  "ex:Slider",
  "ex:field",
  "ex:toggle",
];
