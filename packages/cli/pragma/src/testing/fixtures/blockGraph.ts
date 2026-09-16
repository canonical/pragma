/**
 * A self-contained design-system fixture graph for the pack GraphQL engine and
 * the block lookup parity suites.
 *
 * Models the live ontology's shape faithfully but compactly: a `ds:UIBlock`
 * interface with `Component`/`Pattern`/`Subcomponent` subclasses, the block
 * detail properties (summary, usage, guidelines, anatomy, figmaLink),
 * modifier families with values asserted ONLY in the reverse
 * `ds:modifierFamily` direction (so the compiled inverse-union resolver is
 * exercised), block properties, and `ds:hasSubcomponent` scoped to `ds:Component`
 * (reached via a subtype-scoped fragment). Two blocks — Button and Modal —
 * carry the full spec so block content-parity asserts on a graph shaped like
 * the live one.
 *
 * The usage narrative is modelled as the live graph models it: ONE `ds:usage`
 * literal per block, free-text Markdown carrying its own `### When to use` /
 * `### When not to use` sub-sections. It used to declare the retired
 * `ds:whenToUse`/`ds:whenNotToUse` pair instead, which is why the block parity
 * suite went on asserting a "### When to use" heading that no real install had
 * rendered since the ontology conflated the two into `ds:usage`.
 *
 * Both shapes the live pack has are here on purpose: Button carries a
 * non-empty literal (126 of the 264 live blocks) and Modal an EMPTY one (the
 * other 138), so the fixture proves the renderer both nests a body's own
 * headings under the section heading AND prints no heading at all for an empty
 * literal. A fixture that only ever carried prose could not tell those apart.
 */

/** The prefixes the fixture store is built and queried with. */
export const BLOCK_PREFIXES: Readonly<Record<string, string>> = {
  ds: "https://ds.canonical.com/",
  owl: "http://www.w3.org/2002/07/owl#",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  xsd: "http://www.w3.org/2001/XMLSchema#",
  // The token-binding record spans three vocabularies exactly as the live
  // graph does: the design system owns the record and its edges, the token
  // ontology the symbol it consumes, and the anatomy DSL the style key and
  // state it applies at.
  anatomy: "https://anatomy.canonical.com/",
  dt: "https://dt.canonical.com/",
};

/**
 * A membership roster deep enough to cross the entity read's fan-in threshold,
 * so the fixture exercises the SAMPLED branch and not only the listed one.
 * Generated rather than written out: the count is the whole point of the case,
 * and 22 hand-copied lines invite someone to "tidy" one away.
 */
const ROSTER_MEMBER_COUNT = 22;
const ROSTER_MEMBERS = Array.from(
  { length: ROSTER_MEMBER_COUNT },
  (_, index) => `ds:probe.member${index} a ds:Probe ; ds:tier ds:rosterHub .`,
).join("\n");

