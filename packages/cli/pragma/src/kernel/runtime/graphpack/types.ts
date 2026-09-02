/**
 * Graphpack artifact contracts — the five files a built pack directory holds,
 * as hand-written types with NO runtime dependency.
 *
 * A pack is the content-addressed, boot-ready form of a set of RDF sources:
 * `data.nq` (the store's n-quads dump — boots via ke's cache path, no TTL
 * parse), `schema.json` (the serialized ke-graphql extraction — boots via
 * `compileFromExtraction`, no live 7-pass compile), `index.json` (the storeless
 * entity index the completion tier and reads consume), `stories.json` (the read
 * stories the packages ship, carried verbatim as raw text), and `manifest.json`
 * (provenance + the prefixes the store was built with). A directory missing
 * `manifest.json` is treated as absent (a torn build), so writes are always
 * temp-dir + atomic rename.
 *
 * FIVE AND ONLY FIVE: the constants below are the single place the artifact set
 * is named, and three modules must agree with them — `buildPack` writes them,
 * `packIsComplete` gates on them, and `materializeEmbeddedPack` writes them back
 * out. A sixth artifact added to only some of those makes a pack whose content
 * hash claims more than its directory holds, which the next build then reuses,
 * silently dropping the difference. The agreement is pinned by `graphpack.test.ts`'s
 * "the committed embedded pack (PROTECTED) > materializes exactly the files
 * buildPack produces" — extend the set here and that test fails until every
 * side follows.
 *
 * This module is on the STORELESS FAST PATH — `capabilities/index.ts` →
 * `resolveSources` → `packIsComplete` → `readManifest` reaches it while
 * `__complete` builds the command tree — so it carries NO runtime import at
 * all. It used to hold the zod schemas too, which put zod on that graph through
 * a genuine value import and cost ~3–4 ms of a ~30 ms budget; they now live in
 * `schemas.ts`, imported only by the two readers that are already off the fast
 * path. `capabilities/lazy.test.ts` pins the result — no module on that graph
 * imports zod — so the split cannot silently close.
 */

/** The n-quads store dump — ke boots it via `createStore({ cache })`. */
export const DATA_FILE = "data.nq";
/** The serialized ke-graphql extraction — boots via `compileFromExtraction`. */
export const SCHEMA_FILE = "schema.json";
/** The storeless entity index (PR-C's dynamic-completion contract). */
export const INDEX_FILE = "index.json";
/**
 * The read stories the packages shipped, as raw text: one
 * `{ source, content }` record per `stories/*.json` file, in a JSON array.
 *
 * Written ALWAYS, even as `[]`, and gated by `packIsComplete` alongside the
 * other three — an optional artifact would put the same condition in all three
 * modules below, which is exactly how a pack ends up claiming stories its
 * directory does not hold. Raw text rather than parsed definitions so the pack stays a
 * faithful carrier of the package's bytes and EVERY interpretation failure
 * (malformed JSON and schema-invalid JSON alike) is caught behind the one guard
 * in `kernel/packs/collect.validateStories`.
 */
export const STORIES_FILE = "stories.json";
/** Provenance + prefixes; its presence marks a pack directory as complete. */
export const MANIFEST_FILE = "manifest.json";

/**
 * One indexed entity. The `{ name, type }` pair is the FROZEN minimum the
 * dynamic-completion tier (and PR-C's read verbs) rely on; every other field is
 * enrichment a later PR may add without breaking the contract.
 */
