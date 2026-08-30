/**
 * The ONE shared content graph for cross-cutting behavioral tests.
 *
 * R1 discipline: this does NOT fork a second graph. It IMPORTS PR3's
 * Button/Modal fixture (`testing/fixtures/blockGraph.ts` — the graph PR3's own
 * `block` content-parity + `ontology`/`graph inspect` tests are protected
 * against) byte-for-byte and EXTENDS it with the entities the other bundled
 * read nouns (`standard`, `modifier`, `token`, `tier`) need, plus two more
 * blocks that used to exercise tier-chain inheritance and channel visibility
 * (PR3's hand-written `block list`, Risk5). Those two now serve the opposite
 * purpose: L-OPEN-9 removed the filtering, so a tier-scoped and a
 * channel-gated block are what prove the declared list hides NEITHER. Because
 * `BLOCK_TTL` is reused verbatim, Button/Modal content can never drift between
 * PR3's fixture and this one.
 *
 * Composed as one Turtle document, so ONE store answers every read noun:
 * `block`/`ontology`/`graph inspect` were already provable on `BLOCK_TTL`
 * alone; `standard`/`modifier`/`token`/`tier` need the sections added below.
 * `modifier` in particular needs NOTHING extra — its list/lookup query the
 * exact `ds:ModifierFamily`/`ds:Modifier` individuals `BLOCK_TTL` already
 * declares for Button/Modal's expand sections.
 *
 * Anchors this fixture guarantees stay stable (referenced by B-tier tests and
 * the eval seed, per the plan's R2 discipline — noun/verb/tool SETS are read
 * from `emitSurface(capabilities)` at test time, but these entity VALUES are
 * ours to pin): 4 `ds:Component` (Button, Modal, LXD Panel, Beta Widget),
 * `importance` family with value `primary`, code standard
 * `code/function/purity`.
 *
 * Two of those anchors exist to pin an ABSENCE, and are load-bearing for the
 * "declared, not inferred" halves of the read grammar:
 * - `ds:token.legacy.borderRadius` — a `ds:Token` with no `ds:tokenId`, which
 *   `token list` therefore never publishes and `token lookup`/`token sample`
 *   must never reach (`PackLookup.nameFallback` is declared by `standard`
 *   alone).
 * - `cs:archive` — a `cs:Category` with no standards, which `standard
 *   categories` reports at count 0 and `standard list --category archive` must
 *   answer with a calm empty list rather than INVALID_INPUT.
 */

import { BLOCK_PREFIXES, BLOCK_TTL } from "../blockGraph.js";

/** Extra `ds:` individuals: a tier-chain + a beta-only block, tokens, tiers. */
const DS_EXTRA_TTL = `
# ---- Tiers beyond the global BLOCK_TTL already declares ----
ds:apps a ds:Tier ; ds:name "apps" .
ds:apps_lxd a ds:Tier ; ds:name "apps/lxd" .

# ---- Release channels ----
ds:ReleaseChannel a owl:Class .
ds:release a owl:ObjectProperty ; rdfs:domain ds:UIBlock ; rdfs:range ds:ReleaseChannel .
ds:stable a ds:ReleaseChannel ; ds:name "stable" .
ds:beta a ds:ReleaseChannel ; ds:name "beta" .

# ---- A third block, scoped to the apps/lxd tier (tier-chain inheritance) ----
ds:lxdPanel a ds:Component ;
  ds:name "LXD Panel" ;
  ds:tier ds:apps_lxd ;
  ds:summary "Panel layout for the LXD application." .

# ---- A fourth block, visible only on the prerelease channel ----
ds:betaWidget a ds:Component ;
  ds:name "Beta Widget" ;
  ds:tier ds:global ;
  ds:release ds:beta ;
  ds:summary "An experimental widget gated to the prerelease channel." .

# ---- Tokens ----
ds:Token a owl:Class .
ds:TokenType a owl:Class .
ds:tokenId a owl:DatatypeProperty ; rdfs:domain ds:Token ; rdfs:range xsd:string .
ds:tokenType a owl:ObjectProperty ; rdfs:domain ds:Token ; rdfs:range ds:TokenType .
ds:valueLight a owl:DatatypeProperty ; rdfs:domain ds:Token ; rdfs:range xsd:string .
ds:valueDark a owl:DatatypeProperty ; rdfs:domain ds:Token ; rdfs:range xsd:string .

ds:type.color a ds:TokenType ; rdfs:label "color" .
ds:type.spacing a ds:TokenType ; rdfs:label "spacing" .

ds:token.color.primary a ds:Token ;
  ds:tokenId "color.primary" ;
  ds:tokenType ds:type.color ;
  ds:valueLight "#0066CC" ;
  ds:valueDark "#4D94FF" .
ds:token.spacing.medium a ds:Token ;
  ds:tokenId "spacing.medium" ;
  ds:tokenType ds:type.spacing ;
  ds:valueLight "16px" ;
  ds:valueDark "16px" .

# A ds:Token carrying NO ds:tokenId — the entity "token list" does not publish,
# because its query REQUIRES the id. It is here to pin what a lookup may NOT
# reach: "token lookup" addresses by ds:tokenId, and a story whose list requires
# its "by" property must not become addressable (or sampleable) under a name
# derived from its IRI. See PackLookup.nameFallback, declared by the "standard"
# story alone — the one story whose list DOES publish such a name.
ds:token.legacy.borderRadius a ds:Token ;
  ds:tokenType ds:type.spacing ;
  ds:valueLight "4px" ;
  ds:valueDark "4px" .
`;