/** The fixture ontology + individuals as Turtle. */
export const BLOCK_TTL = `
@prefix ds: <https://ds.canonical.com/> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix anatomy: <https://anatomy.canonical.com/> .
@prefix dt: <https://dt.canonical.com/> .

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
ds:usage a owl:DatatypeProperty ; rdfs:domain ds:UIBlock ; rdfs:range xsd:string .
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

# The token-binding record, modelled with the live graph's split ownership —
# which is what makes the block lookup's \`tokens\` expand a SPARQL-lane one.
#
# The five ds: edges carry a domain and a range, so ke-graphql derives a field
# for each and a document could read them. \`anatomy:styleKey\` and
# \`anatomy:styleState\` carry NO rdfs:domain, because they belong to the anatomy
# vocabulary and apply to every styled thing rather than to this record — so no
# field is derived for either, and a generated document drops them in SILENCE.
# They are two of the six columns that IDENTIFY a binding, so dropping them
# leaves rows a reader cannot tell apart. Preserved here deliberately: change
# the fixture to declare a domain and the suite stops testing the condition the
# lane exists for.
ds:TokenBinding a owl:Class .
ds:hasTokenBinding a owl:ObjectProperty ; rdfs:domain ds:UIBlock ; rdfs:range ds:TokenBinding .
ds:consumesSymbol a owl:ObjectProperty, owl:FunctionalProperty ;
  rdfs:domain ds:TokenBinding ; rdfs:range dt:TokenSymbol .
ds:viaBlock a owl:ObjectProperty ; rdfs:domain ds:TokenBinding ; rdfs:range ds:UIBlock .
ds:rank a owl:DatatypeProperty ; rdfs:domain ds:TokenBinding ; rdfs:range xsd:integer .
ds:node a owl:DatatypeProperty ; rdfs:domain ds:TokenBinding ; rdfs:range xsd:string .
dt:TokenSymbol a owl:Class .
anatomy:styleKey a owl:DatatypeProperty ; rdfs:range xsd:string .
anatomy:styleState a owl:DatatypeProperty ; rdfs:range xsd:string .

# ---- Individuals (ABox) ----
ds:global a ds:Tier ; ds:name "global" .

ds:button a ds:Component ;
  ds:name "Button" ;
  ds:tier ds:global ;
  ds:summary "Primary action trigger with optional icon and label." ;
  ds:usage "Buttons trigger actions; links go places.\\n\\n### When to use\\n\\n- For the primary action on a view.\\n\\n### When not to use\\n\\n- For navigation between pages." ;
  ds:guidelines "Keep labels short and action-oriented." ;
  ds:anatomyDsl "root: button; children: label, icon" ;
  ds:anatomyClassic "Button > Label, Icon" ;
  ds:figmaLink "https://figma.com/design/example/Button" ;
  ds:hasModifierFamily ds:family.importance, ds:family.density ;
  ds:hasProperty ds:button.prop.disabled ;
  ds:hasSubcomponent ds:button.icon ;
  ds:hasTokenBinding ds:binding.button.bg1, ds:binding.button.bg2,
    ds:binding.button.text, ds:binding.button.icon .

ds:modal a ds:Component ;
  ds:name "Modal" ;
  ds:tier ds:global ;
  ds:summary "Focused overlay dialog for a single task." ;
  ds:usage "" ;
  ds:guidelines "Always provide an explicit close affordance." ;
  ds:anatomyDsl "root: dialog; children: header, body, footer" ;
  ds:hasModifierFamily ds:family.size ;
  ds:hasProperty ds:modal.prop.open ;
  ds:hasTokenBinding ds:binding.modal.button .

ds:button.icon a ds:Subcomponent ; ds:name "Button Icon" .

# The symbols the bindings consume, addressed by the dotted name the token
# noun publishes — which is what the expand's \`ds:consumesSymbol/rdfs:label\`
# path reads, so a row here is an address \`token lookup\` takes.
dt:color.background a dt:TokenSymbol ; rdfs:label "color.background" .
dt:color.background.hover a dt:TokenSymbol ; rdfs:label "color.background.hover" .
dt:color.text a dt:TokenSymbol ; rdfs:label "color.text" .
dt:color.icon a dt:TokenSymbol ; rdfs:label "color.icon" .

# Button's own tree. Two records share a node and a key and differ ONLY in
# state and rank — the pair that proves the two columns the GraphQL lane cannot
# see are the ones that tell the rows apart. The declaration order here is
# deliberately NOT the reading order (node, then key, then rank), so the
# expand's own ORDER BY is what puts them right.
ds:binding.button.bg2 a ds:TokenBinding ;
  ds:consumesSymbol dt:color.background.hover ;
  anatomy:styleKey "appearance.background" ; anatomy:styleState "hover" ;
  ds:rank 2 ; ds:viaBlock ds:button ; ds:node "$root" .
ds:binding.button.bg1 a ds:TokenBinding ;
  ds:consumesSymbol dt:color.background ;
  anatomy:styleKey "appearance.background" ; anatomy:styleState "default" ;
  ds:rank 1 ; ds:viaBlock ds:button ; ds:node "$root" .
ds:binding.button.text a ds:TokenBinding ;
  ds:consumesSymbol dt:color.text ;
  anatomy:styleKey "typography.color" ; anatomy:styleState "default" ;
  ds:rank 1 ; ds:viaBlock ds:button ; ds:node "$root" .
# Reached through the subcomponent Button's anatomy embeds, so its via DIFFERS
# from the block and must print.
ds:binding.button.icon a ds:TokenBinding ;
  ds:consumesSymbol dt:color.icon ;
  anatomy:styleKey "appearance.background" ; anatomy:styleState "default" ;
  ds:rank 1 ; ds:viaBlock ds:button.icon ; ds:node "$root/icon" .
# Modal consumes nothing of its own: its one record is Button's, reached
# through the Button its anatomy embeds.
ds:binding.modal.button a ds:TokenBinding ;
  ds:consumesSymbol dt:color.background ;
  anatomy:styleKey "appearance.background" ; anatomy:styleState "default" ;
  ds:rank 1 ; ds:viaBlock ds:button ; ds:node "$root/footer" .

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

# ---- Neighbourhood-read probes ----
# Typed \`ds:Probe\`, which is deliberately NOT declared as an owl:Class and is
# outside the block VALUES set, so these individuals reach the entity reader
# without entering any block list or the ontology class listing.
#
# literalTrap holds a STRING that begins with the ds: namespace. Read through
# the lossy string view it was indistinguishable from an IRI and got compacted
# into something that read back as one; the term view is what tells them apart.
ds:literalTrap a ds:Probe ;
  ds:name "literal trap" ;
  ds:figmaLink "https://ds.canonical.com/not-an-iri" .

# blankHolder carries blank-node objects — store-local handles that re-mint on
# every load — so the read must inline them as records AND order those records
# by content rather than by the label that grouped them.
ds:blankHolder a ds:Probe ;
  ds:name "blank holder" ;
  ds:changeLog [ a ds:ChangeLogEntry ; ds:changeType "decision" ; ds:change "Split the button." ] ;
  ds:changeLog [ a ds:ChangeLogEntry ; ds:changeType "revision" ; ds:change "Renamed the slot." ] .

# One blank node reached by TWO predicates — keyed by node alone, the second
# edge silently vanished.
ds:doubleLinked a ds:Probe ;
  ds:name "double linked" ;
  ds:changeLog [ a ds:ChangeLogEntry ; ds:changeType "decision" ] ;
  ds:usageNote [ a ds:ChangeLogEntry ; ds:changeType "note" ] .

# An RDF 1.2 directional literal — dropped, it reads as a plain @ar literal.
ds:directional a ds:Probe ;
  ds:name "\u0645\u0631\u062D\u0628\u0627"@ar--rtl .

# The roster hub also carries ONE edge under a different predicate, so a read
# can prove that a 22-deep neighbour does not evict its quieter sibling.
ds:rosterHub a ds:Probe ; ds:name "roster hub" .
ds:probe.quiet a ds:Probe ; ds:hasSubcomponent ds:rosterHub .
${ROSTER_MEMBERS}
`;

