# `testing/behavioral/` — the cross-cutting behavioral-test layer

This directory holds PR4's deliverable: the integration/e2e layer that sits
ON TOP of each capability PR's own per-noun unit tests. It does not re-test
per-noun unit behavior — read that in a capability's own `*.test.ts`
(`src/capabilities/<noun>/*.test.ts`). This directory answers a different
question: does the WHOLE SYSTEM — CLI, MCP, the process boundary, the shared
fixture graph — behave consistently across nouns and surfaces?

If you are landing PR5, PR6, or PR7 and wondering where your journey test
goes, read this file first.

## The non-negotiable rule: parameterize, don't hard-code

Every file in this directory drives its assertions over the LIVE surface —
`liveReadSurface.ts` (derived from `emitSurface(capabilities)`) or a direct
`emitSurface(capabilities)` call — never a noun/verb/tool name copied from a
plan document. When PR5 adds `create`, PR6 adds `config` mutations, or PR7
adds the capabilities catalog, most of the sweeps in this directory (B1, B3,
B4, B5, B6, B10) pick the new nouns/tools up AUTOMATICALLY, with zero edits
here. If a sweep does NOT pick up your new noun and you believe it should,
that's a bug in the sweep's filter — fix the filter, don't hand-add your noun
name to a list.

The one test that must NOT auto-grow is `capabilities/surface.test.ts`
(PR3-owned, not in this directory) — each PR re-snapshots its OWN emitted
slice there, in its own diff, and `assertConforms` keeps checking `emitted ⊆
covenant` (never `==`), since the covenant is the frozen FUTURE surface and
the emitted set legitimately grows PR-by-PR.

## What's here

| File | What it proves |
|---|---|
| `liveReadSurface.ts` | The parameterization helper — every other file imports `liveVerbs`/`listVerbs`/`lookupVerbs` from here rather than deriving its own. |
| `harness.foundation.test.ts` | The framework itself boots (fixture graph, foreign-namespace pack, `runCli`, the golden normalizer). |
| `firstRun.e2e.test.ts`, `rootCli.e2e.test.ts`, `exitCodes.e2e.test.ts`, `mcpServe.e2e.test.ts`, `autoLlm.e2e.test.ts` | The THIN spawn-e2e layer — the real process boundary, kept to exactly these cases (R7). Everything else in this package runs in-process. |
| `parity.test.ts` | The uniform CLI-json == MCP-json helper (`helpers/parity.ts`), proven on the stable nouns and swept across every read noun (B5). |
| `errorMatrix.storeless.test.ts`, `errorMatrix.mcp.test.ts` | The error/recovery render matrix, storeless + fixture-backed halves. |
| `agentSession.mcp.test.ts` | A multi-step agent MCP session (list → pick → lookup) + the SPARQL escape hatch. |
| `mcpSurface.test.ts` | Every MCP tool the live catalog exposes is callable and well-formed — the "surface ⊆ covenant, exercised" proof. |
| `disclosure.test.ts` | The cross-noun disclosure sweep (mechanism itself is PR3's/kernel's protected unit test — this only sweeps the noun SET). |
| `journeys.cli.test.ts` | The `block list` tier-chain/channel journey (the one hand-written verb). |
| `completion.test.ts` | The THIN main-line `__complete` candidate contract (§6 — see "Completion" below). |

Plus `testing/eval/` (the eval harness + seed cases) and `testing/PARITY_GAPS.ts`
(the consolidated accepted-divergence ledger) — siblings of this directory,
same ownership.

## The shared fixture graph

`testing/fixtures/graph/canonical.ts` is the ONE content graph every
store-backed behavioral test boots through. It imports PR3's Button/Modal
fixture (`testing/fixtures/blockGraph.ts`) verbatim and extends it (tier
chain, a release channel, tokens, code standards) — it does not fork a
second graph. If your PR needs new entities for its own journey:

- Prefer EXTENDING `canonical.ts` (add a Turtle fragment, concatenate) over
  creating a new fixture file, so the whole package keeps testing against one
  graph and existing anchor assertions (Button, `code/function/purity`,
  `importance`→`primary`, the 4 `ds:Component`s) stay valid.
- If your noun needs an entirely different ontology/vocabulary (like the
  `ex:` recipe pack does, `testing/fixtures/packs/recipe.ts`), a new fixture
  file is fine — that's the "foreign namespace" pattern, not the main graph.

## Booting a store-backed fixture: `bootFixtureRuntime`

```ts
import { bootFixtureRuntime } from "../helpers/fixtureGraph.js";
import { CANONICAL_TTL, CANONICAL_CONFIG } from "../fixtures/graph/canonical.js";

const fixture = await bootFixtureRuntime({ ttl: CANONICAL_TTL, config: CANONICAL_CONFIG });
try {
  // fixture.cwd carries a REAL pragma.lock.json — bootRuntime(flags, fixture.cwd),
  // executeVerb(...), projectMcp(modules, fixture.cwd), and (if you must)
  // runCli(args, { cwd: fixture.cwd }) all resolve the SAME cached pack.
} finally {
  await fixture.dispose();
}
```

