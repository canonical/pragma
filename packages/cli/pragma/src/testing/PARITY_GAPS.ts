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
      "NARROWED: a read envelope still carries no `meta.count`/`meta.total` — the only way to know a list is empty is `data.length === 0`, not a count field. But `meta` is no longer ALWAYS `{}` on a read. A zero-record read now carries the verb's own `notice` as `meta.notice` on BOTH machine surfaces (`project/cli/dispatch.ts#renderData` for `--format json`, `project/mcp/registerVerb.ts#emptyMeta` for MCP — one seam, the same key, so the two stay byte-equal). `data` keeps its uniform empty shape; `[]` is still `[]`. The divergence this entry records is the ABSENCE of counts, not the emptiness of `meta`: without the notice an agent could not tell an unbuilt store, a mistyped filter and a genuinely empty result apart, all three being `{ok:true,data:[],meta:{}}`.",
  },
  {
    id: "no-empty-hook-on-free-filter",
    area: "pack list / empty-state",
    description:
      "STILL TRUE OF EMPTINESS, NARROWED ON BAD ARGUMENTS. A zero-row pack list — narrowed by a declared filter, by an unmatched `--search`, or unconditionally empty — is a SUCCESS: `ok:true, data:[]` at exit 0 with a calm notice (stderr in plain mode, `meta.notice` on the machine surfaces). pragma v2 still never raises EMPTY_RESULTS for an empty list, and U5's removal of the enum-filter-only `buildListEmptyError` hook stands. What is no longer true is that an UNMATCHED free-filter value stays successful: a value-free filter now rejects a value its vocabulary does not admit with INVALID_INPUT and the admissible values as `validOptions`, the same courtesy a declared-`values` filter always extended (`packs/sparql/applyFilters.ts`). The vocabulary is the graph's, not the returned rows' — a filter declares where it lives (`PackFilter.vocabulary`), so a real value that happens to match no row (a category with zero standards, a `ds:ConceptType` no concept uses) is a calm empty list, and only a value the graph does not know is an error.",
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
      "Every noun's plain/llm output renders through the SAME generic list/lookup renderer (`kernel/render/renderers.ts`), driven by declarative column/field/section metadata. There are no per-noun hand-authored render templates left to keep in parity (the last hand-written verb, `block list`, became declared content in L-OPEN-9).",
  },
  {
    id: "block-lookup-not-tier-scoped",
    area: "block",
    description:
      "CLOSED, by REVERSAL of the entry it used to be. This gap read: `block lookup` resolves by `ds:name` globally, a same-named block at two tiers cannot be disambiguated by plain name, address it by prefixed IRI instead. That was accepted while the answer was merely arbitrary; it stopped being acceptable once measured — 25 live block names are carried by 2–3 blocks, and EVERY one of them was answered with whichever IRI sorted first and no sign the others existed (`block lookup button` returned Launchpad's Button, because `apps_launchpad…` precedes `global…`). 'Address it by IRI' is not a recovery an agent can reach when nothing tells it there is a second block to address. Two things replace it, and neither is a change of arity — one name still answers with one entity, and a glob is still the declared multi-entity form. (1) The discard is no longer SILENT: the resolve is unlimited, the winner is answered with, and the IRIs it outranked ride the verb's `notice` — the same seam a zero-record read uses (stderr in plain mode, `meta.notice` on `--format json` and MCP), because an ambiguous hit is the same failure as an empty one, a result that misrepresents itself. `LookupOutput.ambiguous` carries them in `data` for the machine surfaces, and is ABSENT (not `[]`) when nothing was ambiguous, so every unambiguous read keeps the payload it had. Note the recovery is not reachable any other way: a glob expands over DISTINCT names, so `block lookup 'Butt*'` returned Launchpad's Button and ButtonLink and the global Button appeared nowhere. (2) The order is a declared, derived RANKING (`PackLookup.scopeWeight` in `pragma.conf.ts`, generated by `packs/sparql/buildLookupQuery.ts#rankingClause`): a tier's depth comes from the `/` count in its OWN `ds:name` (`\"Apps/Launchpad\"` → 2, never from the `_` in `ds:apps_launchpad`), and it MULTIPLIES the existing type weight rather than tiebreaking above it, so a whole component in a nested tier still outranks a global SUBcomponent (`TextInput`). Nothing is enumerated, so a tier added upstream is placed without an edit here; an asserted `ds:tierRank` would take precedence over the derived depth and retire the config declaration with no code change. WHAT REMAINS a gap: `lookup` is still not tier-SCOPED — there is no way to ask for one tier's answer only, the ranking merely decides which comes first — and since L-OPEN-9 nothing is tier/channel-FILTERED (the hand-written `block list` went with its `tierChain.ts`; see `block-list-unfiltered`). Two top-level tiers still cannot be ordered against each other by depth alone, which today leaves `Navigation` (`global` vs `apps`) and `InfoTable` (`global` vs `sites`) decided by the IRI fallback; naming a precedence among the depth-1 tiers is an ontology question, deliberately NOT invented here.",
  },
  {
    id: "block-list-unfiltered",
    area: "block",
    description:
      "L-OPEN-9 (owner-signed): `block list` is the block story's compiled, UNFILTERED list — it shows every block, including experimental/alpha ones, for everyone, until filtering returns in declared form. The old tier-chain inheritance, channel visibility, and `--all-tiers` escape were hand-written filtering the pack grammar has no term for, and the ruling removed them rather than growing the grammar to keep them. `config.tier` consequently scopes nothing (reported by `config show`/`info` only); `config.channel` keeps only its npm dist-tag role for `upgrade`/`info`.",
  },
  {
    id: "graph-query-deferred",
    area: "graph",
    description:
      "CLOSED by PR6: `graph query` (arbitrary SPARQL, tool `graph_query`) is now live (`capabilities/graph/query.verb.ts`), with its own SELECT/ASK/CONSTRUCT + parity coverage. Two residual divergences remain recorded: a query failure raises INVALID_INPUT (exit 2) with an `ontology list` recovery, NOT the retired v1 `STORE_ERROR`; and B2/the eval seed (`agentSession.mcp.test.ts`, `eval/cases/stable.ts`) still exercise the shared `PragmaRuntime.query.sparql` facade directly — the exact seam the live verb delegates to — rather than re-driving through the tool.",
  },
  {
    id: "config-field-query-via-show",
    area: "config setters",
    description:
      "The covenant gives each `config <field>` setter exactly ONE required positional, so the old per-verb QUERY mode (`pragma config tier` with no arg → print current) is impossible without breaking conformance. Reading a field is `config show` (which reports every field + provenance). Set-only setters (`config/fields.ts`).",
  },
  {
    id: "config-field-reset-sentinel",
    area: "config setters",
    description:
      "No `--reset` flag exists (a flag would emit `flags:[...]` and break the covenant). `tier` (a free string with a meaningful 'no value') resets via a reserved sentinel (`none`/`default`/`-` → removes the field, `writeConfigField(field, undefined)`); `channel`/`detail` reset by setting their default (`normal`/`standard`). `config/runField.ts`.",
  },
  {
    id: "config-global-write-only",
    area: "config setters",
    description:
      "v2 `writeConfigField` writes the GLOBAL layer only ('project configs are authored by hand'), so the old `--scope`/`--local` selectors are dropped. A setter never edits a project `pragma.config.ts`. `kernel/config/writeConfigField.ts`.",
  },
  {
    id: "config-tier-no-ontology-validation",
    area: "config setters",
    description:
      "The covenant `config_tier` has no `needsStore`, so it is storeless — the old store-backed `validateTier` (which queried the ontology for valid tier paths) is DROPPED. `config tier <anything>` writes the value verbatim; an unknown tier simply yields empty scoped reads later. `config/fields.ts`.",
  },
  {
    id: "doctor-exit-zero-with-failures",
    area: "doctor",
    description:
      "The old `doctor` set `process.exitCode = 1` when checks failed. v2 `doctor` is a read (`mutates:false`) and ALWAYS exits 0 — failures live in the `{ failed }` count of the envelope (agents read the data; CI greps `failed`). The dispatcher only maps `PragmaError` codes to non-zero exits, and doctor raises none. `capabilities/doctor/doctor.verb.ts`.",
  },
  {
    id: "info-entitycount-storeless-not-triplecount",
    area: "info",
    description:
      "`info`'s entity total comes from the storeless pack index (`readPackIndex` → `entityTotal` = count of DISTINCT abox subjects), NEVER a store boot — so the storeless invariant (`store.booted === false`) holds. It is deliberately NOT the sum of `instanceCountByType`: that raw multiset double-counts real OWL exports (individual typed as its class AND `owl:NamedIndividual`, plus `owl:Class`/property meta-buckets), so the total ran ~2× (A1). The old `collectStoreSummary`'s SPARQL triple-count is DROPPED (`sources status` owns the per-source breakdown; info shows one total). `capabilities/info/collectInfo.ts`.",
  },
  {
    id: "setup-skills-undo-recompute",
    area: "setup",
    description:
      "Setup ops recompute their plan against real fs each run (preview-accuracy), so `setup skills --undo` AFTER a real `setup skills` sees the now-correct symlink as 'skipped' and emits no symlink effect — there is nothing left to reverse. Writes that always re-emit their undo (`setup completions`' file write) DO reverse cleanly under `--undo`. The symlink effect itself carries a `deleteFile` undo (asserted structurally). `capabilities/setup/operations/setupSkills.ts`.",
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
  {
    id: "mcp-prompts-empty-without-project-prompts",
    area: "mcp/prompts",
    description:
      "The native MCP `prompts/list` (and the `prompt_list`/`prompt_lookup` content tools) project `ds:Prompt` KG entities read from the ACTIVE pack index (`kernel/project/mcp/prompts/source.ts#listPromptSummaries`) — project-supplied data, NOT shipped in the embedded/bundled pack. A bare install (no project-authored `ds:Prompt`) advertises the prompts capability but lists ZERO prompts, never booting the store on the list path. Non-empty listings are exercised only against the seeded fixture graph (`testing/fixtures/graph/canonical.ts`); the storeless empty-by-default case is pinned by `prompts.test.ts` ('lists zero prompts … when no prompt entities exist').",
  },
] as const;
