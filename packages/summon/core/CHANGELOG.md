# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.34.0](https://github.com/canonical/pragma/compare/v0.33.0...v0.34.0) (2026-08-21)


* refactor(cli)!: removals & fold — tier and block go through the story compiler, token add-config removed, cli-core folded into summon (#939) ([11d76c8](https://github.com/canonical/pragma/commit/11d76c83667c3f76e543c0d6dfc1f0c99f29bd3b)), closes [#939](https://github.com/canonical/pragma/issues/939) [#761](https://github.com/canonical/pragma/issues/761) [#939](https://github.com/canonical/pragma/issues/939) [#909](https://github.com/canonical/pragma/issues/909)
* fix(cli)!: correctness — an honest preview interpreter, zod off the fast path, and four diagnosed defects (#909) ([17e1fae](https://github.com/canonical/pragma/commit/17e1faeb55be0a23c267ec0bbc9f6f38e5bdc2d4)), closes [#909](https://github.com/canonical/pragma/issues/909) [#5](https://github.com/canonical/pragma/issues/5) [#1](https://github.com/canonical/pragma/issues/1) [#2](https://github.com/canonical/pragma/issues/2) [#4](https://github.com/canonical/pragma/issues/4) [#909](https://github.com/canonical/pragma/issues/909) [#909](https://github.com/canonical/pragma/issues/909)


### BREAKING CHANGES

* `pragma tier lookup <name>` is removed; the verb is now
the tier story's compiled lookup `pragma tier lookup <name...>`. The
`tier_lookup` MCP tool takes `name: string[]` (was `name: string`) and
returns the uniform lookup envelope `{ results, errors }` (was a single
`{ uri, name, blocks }` object); its completion offers prefixed-IRI
candidates. The `--format llm`/plain output follows the generic lookup
renderers.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017EwUvEW5ZgjAYc9KWPjHCZ

* refactor(cli)!: block list is the block story's declared, unfiltered list

L-OPEN-9 (PRA-111): `block list` was the last hand-written data verb, and the
filtering it existed for — the configured tier's parent CHAIN, the release
CHANNEL, and the `--all-tiers` escape from the first — is something the
declared-content grammar has no term for. The owner ruling is removal, not
grammar growth: the block story in pragma.conf.ts gains the `list` half and
`capabilities/block/` is deleted wholesale, `tierChain.ts` (and its
`CHANNEL_RELEASES` table, which had no other consumer) with it. `block` leaves
the authored registry and flows in through the unclaimed-stories half like
`standard` and `modifier`; only `token` remains a composite.

SIGNED-OFF VISIBLE CONSEQUENCE, verbatim: `block list` now lists ALL blocks,
including experimental/alpha ones, for everyone, until filtering returns in
declared form.

Display parity moved INTO the SPARQL rather than being reimplemented in
TypeScript: `VALUES ?class` closes the type set, so the BINDs that derive
`name` (COALESCE of `ds:name` and the IRI's local name — the old
`row.name ?? localName(...)` fallback), `type` (LCASE of the class local name —
the old `normalizeType`) and `tier` (the tier IRI's local name) operate over
known shapes. The `standard` story is the precedent for that technique. The
tier join stays OPTIONAL, so the untiered block A2 fixed stays visible — in the
ONE view that now exists.

D10-A ruled: block-list empty semantics follow the declared family. MEASURED
FIRST at the dispatch seam the compiled binary uses (`executeVerb`, pinned in
journeys.defaultPack.test.ts): `makeListRun` returns `[]` and never throws on
emptiness, so an empty store still exits 0 with `{ ok: true, data: [] }` —
IDENTICAL to the hand-written verb, which also returned an empty array. There
is NO exit-code delta. The only change is the empty-state MESSAGE, which can no
longer name a tier, a channel, or an `--all-tiers` escape; the story's
`emptyRecovery` supplies "No blocks in the store. Build it from the configured
design-system packs. Run `pragma sources update`." Recorded in the CHANGELOG row.

Covenant change (deliberate, the L-OPEN-9 `$comment` clause extended
chronologically after C1's): `block_list` loses its `--all-tiers` flag, so the
emitted verb has no flags and the MCP tool takes no input. Tool COUNT is
unchanged (37 stays 38 until C3).

CONFIG HONESTY — the fields are KEPT, their claims are not. Removing
`config.tier`/`config.channel` would be a second, unrequested breaking change,
so they stay accepted and reported; what changes is every place that promised
they scope something:
- `emitReference.ts`'s field docs now say `tier` is accepted and SCOPES NOTHING
  (reported by `config show`/`info` only) and `channel` selects the npm dist-tag
  `upgrade`/`info` read, nothing more (`docs/reference/config.md` regenerated);
- `config show`'s "(none — all tiers visible)" placeholder becomes "(none)":
  with no tier filter, "all tiers visible" is true of every value, not just the
  unset one;
- the `capabilities` catalog's `model` convention stops telling agents data is
  tier/channel-SCOPED and says the hierarchy is DATA on each entity, reads are
  unscoped, and `graph_query` is the way to filter;
- `block_list`/`config_show` tool hints follow;
- a new PARITY_GAPS entry (`block-list-unfiltered`) records the gap and its
  owner sign-off in the append-only ledger, and the two entries that described
  the hand-written verb are corrected rather than deleted.

PROTECTED updates, each replacing a dying assert with the new contract:
- surface.test.ts re-pins the flagless emitted verb;
- staleCommands.test.ts BANS `--all-tiers` in every shipped doc, so the retired
  flag cannot come back through prose (the same treatment `--llm` got);
- toolDescriptions.test.ts widens its `block_list` leak assert from the literal
  `--all-tiers` (now vacuous) to "no CLI flag of any name" — the failure a
  re-authored story `toolDescription` could reintroduce;
- collect.ts/collect.test.ts's reserved-noun rationale drops `block` from the
  composites it names (the mechanism is unchanged: every static noun is still
  reserved, derived from `staticModules`).

Tests: `capabilities/block/{parity,blockList}.test.ts` are replaced by
`capabilities/block.parity.test.ts` (the standard-noun fixture-parity pattern
C1 established for `tier`), which keeps every `block lookup` content-parity
assert byte-for-byte and adds the list half: all-blocks membership, the
SPARQL-derived row shape against the old hand-built one, the untiered block,
config-independence, and the measured empty-list semantics. The behavioral
journeys re-pin the NEW contract instead of dropping asserts — journeys.cli
(B9) now proves the same graph under four different tier/channel configs
returns ONE answer (a strictly stronger claim than the four different answers
it used to enumerate), journeys.defaultPack asserts exact whole-pack sets where
it previously had to filter the untiered block out to stay tolerant, and the
eval seed's channel case is inverted into `content-block-list-is-channel-
independent`, asserting the beta-gated block is visible on the normal channel.

Docs regenerated (`bun run gen:reference`: commands.md, tools.md, config.md);
getting-started.md and the storybook-hub CLI page describe the unfiltered list.
Gates: check, 1090 tests, perf budgets 8/8, build.
* `pragma block list --all-tiers` is removed — the CLI rejects
the flag as unknown, and the `block_list` MCP tool no longer accepts an
`allTiers` parameter (it takes no input at all). `block list` no longer filters
by the configured tier chain or release channel: it returns every block in the
store, experimental and alpha ones included. `config.tier` consequently scopes
nothing anywhere in the CLI, and `config.channel` retains only its npm dist-tag
role for `upgrade`/`info`; both fields are still accepted and reported. Row
shape, ordering and exit codes are unchanged.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017EwUvEW5ZgjAYc9KWPjHCZ

* refactor(cli)!: token add-config is removed, not ported

L-OPEN-9 (PRA-111), the third and last removal: `token add-config` writes a
`tokens.config.mjs` starter file for the terrazzo pipeline. That is a MUTATION,
and the declared-content grammar the read surface is now built from
deliberately has no verb for one. The owner ruling is that a command the
grammar cannot express is removed rather than kept as code, so the verb is
deleted — not reimplemented, not deprecated, no window.

With it goes the LAST authored data module: `capabilities/token/` is empty and
gone, so `token` joins `block` and `tier` as a purely declarative noun and the
authored registry is now the kernel's own nouns and nothing else. That is
PRA-111's end state reached: zero hand-written data commands, a fork defines
its entire read surface in `pragma.conf.ts`. (C4 adds the machine check that
holds it there.)

Covenant change (deliberate, the L-OPEN-9 `$comment` clause extended
chronologically after C1's and C2's): the `token` noun drops its `add-config`
verb and `mcpSurface.tools` drops `token_add-config` — 38 → 37, the first
tool-count DECREASE in the covenant's history (AV-228 B3's 41→38 was the last
change of any direction).

Kept deliberately: `mutationContract` in the FIXED section is untouched. The
plan-first/confirm gate is a kernel contract, not this verb's, and
`sources_update`, `config_set`, `upgrade` and the `create_*` verbs still stand
behind it.

PROTECTED updates, each replacing a dying assert with the new contract:
- surface.test.ts pins `token`'s three read verbs, and both closing-direction
  guards (`surface.test.ts`'s emitted==covenant and
  `surfaceConformance.test.ts`'s frozen-tool count) move to 37 — the count is
  the point of those asserts, so it is edited, not loosened;
- the hints↔tools drift guard forced the `hints.ts` entry's removal, exactly as
  designed: a stale hint naming a dead tool fails CI;
- staleCommands.test.ts BANS `token add-config`/`token_add-config` in every
  shipped doc, which is what caught the two prose sites below;
- collect.test.ts's "leaves a composite noun's verbs intact" case becomes
  "leaves a DECLARED noun's shipped verbs intact": the package-claim mechanics
  it guards are unchanged and still asserted against the real registry, but the
  thing at risk is now the story's own verbs — the case that still matters,
  since after this commit every data noun is story-backed;
- collect.ts's reserved-noun rationale no longer justifies itself by a
  hand-written verb (the mechanism — every static noun reserved, derived from
  `staticModules` — is unchanged).

Eval seed: the two `token_add-config` cases are INVERTED rather than dropped,
so the removal is pinned instead of merely un-asserted —
`tool-token-noun-is-read-only` asserts the tool is absent and the token noun
exposes exactly its three reads, and `prompt-tokens-config-maps-to-nothing`
asserts that "generate a terrazzo tokens config" now maps to NO tool at all
(the point of the ruling: an agent finds nothing claiming to do it). The
plan-first MECHANIC the deleted case exercised stays covered by
`tool-config-set-is-plan-first` and `tool-upgrade-is-plan-first`.

Docs regenerated (`bun run gen:reference`: commands.md, tools.md, index.md);
architecture.md's "three DOMAIN verbs the story grammar cannot express" and
config-model.md's composite clause are corrected here because the stale-command
gate makes them red — the remaining composite framing is C4's sweep.
Gates: check, 1087 tests, perf budgets 8/8, build.
* `pragma token add-config` is removed and so is the
`token_add-config` MCP tool; the designed MCP tool count drops from 38 to 37.
Nothing in the CLI generates `tokens.config.mjs` any more — write it by hand or
drive terrazzo directly. The `token` noun keeps `list`, `lookup` and `sample`,
unchanged.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017EwUvEW5ZgjAYc9KWPjHCZ

* docs(cli): the composite framing is retired, and a guard replaces it

C1-C3 removed the last three hand-written data verbs, so every place that
explained the CLI as "stories PLUS a few hand-written verbs" now describes a
shape that no longer exists. This sweeps that framing and — the point of the
commit — replaces the prose with a machine check, because prose is exactly what
went stale.

New PROTECTED assert in `distribution.test.ts`: for every noun `pragma.conf.ts`
declares, the REGISTERED capability module (what the CLI, the MCP server and
the generated reference all project) must be its compiled story and nothing
else. Two halves, because a compiled spec carries closures a second compile
cannot reproduce by identity:

- SHAPE — recompiling the story ALONE must yield the same verbs with the same
  declared shape (path, summary, doc, params, capability, examples), so an
  extra verb or an extra flag beside the story fails;
- IDENTITY — each registered verb must BE the story's compiled verb object.
  A composite module (`[...story.verbs, handWrittenVerb]`, exactly how `block`,
  `token` and `tier` were built until this PR) constructs new objects, so it
  cannot pass even if its shapes happen to match.

That is the checkable form of PRA-111's end state — "a fork defines its entire
read surface in pragma.conf.ts" — and it fails on re-introduction, not on
review.

Framing swept, each site now saying what is true:
- `capabilities/distribution.ts` and `capabilities/index.ts` (the latter in C3):
  no data noun is authored, so a declared story IS the whole noun;
- `kernel/packs/types.ts`: `list` is optional so a pack can serve a noun that is
  addressable but not enumerable — not because a noun's list "stays
  hand-written";
- `kernel/copy.test.ts`: the `src/capabilities/**` exclusion is justified by the
  kernel nouns' runtime copy, and notes that the `ds:` residue it was written
  for is gone;
- `docs/architecture.md` and `docs/config-model.md` (both in C3, forced by the
  stale-command gate) plus config-model's read-story definition here;
- `testing/fixtures/graph/canonical.ts`: the tier-scoped and channel-gated
  blocks now serve the OPPOSITE purpose — they are what prove the declared list
  hides neither;
- `testing/behavioral/README.md`: the `journeys.cli.test.ts` row describes the
  journey it now is.

The "hardcoded five-noun list" PRA-111 carries as an addendum needed nothing
here: it was already structurally retired (`collect.ts` derives the reserved set
from `staticModules`), and C3 retired the last of its prose residue.

Left alone deliberately: "hand-authored"/"hand-written" where it is still true
and about something else — `pragma.conf.ts` as hand-authored data, the
hand-written docs `docExamples.test.ts` scans, the PARITY_GAPS entry saying
there are no hand-authored render templates, and GraphQL's `CompositeType`.
Chronological `$comment` and PARITY_GAPS records keep their historical wording;
those ledgers are append-only.

Gates: check, 1088 tests, build.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017EwUvEW5ZgjAYc9KWPjHCZ

* test(summon): the byte-equality guarantee becomes a named conformance suite

L-OPEN-10 (PRA-121) item 2. Both product binaries generate the same tree from
* the `@canonical/cli-core` package is deleted and no longer
published. Import the surviving symbols from `@canonical/summon-core` under the
same names — `runGeneratorTask`, `createGeneratorStamp`,
`createStampOnEffectStart`, `answerPromptWithDefaults`, `buildReplayCommand`,
`formatContentPreview`, `formatEffectLine`, `formatEffectWithContent`,
`formatLlmHelp`, `formatLlmJson`, `formatLlmMarkdown`, `getActionColor`,
`getActionLabel`, `getEffectPayload`, `getLanguageHint`, `getLlmActionLabel`,
`getLlmEffectPath`, `isVisibleEffect` — except `promptForAnswers`, which is
`collectAnswers`. The v1 command model (`CommandDefinition`, `registerAll`,
`formatHelp`/`formatNounHelp`/`formatVerbHelp`/`formatVerbList`,
`buildCompleters`, `resolveCompletion`, `createOutputAdapter`,
`createExitResult`, `createOutputResult`, `generatorToCommand`,
`promptToParameter`, `executeGenerator`) is removed with no successor in any
published package.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017EwUvEW5ZgjAYc9KWPjHCZ

* feat(summon): the generator definition is summon's versioned domain spec

L-OPEN-10 (PRA-121) item 3. The shape of a generator was described only by
TypeScript interfaces inside this package, so a consumer outside TypeScript had
nothing to read, and a change to the shape left no trace anyone could diff.
`spec/generator-definition.v1.schema.json` writes it down, versioned: a
backwards-incompatible change gets a v2 file beside this one, never an edit
here. The file ships (added to `files`), so it is readable from an installed
package rather than only from the repo.

What it is NOT, stated IN the artifact rather than only in a commit message:
the schema's top-level `$comment` carries the owner's ruling verbatim — the
shared contract is not the generator definition, it is the general command
types seam and the compositional logic — and says explicitly that this file
does not describe, and must not be taken to describe, the contract between a
CLI kernel and its commands. Extracting that seam is a separate program with
its own ADR, and nothing here claims it. Anyone who finds the file finds the
scope; a drift-guard case asserts both sentences are still there.

Declarative projection only. `generate`, and a prompt's `when`/`validate`, are
functions the module carries and JSON cannot. The schema DECLARES them anyway,
marked `CODE-CARRIED, not data` with `type: "null"`, rather than omitting them
— an omission would read as "a generator has no generate", which is the more
misleading of the two.

Drift guard, ajv-FREE and deliberately so (`src/types/schema.test.ts`): a
validator would prove some example document satisfies the schema, which is not
the failure worth guarding. The failure is a field added to or renamed in
`GeneratorDefinition`/`GeneratorMeta`/`PromptDefinition` while the published
schema keeps describing the old shape. So the check is on KEY SETS, pinned to
the interfaces with `satisfies Record<keyof T, unknown>`: adding an interface
field breaks compilation of the test's key literal first, and the runtime
assertion then fails until the JSON is updated too. Two mechanical steps,
neither skippable — and no new dependency in a package every generator author
installs. The schema is read from disk exactly as a consumer would read it, so
malformed JSON fails here rather than at a downstream tool.

Gates: summon-core check + 422 tests at 100% coverage.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017EwUvEW5ZgjAYc9KWPjHCZ

* docs(cli): the tool is the tool, not a next generation of one

L-OPEN-10 (PRA-121) item 4. Two places still described `pragma` as a successor
rather than as itself, and both are read by someone outside the repo:

- `packages/cli/pragma/package.json`'s description — "Next-generation CLI and
  MCP kernel for Canonical's design system (pragma v2)" — is what npm shows on
  the package page and in search results. It now says what the tool IS: "CLI and
  MCP server over Canonical's design-system knowledge graph", matching the
  README's opening sentence.
- the covenant's `bins.pragma` string — "pragma v2 CLI and MCP server host
  (stdio)" — is the frozen description of the binary.

D11-A ruled that the covenant string changes on BOTH sides, so the edit lands in
`surface/surface.v2.json` AND in `emitSurface.ts`'s FIXED_SURFACE (the two must
mirror each other verbatim; `surface.test.ts` fails if they do not), with a
`$comment` clause recording the change and its reasoning.

Kept, deliberately: every chronological `v2` record in the covenant `$comment`
and in PARITY_GAPS. Those ledgers are append-only history — rewriting them to
remove a word would be the same class of dishonesty this PR keeps closing. The
`surface.v2.json` FILENAME is likewise unchanged: it is a wire identity with a
consumer contract, and renaming it is not framing work. The internal docblocks
that contrast a v1 mechanism with its v2 replacement (the error kernel's exit
model, the pack `version: 2` enrichment fields, the grammar's disclosure-level
normalization) also stay: they are accurate statements about where a design came
from, not a claim about what the product is.

Measured before and after: "next-generation" now appears nowhere in this
package, and the only remaining `pragma v2` strings are the historical records
named above.

Gates: pragma check, 1089 tests, build, docs regenerated (no byte moved — the
reference pages never carried either string).

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017EwUvEW5ZgjAYc9KWPjHCZ

* test(cli): the real-run create gates carry explicit timeouts
* `--dry-run` and the MCP plan-first preview can now FAIL. They
previously exited 0 unconditionally, because reads were mocked; they now perform
their reads for real, so a mutation whose run would die on a missing or
unreadable file exits nonzero (CLI) or returns an error envelope (MCP) instead
of printing a plan. Writes are still only recorded — a preview never touches the
disk. Scripts that treat `--dry-run`'s exit code as always-0 must handle a
nonzero exit, which reports a failure the real run was always going to hit.
Planned byte counts also increase by the generator stamp the real run writes and
the mock omitted.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017EwUvEW5ZgjAYc9KWPjHCZ

* feat(summon): the wizard's confirm gate previews honestly

PR7 C8, ruling R6. The Ink wizard's preview pane — the plan a user reads
immediately before consenting to a scaffold — was built with `dryRun`, the
node-free MOCK: `ReadFile` returned `"[mock content of <path>]"` and `Exists`
was unconditionally `true`. So a generator that branches on the filesystem could
show the wrong plan, and one whose run dies on a missing template showed a
confident one. This is the same defect PRA-104 indicts in `--dry-run`, on the
surface where the stakes are highest: the gate exists to be believed.

The pane now comes from `runPreview` (`@canonical/task/node`): reads are real,
through a virtual write overlay so a step sees what the step before it planned,
and writes are recorded but never executed — which is what makes it safe to run
BEFORE the user has consented to anything.

The wiring is ordinary Ink/React, not a workaround for an async engine. The gate
sets `phase: "confirming"` with an EMPTY pane and renders at once; the preview
resolves into `previewEffects` and the view repaints. `EffectsSummary` renders
an empty plan as no rows, so nothing about the rendering changed — only where
the data comes from. Two states are deliberate:

- A preview that FAILS shows an empty pane, never a fiction. The generator's
  error belongs to the run, which reports it with its own message; the decision
  at the gate stays the user's.
- A preview that resolves after the gate is gone (the user answered or cancelled
  while the reads were in flight) is dropped, so it cannot repaint a pane the
  wizard has already left.

`inkPrompt` gains an optional `cwd`, threaded to the controller: the preview
reads the tree the RUN will write into rather than whatever the process cwd
happens to be. `create` passes `rt.cwd` — the same jail-checked write root it
already gives the interpreter — so the pane and the run cannot disagree about
which directory they are talking about. `setup` passes none, matching its own
run, whose interpreter it also gives no `cwd`.

`previewSettled()` is the seam that makes this testable: the wizard never awaits
it (the pane repaints itself, which is the point of being async), but a caller
asserting on the pane must synchronise with real filesystem reads, and a
wall-clock delay would only be flaky.

Tests hold summon-core's 100% threshold. The headline pair drives one generator
that branches on `exists` against two different `cwd`s and asserts the plan
differs accordingly — impossible under a mock that answers `true` either way —
while the directories stay untouched, proving the gate reads without writing.
The failing-preview and stale-preview branches are pinned, and the two existing
preview tests now await the pane instead of reading it synchronously.

cli-core's `executeGenerator` copy keeps its mock preview: that package is
deleted in PR8, so changing it now would be work with no consumer.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017EwUvEW5ZgjAYc9KWPjHCZ

* refactor(cli): the storeless fast path reads a manifest without zod

PRA-106 (PR7 C4). One edge put zod on the graph `bin.ts` evaluates for
`__complete`: `capabilities/index.ts` → `resolveSources` → `packIsComplete` →
`readManifest` → `manifestSchema.parse`, a genuine VALUE import in
`graphpack/types.ts`. L-4's implementer saw the whole-graph guard fail here and
declared it a false positive ("the walker cannot tell a type import from a value
import"); its reviewers found that was wrong, corrected the docblock, and pinned
the edge as an exact one-module set so it could not widen. The pin's own comment
said an exact set was what would make the day it was fixed impossible to miss.
This is that day: it was blocked on L-5 being live in the pack runtime, which it
no longer is.

The three schemas move VERBATIM to a new `graphpack/schemas.ts`, each annotated
`z.ZodType<T>` against the hand-written contract it validates, so a field added
to one and not the other is a type error rather than a surprise at a read. Only
the two readers already off the fast path import it: `read.ts` (boots the store)
and `embedded.ts` (materializes the 1.9 MB embedded pack). `types.ts` becomes
what its name says — contracts, no runtime import at all — with `Manifest` a
hand-written interface instead of `z.infer`.

`readManifest` validates the ~1 KB payload structurally, in about twenty lines,
with zod's STRIP semantics preserved deliberately: the manifest is reconstructed
field by field, so an unknown key in the file is dropped rather than carried into
the returned object, exactly as `z.object` does — several callers re-serialize a
manifest and would otherwise start round-tripping junk.

The schemas remain the executable specification, and the agreement is PINNED
rather than asserted: `graphpack.test.ts` gains twenty cases run through both
`manifestSchema.safeParse` and the hand validator, requiring the same verdict in
both directions AND the same value on success (which is where strip semantics
live). Change a rule in `schemas.ts` and that test fails until the hand validator
follows.

Two PROTECTED guards are updated, both strictly stronger than what they replace:

- `lazy.test.ts`'s zod-importer set flips from `["…graphpack/types.ts"]` to `[]`.
  The old form tolerated one NAMED module, so a brand-new module value-importing
  zod would have passed it; an empty set cannot. This is the flip the guard's own
  comment designed.
- The help-path check named two modules (`config/schema.ts`, `spec/validate.ts`)
  and so could only catch those two. Generalized (ruling R4) to the property they
  stood in for: no module on `buildProgram`'s graph imports zod from anywhere.

test:perf before (this commit stashed, binary rebuilt, box quiet): 8 passed;
--help median 75.5 ms / p95 88.0 ms, __complete trimmed mean 70.7 ms / median
70.0 ms / p95 94.0 ms.
test:perf after (same box, back to back): 8 passed; --help median 67.7 ms / p95
82.0 ms, __complete trimmed mean 60.6 ms / median 60.2 ms / p95 68.1 ms.
So ~10 ms off `__complete`'s trimmed mean and ~8 ms off `--help`'s median —
ahead of the ~3–4 ms the issue projected, in the same direction. Ceilings are
NOT tightened: they stay 130 ms and 100 ms, and this box's spread across runs is
wide enough that a single pair should not be read as more precise than it is.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017EwUvEW5ZgjAYc9KWPjHCZ

* fix(cli): a structural `--<TAB>` execs nothing in fish either





# [0.33.0](https://github.com/canonical/pragma/compare/v0.32.0...v0.33.0) (2026-07-24)

**Note:** Version bump only for package @canonical/summon-core





# [0.32.0](https://github.com/canonical/pragma/compare/v0.31.0...v0.32.0) (2026-07-20)

**Note:** Version bump only for package @canonical/summon-core





# [0.31.0](https://github.com/canonical/pragma/compare/v0.30.0...v0.31.0) (2026-07-17)

**Note:** Version bump only for package @canonical/summon-core





# [0.30.0](https://github.com/canonical/pragma/compare/v0.29.1...v0.30.0) (2026-07-14)


### Bug Fixes

* **summon:** run under plain Node + fix publish-time breakages ([#721](https://github.com/canonical/pragma/issues/721)) ([c24295f](https://github.com/canonical/pragma/commit/c24295f7c67f5d3577d77f0abad818073871bd2e))





# [0.29.0](https://github.com/canonical/pragma/compare/v0.29.0-experimental.0...v0.29.0) (2026-07-03)

**Note:** Version bump only for package @canonical/summon-core





# [0.29.0-experimental.0](https://github.com/canonical/pragma/compare/v0.28.0...v0.29.0-experimental.0) (2026-06-24)

**Note:** Version bump only for package @canonical/summon-core





# [0.28.0](https://github.com/canonical/pragma/compare/v0.27.1-experimental.0...v0.28.0) (2026-06-16)


### Features

* **pragma:** trace, MCP resources, summon template loading, framework config ([#645](https://github.com/canonical/pragma/issues/645)) ([4f0a341](https://github.com/canonical/pragma/commit/4f0a341a050facbf3a87419ed7a9b3c29c0a9ade)), closes [#1](https://github.com/canonical/pragma/issues/1) [#551](https://github.com/canonical/pragma/issues/551) [#569](https://github.com/canonical/pragma/issues/569) [#641](https://github.com/canonical/pragma/issues/641) [#641](https://github.com/canonical/pragma/issues/641)





## [0.27.1-experimental.0](https://github.com/canonical/pragma/compare/v0.28.0-experimental.0...v0.27.1-experimental.0) (2026-05-21)


### Bug Fixes

* **release:** unblock lerna 9 publish (access via publishConfig) ([#637](https://github.com/canonical/pragma/issues/637)) ([acc1185](https://github.com/canonical/pragma/commit/acc1185b43290c1edd88da25c000f7d9494caee6))





# [0.27.0](https://github.com/canonical/pragma/compare/v0.26.0...v0.27.0) (2026-04-29)

**Note:** Version bump only for package @canonical/summon-core





# [0.26.0](https://github.com/canonical/pragma/compare/v0.25.0...v0.26.0) (2026-04-24)

**Note:** Version bump only for package @canonical/summon-core





# [0.25.0](https://github.com/canonical/pragma/compare/v0.24.0...v0.25.0) (2026-04-17)

**Note:** Version bump only for package @canonical/summon-core





# [0.24.0](https://github.com/canonical/pragma/compare/v0.23.0...v0.24.0) (2026-04-13)

**Note:** Version bump only for package @canonical/summon-core





# [0.23.0](https://github.com/canonical/pragma/compare/v0.22.1...v0.23.0) (2026-04-07)

**Note:** Version bump only for package @canonical/summon-core





# [0.22.0](https://github.com/canonical/pragma/compare/v0.22.0-experimental.0...v0.22.0) (2026-04-03)

**Note:** Version bump only for package @canonical/summon-core





# [0.21.0](https://github.com/canonical/pragma/compare/v0.20.1...v0.21.0) (2026-04-01)


### Bug Fixes

* **deps:** update dependency ejs to v5 ([#452](https://github.com/canonical/pragma/issues/452)) ([d283bb4](https://github.com/canonical/pragma/commit/d283bb4d7b108597d7e87560a6c8b55622cf8604))





# [0.20.0](https://github.com/canonical/pragma/compare/v0.19.0...v0.20.0) (2026-03-26)

**Note:** Version bump only for package @canonical/summon-core





# [0.19.0](https://github.com/canonical/pragma/compare/v0.18.0...v0.19.0) (2026-03-26)


### Bug Fixes

* **summon-component:** duplication of "generated by" comment ([#495](https://github.com/canonical/pragma/issues/495)) ([c52a374](https://github.com/canonical/pragma/commit/c52a374a85a9f703d0ff04b3fc3fd6d18370c458))


### Features

* **cli-framework:** add generator-to-CLI bridge modules (v0.1-P3b) ([#494](https://github.com/canonical/pragma/issues/494)) ([8bbaf5f](https://github.com/canonical/pragma/commit/8bbaf5fa68507b5f7de8301a9f481103e9aaf211))
* **pragma:** extract summon binary + add shared operations (v0.1-P3b/P4/D3) ([#497](https://github.com/canonical/pragma/issues/497)) ([15bfa93](https://github.com/canonical/pragma/commit/15bfa9381fc9571099467d382f60ae9f70b60bd5))
* **task,summon-core:** extract @canonical/task, restructure summon as @canonical/summon-core (v0.1-P1+P2) ([#484](https://github.com/canonical/pragma/issues/484)) ([1493baf](https://github.com/canonical/pragma/commit/1493baf6b28a9d5cbd7e4e13009f105945df72a9))





# [0.18.0](https://github.com/canonical/pragma/compare/v0.17.1...v0.18.0) (2026-03-11)


### Features

* **summon:** pt2, monorepo generator ([#459](https://github.com/canonical/pragma/issues/459)) ([fed0ea1](https://github.com/canonical/pragma/commit/fed0ea12f290a85dde427842b392fe30c69587cc))





## [0.17.1](https://github.com/canonical/pragma/compare/v0.17.0...v0.17.1) (2026-03-04)

**Note:** Version bump only for package @canonical/summon





# [0.17.0](https://github.com/canonical/pragma/compare/v0.16.0...v0.17.0) (2026-03-04)

**Note:** Version bump only for package @canonical/summon





# [0.16.0](https://github.com/canonical/pragma/compare/v0.16.0-experimental.1...v0.16.0) (2026-03-03)

**Note:** Version bump only for package @canonical/summon





# [0.16.0-experimental.1](https://github.com/canonical/pragma/compare/v0.16.0-experimental.0...v0.16.0-experimental.1) (2026-03-03)

**Note:** Version bump only for package @canonical/summon





## [0.15.1](https://github.com/canonical/pragma/compare/v0.15.0...v0.15.1) (2026-02-23)

**Note:** Version bump only for package @canonical/summon





# [0.15.0](https://github.com/canonical/pragma/compare/v0.15.0-experimental.0...v0.15.0) (2026-02-20)

**Note:** Version bump only for package @canonical/summon





# [0.15.0-experimental.0](https://github.com/canonical/pragma/compare/v0.14.0...v0.15.0-experimental.0) (2026-02-17)


### Features

* **svelte-generator:** update Svelte component templates ([#422](https://github.com/canonical/pragma/issues/422)) ([f1fb13f](https://github.com/canonical/pragma/commit/f1fb13fa08463b844e611ae5cd0f94a06b13ff30))





# [0.14.0](https://github.com/canonical/pragma/compare/v0.13.0...v0.14.0) (2026-02-16)

**Note:** Version bump only for package @canonical/summon





# [0.13.0](https://github.com/canonical/pragma/compare/v0.13.0-experimental.0...v0.13.0) (2026-02-10)

**Note:** Version bump only for package @canonical/summon





# [0.12.0](https://github.com/canonical/pragma/compare/v0.12.0-experimental.0...v0.12.0) (2026-02-06)

**Note:** Version bump only for package @canonical/summon





# [0.12.0-experimental.0](https://github.com/canonical/pragma/compare/v0.11.0...v0.12.0-experimental.0) (2026-01-26)


### Features

* **components:** Ft components ([#393](https://github.com/canonical/pragma/issues/393)) ([abbe615](https://github.com/canonical/pragma/commit/abbe6150c52deefffb7e9e7fbfee8a3b6ffb94c6))
* **summon:** new codegen  ([#388](https://github.com/canonical/pragma/issues/388)) ([bcd1f35](https://github.com/canonical/pragma/commit/bcd1f350fd8799a580511e783a4292911fd5cc33))
