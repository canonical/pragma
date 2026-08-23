# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.34.0](https://github.com/canonical/pragma/compare/v0.33.0...v0.34.0) (2026-08-21)


* fix(cli)!: correctness — an honest preview interpreter, zod off the fast path, and four diagnosed defects (#909) ([17e1fae](https://github.com/canonical/pragma/commit/17e1faeb55be0a23c267ec0bbc9f6f38e5bdc2d4)), closes [#909](https://github.com/canonical/pragma/issues/909) [#5](https://github.com/canonical/pragma/issues/5) [#1](https://github.com/canonical/pragma/issues/1) [#2](https://github.com/canonical/pragma/issues/2) [#4](https://github.com/canonical/pragma/issues/4) [#909](https://github.com/canonical/pragma/issues/909) [#909](https://github.com/canonical/pragma/issues/909)


### BREAKING CHANGES

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

**Note:** Version bump only for package @canonical/task





# [0.32.0](https://github.com/canonical/pragma/compare/v0.31.0...v0.32.0) (2026-07-20)

**Note:** Version bump only for package @canonical/task





# [0.31.0](https://github.com/canonical/pragma/compare/v0.30.0...v0.31.0) (2026-07-17)

**Note:** Version bump only for package @canonical/task





# [0.30.0](https://github.com/canonical/pragma/compare/v0.29.1...v0.30.0) (2026-07-14)


### Bug Fixes

* **task:** route effect exceptions through recovery and trampoline preview/undo interpreters ([#740](https://github.com/canonical/pragma/issues/740)) ([6ad8b65](https://github.com/canonical/pragma/commit/6ad8b6518134f259f12acf76b21e1ce985e75403))


* refactor(task)!: scope @canonical/task to its consumer-used surface (#755) ([cdc725d](https://github.com/canonical/pragma/commit/cdc725d481d24ede55fc2f5b82cfad9b7dc088bc)), closes [#755](https://github.com/canonical/pragma/issues/755) [#741](https://github.com/canonical/pragma/issues/741) [#742](https://github.com/canonical/pragma/issues/742)


### Features

* **task:** content-addressable effect identity — canonicalJSON, EffectId, per-tag descriptors ([#741](https://github.com/canonical/pragma/issues/741)) ([f1a3a0b](https://github.com/canonical/pragma/commit/f1a3a0bacb607b51d89cf8f7d206a8252b7842bf))
* **task:** journal record/replay for deterministic effect execution ([#742](https://github.com/canonical/pragma/issues/742)) ([703db92](https://github.com/canonical/pragma/commit/703db927cf0bf9f937948817a2a2f7ba5cd1f87a))


### BREAKING CHANGES

* the journal/effect-identity exports are gone from
@canonical/task; RunTaskOptions no longer accepts `journal`.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DF9ExVCukzqpe1Fus9V1no

* chore(task): drop imports orphaned by the journal-seam test removal

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DF9ExVCukzqpe1Fus9V1no





# [0.29.0](https://github.com/canonical/pragma/compare/v0.29.0-experimental.0...v0.29.0) (2026-07-03)

**Note:** Version bump only for package @canonical/task





# [0.29.0-experimental.0](https://github.com/canonical/pragma/compare/v0.28.0...v0.29.0-experimental.0) (2026-06-24)


### Features

* **task:** stack-safe trampoline interpreter + effect-alphabet generics ([#691](https://github.com/canonical/pragma/issues/691)) ([7dc66a3](https://github.com/canonical/pragma/commit/7dc66a3b6ca939bf9970903af241d947b6187fd0))





# [0.28.0](https://github.com/canonical/pragma/compare/v0.27.1-experimental.0...v0.28.0) (2026-06-16)


### Features

* **summon-application:** add domain, route, and wrapper generators ([#626](https://github.com/canonical/pragma/issues/626)) ([6744b08](https://github.com/canonical/pragma/commit/6744b084236175b121f7aec36859976b5028a33e)), closes [#617](https://github.com/canonical/pragma/issues/617) [#643](https://github.com/canonical/pragma/issues/643)





## [0.27.1-experimental.0](https://github.com/canonical/pragma/compare/v0.28.0-experimental.0...v0.27.1-experimental.0) (2026-05-21)


### Bug Fixes

* **release:** unblock lerna 9 publish (access via publishConfig) ([#637](https://github.com/canonical/pragma/issues/637)) ([acc1185](https://github.com/canonical/pragma/commit/acc1185b43290c1edd88da25c000f7d9494caee6))





# [0.27.0](https://github.com/canonical/pragma/compare/v0.26.0...v0.27.0) (2026-04-29)

**Note:** Version bump only for package @canonical/task





# [0.26.0](https://github.com/canonical/pragma/compare/v0.25.0...v0.26.0) (2026-04-24)

**Note:** Version bump only for package @canonical/task





# [0.25.0](https://github.com/canonical/pragma/compare/v0.24.0...v0.25.0) (2026-04-17)

**Note:** Version bump only for package @canonical/task





# [0.24.0](https://github.com/canonical/pragma/compare/v0.23.0...v0.24.0) (2026-04-13)

**Note:** Version bump only for package @canonical/task





# [0.23.0](https://github.com/canonical/pragma/compare/v0.22.1...v0.23.0) (2026-04-07)

**Note:** Version bump only for package @canonical/task





# [0.22.0](https://github.com/canonical/pragma/compare/v0.22.0-experimental.0...v0.22.0) (2026-04-03)

**Note:** Version bump only for package @canonical/task





# [0.21.0](https://github.com/canonical/pragma/compare/v0.20.1...v0.21.0) (2026-04-01)


### Features

* **styles:** spacing tokens, canonical borders, self-hosted fonts, addon-utils toolbar ([#552](https://github.com/canonical/pragma/issues/552)) ([b7f0adc](https://github.com/canonical/pragma/commit/b7f0adc3f83dabf95b7272ce60e01de3110706c4))





# [0.20.0](https://github.com/canonical/pragma/compare/v0.19.0...v0.20.0) (2026-03-26)

**Note:** Version bump only for package @canonical/task





# [0.19.0](https://github.com/canonical/pragma/compare/v0.18.0...v0.19.0) (2026-03-26)


### Features

* **cli-framework:** add cli-framework package, build and webarchitect checks (v0.1-P3) ([#490](https://github.com/canonical/pragma/issues/490)) ([549806d](https://github.com/canonical/pragma/commit/549806dc5626a8f0165ca6daeb1abc65bb52d32b))
* **cli-framework:** add generator-to-CLI bridge modules (v0.1-P3b) ([#494](https://github.com/canonical/pragma/issues/494)) ([8bbaf5f](https://github.com/canonical/pragma/commit/8bbaf5fa68507b5f7de8301a9f481103e9aaf211))
* **harness:** creates the @canonical/harnesses package ([#486](https://github.com/canonical/pragma/issues/486)) ([6e11f7d](https://github.com/canonical/pragma/commit/6e11f7d0a9bd1849edd3d95ffa1124deecbdd182))
* **task,summon-core:** extract @canonical/task, restructure summon as @canonical/summon-core (v0.1-P1+P2) ([#484](https://github.com/canonical/pragma/issues/484)) ([1493baf](https://github.com/canonical/pragma/commit/1493baf6b28a9d5cbd7e4e13009f105945df72a9))
* **task:** add Symlink effect, switchMap, gen(), suppressed errors, AbortSignal (v0.1-P1b) ([#489](https://github.com/canonical/pragma/issues/489)) ([b199523](https://github.com/canonical/pragma/commit/b19952348be60e815e8c33477dbb02380ff4e139))
* **task:** add undo interpreter and --undo flag across CLI ([#538](https://github.com/canonical/pragma/issues/538)) ([8c2fff5](https://github.com/canonical/pragma/commit/8c2fff58eb4e5527e4ca2aa1bd7e9f42b3cf70ee))
