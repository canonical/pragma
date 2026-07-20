/**
 * The hermetic, vendored "default-pack" fixture — a SMALL but REAL multi-typed
 * design-system pack, shaped the way a shipped default pack actually is, not the
 * way the 6-entity single-typed canonical graph was.
 *
 * WHY A SECOND GRAPH (the R1 "one graph" discipline notwithstanding): the
 * canonical fixture (`canonical.ts`) is deliberately clean — every individual is
 * single-typed (`a ds:Component`), every block carries a tier, every label is a
 * bare string. That cleanliness is exactly what masked the real-data counter and
 * classifier bugs the journey harness (AV-231, Backlog E) exists to catch. This
 * fixture is the ADVERSARIAL default pack: it reproduces the four shapes a real
 * vendored pack has that the clean graph does not —
 *
 *  1. `owl:NamedIndividual` co-typing — every block is
 *     `a owl:NamedIndividual, ds:<Class>`, the way exported OWL individuals are.
 *     This is what doubles the per-type instance tally (A1 `entityTotal` 2×): a
 *     block counts once under `owl:NamedIndividual` AND once under its domain
 *     class.
 *  2. Two+ domain classes (`ds:Component` and `ds:Pattern`) so a read that keys
 *     off the primary domain type is exercised across more than one class.
 *  3. An UNTIERED block (`ds:orphanWidget` — a `ds:Component` with a `ds:name`
 *     but NO `ds:tier`). `block list`'s SELECT inner-joins `?c ds:tier ?t`, so an
 *     untiered block is silently dropped from every listing (A2), even though
 *     `graph query` finds it — the fixture pins both halves of that divergence.
 *  4. A multilingual `rdfs:label "Button"@en, "Bouton"@fr` — two same-predicate
 *     labels whose winner in the single-valued index is store-order-arbitrary
 *     (A7), a shape a bare-string fixture can never produce.
 *
 * The vocabulary is the live `ds:` design-system namespace (same as
 * `blockGraph.ts`/`canonical.ts`), so `block list`, `ontology list/show`, and
 * `graph query` all run against real terms — the hand-written `block list` verb
 * hard-codes `ds:Component`/`ds:name`/`ds:tier`/`ds:release`.
 *
 * Stable anchors this fixture guarantees (pinned by the journey suite):
 *  - Exactly 4 blocks in the graph: Button (`ds:Component`, global), Card
 *    (`ds:Pattern`, global), Beta Badge (`ds:Component`, apps tier, beta
 *    channel), Orphan Widget (`ds:Component`, UNTIERED).
 *  - 5 TBox classes, 4 TBox properties, 2 tiers (`global`, `apps`), 2 release
 *    channels (`stable`, `beta`).
 *  - `ds:button` carries the multilingual label; every other subject is a bare
 *    string, so the multilingual path is isolated to one entity.
 */

/** The prefixes the default-pack fixture store is built and queried with. */
export const DEFAULT_PACK_PREFIXES: Readonly<Record<string, string>> = {
  ds: "https://ds.canonical.com/",
  owl: "http://www.w3.org/2002/07/owl#",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  xsd: "http://www.w3.org/2001/XMLSchema#",
};

/**
 * The vendored default pack as one Turtle document: TBox (5 classes, 4
 * properties) + ABox (2 tiers, 2 channels, 4 blocks). Every block is co-typed
 * `owl:NamedIndividual` — the real-export shape the clean canonical graph omits.
 */