/**
 * The `cs:` (code standards) section — shaped like the SHIPPED code-standards
 * graph, not like a convenience fixture.
 *
 * Two facts about the real data are reproduced here on purpose, because the
 * eval harness was blind to both while every fixture standard carried a
 * `cs:name`:
 *
 * 1. **Most standards carry NO `cs:name`.** The shipped graph asserts it on 22
 *    of 156 (~13%); one of the eight standards below carries one (~13%). The
 *    ontology says so deliberately — `cs:name` is "an optional human-readable
 *    display title" that "never participates in identity", the canonical
 *    identifier being the compact IRI. So the name `standard list` publishes for
 *    the other seven is SYNTHESIZED from the IRI local name
 *    (`cs:react.component.props` → `react/component/props`), and a lookup that
 *    cannot resolve a synthesized name cannot resolve the graph.
 * 2. **Categories are a two-level SKOS tree.** `cs:testing.unit skos:broader
 *    cs:testing`, exactly as the shipped graph declares for `testing.*` and
 *    `ui_blocks.nojs`, and one standard sits DIRECTLY on the parent — the case a
 *    non-reflexive roll-up (`skos:broader+`) silently drops.
 *
 * Anchor names (`code/function/purity`, `react/component/*`) are unchanged; they
 * are simply reached the way the real graph reaches them.
 */
