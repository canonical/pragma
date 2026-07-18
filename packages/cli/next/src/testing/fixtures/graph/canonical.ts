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

/** The prefixes the canonical store is built and queried with. */
export const CANONICAL_PREFIXES: Readonly<Record<string, string>> = {
  ...BLOCK_PREFIXES,
  cs: "http://pragma.canonical.com/codestandards#",
};

/** The full canonical Turtle: PR3's `BLOCK_TTL` verbatim, plus the sections above. */
export const CANONICAL_TTL = `${BLOCK_TTL}\n${DS_EXTRA_TTL}\n${CS_TTL}`;

/** Default viewing config: no tier set, `normal` channel — drops the beta-only block. */
export const CANONICAL_CONFIG = { channel: "normal" as const };

/** Scoped to the `apps/lxd` tier — own + inherited (LXD Panel, Modal, Button). */
export const FILTERED_CONFIG = { tier: "apps/lxd" as const };

/** `prerelease` channel, no tier — the one config where all 4 components are listed. */
export const ALL_VISIBLE_CONFIG = { channel: "prerelease" as const };

/** Re-exported so callers needn't also import `blockGraph.ts` directly. */
export { BLOCK_PREFIXES, BLOCK_TTL };
