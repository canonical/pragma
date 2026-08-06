/**
 * The five files a built pack directory holds — the single place the artifact
 * set is named.
 *
 * FIVE AND ONLY FIVE, and three modules must agree with them: `buildPack`
 * writes them, `packIsComplete` gates on them, and `materializeEmbeddedPack`
 * writes them back out. A sixth artifact added to only some of those makes a
 * pack whose content hash claims more than its directory holds, which the next
 * build then reuses, silently dropping the difference. The agreement is pinned
 * by `graphpack.test.ts`'s "the committed embedded pack (PROTECTED) >
 * materializes exactly the files buildPack produces" — extend the set here and
 * that test fails until every side follows.
 *
 * In their own module because they are constants and `types.ts` holds types
 * (cs:code.constants.file / cs:code.types.file) — the same split
 * `kernel/packs/storyOrigin.ts` records for the story-origin constructor. There
 * is no erasability constraint here as there is next door: `manifest.ts` value-
 * imports all five, so they were never erasable.
 *
 * The move is neutral for COST and NOT for GRAPH SIZE, and the two are worth
 * keeping apart because three docblocks in this tree quote graph size as their
 * unit. Cost: this file has ZERO import statements, so a fast path that reaches
 * it evaluates five string literals and pulls nothing new — `manifest.ts`
 * already value-imported all five. Size: it is a new node, and it arrives on
 * both fast-path graphs that reach `manifest.ts` — `capabilities/index.ts`
 * gained it, and `kernel/completion/complete.ts` went 22 files to 23 with this
 * file as the single addition. Update the counts in
 * `kernel/completion/safety.test.ts` and `kernel/config/schema.ts` if this file
 * moves again. Confirmed after the move: `capabilities/lazy.test.ts` and
 * `kernel/completion/safety.test.ts` pass with every exact ENUMERATION
 * byte-identical — those pin file lists, not sizes.
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
