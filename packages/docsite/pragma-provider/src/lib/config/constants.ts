// =============================================================================
// The relocated pragma knowledge: every fact about pragma's specific ontologies
// that the docsite app used to carry, in one place.
//
// IMPLEMENTER DECISION (plan OQ-4): `EXCLUDED_SOURCES` and `CUSTOM_MAPPINGS`
// are PINNED CONSTANTS, not `PragmaProviderOptions` fields.
//
// Both are facts about specific upstream ontologies rather than about any
// caller, and both have a documented upstream remedy that DELETES them (a
// `graphql:name` annotation on `anatomy:uri`; a modelling fix for
// `shim-concept.ttl`). Exposing them as options would mean a second caller
// could pass a different value and silently compile a schema incompatible with
// the `schema.graphql` relay-compiler reads — the same class of divergence
// `mode`/`prefixing` are pinned against in `createPragmaProvider`. The whole
// point of this file is that there is ONE place these live and one answer to
// "why is this here"; an option turns that into "it depends who called".
//
// The cost is real and accepted: a consumer who needs different exclusions
// must fork or send a PR. That is the correct friction for a value whose
// existence is a bug report against an ontology.
// =============================================================================

import { homedir } from "node:os";
import { join } from "node:path";

/** The cached source packages whose TTL constitutes the docsite graph. */
export const REF_PACKAGES: readonly string[] = [
  "design-system",
  "code-standards",
  "anatomy-dsl",
];

/**
 * The SECOND source root: the semantic packages that carry the docsite's
 * own demand model — the surface ontology (jobs, coordinates, pairings,
 * surfaces, layouts) and the docs graph that instantiates it. These live
 * in the semantics working tree rather than the pragma CLI's refs cache,
 * so they are collected from their own root and merged into the same
 * store: one schema, two roots.
 *
 * Compiling them alongside the refs packages is purely additive — no
 * existing type loses a field and no prefix collides (`sem://surface#Job`
 * yields `Job`, `sem://design-system-docs#` its own block).
 */
export const SEM_PACKAGES: readonly string[] = [
  "surface",
  "design-system-docs",
];

/** The package subdirectories scanned for `.ttl` sources. */
export const TTL_DIRS: readonly string[] = ["definitions", "data"];

/**
 * Sources excluded from the semantic root.
 *
 * `shim-concept.ttl` declares `ds:embodiesConcept` with `rdfs:domain
 * ds:Entity`. Because `ds:Entity` is the root of the design-system class
 * tree, that one domain assertion smears the property (and its inverse)
 * onto ALL FOURTEEN `ds:` types once both roots compile together — every
 * existing docsite type would silently gain two fields, and `Concept`
 * would gain a malformed single-character field. The shim is a modelling
 * bridge for a graph the docsite does not read; excluding it keeps the
 * second root additive-only, which `src/testing/sourceAdditivity.test.ts`
 * pins by asserting `Component` still carries exactly its established field
 * count (restore the shim and that suite fails — verified, not assumed).
 */
export const EXCLUDED_SOURCES: readonly string[] = [
  "design-system-docs/data/shim-concept.ttl",
];

/** The ref (branch) of each source package the provider reads. */
export const REF_NAME = "main";

/**
 * A Turtle prefix prologue declaration (`@prefix ex: <iri> .` or the
 * case-insensitive keyword form). The label group requires at least one
 * character so the default-namespace form (`@prefix : <iri>`) is skipped.
 */
export const PREFIX_DECL = /(?:^|\s)@?prefix\s+([^\s:]+):\s*<([^>]*)>/gi;

/**
 * The one custom mapping this graph cannot boot without.
 *
 * `anatomy:uri` is an ordinary `owl:DatatypeProperty` on the anatomy DSL's
 * `NamedNode` class, and it maps to the GraphQL field name `uri` — which the
 * converged base RESERVES: `uri: ID!` is the primary key the compiler
 * injects on every Node implementer. The compiler used to rename such a
 * collision silently (M002, which is where the committed `anatomyUri` came
 * from); the converged compiler removed that branch, because a silent
 * rename breaks the consumer's query without telling them which IRI did it.
 * It now reports M005 — DROPPED, severity `error` — and `runPasses` refuses
 * to hand out a schema with any error in it, so the whole boot dies.
 *
 * That last sentence is no longer prose: `createPragmaProvider.test.ts`
 * boots the hermetic corpus with and without this mapping and asserts the
 * observed behaviour. See that test's header for the measurement.
 *
 * The remedy the diagnostic names is a custom mapping, and this is it. The
 * name it restores is exactly the one the schema already carried, so nothing
 * downstream moves. (`prefixing: "all"`, the other remedy, would rename
 * EVERY field in the schema to clear one collision.)
 *
 * `mappings` is deprecated in favour of a `graphql:name` annotation on the
 * term itself — the right home for this, since the collision is a fact about
 * the anatomy ontology and not about this package. That ontology lives in the
 * anatomy DSL's own repository, outside this monorepo, so the annotation is
 * an upstream change; when it lands, delete this. (MEASURED at pragma
 * `4d228c8`: the ontology's `definitions/ontology.ttl` is present at
 * `/workspace/anatomy-dsl` in the authoring container, but it is not vendored
 * into this repo and must not be — the corpus under `src/__fixtures__/corpus`
 * is a hand-written stand-in that declares the colliding IRI verbatim.)
 */
export const ANATOMY_URI = "http://anatomy-dsl.example.org/ontology#uri";

/** @see {@link ANATOMY_URI} — the M005 remedy, pinned. */
export const CUSTOM_MAPPINGS: Readonly<
  Record<string, { readonly graphqlName: string }>
> = { [ANATOMY_URI]: { graphqlName: "anatomyUri" } };

/**
 * A channel-dotted local name reference (`ds:.subcomponent.accordion-item`):
 * a valid IRI but invalid Turtle, since a PN_LOCAL may not start with an
 * unescaped dot. Public data files reference experimental-channel entities
 * this way (the entities' own dot-prefixed files are excluded as sources), so
 * the reference is escaped (`ds:\.foo` — same IRI) rather than dropped; the
 * dangling target then reads as honest absence in the graph.
 */
export const CHANNEL_DOTTED_REF = /\b([A-Za-z][\w-]*):\.(?=[A-Za-z_])/g;

/** The pragma CLI's cache location — the refs root when nothing overrides it. */
export const DEFAULT_REFS_ROOT: string = join(
  homedir(),
  ".cache",
  "pragma",
  "refs",
  "@canonical",
);

/** The sibling semantics working tree — the sem root when nothing overrides it. */
export const DEFAULT_SEM_ROOT: string = join(
  homedir(),
  "code",
  "cn",
  "semantics",
);