/**
 * An OPT-IN overlay for the lookup-addressing suite, appended to
 * {@link BLOCK_TTL} by the tests that need it and by nothing else — the block
 * parity, ontology and GraphQL-engine suites assert over the base graph and
 * must keep seeing exactly two components.
 *
 * It models the four shapes the addressing path gets wrong: two components
 * sharing one `ds:name` (declared zeta-first so the store's enumeration order
 * and IRI order DISAGREE), a component carrying no `ds:name` at all (reachable
 * only by IRI, the way 131 of the 144 live code standards are), and a component
 * whose `ds:name` is PADDED with a trailing space.
 *
 * That last one is copied from the live graph, not invented: 66 shipped names
 * end in a space, carried across by the transform that reads them out of the
 * source document, and `block lookup Timeline` used to answer
 * ENTITY_NOT_FOUND while suggesting "Timeline " back. It is spelled with the
 * live name so the fixture reads as the report it came from.
 *
 * The shared name is a SHAPE probe, not the live ambiguity: neither chip's tier
 * outranks the other, so this fixture can only prove that both are returned in a
 * total order — never which of them a reader means. Deciding that is a judgement
 * about real tiers, and it is asserted where the real tiers are, against the
 * shipped pack (`capabilities/block.tierRank.exec.test.ts`).
 */
export const AMBIGUOUS_TTL = `
ds:apps a ds:Tier ; ds:name "apps" .

ds:zeta.chip a ds:Component ;
  ds:name "Chip" ;
  ds:tier ds:global ;
  ds:summary "The zeta chip — declared first, sorts last." .

ds:alpha.chip a ds:Component ;
  ds:name "Chip" ;
  ds:tier ds:apps ;
  ds:summary "The alpha chip — declared last, sorts first." .

ds:nameless.widget a ds:Component ;
  ds:tier ds:global ;
  ds:summary "Carries no ds:name; addressable only by IRI." .

ds:padded.timeline a ds:Component ;
  ds:name "Timeline " ;
  ds:tier ds:global ;
  ds:summary "Its ds:name carries the source document's trailing space." .
`;
