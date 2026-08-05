/**
 * Graphpack artifact contracts — the five files a built pack directory holds,
 * and the shapes they carry.
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
 * THIS MODULE IMPORTS NOTHING, and that is load-bearing rather than tidy. It
 * used to declare the pack schemas in zod, and `manifest.ts` value-imported
 * `manifestSchema` for `readManifest`; `packIsComplete` calls that, and
 * `resolveSources` calls `packIsComplete`. The live chain was
 * `capabilities/index.ts → graph/index.ts → resources/index.ts →
 * resources/provider.ts → resolveSources.ts → graphpack/manifest.ts →
 * graphpack/types.ts → zod`, so BUILDING THE COMMAND TREE evaluated zod —
 * `__complete` and `--help` included. The schemas that survive live in
 * `schemas.ts`, reached only from `read.ts`, which is off that graph; the
 * manifest is validated by `manifest.ts`'s hand-written `parseManifest`.
 *
 * Measured on this box (compiled binary, trimmed mean of 40 spawns, netted
 * against `--version` from the same binary in the same run, because process
 * start here swings by tens of ms):
 *
 * | | before (2 runs) | after (2 runs) |
 * |---|---|---|
 * | `__complete block ''` net | 24.1 / 26.1 ms | 19.5 / 21.5 ms |
 * | `--help` net | 26.7 / 30.9 ms | 26.3 / 25.2 ms |
 *
 * — about 4 ms off `__complete`'s ~25 ms of work, matching the estimate the
 * defect was recorded with. The `--help` figure is inside its own run-to-run
 * spread, so the honest claim is `__complete`; `--help` is not slower.
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
 * `version` is `2` for packs built by this kernel (the v2 enrichment fields on
 * each entity + the resource browser depend on it); `1` is a legacy artifact
 * whose enrichment is absent — the resources provider degrades to a "run
 * `pragma sources update`" hint rather than a live re-index.
 */
export interface PackIndex {
  readonly version: 1 | 2;
  /** The pack's content hash (matches its cache directory name). */
  readonly contentHash: string;
  readonly prefixes: Readonly<Record<string, string>>;
  readonly entities: readonly PackIndexEntity[];
  /** Full-type-URI → count of asserted instances. */
  readonly instanceCountByType: Readonly<Record<string, number>>;
}

/**
 * Pack provenance and the prefixes the store was built with — the shape of
 * `manifest.json`.
 *
 * Hand-written rather than inferred from a zod schema: this is the ONE artifact
 * the BOOT DECISION reads (`resolveSources` → `packIsComplete` →
 * `readManifest`), so its declaration must not drag a validator onto the
 * storeless fast path. `manifest.ts#parseManifest` is its single structural
 * reader.
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
   * The distinct abox entity count. Lets `sources status` report the figure
   * without parsing the whole `index.json` (A10). Optional — packs built before
   * this field fall back to the index read.
   */
  readonly entityCount?: number;
}