const CS_TTL = `
@prefix cs: <http://pragma.canonical.com/codestandards#> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .

cs:CodeStandard a owl:Class .
cs:Category a owl:Class .
cs:Example a owl:Class .
cs:name a owl:DatatypeProperty ; rdfs:domain cs:CodeStandard ; rdfs:range xsd:string .
cs:description a owl:DatatypeProperty ; rdfs:range xsd:string .
cs:hasCategory a owl:ObjectProperty ; rdfs:domain cs:CodeStandard ; rdfs:range cs:Category .
cs:slug a owl:DatatypeProperty ; rdfs:domain cs:Category ; rdfs:range xsd:string .
cs:extends a owl:ObjectProperty ; rdfs:domain cs:CodeStandard ; rdfs:range cs:CodeStandard .
cs:do a owl:ObjectProperty ; rdfs:domain cs:CodeStandard ; rdfs:range cs:Example .
cs:dont a owl:ObjectProperty ; rdfs:domain cs:CodeStandard ; rdfs:range cs:Example .
cs:language a owl:DatatypeProperty ; rdfs:domain cs:Example ; rdfs:range xsd:string .
cs:code a owl:DatatypeProperty ; rdfs:domain cs:Example ; rdfs:range xsd:string .

# ---- Categories: flat roots, plus one two-level branch (testing) ----
cs:react a cs:Category ; rdfs:label "React" ; cs:slug "react" .
cs:code a cs:Category ; rdfs:label "Code" ; cs:slug "code" .
cs:turtle a cs:Category ; rdfs:label "Turtle" ; cs:slug "turtle" .
cs:testing a cs:Category ; rdfs:label "Testing" ; cs:slug "testing" .
cs:testing.unit a cs:Category ;
  rdfs:label "Unit testing" ;
  cs:slug "testing-unit" ;
  skos:broader cs:testing .

# A category the graph DECLARES with no standards filed under it. The
# "standard categories" verb lists it with count 0, so
# "standard list --category archive" must be the documented calm empty list — a
# real slug, an empty answer. Validity read off the returned ROWS instead of the
# graph called it INVALID_INPUT.
cs:archive a cs:Category ;
  rdfs:label "Archive" ;
  cs:slug "archive" .

# ---- Standards. Seven of eight carry NO cs:name (the shipped ~13% split). ----
cs:react.component.props a cs:CodeStandard ;
  cs:description "Type component props explicitly." ;
  cs:hasCategory cs:react ;
  cs:do [ a cs:Example ; cs:description "Do type props" ; cs:language "tsx" ; cs:code "interface P {}" ] ;
  cs:dont [ a cs:Example ; cs:description "Avoid any" ; cs:language "tsx" ; cs:code "props: any" ] .

cs:react.component.structure a cs:CodeStandard ;
  cs:description "Keep folder structure flat." ;
  cs:hasCategory cs:react ;
  cs:extends cs:react.component.props ;
  cs:do [ a cs:Example ; cs:description "Do flatten" ; cs:language "text" ; cs:code "src/Button.tsx" ] .

cs:code.function.purity a cs:CodeStandard ;
  cs:description "Prefer pure functions." ;
  cs:hasCategory cs:code .

# The standard sitting DIRECTLY on the parent category: a skos:broader+
# roll-up loses it, a reflexive skos:broader* keeps it.
cs:testing.smoke a cs:CodeStandard ;
  cs:description "Keep one end-to-end smoke path green." ;
  cs:hasCategory cs:testing .

cs:testing.unit.isolation a cs:CodeStandard ;
  cs:description "Isolate the unit under test." ;
  cs:hasCategory cs:testing.unit .

cs:testing.unit.naming a cs:CodeStandard ;
  cs:description "Name a unit test for the behaviour it pins." ;
  cs:hasCategory cs:testing.unit ;
  cs:do [ a cs:Example ; cs:description "Do name the behaviour" ; cs:language "ts" ; cs:code "it(\\"rejects an empty batch\\")" ] .

cs:testing.unit.fixtures a cs:CodeStandard ;
  cs:description "Share one fixture per behavioural claim." ;
  cs:hasCategory cs:testing.unit .

# The ~13%: a display title that adds something the IRI does not.
cs:turtle.naming.local_name_casing a cs:CodeStandard ;
  cs:name "Turtle local-name casing" ;
  cs:description "Use snake_case for multi-word local-name segments." ;
  cs:hasCategory cs:turtle .
`;

/** The `ds:Prompt` workflow templates — the ONE source both the `prompt_list`/
 * `prompt_lookup` content tools and the native MCP `prompts/*` surface project.
 * Adapted from the old shell's `DECISION_TREES`. `rdfs:label` is the prompt name
 * (indexed → storeless native list); `ds:promptBody` + `ds:promptArgument`
 * blank nodes are store-backed. Arguments are untyped blank nodes so they never
 * enter the entity index (the same shape `cs:do`/`cs:dont` examples use). */