export interface PackIndexEntity {
  /** Completion token — the prefixed name a user types (e.g. `ds:Button`). */
  readonly name: string;
  /** Prefixed primary `rdf:type` — the completion filter key (e.g. `ds:UIBlock`). */
  readonly type: string;
  /** Full subject URI. */
  readonly uri?: string;
  /** Prefixed subject (same value as `name`, kept explicit for readers). */
  readonly prefixed?: string;
  /** All prefixed `rdf:type` values asserted on the subject. */
  readonly types?: readonly string[];
  /** Human label (rdfs:label / skos:prefLabel / dcterms:title / schema:name). */
  readonly label?: string | null;
  /**
   * Alternative completable names — the values of the distribution's declared
   * alternative-name property (`kernel/vocabulary.ts`), which is what a
   * bespoke lookup matches on, when they differ from `name`/`label`.
   * Enrichment for the storeless name-completion sources.
   */
  readonly altNames?: readonly string[];
  /** Schema (`tbox`) vs individual (`abox`). */
  readonly box?: "tbox" | "abox";
  /** Short description (rdfs:comment / dcterms:description / skos:definition). */
  readonly description?: string | null;
}

/**
 * The storeless entity index a pack ships as `index.json`.
 *
 * `version` is `3` for packs built by this kernel: v2 added the enrichment
 * fields on each entity (which the resource browser depends on), v3 adds the
 * anonymous per-type instance counts. `1` is a legacy artifact whose
 * enrichment is absent — the resources provider degrades to a "run
 * `pragma sources update`" hint rather than a live re-index. A `2` index is
 * fully SERVABLE (every v2 reader's field is present); it merely lacks the
 * anonymous counts until its next rebuild.
 */
export interface PackIndex {
  readonly version: 1 | 2 | 3;
  /** The pack's content hash (matches its cache directory name). */
  readonly contentHash: string;
  readonly prefixes: Readonly<Record<string, string>>;
  readonly entities: readonly PackIndexEntity[];
  /**
   * Full-type-URI → count of NAMED (addressable) asserted instances.
   *
   * Deliberately excludes blank-node subjects: this is the number consumers
   * with a browse-promise read (a resource collection advertising this count
   * must be able to list that many entries, and a blank node cannot be
   * addressed). The graph-truth total of a type is this plus its
   * {@link anonymousInstanceCountByType} bucket.
   */
  readonly instanceCountByType: Readonly<Record<string, number>>;
  /**
   * Full-type-URI → count of BLANK-NODE (anonymous) asserted instances —
   * real instances of a named class that cannot themselves be named (the
   * shipped pack models every `ds:Property`/`ds:ChangeLogEntry` this way).
   * Sparse: only types with at least one anonymous instance carry a key.
   * Absent on a pre-v3 index. Kept OUT of {@link instanceCountByType} so the
   * named count keeps its browse-promise meaning; display surfaces that want
   * the graph truth sum the two.
   */
  readonly anonymousInstanceCountByType?: Readonly<Record<string, number>>;
}

/**
 * Pack provenance and the prefixes the store was built with — the parsed shape
 * of `manifest.json`.
 *
 * Hand-written rather than inferred from a zod schema, so reading a manifest
 * needs no validator library (see the module docblock). `schemas.ts`'s
 * {@link manifestSchema} is annotated against this type, so the two cannot
 * drift in their FIELDS; `graphpack.test.ts` pins that they do not drift in
 * what they ACCEPT either.
 */
export interface Manifest {
  readonly name: string;
  readonly version: string;
  /** The config `packs` ref this pack was built from (verbatim), or a label. */
  readonly sourceRef: string;
  readonly contentHash: string;
  readonly prefixes: Readonly<Record<string, string>>;
  readonly createdAt: string;
  /**
   * The store's triple count at build time. Cross-checked against the booted
   * store so a truncated-but-non-empty `data.nq` (a partial graph that passes
   * the mere size>0 completeness gate) surfaces as STORE_UNAVAILABLE rather
   * than being served silently (A9). Optional — packs built before this field
   * skip the check.
   */
  readonly tripleCount?: number;
  /**
   * The distinct abox entity count (matches `entityTotal`). Lets
   * `sources status` report the figure without parsing the whole `index.json`
   * (A10). Optional — packs built before this field fall back to the index read.
   */
  readonly entityCount?: number;
}