export const DEFAULT_PACK_TTL = `
@prefix ds: <https://ds.canonical.com/> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

# ---- Ontology (TBox): 5 classes, 4 properties ----
ds:UIBlock a owl:Class ; rdfs:label "UI Block" .
ds:Component a owl:Class ; rdfs:subClassOf ds:UIBlock ; rdfs:label "Component" .
ds:Pattern a owl:Class ; rdfs:subClassOf ds:UIBlock ; rdfs:label "Pattern" .
ds:Tier a owl:Class ; rdfs:label "Tier" .
ds:ReleaseChannel a owl:Class ; rdfs:label "Release Channel" .

ds:name a owl:DatatypeProperty ; rdfs:domain ds:UIBlock ; rdfs:range xsd:string .
# Functional (one tier per block), matching the live ontology — a non-functional
# ds:tier compiles to a multi-valued GraphQL field the bundled block lookup rejects.
ds:tier a owl:ObjectProperty, owl:FunctionalProperty ; rdfs:domain ds:UIBlock ; rdfs:range ds:Tier .
ds:release a owl:ObjectProperty, owl:FunctionalProperty ; rdfs:domain ds:UIBlock ; rdfs:range ds:ReleaseChannel .
ds:summary a owl:DatatypeProperty ; rdfs:domain ds:UIBlock ; rdfs:range xsd:string .

# ---- Tiers (a real parent chain: apps -> global) ----
ds:global a ds:Tier ; ds:name "global" .
ds:apps a ds:Tier ; ds:name "apps" .

# ---- Release channels ----
ds:stable a ds:ReleaseChannel ; ds:name "stable" .
ds:beta a ds:ReleaseChannel ; ds:name "beta" .

# ---- Blocks (ABox) — every one co-typed owl:NamedIndividual (the export shape) ----

# A component on the global tier, carrying a MULTILINGUAL label (A7 shape).
ds:button a owl:NamedIndividual, ds:Component ;
  ds:name "Button" ;
  rdfs:label "Button"@en, "Bouton"@fr ;
  ds:tier ds:global ;
  ds:summary "A clickable button control." .

# A second DOMAIN CLASS (ds:Pattern), on the global tier.
ds:card a owl:NamedIndividual, ds:Pattern ;
  ds:name "Card" ;
  rdfs:label "Card" ;
  ds:tier ds:global ;
  ds:summary "A content card layout pattern." .

# A component gated to the BETA channel and the non-global apps tier — exercises
# both channel visibility and tier-chain inheritance.
ds:betaBadge a owl:NamedIndividual, ds:Component ;
  ds:name "Beta Badge" ;
  rdfs:label "Beta Badge" ;
  ds:tier ds:apps ;
  ds:release ds:beta ;
  ds:summary "An experimental badge, gated to the prerelease channel." .

# An UNTIERED component — a real ds:Component with a ds:name but NO ds:tier.
# It IS in the graph (graph query finds it) but block list's mandatory
# tier join (?c ds:tier ?t) drops it (A2).
ds:orphanWidget a owl:NamedIndividual, ds:Component ;
  ds:name "Orphan Widget" ;
  rdfs:label "Orphan Widget" ;
  ds:summary "A component shipped without a tier assignment." .
`;

/** No-tier viewing config, `normal` channel — hides the beta-only Beta Badge. */
export const DEFAULT_PACK_CONFIG = { channel: "normal" as const };

/** `prerelease` channel, no tier — the config where every channel-gated block shows. */
export const DEFAULT_PACK_ALL_VISIBLE_CONFIG = {
  channel: "prerelease" as const,
};

/** The names of the 4 blocks the fixture declares, sorted (SPARQL `ORDER BY ?name`). */
export const DEFAULT_PACK_BLOCK_NAMES = [
  "Beta Badge",
  "Button",
  "Card",
  "Orphan Widget",
] as const;

/** The block excluded from `block list` for want of a `ds:tier` (A2 anchor). */
export const UNTIERED_BLOCK_NAME = "Orphan Widget";

/**
 * A second, ontology-only pack with NO tiered blocks — drives the EMPTY
 * `block list` (a calm exit-0 empty result, not an error). It still declares the
 * `ds:` TBox, so `ontology list` is POPULATED here (the populated/empty pair for
 * the two list verbs is split across this and {@link INSTANCE_ONLY_TTL}).
 */
export const NO_BLOCKS_TTL = `
@prefix ds: <https://ds.canonical.com/> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ds:UIBlock a owl:Class .
ds:Component a owl:Class ; rdfs:subClassOf ds:UIBlock .
ds:Tier a owl:Class .
ds:name a owl:DatatypeProperty ; rdfs:domain ds:UIBlock ; rdfs:range xsd:string .
ds:tier a owl:ObjectProperty ; rdfs:domain ds:UIBlock ; rdfs:range ds:Tier .

ds:global a ds:Tier ; ds:name "global" .
`;

/**
 * A pack of pure instance data with NO `owl:Class`/`owl:*Property` declarations —
 * drives the EMPTY `ontology list` (no namespace has any classes or properties
 * to group), while `graph query` still resolves its triples.
 */
export const INSTANCE_ONLY_TTL = `
@prefix ex: <https://ex.test/#> .
ex:alpha ex:relatesTo ex:beta .
ex:beta ex:name "Beta" .
`;

/**
 * A malformed Turtle source — a subject/predicate with no object — drives the
 * `sources update` data-error classification path (a NAMED `CONFIG_ERROR`, not
 * an INTERNAL "please report this issue").
 */
export const MALFORMED_TTL = `@prefix ex: <https://ex.test/#> .
ex:One a ex:Widget .
ex:Two ex:danglingPredicate .
`;