const PROMPT_TTL = `
ds:Prompt a owl:Class .
ds:promptBody a owl:DatatypeProperty ; rdfs:domain ds:Prompt ; rdfs:range xsd:string .
ds:promptArgument a owl:ObjectProperty ; rdfs:domain ds:Prompt .
ds:argName a owl:DatatypeProperty ; rdfs:range xsd:string .
ds:argRequired a owl:DatatypeProperty ; rdfs:range xsd:boolean .

ds:prompt.build-a-block a ds:Prompt ;
  rdfs:label "build-a-block" ;
  rdfs:comment "Scaffold and wire a design-system block end to end." ;
  ds:promptBody "You are building the {{blockName}} block. 1) If unfamiliar with block data, call block_sample for real shapes. 2) block_list to browse, or block_lookup {{blockName}} --detail detailed for anatomy, modifiers, and properties. 3) Follow the relevant standards via standard_lookup." ;
  ds:promptArgument [ ds:argName "blockName" ; rdfs:comment "The block to build (e.g. Button)." ; ds:argRequired false ] .

ds:prompt.audit-standards a ds:Prompt ;
  rdfs:label "audit-standards" ;
  rdfs:comment "Audit code against the design system's coding standards." ;
  ds:promptBody "Audit code against the {{category}} standards. 1) standard_categories to see categories. 2) standard_list --category {{category}}. 3) standard_lookup <name> --detail detailed for do/don't examples, then reconcile the code." ;
  ds:promptArgument [ ds:argName "category" ; rdfs:comment "Standard category slug (e.g. react)." ; ds:argRequired false ] .

ds:prompt.explore-design-system a ds:Prompt ;
  rdfs:label "explore-design-system" ;
  rdfs:comment "Orient in an unfamiliar design system before querying." ;
  ds:promptBody "Explore the design system. 1) capabilities for the tool map. 2) block_sample / modifier_sample for real data shapes. 3) ontology_list then ontology_show <ns> for the schema. 4) tier_list for the tier hierarchy. 5) graph_query for raw SPARQL joins." .

ds:prompt.configure a ds:Prompt ;
  rdfs:label "configure" ;
  rdfs:comment "Set the active tier and release channel scope." ;
  ds:promptBody "Configure pragma's scope. Set the tier with config_tier {{tier}}, the channel with config_channel {{channel}} (normal|experimental|prerelease), then confirm with config_show." ;
  ds:promptArgument [ ds:argName "tier" ; rdfs:comment "Tier path (e.g. apps/lxd)." ; ds:argRequired false ] ;
  ds:promptArgument [ ds:argName "channel" ; rdfs:comment "Release channel." ; ds:argRequired false ] .

ds:prompt.scaffold-component a ds:Prompt ;
  rdfs:label "scaffold-component" ;
  rdfs:comment "Scaffold a new component and align it to the standards." ;
  ds:promptBody "Scaffold the {{componentName}} component in {{framework}}. Use create_component with framework {{framework}} and the component path, then review the generated files against the react/component standards via standard_lookup." ;
  ds:promptArgument [ ds:argName "componentName" ; rdfs:comment "Component name/path (e.g. Button)." ; ds:argRequired true ] ;
  ds:promptArgument [ ds:argName "framework" ; rdfs:comment "react | svelte | lit." ; ds:argRequired false ] .
`;

/** The `ds:Concept` section — long-form documentation entries the `concept`
 * story reads. Mirrors the real design-system data shape (canonical/design-system#64):
 * `ds:name`/`ds:summary`/`ds:tier` base, the Markdown body in `ds:content`
 * (standard disclosure), `ds:knownEdgeCases` (detailed), and `ds:conceptType`
 * → a named `ds:ConceptType` individual carrying its own `ds:name`. */
const CONCEPT_TTL = `
ds:Concept a owl:Class .
ds:ConceptType a owl:Class .
ds:content a owl:DatatypeProperty ; rdfs:domain ds:Concept ; rdfs:range xsd:string .
ds:knownEdgeCases a owl:DatatypeProperty ; rdfs:domain ds:Concept ; rdfs:range xsd:string .
ds:conceptType a owl:ObjectProperty ; rdfs:domain ds:Concept ; rdfs:range ds:ConceptType .

ds:concepttype.Explanation a ds:ConceptType ;
  ds:name "Explanation" ;
  ds:summary "Concept documentation that deepens understanding of a topic." .

ds:concepttype.How-to-guide a ds:ConceptType ;
  ds:name "How-to guide" ;
  ds:summary "Concept documentation that walks through solving a problem." .

ds:concept.Foundations-Grid a ds:Concept ;
  ds:name "Foundations: Grid" ;
  ds:summary "How the grid system underpins every layout." ;
  ds:tier ds:global ;
  ds:conceptType ds:concepttype.Explanation ;
  ds:content "The grid is the shared spatial contract every block lays out against." ;
  ds:knownEdgeCases "Nested grids inherit the outer gutter unless re-declared." .

ds:concept.Question-mark-vs-information-icon a ds:Concept ;
  ds:name "Question mark vs information icon" ;
  ds:summary "Deciding between the information icon and the question mark icon." ;
  ds:tier ds:global ;
  ds:conceptType ds:concepttype.How-to-guide ;
  ds:content "The information icon offers context proactively; the question mark answers a question the user already has." ;
  ds:knownEdgeCases "Icon interpretation depends on the user's prior conventions." .
`;

