# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.34.0](https://github.com/canonical/pragma/compare/v0.33.0...v0.34.0) (2026-08-21)


* refactor(cli)!: removals & fold — tier and block go through the story compiler, token add-config removed, cli-core folded into summon (#939) ([11d76c8](https://github.com/canonical/pragma/commit/11d76c83667c3f76e543c0d6dfc1f0c99f29bd3b)), closes [#939](https://github.com/canonical/pragma/issues/939) [#761](https://github.com/canonical/pragma/issues/761) [#939](https://github.com/canonical/pragma/issues/939) [#909](https://github.com/canonical/pragma/issues/909)
* fix(cli)!: correctness — an honest preview interpreter, zod off the fast path, and four diagnosed defects (#909) ([17e1fae](https://github.com/canonical/pragma/commit/17e1faeb55be0a23c267ec0bbc9f6f38e5bdc2d4)), closes [#909](https://github.com/canonical/pragma/issues/909) [#5](https://github.com/canonical/pragma/issues/5) [#1](https://github.com/canonical/pragma/issues/1) [#2](https://github.com/canonical/pragma/issues/2) [#4](https://github.com/canonical/pragma/issues/4) [#909](https://github.com/canonical/pragma/issues/909) [#909](https://github.com/canonical/pragma/issues/909)
* refactor(cli)!: config honesty — detail validates, dead fields deleted loudly, colophon and MCP identity declared (#907) ([b30b4a5](https://github.com/canonical/pragma/commit/b30b4a5eb8411ece7e9d86e1df5c2193b57df512)), closes [#907](https://github.com/canonical/pragma/issues/907)
* feat(cli)!: the first install answers reads offline from the embedded pack (#897) ([f9be83d](https://github.com/canonical/pragma/commit/f9be83df5998f2a71420cb293fdec551299a5b2d)), closes [#897](https://github.com/canonical/pragma/issues/897)
* feat(cli)!: rename config packages to packs + ship pragma.conf.ts distribution defaults (#895) ([b1632d2](https://github.com/canonical/pragma/commit/b1632d2cfc9f3b30799417a41b3302ace23968ea)), closes [#895](https://github.com/canonical/pragma/issues/895)


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
* a config layer declaring a `detail` value other than
`summary`, `standard` or `detailed` now fails at load with CONFIG_ERROR
naming the file and the three levels, instead of being accepted,
reported by `config show`, and silently rendered at `standard`.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017EwUvEW5ZgjAYc9KWPjHCZ

* refactor(cli)!: the dead completion.caseSensitive is removed, loudly

`completion.caseSensitive` was validated, documented, layered — and read
by nothing: the completion matcher's case behaviour is declared per
parameter by the grammar (`AutocompleteHeuristic.caseSensitive`, which
stays), never by config. The generated reference already published the
field as dead; this removes it.

Removal is loud, mirroring the `packages`->`packs` precedent: the exact
`completion.caseSensitive` path is detected BEFORE `safeParse`, because
the schema strips unknown keys for forward compatibility and would
otherwise hide the removal in silence — a config author would keep
believing the setting is in force. The check reads only that one nested
path: a stray TOP-LEVEL `caseSensitive` key remains an ordinary unknown
key (pinned), and the `packages` detection stays shallow (already
pinned at readConfig.test.ts).

`completion.minChars` and `completion.families` are unchanged.
Reference page regenerated: the `completion` row drops the dead-field
sentence and the page gains a "Removed: completion.caseSensitive"
section beside the rename section.
* a config layer still setting `completion.caseSensitive`
now fails at load with CONFIG_ERROR naming the removed field, instead of
the value being accepted and ignored. Delete the key.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017EwUvEW5ZgjAYc9KWPjHCZ

* refactor(cli)!: the dead generators declaration is deleted, loudly

Ruled by the owner (PRA-105 / L-OPEN-1, D1-A): DELETE. The `generators`
config field was validated, layered, documented and read by nothing —
`resolveSources` never consumed it, `generators[].source` had zero
readers, and `create` resolves its generators through static imports
(`bun build --compile` links only statically analysable specifiers, so a
declared package name could never decide what a compiled binary runs).
Its only consumers were the config merge and `config show`'s name
display: the exact "live or absent" hazard the L programme indicts.

Deleted from `pragma.conf.ts`, the config schema (`GeneratorSource`,
`RawConfig.generators`, `PragmaConfig.generators`,
`ConfigOrigins.generators`), the reader, the public type barrel, and
`config show` (plain, llm, and the JSON payload, which loses the field
with its type). The bindings the create surface actually runs stay in
`capabilities/create/constants.ts`, now documented as the single
authoring point.

A config still declaring the field fails at load: the removal is
detected before the schema's unknown-key stripping could hide it (the
`packages`-rename precedent) and throws CONFIG_ERROR naming the file and
the removed field, with a delete-the-field recovery. The distribution's
own config passes the same strict validation eagerly at import, so the
field cannot quietly return there either (pinned in defaults.test.ts).

Reference page regenerated: the `generators` row leaves the field table,
`config show` reports four fields, and the page gains a "Removed:
generators" section. The declared-generators door reopens in program M
per the ruling — as a working feature, not as inert data.
* the `generators` config field is removed. A global or
project layer still declaring it fails at load with CONFIG_ERROR naming
the field; delete it. `config show` no longer prints a generators row,
its JSON payload no longer carries `config.generators` /
`origins.generators`, and the package no longer exports the
`GeneratorSource` type.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017EwUvEW5ZgjAYc9KWPjHCZ

* refactor(cli)!: the toolchain colophon is content the distribution declares

Ruled by the owner (PRA-107 / L-OPEN-5, D2-A): the colophon stays
hand-written prose, but it moves into `pragma.conf.ts` as a declaration
— `colophon: { markdown, summary }` — and the kernel renders whatever
the config declares. The measured gap this closes: the colophon was the
one surface a fork's USER still read in this distribution's voice, the
only genuine content in the tree with no content seam. A fork now tells
its own story by editing the file it already edits to stop being this
distribution.

`pragmaColophon.ts` is deleted; `collectColophon` reads the validated
distribution config (`config/defaults.js` — safe behind the verb's
dynamic import, off the fast path) and titles the section with the
projected BIN_NAME. A distribution declaring no colophon gets no
toolchain section rather than an inherited narrative. The previously
dead one-line `colophon` string ("Made by the Canonical Webteam …") is
folded into the declared markdown as its closing line, so the old
field's content survives in the now-live seam.

Wire compatibility is preserved deliberately: `ColophonSection.kind`
stays the frozen JSON discriminant `"pragma"` (like the `pragma:`
resource scheme, it does not track the distribution's name) and
`source` stays `"built-in"` — both documented at the type.

PROTECTED updates, each the point of the change rather than collateral:
- copy.test.ts: the `colophon/pragmaColophon.ts` exemption — the single
  exemption the capability command rules carried — is removed with the
  file. Its docblock said the exemption stood because the owner had not
  decided whether a fork inherits, rewrites, or declares the narrative;
  the ruling decided (declares), and the filter-free source list is the
  machine-checkable proof the seam exists.
- identity.test.ts: the conf mock's `colophon` becomes the declared
  shape, and a new fork-proof case pins the projection end to end —
  the fork's declared story, under the fork's name, no leak of this
  distribution, `kind` still the frozen literal.
- defaults.test.ts: pins the declaration's shape (bodies, no leading
  H1) and its two stable fragments in place of the dead string.

The colophon verb's published doc stops enumerating this distribution's
chapters (a fork's declaration will have different ones) and describes
the seam instead; reference pages regenerated. RawConfig.colophon
narrows from `string` to the declaration object; layers may still
declare it to zero effect, as before (readConfig.test.ts updated).
* the `colophon` config field changes shape from a string
to `{ markdown, summary? }` — a layer declaring the old string form now
fails validation; move the text into `markdown`. The `colophon` verb now
renders the distribution config's declaration: a distribution that
declares none prints only its packs' domain colophons.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017EwUvEW5ZgjAYc9KWPjHCZ

* refactor(cli)!: the MCP wire identity is a stated projection, not a habit

Ruled by the owner (PRA-107 / L-OPEN-5, D2-A+A): the MCP serverInfo
projects from the bundled config — a fork's server introduces itself
under its own name — and the rule is RECORDED where machine peers can
hold it, instead of living as an accident of constants wiring.

The covenant (surface/surface.v2.json) gains `mcpSurface.serverInfo`,
stated as placeholders (`<the declared distribution name>` / `<the
package version>`, the covenant's existing envelope idiom) so the rule
is frozen while release version bumps never churn the covenant. The
$comment ledger gains the L-PR6 clause in the existing chronological
style, recording both halves of the ruling: serverInfo projects; the
`pragma:{+uri}` template, its minted URIs, and the `pragma/box` /
`pragma/instanceCount` `_meta` keys stay FROZEN protocol identity (the
measured half-derivation broke all 653 of a fork's resources). $comment
is not in FIXED_SECTIONS, and the added mcpSurface key is outside
assertConforms's checks, so conformance passes with the edit committed —
the new key is pinned by tests instead:

PROTECTED updates, both extensions (no existing pin weakened):
- surface.test.ts ("surface COMPLETE") gains the serverInfo case: the
  covenant states exactly the placeholder rule, and a real initialize
  handshake (in-memory transport) serves { MCP_SERVER_NAME, VERSION }.
- identity.test.ts gains the fork half over the same wire: under the
  mocked distribution config the server introduces itself as "recipes"
  at the package version — asserted on the handshake, not the constant,
  so a hardcoded serverInfo in buildServer fails even while the
  constant projects.

buildServer's docblock stops claiming a "stable `pragma` identity" (the
code already projected; the claim was the leak). The test harness gains
a serverInfo() accessor. docs/mcp-integration.md gains "The server's
identity" — the do-not-assume-`pragma` rule and the frozen-scheme rule
with its measurement. The generated tools.md now states the projection
in its header and the frozen-template rule on the resources bullet
(phrased so the fork-rename probe's template masking stays sound);
reference regenerated.
* the MCP server's serverInfo is contractually the
distribution's declared name and the package version. A client or
harness that assumed the server always introduces itself as `pragma`
must read serverInfo instead; against a fork's binary that assumption
never held. The resource scheme and `_meta` taxonomy keys remain frozen
and identical across distributions.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017EwUvEW5ZgjAYc9KWPjHCZ
* `--frozen` is removed — it existed only to reproduce a lock.
Pin a revision by putting a commit SHA in the pack's source ref
(`git+https://…#<sha>`), which `cloneRef` already resolves exactly. The
`sources_status` payload changes shape: `store` / `sourceRef` replace
`lockPresent`, `cached`, and the per-source `resolved`/`staleness` fields, none
of which survive without a lock to record them. `sources update` removes an
orphan `pragma.lock.json` on its next run, reversibly.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01L4ybb1LXGtws4i23z7Ju7D

* feat(cli): pin the ds: namespace in the distribution config

The design system declares `ds:` with two IRIs — `https://ds.canonical.com/` in
`definitions/` and `https://ds.canonical.com/data/` in `data/`. Prefix
harvesting is last-wins over a filename sort, so today the right one binds only
because `definitions/` sorts after `data/`. An added or renamed upstream file
flips it, and the index then compacts every `ds:` entity to the wrong prefix —
`block list` stops resolving.

Declaring the prefix in the distribution config puts it in the layer that wins
every harvest, so the binding no longer depends on filenames. It fixes the same
latent bug for every user's `sources update`, not just for the compiled embed.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01L4ybb1LXGtws4i23z7Ju7D

* feat(cli)!: compile the embedded pack from pragma.conf.ts

A cold install now answers real reads. `scripts/bundle.ts` resolves the three
packs `pragma.conf.ts` declares through the product's own pipeline — the same
`parsePackDeclaration` → `resolvePackage` → `buildPack`, with `sources update`'s
own prefix precedence, now shared as `buildPackPrefixes` so the two pipelines
cannot silently disagree — and inlines the result. On a machine with no cache,
no pointer, no network and an empty cwd, the compiled binary answers `block list`
(251), `standard list` (144), `tier list` (15), `modifier list` (11), and reports
`token list` / `prompt list` as genuinely empty rather than papering over it.

The three-line toy `sample.ttl` and `genEmbedded.ts` are gone with it.

The artifacts are not byte-reproducible — blank-node labels and SHACL value
order are store artifacts — so the bundler does not try to be. It writes NOTHING
when the pack's content hash matches the committed manifest, which gives a ZERO
diff on an unchanged rebuild: strictly stronger than byte-reproducibility, and
it needs no canonicalizer. It refuses a `file:` ref outright, so a machine-local
path can never reach the committed artifact.

`@canonical/anatomy-dsl` is unreachable from this build environment, so the
bundler resolves it from the published npm tarball (identical `definitions/*.ttl`)
via a four-line, delete-me override. `pragma.conf.ts` keeps its git source, which
is the correct ref for users; the substitution is visible in every artifact
because the manifest's `sourceRef` records `npm:0.2.2` beside the two git SHAs.
* the embedded pack is now the distribution's real graph rather
than a three-entity sample, so `graph inspect`, the MCP resource surface, and
entity completion answer over `ds:`/`cs:` entities instead of the `ex:` sample.
`embeddedContentHash()` is replaced by `embeddedManifest()`, which carries the
provenance `sources status` and `doctor` report.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01L4ybb1LXGtws4i23z7Ju7D

* docs(cli): first install answers offline; the lock is gone

The docs still told users to run `sources update` before reading anything and
described a `pragma.lock.json` that no longer exists. Reads now answer from the
compiled snapshot the moment the binary is installed; `sources update` rebuilds
from the live packs; `sources status` says which of the two is answering and
what it was built from; and a revision is pinned by putting a SHA in the pack's
source ref rather than by a removed flag.

BUDGETS.md gains the interleaved toy/real/`--version` measurement behind the
claim that the real graph costs ~+181 ms of store work, together with the
evidence that this box already fails the warm-store budget on the OLD embed —
so the ceiling is argued from the reference box, not from here.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01L4ybb1LXGtws4i23z7Ju7D

* test(cli): re-derive the warm-store ceiling from the real embedded pack

The 300 ms ceiling was derived as ~2x the median of a store boot over the
23-triple placeholder. The embed is now the distribution's 8 479-triple graph,
and booting it costs ~+181 ms of store work — measured net of a `--version`
control, since this box's process start alone swings several-fold under load.
Projected onto the reference box that is ~290 ms median / ~317 ms p95: the
median sits at the old ceiling and the p95 is over it.

`ceil(317 x 1.25 / 50) x 50` = 400. The designed `<300ms` target stays in the
surface covenant — the same treatment `--help` and `__complete` already get —
and `budgets.$comment` now names `warmStoreVerb` as the third case where the
enforced ceiling and the designed aspiration differ.

The assertion still runs against median AND p95. Swapping it for a trimmed mean
would have made this pass without moving the number, but that mechanism exists
for `__complete`, where the p95 excess was contention noise over a median with
2x headroom. Here the excess is real work, and hiding it would make the budget
lie.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01L4ybb1LXGtws4i23z7Ju7D

* fix(cli)!: read the pack index through the boot decision, not around it

`readPackIndex` re-derived its own two-way answer (pointer, else the embedded
snapshot) while `resolveSources` has three. The row it collapsed is the one
this PR's negative case exists to protect: a project that declares its own
packs and has never built them. On the compiled binary that project's
`block list` exited 3 with STORE_UNAVAILABLE while `pragma info` reported the
distribution's 550 entities and MCP `resources/list` advertised 653 resources
that every `resources/read` then refused — contradicting the guarantee written
into `resolveSources.ts`, `embedded.ts` and `docs/architecture.md`.

`readPackIndex` now takes the `SourcesDecision` instead of a cwd, so `info`,
`doctor`, the MCP resource browser and native `prompts/list` switch on the one
predicate rather than composing a second one. The `unavailable` arm returns
`undefined`, which those surfaces already degrade on (`buildResourceList` emits
the `pragma:sources` recovery entry; `info` omits the total).

The `__complete` fast path keeps a config-free reader — it is denied the config
evaluator, so it cannot see `origins.packs` — but it no longer prefers the
snapshot over a pointer whose pack the cache lost, which is the decision
table's second row. Its docblock now states what it does and does not
implement, and `embedded.ts`/`resolveSources.ts` scope their claims to match.

Tests cover all three arms of `readPackIndex`, including the `unavailable` row
the old parity test could not reach, plus the evicted-pointer row on the fast
path.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01L4ybb1LXGtws4i23z7Ju7D

* refactor(cli): drop the legacy pragma.lock.json migration

The migration claimed to be reversible and dry-run-visible, and was permitted
on exactly those grounds. Neither held: `buildUpdatePlan` returns before the
legacy probe, so `--dry-run` listed only the pointer write; and `--undo`
rebuilds the Task from post-update state, where the file is already gone, so
the delete effect — and therefore its undo — was never in the Task. Verified
against the compiled binary: the lock disappeared with nothing said on any
surface, and `sources update --undo` reported "Undid 1 step(s)" without
restoring it. The test that certified the claim hand-staged a state the
product cannot reach.

Both halves are structural, not oversights: the plan path is offline by
contract and undo has no journal. So the delete goes rather than growing a
journal to justify it — a user who never runs `sources update` was never
migrated anyway. The CHANGELOG migration table now says the lock is retired
and can be deleted, alongside the `--frozen` removal it also omitted.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01L4ybb1LXGtws4i23z7Ju7D

* fix(cli): record the resolved revisions in a built pack's sourceRef

The bundler writes `@canonical/design-system@git:41c31b34…` into the embed's
manifest; `sources update` wrote the config's pack NAMES. So `manifest.sourceRef`
— which `sources status`, `status.render` and `doctor` all present as "the
answering pack's provenance" — meant two different things depending on who
built the pack, and with the lock gone no read surface could answer "which
revision is my store built from?" for a locally-built pack.

`runUpdate` already holds `ref.kind` and `pkg.resolved` (it puts both in
`data.packs[]`), so emitting the bundler's exact `<name>@<kind>:<resolved>`
label costs carrying `kind` through the resolve loop. Losing per-source
revisions was presented as forced by removing the lock; it was not.

Drops `entryName` from this module with its last caller — leaving two copies
in the tree, under the extraction threshold.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01L4ybb1LXGtws4i23z7Ju7D

* fix(cli): key the bundler's skip on the whole manifest, and type-check scripts/

Shipping no canonicalizer rests entirely on "write nothing when the pack is
unchanged", and the skip compared `contentHash` — a SHA-256 over the resolved
TTL inputs only. `prefixes`, `version` and `sourceRef` are supplied by the
bundler and never reach that hash, so two builds of identical TTL under
different config produce equal hashes and different manifests. The first thing
that breaks is the commit directly before this one in the branch: editing
`pragma.conf.ts`'s `ds:` prefix pin and re-running `bun run bundle` would print
`unchanged … wrote nothing` and ship an embed compiled with the old map. A
release bump or an upstream revision that touches no `.ttl` would likewise
leave stale provenance in the committed manifest, which `sources status` and
`doctor` then report to users.

The skip now compares everything the manifest asserts except `createdAt` — the
only field that is not a function of the inputs.

`tsconfig.json`'s `include` gains `scripts/**/*.ts`, so the producer of the
1.87 MB committed artifact, and `buildPackPrefixes`'s only external consumer,
are covered by `check:ts`. One array entry; zero errors to fix.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01L4ybb1LXGtws4i23z7Ju7D

* refactor(cli): delete the orphaned kernel/config cacheDir

Making `kernel/runtime/paths.ts` leaf-clean moved the cache root's XDG
resolution into it and left `kernel/config/paths.ts#cacheDir` with zero
callers — two definitions and one caller where there had been one of each.
The store layer owns the cache root now, so the config leaf drops it and the
two docblocks that described the duplication say what is true instead.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01L4ybb1LXGtws4i23z7Ju7D

* docs(cli): retire the lock-era prose the pointer rename left behind

The rename established "pointer" and rewrote it in the files the plan named,
leaving 19 sites in modules the plan did not list — including the `sources`
capability barrel documenting "the resolve/build/lock Task", a `@param` example
quoting a reason string this branch renamed, three `it(...)` titles describing
an assertion the test no longer makes, and a fixture whose entire stated reason
for existing was a contrast with the `sample.ttl` this branch deletes.

Also states that a git SHA pin must be the full 40 characters: `isSha` accepts
7–40 hex, but `git fetch` cannot resolve an abbreviated one and the update
fails naming it.

No behaviour changes; the two renamed test titles assert exactly what they
asserted before.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01L4ybb1LXGtws4i23z7Ju7D

* test(cli): re-derive the warm-store ceiling from a control-netted measurement

The 400 ms ceiling was not derived. BUDGETS.md computed "+181 ms of store work"
and then composed 45.5 + 245 = 290 for the median — discarding that increment
and assuming store work is box-invariant, which the toy row two lines above
disproves. The p95 it derived the ceiling from, 317 ms, follows from no number
in the document; it is the discarded attempt's this-box measurement of a
different implementation, re-presented as a reference-box projection.

Re-measured here across five repetitions and two protocols (interleaved
round-robin over both binaries; and each binary alone, back to back), with
every probe netted against ITS OWN binary's `--version` from the same run —
which the old derivation did not do. That netting is not optional: absolute
`--version` ranged 60–287 ms across these runs on page-cache state alone. The
toy control holds at a median +92.8 ms, within 9% of the reference box's own
101.5 ms, which is what licenses projecting at all. The real pack's store work
is 2.83× the sample's (median of the five within-run multipliers; the spread,
2.43–3.65, is contention on a workload 2.8× longer).

Projected: 45.5 + 101.5 × 2.83 ≈ 333 ms median; × the reference box's own
p95/median for this command (176/147) ≈ 398 ms p95; ceil(398 × 1.25 / 50) × 50
= 500. BUDGETS.md now writes every step out from named inputs, and the additive
model is shown to land on the same ceiling. The result is 1.6× the projected
median — tighter than the 2×-of-median rule the other ceilings use — and the
assertion still runs against median AND p95, not a trimmed mean.

Also recorded: the +24 to +28 ms this box pays at process start on EVERY
invocation, including `--version`, because `bun build --compile` emits one
script and parses the 1.87 MB embed regardless of what imports it — which is
not what the `entitySource` module split avoids, and the docblock said it was.
And the coverage gap that no budget case reads the pack index.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01L4ybb1LXGtws4i23z7Ju7D

* fix(cli): keep machine paths out of the sourceRef provenance label

A `file:` pack's "resolved revision" is its absolute local path, so the
previous commit's uniform `<name>@<kind>:<resolved>` put a build machine's
directory into `manifest.sourceRef` — which `sources status` and `doctor`
render as provenance. A path is not a revision; a `file:` pack now contributes
its name alone, exactly as before, and `sources status` already lists its ref
on the per-source line.

Pins the git case: the resolved SHA must reach the manifest, since that field
is now the only place `status` and `doctor` can read a revision from.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01L4ybb1LXGtws4i23z7Ju7D

* test(cli): drop a storeless test name's claim it does not assert

"reports a cold store" describes neither the assertion (exit 0 and
`store.booted === false`) nor the behaviour: at a fresh cwd `sources status`
reports the embedded snapshot, not a cold store. The subject is the storeless
guarantee; the name now says only that.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01L4ybb1LXGtws4i23z7Ju7D
* the `packages` field of `pragma.config.ts` and the global
config JSON is renamed to `packs`. Unknown keys are stripped by the config
schema, so a legacy `packages` key is detected before validation and rejected
with a loud CONFIG_ERROR naming the rename rather than silently ignored.

The config-facing types rename with it (`PackageEntry` → `PackDeclaration`,
`PackageDeclaration` → `PackSource`); the resolution machinery
(`parsePackageEntry`, `PackageRef`, `ResolvedPackage`, `resolvePackage`)
keeps its package vocabulary — only its config-facing param type changes.
User-facing messages that name the config concept move to "packs"; the
doctor check name "package refs" and `checkPackageRefs.ts` stay.

* feat(cli): add identity and generators config fields

The config schema gains the distribution-identity fields `name`, `help`,
`colophon`, `issuesUrl` and a `generators` list (`{ name, source }` refs,
both required). They merge with the same per-field provenance as every
other layer field, so `config show` renders them — in the order name,
help, issuesUrl, colophon, tier, channel, detail, packs, generators —
with `[global]`/`[project]` origin markers and `(none)` when unset. In
this PR they are schema + provenance/display only; nothing consumes them
yet. `GeneratorRef` joins the public types barrel.

* feat(cli): ship distribution config as pragma.conf.ts defaults layer

The built-in defaults stop being a hand-maintained `satisfies PragmaConfig`
literal and become the distribution's own config file: `pragma.conf.ts`
at the package root (a non-magic name — `findProjectConfig` only discovers
`pragma.config.{ts,js}`, so it is never mistaken for a project config).
`defaults.ts` statically imports it, so `bun build --compile` inlines it
with no fs read, and validates it at module load through the same
`parseRawConfig` as every other layer — an invalid edit now fails loudly
in tests and behind the dynamic config boundary, never on the
`--help`/`__complete` fast path (the lazy.test.ts module-graph probe now
pins both `kernel/config/defaults.ts` and `pragma.conf.ts` off the static
graph). tsconfig and biome both gain the root file so it is type-checked
and linted like any source module.

* docs(cli): packs rename + new fields in config model docs

The config model doc documents the `packages` → `packs` rename (including
the loud CONFIG_ERROR a legacy `packages:` key now raises), gains rows for
the identity fields (`name`, `help`, `colophon`, `issuesUrl`) and
`generators`, and notes the defaults ship as the binary's bundled
`pragma.conf.ts`. README and getting-started move to "packs named in your
pragma.config.ts". The generated reference is unchanged (no verb spec
strings moved).

* refactor(cli): fold PR-1 review findings

Ship `pragma.conf.ts` in the tarball and anchor it with `satisfies RawConfig`;
stop re-exporting the now-zod-reaching `defaults` from the config barrel;
rename `GeneratorRef` → `GeneratorSource` and `parsePackageEntry` →
`parsePackDeclaration`; sweep remaining user-facing "configured packages"
strings, docblock references, and the doctor check display name ("pack refs")
to packs vocabulary (regenerating the two reference pages); tighten the
legacy-rename error contract (recovery carries the path); mirror declaration
order in `config show`; and pin the shallow-only legacy-key detection plus
the llm formatter rows with new tests.





# [0.33.0](https://github.com/canonical/pragma/compare/v0.32.0...v0.33.0) (2026-07-24)


### Features

* **cli:** pragma setup detects already-present config (idempotent, state-aware) ([#883](https://github.com/canonical/pragma/issues/883)) ([55f0afb](https://github.com/canonical/pragma/commit/55f0afb1bc08e96590584a1b5e03e2e3279ca110))





# [0.32.0](https://github.com/canonical/pragma/compare/v0.31.0...v0.32.0) (2026-07-20)

**Note:** Version bump only for package @canonical/pragma-cli





# Unreleased


### BREAKING CHANGES

The v2 CLI reshapes the command surface. Migrate as follows:

| v1 | v2 | Notes |
| --- | --- | --- |
| `packages:` in a config | `packs:` | The config field was renamed. A global or project config that still declares `packages:` throws `CONFIG_ERROR` at startup — every command, `doctor` and `sources update` included — with a message naming the rename. Rename the key; the entry shape is unchanged. |
| `detail:` as any string | `detail: summary \| standard \| detailed` | The `detail` config field is validated as the closed enum it documents, exactly like `channel`. A layer declaring any other value (a typo, the v1 `digest`) throws `CONFIG_ERROR` at load naming the file and the three levels — it no longer passes validation, gets reported by `config show` as in force, and silently renders at `standard`. |
| `completion.caseSensitive` | — | The field is removed: it was accepted by the validator and read by nothing — completion matching is declared per parameter by the capability grammar, never configured. A layer still setting it throws `CONFIG_ERROR` at load naming the removed field (detected before the schema's unknown-key stripping could hide it); delete the key. `completion.minChars` and `completion.families` are unchanged. |
| `generators:` in a config | — | The field is removed from the config schema, from `pragma.conf.ts`, from `config show`, and from the public type barrel (`GeneratorSource`). It was validated, layered, documented and read by nothing: `sources update` never consumed it and the `create` verbs resolve their generators statically — a compiled binary can only run generators it was linked with — so declaring it changed only what `config show` printed. A layer still declaring it throws `CONFIG_ERROR` at load naming the removed field; delete it. Declared generators may return as a working feature in a later program. |
| `pragma data …` | `pragma sources …` | The `data` noun is renamed `sources`. Build the store with `pragma sources update`; inspect it with `pragma sources status`. |
| `pragma update-refs` | `pragma sources update` | The standalone refs-update command is removed. `sources update` resolves every configured package and builds the store in one step. |
| `pragma.lock.json` | — | The project lock is removed. Which pack answers a project's reads is recorded by a one-line pointer in the cache (`$XDG_CACHE_HOME/pragma/projects/`), because the pack it names is machine-local and was never committable. Run `pragma sources update` once, then delete the orphan `pragma.lock.json` from your repo — nothing reads it. |
| `pragma sources update --frozen` | a SHA in the source ref | `--frozen` reproduced a lock; with no lock there is nothing to reproduce. Pin by putting the full 40-character commit SHA in the ref (`git+https://…#<sha>`), which every update then resolves to exactly. |
| the `llm` tool | `pragma capabilities` + MCP handshake instructions | The `llm` orientation tool is retired. Agents are oriented by the MCP handshake `instructions` sent on `initialize` and by the `capabilities` tool/verb, both derived from the live grammar. |
| `pragma tokens …` / `tokens_*` tools | `pragma token …` / `token_*` tools | The token noun and its tools are singular now: `token list`, `token lookup`, `token sample`, `token add-config`. |
| `--format text` | `--format plain` | The default text format is renamed `plain`. Output modes are `--format plain`, `--format json`, and the `--llm` condensed-Markdown flag (auto-on when piped) — there is no `llm` format value. |
| a four-file pack | a five-file pack | A built pack now also carries `stories.json` — the read stories its packages ship. A pack built by an earlier build lacks it and is treated as incomplete, so reads report `STORE_UNAVAILABLE` ("the built pack is incomplete — an older or torn build") until you run `pragma sources update` once. That update re-resolves every configured pack, so it needs the network and your git credentials, not just the local cache. |
| `config show`'s story bodies | `pragma capabilities` | `config show --format json` no longer carries declared story bodies (`config.packs[].stories`, `config.stories`) — they are SPARQL, and MCP returns that payload verbatim. Pack names, sources and per-field provenance are unchanged; use `pragma capabilities` to see the verbs a story produces. |
| a story's `emptyRecovery.cli` | the same command WITHOUT the binary name | A read story (in your config, or in a package's `stories/*.json`) declares `cli: "sources update"`, not `cli: "pragma sources update"` — the CONSUMING distribution's binary name is prepended when the hint is rendered, so one story is portable across distributions. The old prefixed form is now rejected rather than rendered as `pragma pragma sources update`: in your config that is a fatal `CONFIG_ERROR` naming the change, and a package's `stories/*.json` carrying it is dropped and named under `doctor`'s `pack refs`, like any other invalid package story. A hint carrying some other distribution's name cannot be detected, and renders doubled. |
| `config show`'s identity rows | `pragma --help` / `pragma colophon` | `name`, `help` and `issuesUrl` are read from the distribution config at module load, and `colophon` from the same file at `colophon` render time — none of the four is merged through the layers — so `config show` no longer prints them, and `config show --format json` drops them from `data.config` and `data.origins`. A global or project layer declaring one is still accepted by the validator and, as before, has no effect; it is now silent instead of being reported with a `[project]` marker nothing honours. |
| `colophon:` as a string | `colophon: { markdown, summary? }` | The toolchain colophon is declared content now, not code: the `colophon` verb renders whatever the distribution config declares (full narrative + optional condensed `--format llm` form), titled with the distribution's name, and the hand-written narrative module is deleted. The old one-line string form fails validation — move the text into `markdown`. The section's JSON `kind: "pragma"` discriminant is frozen for wire compatibility and does not track the name. |
| an MCP client assuming the server is named `pragma` | read `serverInfo` | The MCP server's wire identity is a projection, recorded in the covenant (`mcpSurface.serverInfo`): `serverInfo.name` is the distribution's declared name and `serverInfo.version` the package version, so a fork's server introduces itself under its own name. Peers must read `serverInfo` rather than assume `pragma`. The `pragma:{+uri}` resource template, the `pragma:<uri>` URIs it mints, and the `pragma/box`/`pragma/instanceCount` `_meta` keys stay frozen protocol identity every distribution serves unchanged — clients persist resource URIs, so the scheme never follows a fork's name. |
| `surface.v2.json`'s `configFiles.lock` | `configFiles.configCache` | The key named the project-lock file that v2 removed; it always described the evaluated-project-config cache. The value is unchanged. `surface/surface.v2.json` has no consumer outside the CLI package. |
| `--dry-run` / MCP plan-first always exiting 0 | an honest preview that can FAIL | A preview was a mock: reads returned placeholder strings and `Exists` was unconditionally true, so a mutation whose real run dies on its first read still printed a full plan and exited 0. Previews now perform their reads for real (writes are still only recorded — the disk is untouched), so a `--dry-run` that would fail exits **nonzero**, and the MCP plan-first twin returns the error instead of a plan. If you script `--dry-run` as a check, a new nonzero exit means the command was always going to fail; a preview's exit code is now a prediction of the run's. Planned byte counts also grew: they now include the generator stamp the real run writes, which the mock omitted. Two limits are deliberate: `Exec` is never spawned in a preview, and prompts auto-answer with their defaults. |
| an unbound story prefix always exiting **3** | a config- or package-declared story exits **1** | A read story naming a prefix the graph does not bind was reported as `STORE_UNAVAILABLE` (exit 3), recovering with `sources update` — a lever that cannot help, because no amount of building conjures a term the story's author invented. The failure now consults the story's provenance. A story declared in your config, or shipped in a package's `stories/*.json`, fails as `CONFIG_ERROR` (exit **1**) naming the file to fix and pointing at its `prefixes`, and deliberately carries no recovery command. The distribution's own stories keep `STORE_UNAVAILABLE` and the `sources update` recovery, where an unbound prefix genuinely does mean nothing is built. If you branch on the exit code, a config or package story's unbound prefix moves from **3** to **1**. |
| `pragma tier lookup <name>` | `pragma tier lookup <name...>` | The hand-written tier lookup is replaced by the tier story's compiled one, so it takes the variadic every declared lookup takes: batches, globs and prefixed-IRI addressing (`ds:apps`) now work. The `tier_lookup` MCP tool's `name` is a `string[]` (was a `string`) and it returns the uniform lookup envelope `{ results, errors }` (was one `{ uri, name, blocks }` object). `--format llm`/plain follow the generic lookup renderers: the backtick-wrapped IRI/blocks lines are gone and a tier with no members omits the blocks section instead of printing a placeholder. Shell completion offers entity names (prefixed IRIs) rather than `altNames`. |
| `pragma block list [--all-tiers]` | `pragma block list` | `block list` was the one hand-written read, and its filtering — the configured tier's parent CHAIN, the release channel, and the `--all-tiers` escape from the first — is removed, not reimplemented. It is now the block story's compiled list, and it lists **every** block in the store: experimental and alpha ones included, for everyone, until filtering returns in declared form. `config.tier` therefore scopes nothing at all (it is still accepted and still reported by `config show`/`info`), and `config.channel` keeps only its npm dist-tag role for `upgrade`/`info`. The `--all-tiers` flag and the `block_list` tool's `allTiers` parameter are gone: the CLI rejects the flag as unknown, and the tool takes no input. Row shape, ordering and exit codes are unchanged — an empty result is still a calm exit 0 with an empty `data: []`; only the empty-state MESSAGE changed, because there is no longer a tier or channel to name in it. |

| `pragma token add-config` / the `token_add-config` tool | — | Removed, not replaced. It wrote a `tokens.config.mjs` starter for the terrazzo pipeline — a MUTATION, and the declared-content grammar the read surface is now built from deliberately has no mutation verb. Nothing in the CLI writes that file any more; author it by hand, or drive terrazzo directly. The `token` noun keeps its three reads (`token list`, `token lookup`, `token sample`), and the MCP tool count drops from 38 to 37. |

See [docs/getting-started.md](./docs/getting-started.md) for the v2 workflow and [docs/reference/index.md](./docs/reference/index.md) for the full command and tool surface.


### Features

* **cli:** add `pragma colophon` — a self-describing, pack-extensible toolchain colophon (storeless self-verb + MCP tool + a pack-grammar `colophon` markdown field), rendered plain/llm/json
* **cli:** the toolchain colophon is content the distribution declares — `pragma.conf.ts` carries `colophon: { markdown, summary }` and the kernel renders whatever is declared, so a fork tells its own story by editing its config. The last hand-written narrative (`pragmaColophon.ts`) is deleted along with the copy-guard exemption that covered it: every capability source is now scanned.
* **cli:** the distribution declares its five read nouns (`block`, `token`, `modifier`, `standard`, `tier`) as data in `pragma.conf.ts` instead of code in `src/`, compiled at module load through the same compiler a third-party story goes through. `packs[].stories` is a working config field with the distribution as its first consumer.
* **cli:** a package can ship `stories/*.json`; `sources update` carries them into the pack and they become working commands in any project that declares that package. A package story may only ADD a noun the CLI does not have: one that is malformed, schema-invalid, or names a noun the CLI already ships is ignored — named on stderr and under `doctor`'s `pack refs` — never fatal.

### Bug Fixes

* **cli:** accept `sample.fixedCount` in the pack grammar validator — a documented field used by three bundled stories that `sampleSchema` (`.strict()`) omitted, so any config- or package-declared story using it died with a fatal `CONFIG_ERROR` at startup.
* **cli:** the pack grammar rejects a definition the compiler cannot build — an extra `verbs[].verb` repeating `list`/`lookup`/`sample`, or a `filters[].param` declared twice. Both were schema-valid and both threw before the command tree existed, so a package shipping one made EVERY command fail, `pragma doctor` and `pragma sources update` included.
* **cli:** `pragma capabilities` reports the effective modules, so it lists config- and package-declared nouns. The MCP server already registered its tools from that set, so the catalog and `tools/list` could disagree.

# [0.31.0](https://github.com/canonical/pragma/compare/v0.30.0...v0.31.0) (2026-07-17)


### Bug Fixes

* **cli:** boot the ke store resiliently and name the offending file ([#798](https://github.com/canonical/pragma/issues/798)) ([dda93bb](https://github.com/canonical/pragma/commit/dda93bb9cc588e7a186ba8ab8d4a5d60ec424728))
* **cli:** core input/output correctness — completions, exit codes, validation ([#815](https://github.com/canonical/pragma/issues/815)) ([26b761d](https://github.com/canonical/pragma/commit/26b761d00c145a6e0a564c9f70d001805240e139))
* **cli:** don't boot the ke store for `create` scaffolding ([#797](https://github.com/canonical/pragma/issues/797)) ([298f8c4](https://github.com/canonical/pragma/commit/298f8c4233db0dafd89a7a801aeb45bdf9c5c9a8))
* **cli:** flag & command UX — unknown-verb, --version, config, graph query ([#817](https://github.com/canonical/pragma/issues/817)) ([82816d0](https://github.com/canonical/pragma/commit/82816d05e9e5308ff9747dcb361115994d8d70a3))
* **cli:** generator validation, --no- flags, auto-LLM detection, coverage ([#816](https://github.com/canonical/pragma/issues/816)) ([c9436f4](https://github.com/canonical/pragma/commit/c9436f471095edc2034157a21afce0cce50edfe7))
* **cli:** setup real-execution + harness detection, hang & help fixes, validation ([#818](https://github.com/canonical/pragma/issues/818)) ([59fea44](https://github.com/canonical/pragma/commit/59fea4471a036d8dc24f12ddbd3cd3f859c3a0d0))


### Features

* **cli:** add `create application` generator (CLI + MCP) ([#828](https://github.com/canonical/pragma/issues/828)) ([fbc8797](https://github.com/canonical/pragma/commit/fbc8797edc922aa31d40deed9aa1f917e08b3cb1))
* **cli:** bundled story-pack mechanism; migrate tier to a pack (P1, re-land) ([#844](https://github.com/canonical/pragma/issues/844)) ([7b6580b](https://github.com/canonical/pragma/commit/7b6580b23e03fd221ada608bae95fd55a46cafc6))
* **cli:** first-run onboarding — welcome note + global config creation ([#843](https://github.com/canonical/pragma/issues/843)) ([ea11862](https://github.com/canonical/pragma/commit/ea118628bb82301ef886ffe963ffb224ae958bcd))
* **cli:** generator packs — data-driven create surface ([#835](https://github.com/canonical/pragma/issues/835)) ([125ffbd](https://github.com/canonical/pragma/commit/125ffbd7519f9bb8f9266a87d1f6cbc901de766c))
* **cli:** package-declared prefixes + bare-core boot (P0) ([#824](https://github.com/canonical/pragma/issues/824)) ([b4f8a4a](https://github.com/canonical/pragma/commit/b4f8a4abbe36a89c47b472aec0cb94139a928dc4))
* **cli:** pragma create reuses summon's rich Ink UI when interactive ([#819](https://github.com/canonical/pragma/issues/819)) ([23d88b0](https://github.com/canonical/pragma/commit/23d88b0f080650da5e50546e0d416b9e844bb6ae))
* **cli:** task-oriented root --help with real descriptions ([#809](https://github.com/canonical/pragma/issues/809)) ([6c0c065](https://github.com/canonical/pragma/commit/6c0c065f40a22f27fa9a6e8717176714acb59a77))
* **doctor:** legible output with sub-items and inline remedies ([#800](https://github.com/canonical/pragma/issues/800)) ([d1ea747](https://github.com/canonical/pragma/commit/d1ea747950867a2f4b1695ecfc88c6261c1f6eeb))





# [0.30.0](https://github.com/canonical/pragma/compare/v0.29.1...v0.30.0) (2026-07-14)


### Bug Fixes

* **cli:** partial-failure-safe lookupMany, bundledLoader hardening, remove dead sem MCP server ([#763](https://github.com/canonical/pragma/issues/763)) ([e85cf27](https://github.com/canonical/pragma/commit/e85cf275e20ce5d12c9f6aa6787e22fb63d6deb1))
* **harnesses:** stop setup mcp from destroying valid JSONC configs (SEC-1) ([#743](https://github.com/canonical/pragma/issues/743)) ([1cf47a2](https://github.com/canonical/pragma/commit/1cf47a20889f1f25208110550398990bc11067e5))


* refactor(cli)!: collapse the executor mode ladder; retire the interactive handoff (#772) ([34eb691](https://github.com/canonical/pragma/commit/34eb6916852ffd98670e4375a3692a90bb8443f9)), closes [#772](https://github.com/canonical/pragma/issues/772)


### Features

* **cli:** bundled loader serves embedded story definitions ([#781](https://github.com/canonical/pragma/issues/781)) ([511328a](https://github.com/canonical/pragma/commit/511328a4ca5e987f2f73e108a305848a65d6f03a))
* **cli:** byte-identical output for pragma create and summon; summon on the shared core ([#761](https://github.com/canonical/pragma/issues/761)) ([c10e133](https://github.com/canonical/pragma/commit/c10e1332e3a1f7e4f815da7cc40ecb4f95fbb045))
* **cli:** declarative list filters for story packs ([#780](https://github.com/canonical/pragma/issues/780)) ([87e0b0d](https://github.com/canonical/pragma/commit/87e0b0d9f86548da34d8bb1d7f0423b9904a6d45))
* **cli:** one prompting model — dialog-first prompts through the executor seam ([#758](https://github.com/canonical/pragma/issues/758)) ([ace9246](https://github.com/canonical/pragma/commit/ace9246de5e5e72231b2637b69443d55d9d0cfb8))
* **cli:** redesign MCP resources — TBox/ABox grouping, autocomplete, correctness fixes ([#784](https://github.com/canonical/pragma/issues/784)) ([7d08aec](https://github.com/canonical/pragma/commit/7d08aec79f54ea8a768f8d76e0f2cbe71be33c99))
* **cli:** story packs — declarative read stories for any ontology (experimental) ([#778](https://github.com/canonical/pragma/issues/778)) ([23f1227](https://github.com/canonical/pragma/commit/23f122701a88668dba8bee6d0652d40417d5dbf5))
* **pragma-cli:** graphql serve + config-driven build/check over semantic packages ([#682](https://github.com/canonical/pragma/issues/682)) ([d3a09f5](https://github.com/canonical/pragma/commit/d3a09f56b113bad0adc63158c38715c7eb39ec1f))


### BREAKING CHANGES

* cli-core no longer exports InteractiveSpec, InteractiveHandler,
createInteractiveResult, or the "interactive" CommandResult variant; consumers
inject a PromptSession via CommandContext.promptSession instead.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DF9ExVCukzqpe1Fus9V1no

* test(cli): assert exit-code propagation; fix stale CommandResult docs

Adversarial review of the mode-ladder collapse surfaced two gaps:

- registerAll.handleResult's exit branch is the sole path by which
  executeGenerator's exit 3 (non-interactive, missing flags) and exit
  130 (Ctrl-C) reach process.exitCode, yet every test drove it with
  code 0 — a mutation to that assignment would have gone unnoticed. Add
  a regression test that dispatches a non-zero exit result and asserts
  process.exitCode.
- cli-core's README still described CommandResult as a three-variant
  union listing the retired "interactive" variant. Update it to the
  two-variant (output | exit) union the type now defines.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DF9ExVCukzqpe1Fus9V1no

* fix(cli): don't construct a prompt session off a TTY; distinct headers

runInteractiveExecution called the injected promptSession factory before
checking the terminal, so a non-interactive run with a no-default
required prompt would open a readline handle and discard it undisposed.
Construct the session only on an interactive terminal.

Also give the two "interaction unavailable" failure modes accurate
headers: a non-interactive stdin/stdout versus an interactive terminal
with no injected session — the latter previously misreported itself as a
non-interactive terminal.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DF9ExVCukzqpe1Fus9V1no





# [0.29.0](https://github.com/canonical/pragma/compare/v0.29.0-experimental.0...v0.29.0) (2026-07-03)

**Note:** Version bump only for package @canonical/pragma-cli





# [0.29.0-experimental.0](https://github.com/canonical/pragma/compare/v0.28.0...v0.29.0-experimental.0) (2026-06-24)

**Note:** Version bump only for package @canonical/pragma-cli





# [0.28.0](https://github.com/canonical/pragma/compare/v0.27.1-experimental.0...v0.28.0) (2026-06-16)


### Features

* **ke-graphql:** demo dev server + benchmark script ([#673](https://github.com/canonical/pragma/issues/673)) ([152aaad](https://github.com/canonical/pragma/commit/152aaadcb37084d7c205bd2648ee99096d46d92a))
* **pragma:** parallel doctor checks + S-grade empty-result recovery hints ([#641](https://github.com/canonical/pragma/issues/641)) ([060b9f5](https://github.com/canonical/pragma/commit/060b9f5291aef1ad525744b625b4164ff25c3f7b)), closes [#543](https://github.com/canonical/pragma/issues/543)
* **pragma:** trace, MCP resources, summon template loading, framework config ([#645](https://github.com/canonical/pragma/issues/645)) ([4f0a341](https://github.com/canonical/pragma/commit/4f0a341a050facbf3a87419ed7a9b3c29c0a9ade)), closes [#1](https://github.com/canonical/pragma/issues/1) [#551](https://github.com/canonical/pragma/issues/551) [#569](https://github.com/canonical/pragma/issues/569) [#641](https://github.com/canonical/pragma/issues/641) [#641](https://github.com/canonical/pragma/issues/641)





## [0.27.1-experimental.0](https://github.com/canonical/pragma/compare/v0.28.0-experimental.0...v0.27.1-experimental.0) (2026-05-21)


### Bug Fixes

* **release:** unblock lerna 9 publish (access via publishConfig) ([#637](https://github.com/canonical/pragma/issues/637)) ([acc1185](https://github.com/canonical/pragma/commit/acc1185b43290c1edd88da25c000f7d9494caee6))





# [0.27.0](https://github.com/canonical/pragma/compare/v0.26.0...v0.27.0) (2026-04-29)

**Note:** Version bump only for package @canonical/pragma-cli





# [0.26.0](https://github.com/canonical/pragma/compare/v0.25.0...v0.26.0) (2026-04-24)


### Features

* **cli:** configurable package sources with git ref resolution ([#621](https://github.com/canonical/pragma/issues/621)) ([66dc0dc](https://github.com/canonical/pragma/commit/66dc0dcf6891d697d5e4b134db76fe34901520d9))





# [0.25.0](https://github.com/canonical/pragma/compare/v0.24.0...v0.25.0) (2026-04-17)

**Note:** Version bump only for package @canonical/pragma-cli





# [0.24.0](https://github.com/canonical/pragma/compare/v0.23.0...v0.24.0) (2026-04-13)

**Note:** Version bump only for package @canonical/pragma-cli





# [0.23.0](https://github.com/canonical/pragma/compare/v0.22.1...v0.23.0) (2026-04-07)

**Note:** Version bump only for package @canonical/pragma-cli





# [0.22.0](https://github.com/canonical/pragma/compare/v0.22.0-experimental.0...v0.22.0) (2026-04-03)

**Note:** Version bump only for package @canonical/pragma-cli





# [0.22.0-experimental.0](https://github.com/canonical/pragma/compare/v0.21.0...v0.22.0-experimental.0) (2026-04-02)


### Bug Fixes

* **pragma-cli:** embed oxigraph WASM in compiled binary ([#584](https://github.com/canonical/pragma/issues/584)) ([929dad6](https://github.com/canonical/pragma/commit/929dad6ee8f770b659b5fb1387419648bcc32fa0))





# [0.21.0](https://github.com/canonical/pragma/compare/v0.20.1...v0.21.0) (2026-04-01)


### Features

* **cli-core:** support interactive pragma generators ([#576](https://github.com/canonical/pragma/issues/576)) ([fc53e23](https://github.com/canonical/pragma/commit/fc53e237a70436cf2d9a0843e17801926c878f31))
* **pragma-cli:** compile to linux-x64 binary for npm publish ([#581](https://github.com/canonical/pragma/issues/581)) ([80648dc](https://github.com/canonical/pragma/commit/80648dca3dfd48694ee64a18e267496f93647569))
* **pragma-cli:** rich TUI rendering for list and lookup commands ([#577](https://github.com/canonical/pragma/issues/577)) ([ebeb4e0](https://github.com/canonical/pragma/commit/ebeb4e023d92239614d281cb4825ded493bbaff5))





# [0.20.0](https://github.com/canonical/pragma/compare/v0.19.0...v0.20.0) (2026-03-26)

**Note:** Version bump only for package @canonical/pragma-cli





# [0.19.0](https://github.com/canonical/pragma/compare/v0.18.0...v0.19.0) (2026-03-26)


### Bug Fixes

* **ci:** add missing build step to push workflow, replace workspace: protocol ([#521](https://github.com/canonical/pragma/issues/521)) ([0e88312](https://github.com/canonical/pragma/commit/0e883120c96034d180de0ebdde6e9740d97609fe)), closes [#512](https://github.com/canonical/pragma/issues/512)
* **cli-core:** show contextual help at each command level ([#534](https://github.com/canonical/pragma/issues/534)) ([e4ad03b](https://github.com/canonical/pragma/commit/e4ad03bbb95f7c16caf591a0d8136dac9bd245ee))
* **pragma:** critical bugs, SPARQL hardening, contract types, package rename ([#549](https://github.com/canonical/pragma/issues/549)) ([ebacb6e](https://github.com/canonical/pragma/commit/ebacb6ef54eca92d720fb5ccc05459748f854849))
* **pragma:** resolve skill sources via require.resolve ([#535](https://github.com/canonical/pragma/issues/535)) ([8b5bb77](https://github.com/canonical/pragma/commit/8b5bb77e3ca261d8cbd5ae4fa69c197933157339))
* **pragma:** resolve TTL sources via require.resolve, thread cwd through ke ([#533](https://github.com/canonical/pragma/issues/533)) ([615f9fe](https://github.com/canonical/pragma/commit/615f9fe7f61629c408f60f94ba788018acb8662e))


### Features

* **cli-framework:** add cli-framework package, build and webarchitect checks (v0.1-P3) ([#490](https://github.com/canonical/pragma/issues/490)) ([549806d](https://github.com/canonical/pragma/commit/549806dc5626a8f0165ca6daeb1abc65bb52d32b))
* **cli-framework:** add generator-to-CLI bridge modules (v0.1-P3b) ([#494](https://github.com/canonical/pragma/issues/494)) ([8bbaf5f](https://github.com/canonical/pragma/commit/8bbaf5fa68507b5f7de8301a9f481103e9aaf211))
* **pragma-cli:** unify lookup orchestration and IRI queries ([#551](https://github.com/canonical/pragma/issues/551)) ([48c2870](https://github.com/canonical/pragma/commit/48c2870ccdf21135d97c53283ed5c028bfbcc769))
* **pragma:** add `pragma _completions-server` and `pragma --completions` (v0.2-D10) ([#522](https://github.com/canonical/pragma/issues/522)) ([d9a6026](https://github.com/canonical/pragma/commit/d9a6026a78ade6058a61e4d02a5208c66cd10064))
* **pragma:** add `pragma doctor` environment health check (v0.3-04) ([#518](https://github.com/canonical/pragma/issues/518)) ([7b4e699](https://github.com/canonical/pragma/commit/7b4e699aac5aed8f7b726a17db992becbe748fdf))
* **pragma:** add `pragma info` and `pragma upgrade` commands (v0.2-D9) ([#503](https://github.com/canonical/pragma/issues/503)) ([aee3440](https://github.com/canonical/pragma/commit/aee3440bf91ff62c714e9f62ce81b43088fd2554))
* **pragma:** add `pragma llm` decision trees (v0.2-D13) ([#517](https://github.com/canonical/pragma/issues/517)) ([99c1376](https://github.com/canonical/pragma/commit/99c1376d7484f0e1512d41bb91e84446ccc546d2))
* **pragma:** add agent skills setup + list commands (v0.3-09) ([#520](https://github.com/canonical/pragma/issues/520)) ([6d981c6](https://github.com/canonical/pragma/commit/6d981c6e268a73ec618f114b6a45ad8849484f6a))
* **pragma:** add canonical fixture and integration test suite ([#531](https://github.com/canonical/pragma/issues/531)) ([70207ad](https://github.com/canonical/pragma/commit/70207ad3780dd3c46a7c8957b12991cad48aa962))
* **pragma:** add CLI adapter with federation, output formatting, and error rendering (v0.1-D2) ([#492](https://github.com/canonical/pragma/issues/492)) ([1586fa3](https://github.com/canonical/pragma/commit/1586fa33b1b8316c36490c79893c3439cd633e6a))
* **pragma:** add component commands (v0.2-D4) ([#506](https://github.com/canonical/pragma/issues/506)) ([5ea1835](https://github.com/canonical/pragma/commit/5ea183551e475862556dcee23bfa784f281fff13))
* **pragma:** add config commands (v0.2-D6) ([#505](https://github.com/canonical/pragma/issues/505)) ([5c7435b](https://github.com/canonical/pragma/commit/5c7435bc3950b8a3bf1a8303cb0bbc5c67c97b6f))
* **pragma:** add generator commands (`pragma create`) (v0.2-D14) ([#515](https://github.com/canonical/pragma/issues/515)) ([80c9da6](https://github.com/canonical/pragma/commit/80c9da6f5c0ba0a6d23c444bff382b6d21f4c232))
* **pragma:** add graph + ontology shared operations (v0.2-D7) ([#504](https://github.com/canonical/pragma/issues/504)) ([5d7264c](https://github.com/canonical/pragma/commit/5d7264c2d4f602f3751c3cd67baab5b7566ed467))
* **pragma:** add graph-driven MCP resources (v0.2-D12) ([#516](https://github.com/canonical/pragma/issues/516)) ([8df3165](https://github.com/canonical/pragma/commit/8df31659c3026bc881036875649f9e7cf7b18e6f))
* **pragma:** add MCP adapter (v0.2-D11) ([#508](https://github.com/canonical/pragma/issues/508)) ([277681c](https://github.com/canonical/pragma/commit/277681c4bd9629145aa724775a789524e8b81250))
* **pragma:** add modifier, tier, and token commands (v0.2-D8) ([#513](https://github.com/canonical/pragma/issues/513)) ([71fb8af](https://github.com/canonical/pragma/commit/71fb8afe3d4f31ffa2179605d96bc6d004df7655))
* **pragma:** add setup commands (v0.2-D15) ([#519](https://github.com/canonical/pragma/issues/519)) ([65adca7](https://github.com/canonical/pragma/commit/65adca795f72e70ba54ad535ab1c1c683ad15a47))
* **pragma:** add standard commands (v0.2-D5) ([#507](https://github.com/canonical/pragma/issues/507)) ([c441e43](https://github.com/canonical/pragma/commit/c441e43437494e1d6fc03652ca56070dc6febdf4))
* **pragma:** extract summon binary + add shared operations (v0.1-P3b/P4/D3) ([#497](https://github.com/canonical/pragma/issues/497)) ([15bfa93](https://github.com/canonical/pragma/commit/15bfa9381fc9571099467d382f60ae9f70b60bd5))
* **pragma:** reconcile MCP surface, response envelope, and unified boot ([#530](https://github.com/canonical/pragma/issues/530)) ([d7b7743](https://github.com/canonical/pragma/commit/d7b7743f68638f1f7bf9352a6b2a9d6d6abb2e41))
* **pragma:** rename get→lookup, add batch_lookup tools, remove names filter from list ([#539](https://github.com/canonical/pragma/issues/539)) ([d61fedd](https://github.com/canonical/pragma/commit/d61fedd64e66920722ac856649354d624e0d6d81))
* **pragma:** scaffold @canonical/pragma package ([#483](https://github.com/canonical/pragma/issues/483)) ([4d1ba99](https://github.com/canonical/pragma/commit/4d1ba991e789bc493ae3970822f9ffb7bb095ea8))
* **pragma:** structured recovery, surface parity, block rename, disclosure, batch ([#537](https://github.com/canonical/pragma/issues/537)) ([855bdc5](https://github.com/canonical/pragma/commit/855bdc546e5600e40c0b1ebc5e780fb86fad89d9))
* **pragma:** validate WASM embedding in bun build --compile (v0.1-E1) ([#491](https://github.com/canonical/pragma/issues/491)) ([6d3f7e9](https://github.com/canonical/pragma/commit/6d3f7e9fa74beb3b6294b254a53508de57423a9d))
* **task:** add undo interpreter and --undo flag across CLI ([#538](https://github.com/canonical/pragma/issues/538)) ([8c2fff5](https://github.com/canonical/pragma/commit/8c2fff58eb4e5527e4ca2aa1bd7e9f42b3cf70ee))


### Performance Improvements

* **ci:** parallel jobs with Nx remote cache server ([#523](https://github.com/canonical/pragma/issues/523)) ([053a2ec](https://github.com/canonical/pragma/commit/053a2ec8a7ea4dc05e4e31000c09a56fc15f77bf))


### BREAKING CHANGES

* **pragma:** MCP tool names drop `pragma_` prefix. Response
format changes from raw data to `{ ok, data, meta }` envelope.
Config file changes from pragma.config.toml to pragma.config.json.

* style(pragma): apply biome formatting and import sorting

* refactor(pragma): split wrapTool into single-export files

Move serializeErrorPayload and estimateTokens into their own files
per packaging/naming/single-export-file and packaging/export/shape
code standards. Each file now has exactly one default export.

* chore(pragma): update bun.lock after removing smol-toml
