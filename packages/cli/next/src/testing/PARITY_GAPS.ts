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
    id: "read-meta-always-empty",
    area: "envelope",
    description:
      "`dispatch.ts#executeVerb`'s read branch always renders with `meta: {}` — there is no `meta.count`/`meta.total` field on a list/lookup envelope (verified empirically). An empty (possibly filtered) list is `{ok:true, data:[], meta:{}}`; the only way to know it's empty is `data.length === 0`, not a meta field.",
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
    id: "sample-is-nondeterministic-across-calls",
    area: "sample verb",
    description:
      "`kernel/packs/sample.ts#pickRandom` draws an independent random selection on EVERY call. Two separate invocations of the same `<noun> sample` — even back-to-back, even CLI vs MCP — are not expected to return identical entities. Content-equality parity (`helpers/parity.ts`) is scoped to deterministic verbs; sample's STRUCTURE (population size, requested count, envelope shape) is what B4's callable-envelope sweep checks instead.",
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
    id: "completion-verb-level-not-sorted",
    area: "completion",
    description:
      "The pr4-base main-line `kernel/completion/complete.ts` sorts NOUN-level candidates (`buildCompletionModel`) and ENTITY-param candidates (`createIndexEntityReader`), but VERB-level candidates are in AUTHORING order (`model.verbs[noun]` is never sorted) — verified empirically (`standard` completes as `[list, categories, lookup, sample]`, not alphabetical). It also offers NO per-verb flag completion at all (a `-`-prefixed partial always resolves against the global flags only). B10 (`completion.test.ts`) asserts verb candidates as a SET, not an order, and pins kebab-casing at the emission layer rather than a nonexistent completion-time flag offer. PR-C's fuller engine (merging at PR8) may close both gaps — flagged here for that review, not fixed by PR4 (R6: completion engine work is PR-C's).",
  },
  {
    id: "skill-noun-storeless",
    area: "skill",
    description:
      "`skill list`/`skill lookup` are pure filesystem discovery (`needsStore: false`) — they never touch the knowledge-graph store. Every other read noun in this ledger's scope is store-backed; `skill` is the one deliberate exception.",
  },
  {
    id: "single-lookup-miss-fails-batch-partial-reports",
    area: "pack lookup",
    description:
      "`kernel/packs/runBodies.ts#makeLookupRun` throws (the call fails, `ok:false`) on a TOTAL miss — a single unresolved name, or a batch where EVERY name misses. Only a PARTIAL batch (at least one name resolves) reports the miss in `data.errors` while returning `ok:true` with the hits in `data.results`. Verified empirically (`agentSession.mcp.test.ts` / `errorMatrix.mcp.test.ts`) — a single-name miss is a failed call, not a reported one.",
  },
  {
    id: "plan-first-meta-differs",
    area: "mutation plan-first",
    description:
      "A CLI `--dry-run` and an unconfirmed MCP call describe the SAME effects (`data.plan`), but under intentionally DIFFERENT `meta` shapes: `{dryRun:true}` (dispatch.ts#renderPlan) vs `{planOnly:true,confirmRequired:true}` (registerVerb.ts#mutateHandler). They are different REQUESTS — one an explicit preview, one an implicit not-yet-confirmed call — so the envelope names the mode differently rather than forcing one vocabulary onto both.",
  },
  {
    id: "index-fields-trimmed",
    area: "pack index",
    description:
      "`index.json` (PackIndex v2) does not carry `category`/`primaryType`/`primaryTypeLabel` — dropped at the pr3-fold review as zero-consumer fields. Completion and the MCP resource browser read only `{name,type,uri,prefixed,types,label,box,description}` plus `instanceCountByType`.",
  },
] as const;
