/**
 * Standard-noun cutover parity contract.
 *
 * The hand-written `standard` domain was deleted; the noun is served by
 * the bundled pack-v1 definition (`pack/bundled/standardPack.ts`), and
 * `standardParity.test.ts` asserts SEMANTIC parity against the real
 * @canonical/code-standards graphs: same entities and values reachable,
 * uniform pack row/entity shapes, generic renderers.
 *
 * {@link PARITY_GAPS} is the honest record of the differences that
 * remain BY DESIGN after the cutover. Each entry names a concrete,
 * accepted divergence from the deleted built-in — remove an entry only
 * when the pack format gains the capability and the parity test asserts
 * it.
 */

/**
 * Accepted post-cutover divergences from the deleted built-in standard
 * domain. These are doctrine (semantic parity, not byte parity) plus the
 * capabilities pack v1 deliberately does not carry.
 */
export const PARITY_GAPS: readonly string[] = [
  "list disclosure: pack lists are single-level — the old `standard list --digest/--detailed` row enrichment (extends/example/dos/donts merged into every row, disclosure meta on the MCP envelope) is gone; the same data is reachable per-entity via `standard lookup --detail digest|detailed` and `standard sample`",
  "list empty guard: the old list raised EMPTY_RESULTS with an install-hint recovery when no standards load or a --category matched nothing; the pack format has no emptyError hook, so an empty or fully-filtered list renders zero rows successfully",
  "lookup digest rendering: the old list digest truncated the first do-example to 120 chars; the pack `digest` level fetches the full `dos` expand instead (richer, not byte-equal)",
  "lookup data compaction: the old domain compacted cs:extends in resolved data (JSON showed `cs:ComponentFolderStructure`); pack entities keep the raw IRI in JSON — plain/llm output still compacts at display time",
  "lookup recovery copy: cross-domain hints (detectCrossDomain) and the curated `List available standards.` message are not authorable; pack misses carry ranked suggestions with the generic `List available standard entries.` copy",
  'typed shapes: pack rows/entities are all-string records — category counts are strings, and dos/donts entries are `{caption?, language?, code?}` string records rather than typed CodeBlock objects (no `language: "typescript"` default, absent captions are omitted)',
  "render templates: plain/llm output uses the generic pack renderers (aligned columns, `## Standard (n)` headings, `- key: value` collection entries), not the old bespoke standard templates",
  "sample count flag: the pack sample takes a positional count (`standard sample 3`) instead of the old `--count 3` flag",
  "lookup IRI display: plain/llm lookup output does not print the entity IRI (the pack renderer titles by name and projects no uri field); the IRI stays reachable via the list's IRI column, `--format json`, and the non-condensed MCP envelope",
  "categories JSON shape: the old CategorySummary carried a numeric `standardCount`; pack category rows carry the key `count` with a string value (all-string pack rows, until pack v2 typed columns)",
  "sample population: totalCount counts name-addressable standards (the set the sampler can actually resolve) rather than all list rows; the old op counted every list row but failed outright when it drew a standard without cs:name",
  "ink renderers: the pack format declares no renderInk TUI views",
];