Use `packRuntime.ts#buildFixtureRuntime` (PR3's helper) instead when you only
need ONE surface (a direct `verb.run()` call) — it's cheaper (no lock file).
Reach for `bootFixtureRuntime` specifically when you need CLI and MCP (or a
spawn) to agree on the same store.

## Cross-surface parity: `assertCliMcpParity`

```ts
import { assertCliMcpParity } from "../helpers/parity.js";

await assertCliMcpParity({
  modules: capabilities, // or your module array
  verb: yourVerbSpec,
  tool: "your_tool_name",
  cwd: fixture.cwd,
  params: { name: ["Something"] }, // same bag serves both surfaces
});
```

v2's MCP envelope IS the CLI `--format json` envelope — this is structural
deep-equality, not the old condensed-shape byte comparison. Don't reproduce a
`condensed`/token-count MCP shape; there isn't one (`PARITY_GAPS`
`no-condensed-mcp-envelope`).

Two things this helper does NOT handle — check `PARITY_GAPS.ts` before
assuming a mismatch is a bug:
- A mutating verb's plan-first preview differs in `meta` shape between a CLI
  `--dry-run` and an unconfirmed MCP call by design (`plan-first-meta-differs`).
- `sample` verbs draw an independent random selection per call — never assert
  content equality on one, only structure.

## Adding your PR's journey

1. **New nouns your PR adds are picked up automatically** by every sweep in
   this directory that iterates `liveReadSurface.ts`, `emitSurface`, or
   `capabilities` directly. Run the existing suite after landing your noun —
   if `mcpSurface.test.ts`/`parity.test.ts` (B4/B5) pass with no edits, you're
   already covered for the generic contract.
2. **Your noun's own SPECIFIC journey** (a multi-step flow only your noun
   makes sense for — e.g. PR5's `create` dry-run → real → byte-equality with
   summon) is your PR's to add, as a new file here (`journeys.<yourNoun>.test.ts`
   or similar), following the naming/parameterization conventions above.
3. **Extend, don't duplicate, the eval seed.** Add a `cases/<yourArea>.ts`
   file (`EvalCase[]`) under `testing/eval/cases/`, mirroring
   `cases/readNouns.ts`, and wire it into `eval.test.ts`/`report.ts`'s
   `allSeedCases` concat.
4. **Append to `PARITY_GAPS.ts`**, don't start a second ledger, when you find
   (or design in) an intentional divergence from a naive parity/behavior
   expectation.
5. **Keep the spawn layer thin.** Only reach for `runCli` when the PROCESS
   BOUNDARY itself is what's under test (first-run, `--version`, real exit
   codes, `mcp` serve boot). Everything else: `executeVerb`/`projectCli`/
   `projectMcp`/`bootFixtureRuntime`, in-process.

## Extension points this PR left for you, by owner

- **PR5 (`create`)** — `C1` in the port ledger. No journey exists yet for
  `create component/package/application` dry-run/real/byte-equality. Add
  `journeys.create.test.ts` here plus its own eval cases.
- **PR6 (config mutation, info enrichment, doctor, upgrade, setup, `graph
  query`)** — `C2`/`C3`/`C4` — **BUILT**. Each new verb ships its own
  in-diff coverage: `config/field.test.ts`, `info/info.test.ts`,
  `doctor/doctor.test.ts`, `upgrade/upgrade.test.ts`, `setup/setup.test.ts`,
  `graph/query.test.ts`. `graph query` (tool `graph_query`) is now LIVE
  (`PARITY_GAPS` `graph-query-deferred` reworded to record its two residual
  divergences); B2's SPARQL-escape-hatch coverage continues to exercise the
  shared `PragmaRuntime.query.sparql` facade the live verb delegates to. Future
  work may re-drive B2 through the tool the way B1-B6 do for the read nouns.
- **PR7 (capabilities catalog, MCP prompts, budget activation)** — `C5`. The
  eval harness (`testing/eval/`) is seeded with 14 representative cases across
  all 4 kinds (tool/content/disclosure/prompt) — populate the full matrix on
  top, not a parallel harness. `mcpP95Warm` (`testing/perf/mcpP95Warm.seed.test.ts`)
  and `condensedSDL` (`testing/eval/cases/stable.ts`) are SEEDED (measured,
  softly checked) — this is where they graduate to enforced, alongside
  `help`/`complete`/`warmStoreVerb` in `testing/perf/budgets.test.ts`.
- **PR8 (completion merge, PR-C)** — `R6`. This package's main-line
  `kernel/completion/complete.ts` is intentionally minimal; PR-C's fuller
  engine (shell drivers, script goldens, rank/parse/resolve) lands at PR8.
  `completion.test.ts` documents two gaps the fuller engine may want to close
  (verb-level candidates aren't sorted; there's no per-verb flag completion at
  all today) — see `PARITY_GAPS` `completion-verb-level-not-sorted`. Don't
  double-port the rich suite; this file's thin candidate-format/set contract
  is all PR4 owns here.