/**
 * The implementation graph: two libraries whose `ds:implementsBlock` edges point
 * at `BLOCK_TTL`'s own Button/Modal IRIs, so a test can prove the cross-pack
 * join (an implementation collected from source resolving to a block declared by
 * the design system) rather than just the shape of a row. Button is implemented
 * TWICE, on two platforms — the case `--platform` has to separate.
 */
const IMPLEMENTATION_TTL = `
ds:ImplementationLibrary a owl:Class .
ds:ImplementationObject a owl:Class .
ds:hasImplementation a owl:ObjectProperty ; rdfs:domain ds:ImplementationLibrary ; rdfs:range ds:ImplementationObject .
ds:implementsBlock a owl:ObjectProperty ; rdfs:domain ds:ImplementationObject ; rdfs:range ds:UIBlock .
ds:libraryName a owl:DatatypeProperty ; rdfs:domain ds:ImplementationLibrary ; rdfs:range xsd:string .
ds:platform a owl:DatatypeProperty ; rdfs:domain ds:ImplementationLibrary ; rdfs:range xsd:string .
ds:libraryTier a owl:ObjectProperty ; rdfs:domain ds:ImplementationLibrary ; rdfs:range ds:Tier .
ds:implementationCount a owl:DatatypeProperty ; rdfs:domain ds:ImplementationLibrary ; rdfs:range xsd:integer .
ds:headLink a owl:DatatypeProperty ; rdfs:domain ds:ImplementationObject ; rdfs:range xsd:string .
ds:versionedLink a owl:DatatypeProperty ; rdfs:domain ds:ImplementationObject ; rdfs:range xsd:string .

ds:implementation.library.react-ds-global a ds:ImplementationLibrary ;
  ds:libraryName "@canonical/react-ds-global" ;
  ds:platform "react" ;
  ds:libraryTier ds:global ;
  ds:version "0.34.0" ;
  ds:implementationCount 2 ;
  ds:hasImplementation ds:implementation.react-ds-global.button,
                       ds:implementation.react-ds-global.modal .

ds:implementation.react-ds-global.button a ds:ImplementationObject ;
  ds:implementsBlock ds:button ;
  ds:headLink "https://example.test/react/Button.tsx" .

ds:implementation.react-ds-global.modal a ds:ImplementationObject ;
  ds:implementsBlock ds:modal ;
  ds:headLink "https://example.test/react/Modal.tsx" .

ds:implementation.library.svelte-ds-global a ds:ImplementationLibrary ;
  ds:libraryName "@canonical/svelte-ds-global" ;
  ds:platform "svelte" ;
  ds:libraryTier ds:global ;
  ds:version "0.34.0" ;
  ds:implementationCount 1 ;
  ds:hasImplementation ds:implementation.svelte-ds-global.button .

ds:implementation.svelte-ds-global.button a ds:ImplementationObject ;
  ds:implementsBlock ds:button ;
  ds:headLink "https://example.test/svelte/Button.svelte" .
`;

/** The prefixes the canonical store is built and queried with. */
export const CANONICAL_PREFIXES: Readonly<Record<string, string>> = {
  ...BLOCK_PREFIXES,
  cs: "http://pragma.canonical.com/codestandards#",
  skos: "http://www.w3.org/2004/02/skos/core#",
};

/** The full canonical Turtle: PR3's `BLOCK_TTL` verbatim, plus the sections above. */
export const CANONICAL_TTL = `${BLOCK_TTL}\n${DS_EXTRA_TTL}\n${CS_TTL}\n${PROMPT_TTL}\n${CONCEPT_TTL}\n${IMPLEMENTATION_TTL}`;

/** Default viewing config: no tier set, `normal` channel — drops the beta-only block. */
export const CANONICAL_CONFIG = { channel: "normal" as const };

/** Scoped to the `apps/lxd` tier — own + inherited (LXD Panel, Modal, Button). */
export const FILTERED_CONFIG = { tier: "apps/lxd" as const };

/** `prerelease` channel, no tier — the one config where all 4 components are listed. */
export const ALL_VISIBLE_CONFIG = { channel: "prerelease" as const };

/** Re-exported so callers needn't also import `blockGraph.ts` directly. */
export { BLOCK_PREFIXES, BLOCK_TTL };
