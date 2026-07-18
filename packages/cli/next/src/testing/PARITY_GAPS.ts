/**
 * The consolidated, living record of every INTENTIONAL divergence from the old
 * shell's behavior (or from a naive byte-exact-parity expectation).
 *
 * PORTS the CONCEPT of the old `testing/standardParityFixtures.ts#PARITY_GAPS`
 * — each entry names one accepted divergence, so a reviewer (or a future PR)
 * can tell "this is different on purpose" from "this regressed." PR4 owns this
 * CONSOLIDATED file: at PR4 impl time no other PR had started a per-noun gaps
 * list (grepped the tree — no `PARITY_GAP`/"disposition table" precedent
 * existed), so this is the ledger every later PR appends its own accepted
 * divergences to, rather than scattering ad hoc comments.
 *
 * The `PARITY_GAPS.test.ts` ledger test asserts every entry is distinct and
 * non-empty — the same shape `standardParity`'s old ledger test enforced.
 */

/** One accepted, intentional divergence from a naive parity expectation. */
export interface ParityGapEntry {
  /** A short, stable, kebab-case identifier for the gap. */
  readonly id: string;
  /** Which area of the surface the gap applies to. */
  readonly area: string;
  /** Why the divergence is intentional, and where it's decided in code. */
  readonly description: string;
}

/** The consolidated ledger. Append here; do not delete a still-true entry. */
export const PARITY_GAPS: readonly ParityGapEntry[] = [
  {
    id: "no-condensed-mcp-envelope",
    area: "mcp/envelope",
    description:
      "v2's MCP tool result IS the CLI `--format json` envelope (`{ok,data,meta}` / `{ok,error}`), built by the SAME `successEnvelope`/`errorEnvelope` (kernel/render/envelope.ts). There is no separate condensed/text/token-count MCP shape to reproduce, so parity is asserted as structural data-equality (helpers/parity.ts), not a byte-exact `condensed === fmt.llm(...)` comparison.",
  },
  {
    id: "pack-lists-single-level",
    area: "pack list",
    description:
      "Every bundled/dynamic pack's `list` returns the full row set in one response — no pagination/cursor/page-size flags. A noun with a large population relies on `--search`/declared filters (or `sample` for shape discovery) to narrow it, not paging.",
  },
  {
    id: "no-empty-hook-on-free-filter",
    area: "pack list / EMPTY_RESULTS",
    description:
      "`kernel/packs/runBodies.ts#buildListEmptyError` raises a typed EMPTY_RESULTS only when an ENUM-valued filter (`PackFilter.values` declared) is active, or the pack declares `emptyRecovery` and the list is unconditionally empty. A FREE-STRING filter (e.g. `standard list --category nonexistent`) or an unmatched `--search` narrows to zero rows silently: `ok:true, data:[], meta` with no error. No PR3 read noun currently declares an enum-valued list filter, so the `error.filters` envelope shape is unit-tested at the kernel level but has no live end-to-end trigger yet.",
  },
  {
    id: "raw-iri-in-data",
    area: "pack lookup / disclosure",
    description:
      "An IRI-valued field (e.g. `cs:extends`) stays the full, uncompacted IRI in `data` (`--format json` / MCP). Compaction to `prefix:local` (`kernel/render/compactUri.ts`) is applied only by the plain/llm renderers at display time — the JSON payload is never display-shaped.",
  },
  {
    id: "all-string-pack-records",
    area: "pack list / lookup",
    description:
      "Every pack row/entity is a flat `Record<string,string>` (list rows: `PackRow`; lookup/expand: `PackEntity`/`PackChildRow`), typed and rendered generically by column/field/section METADATA the pack declares — never a per-noun bespoke record class or hand-authored template.",
  },
  {
    id: "positional-sample-count",
    area: "sample verb",
    description:
      "`<noun> sample [count]` takes `count` as an optional POSITIONAL (`pragma standard sample 3`), not an old-style `--count` flag. Omitted, it falls back to the pack's declared default (or the built-in default of 2).",
  },
  {
    id: "generic-renderers-not-bespoke-templates",
    area: "render",
    description:
      "Every noun's plain/llm output — including the one hand-written verb, `block list` — renders through the SAME generic list/lookup renderer (`kernel/render/renderers.ts`), driven by declarative column/field/section metadata. There are no per-noun hand-authored render templates left to keep in parity.",
  },
  {
    id: "block-lookup-not-tier-scoped",
    area: "block",
    description:
      "`block lookup` resolves by `ds:name` GLOBALLY, with no tier or channel filtering — only the hand-written `block list` is tier/channel-aware (PR3 Risk5, `capabilities/block/tierChain.ts`). A same-named block declared at two tiers cannot be disambiguated by `block lookup` alone (the old shell's tier-scoped lookup disambiguation has no v2 equivalent).",
  },
  {
    id: "graph-query-deferred",
    area: "graph",
    description:
      'The covenant reserves `graph query` (arbitrary SPARQL, tool `graph_query`), but PR3 ships only `graph inspect` (`graph/index.ts`: "query lands in PR6"). PR4\'s SPARQL-escape-hatch behavioral coverage (B2) exercises `PragmaRuntime.query.sparql` directly — the same seam the future verb will call — rather than a live tool that does not exist yet.',
  },
  {
    id: "digest-renamed-standard",
    area: "disclosure",
    description:
      "The old `digest` disclosure level is named `standard` in v2's canonical three-level index (`summary < standard < detailed`, `constants.DETAIL_LEVELS`). Gating is by canonical INDEX, not by a pack-declared level name matching a fixed string.",
  },
  {
    id: "skill-noun-storeless",
    area: "skill",
    description:
      "`skill list`/`skill lookup` are pure filesystem discovery (`needsStore: false`) — they never touch the knowledge-graph store. Every other read noun in this ledger's scope is store-backed; `skill` is the one deliberate exception.",
  },
  {
    id: "index-fields-trimmed",
    area: "pack index",
    description:
      "`index.json` (PackIndex v2) does not carry `category`/`primaryType`/`primaryTypeLabel` — dropped at the pr3-fold review as zero-consumer fields. Completion and the MCP resource browser read only `{name,type,uri,prefixed,types,label,box,description}` plus `instanceCountByType`.",
  },
] as const;
