/**
 * The ONE shared content graph for cross-cutting behavioral tests.
 *
 * R1 discipline: this does NOT fork a second graph. It IMPORTS PR3's
 * Button/Modal fixture (`testing/fixtures/blockGraph.ts` — the graph PR3's own
 * `block` content-parity + `ontology`/`graph inspect` tests are protected
 * against) byte-for-byte and EXTENDS it with the entities the other bundled
 * read nouns (`standard`, `modifier`, `token`, `tier`) need, plus two more
 * blocks that exercise tier-chain inheritance and channel visibility (PR3's
 * hand-written `block list`, Risk5). Because `BLOCK_TTL` is reused verbatim,
 * Button/Modal content can never drift between PR3's fixture and this one.
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

# ---- Concepts (standalone documentation) ----
ds:Concept a owl:Class .
ds:ConceptType a owl:Class .
ds:content a owl:DatatypeProperty ; rdfs:domain ds:Concept ; rdfs:range xsd:string .
ds:knownEdgeCases a owl:DatatypeProperty ; rdfs:domain ds:Concept ; rdfs:range xsd:string .
ds:conceptType a owl:ObjectProperty ; rdfs:domain ds:Concept ; rdfs:range ds:ConceptType .

ds:concepttype.Explanation a ds:ConceptType ; ds:name "Explanation" .

# Name carries a colon — exercises the by-name (not prefixed-IRI) lookup path.
ds:concept.Foundations-Grid a ds:Concept ;
  ds:name "Foundations: Grid" ;
  ds:summary "The shared column system and per-tier grid rules." ;
  ds:content "## Grid\\n\\nColumn counts are 4, 8, or 16 only." ;
  ds:conceptType ds:concepttype.Explanation ;
  ds:tier ds:global .
`;

/** The `cs:` (code standards) section — reused verbatim from `standard/parity.test.ts`'s
 * fixture shape so `code/function/purity`/`react/component/*` are stable, shared
 * anchor names rather than a second invented set. */
const CS_TTL = `
@prefix cs: <http://pragma.canonical.com/codestandards#> .

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

cs:cat.react a cs:Category ; cs:slug "react" .
cs:cat.code a cs:Category ; cs:slug "code" .

cs:react.component.props a cs:CodeStandard ;
  cs:name "react/component/props" ;
  cs:description "Type component props explicitly." ;
  cs:hasCategory cs:cat.react ;
  cs:do [ a cs:Example ; cs:description "Do type props" ; cs:language "tsx" ; cs:code "interface P {}" ] ;
  cs:dont [ a cs:Example ; cs:description "Avoid any" ; cs:language "tsx" ; cs:code "props: any" ] .

cs:react.component.structure a cs:CodeStandard ;
  cs:name "react/component/structure" ;
  cs:description "Keep folder structure flat." ;
  cs:hasCategory cs:cat.react ;
  cs:extends cs:react.component.props ;
  cs:do [ a cs:Example ; cs:description "Do flatten" ; cs:language "text" ; cs:code "src/Button.tsx" ] .

cs:code.function.purity a cs:CodeStandard ;
  cs:name "code/function/purity" ;
  cs:description "Prefer pure functions." ;
  cs:hasCategory cs:cat.code .
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
  ds:promptBody "Scaffold the {{componentName}} component in {{framework}}. Use create_component with the component path and --framework {{framework}}, then review the generated files against the react/component standards via standard_lookup." ;
  ds:promptArgument [ ds:argName "componentName" ; rdfs:comment "Component name/path (e.g. Button)." ; ds:argRequired true ] ;
  ds:promptArgument [ ds:argName "framework" ; rdfs:comment "react | svelte | lit." ; ds:argRequired false ] .
`;

/** The prefixes the canonical store is built and queried with. */
export const CANONICAL_PREFIXES: Readonly<Record<string, string>> = {
  ...BLOCK_PREFIXES,
  cs: "http://pragma.canonical.com/codestandards#",
};

/** The full canonical Turtle: PR3's `BLOCK_TTL` verbatim, plus the sections above. */
export const CANONICAL_TTL = `${BLOCK_TTL}\n${DS_EXTRA_TTL}\n${CS_TTL}\n${PROMPT_TTL}`;

/** Default viewing config: no tier set, `normal` channel — drops the beta-only block. */
export const CANONICAL_CONFIG = { channel: "normal" as const };

/** Scoped to the `apps/lxd` tier — own + inherited (LXD Panel, Modal, Button). */
export const FILTERED_CONFIG = { tier: "apps/lxd" as const };

/** `prerelease` channel, no tier — the one config where all 4 components are listed. */
export const ALL_VISIBLE_CONFIG = { channel: "prerelease" as const };

/** Re-exported so callers needn't also import `blockGraph.ts` directly. */
export { BLOCK_PREFIXES, BLOCK_TTL };
