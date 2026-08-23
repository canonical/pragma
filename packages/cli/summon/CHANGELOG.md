# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# Unreleased

### BREAKING CHANGES

* **`@canonical/cli-core` is deleted.** It was the v1 shared-CLI framework, and
  the v1 name dies with the v1 model: the pragma kernel dropped the dependency
  when it built its own command grammar, and every symbol summon still imported
  from it had already been moved down into `@canonical/summon-core` and was
  being served by a re-export shim. The summon bin now imports those symbols
  from `@canonical/summon-core` directly. `packages/cli/` is left with the two
  product binaries and zero framework packages.

  For consumers: `@canonical/cli-core` is no longer published. If you imported
  from it, the surviving symbols — `runGeneratorTask`, `createGeneratorStamp`,
  `createStampOnEffectStart`, `answerPromptWithDefaults`, the effect formatters
  (`formatEffectLine`, `formatEffectWithContent`, `formatContentPreview`,
  `formatLlmHelp`/`formatLlmJson`/`formatLlmMarkdown`, `isVisibleEffect`, …) —
  are exported by `@canonical/summon-core` under the same names, except
  `promptForAnswers`, which is `collectAnswers` there. The rest of cli-core (the
  v1 `CommandDefinition` type, `registerAll`, its help/completion derivation and
  output adapters, `convertGenerator`, `executeGenerator`) has no successor in
  this package: those concerns live inside the pragma kernel's command grammar,
  whose extraction into a shared package is tracked separately.

* **One interaction model — non-interactive runs without complete input now
  REFUSE (exit 2).** Summon adopts the shared interaction decision it now
  shares verbatim with `pragma create` (normative contract:
  `packages/summon/core/docs/parity-contract.md`, §3). Three behaviors that
  previously fell through to mounting the Ink UI are now loud, scriptable
  failures:

  - **Non-TTY refusal**: a piped/CI run of a generator without `--yes`,
    `--dry-run`, `--undo`, or a complete set of answer flags exits **2** with
    `Refusing to scaffold in a non-interactive run without complete input.
    Pass --yes to accept defaults, --dry-run to preview, or provide every
    answer as a flag. Missing: --…` (previously: an Ink render attempt against
    a pipe). A CI invocation like `summon component react | tee log` must now
    pass `--yes` (accept defaults), `--dry-run` (preview only), or every
    remaining flag.
  - **Excess positionals** exit **2** with `error: unexpected argument "X"`
    naming the first excess operand (plus a did-you-mean when ANY operand of
    the invocation — a bound positional included, not only the excess ones —
    names a sibling or child segment: `summon component react svelte MyThing`
    suggests `summon component svelte` off the bound `svelte`); they were
    previously commander's generic "too many arguments" or silently absorbed.
    Every other Commander parse failure — an unknown option, an unknown
    command, a missing option argument — now also exits **2** (aligned with
    `pragma`; commander's own exit **1** previously stood). The error text is
    unchanged — except an unknown segment beneath a namespace
    (`summon component reakt`), whose suggestion is now the shared
    `Did you mean 'summon component react'?` form both CLIs emit (previously
    commander's `(Did you mean react?)`); `--help`/`--version` keep exit 0,
    and a bare namespace still prints its help on stderr with exit 1.
  - **Invalid input**: an explicitly provided answer failing its prompt's own
    constraint (a `validate` rejection, or a value outside a select's
    choices) errors loudly (exit **2**) in every mode that reaches the
    generator — batch, run, and wizard; an incomplete non-interactive run
    REFUSES first, before validating — with a message echoing the value
    (`Invalid --component-path "not-pascal": …`). Batch runs
    (`--dry-run`/`--undo`) previously fell through to the interactive UI;
    `--yes` runs and partial-flag wizards previously accepted the invalid
    value and scaffolded a tree carrying it (e.g. `--name "Bad Name!"` wrote
    `./Bad Name!/` with the broken name in its package.json) — all four now
    refuse before any UI, exactly where `pragma create` validates. One
    prompt's VALUE SET also changed, not just when validation runs:
    `application/react`'s `--app-path` now rejects an absolute path and any
    `..` segment (previously ANY path was accepted and the tree was written
    wherever it pointed — a sibling app via `../my-app` included), matching
    `--component-path`'s long-standing rule. The batch
    modes additionally error (exit **2**) on a required answer that is
    missing even after defaults. A generator-raised cross-answer constraint
    (`invalidAnswersError` from `@canonical/summon-core`) fails the same
    way — a bare stderr line, exit **2** in the batch modes (previously an
    uncaught throw with a stack, exit 1); no shipped generator raises one
    today (application/react's former ssr/router guard is gone with its
    prompts — see the wizard note below). The run and wizard
    arms show it as the App's clean error instead of crashing — and now
    carry the same exit codes instead of exiting 0 with the failure
    rendered: exit **2** for the typed cross-answer error, exit **1** for
    any other failure the App reports (a mid-run write error, say). An ordinary
    `Error` thrown by a generator's `generate` gets the same treatment in
    every arm: the App's clean error phase (`GENERATE_ERROR`, exit **1**)
    where it previously crashed into Ink's boundary — rendered on stdout
    with a source frame and, under bun, exit **0** — and a bare stderr
    line (exit **1**) in the batch modes, where it previously escaped as
    an unhandled-rejection stack. A `generate()` that RETURNS no task (a
    plain-JS generator that forgot its `return`) is classified the same
    way — the named line `<generator>'s generate returned no task`, exit
    **1** in every arm — instead of the interpreter's incidental
    TypeError. For failures the App already reported, the rendering is
    unchanged; only the exit code moved.

  Also in this line of work, on a TTY: `--dry-run` renders the batch plan and
  `--undo` runs batch undo (neither mounts the interactive preview any more,
  and `--dry-run` now takes precedence over `--undo`); a run with PARTIAL
  answer flags asks exactly the missing prompts instead of silently
  defaulting the rest; and the long-missing `--undo` row appears in every
  generator's `--help`. Generated trees are byte-identical throughout; a
  `--yes` run with VALID answers is untouched (an invalid explicit answer
  now refuses — see *Invalid input* above).

* **`application/react` drops its `ssr` and `router` prompts — SSR and the
  router are always on.** The scaffold has no SPA arm, so the two wizard
  questions (`Include SSR?`, `Include router?`) only ever accepted their
  default: answering "no" hit the generator's own guard. Worse, the pair made
  the non-interactive refusal's advice unfollowable — a default-`true`
  confirm can be provided explicitly only as its negation, which the guard
  then rejected, so `summon application react` had no complete-flags path at
  all. The wizard now asks four questions (directory, forms, relay, install);
  `--no-ssr`/`--no-router` are unknown options (they previously only ever
  produced the guard error); the guard itself is gone as dead code. Generated
  trees are byte-identical — the pair never reached a template.

# [0.33.0](https://github.com/canonical/pragma/compare/v0.32.0...v0.33.0) (2026-07-24)

**Note:** Version bump only for package @canonical/summon





# [0.32.0](https://github.com/canonical/pragma/compare/v0.31.0...v0.32.0) (2026-07-20)

**Note:** Version bump only for package @canonical/summon





# [0.31.0](https://github.com/canonical/pragma/compare/v0.30.0...v0.31.0) (2026-07-17)


### Features

* **cli:** pragma create reuses summon's rich Ink UI when interactive ([#819](https://github.com/canonical/pragma/issues/819)) ([23d88b0](https://github.com/canonical/pragma/commit/23d88b0f080650da5e50546e0d416b9e844bb6ae))





# [0.30.0](https://github.com/canonical/pragma/compare/v0.29.1...v0.30.0) (2026-07-14)


### Bug Fixes

* **summon:** run under plain Node + fix publish-time breakages ([#721](https://github.com/canonical/pragma/issues/721)) ([c24295f](https://github.com/canonical/pragma/commit/c24295f7c67f5d3577d77f0abad818073871bd2e))


### Features

* **cli:** byte-identical output for pragma create and summon; summon on the shared core ([#761](https://github.com/canonical/pragma/issues/761)) ([c10e133](https://github.com/canonical/pragma/commit/c10e1332e3a1f7e4f815da7cc40ecb4f95fbb045))





# [0.29.0](https://github.com/canonical/pragma/compare/v0.29.0-experimental.0...v0.29.0) (2026-07-03)

**Note:** Version bump only for package @canonical/summon





# [0.29.0-experimental.0](https://github.com/canonical/pragma/compare/v0.28.0...v0.29.0-experimental.0) (2026-06-24)

**Note:** Version bump only for package @canonical/summon





# [0.28.0](https://github.com/canonical/pragma/compare/v0.27.1-experimental.0...v0.28.0) (2026-06-16)


### Features

* **summon-application:** add domain, route, and wrapper generators ([#626](https://github.com/canonical/pragma/issues/626)) ([6744b08](https://github.com/canonical/pragma/commit/6744b084236175b121f7aec36859976b5028a33e)), closes [#617](https://github.com/canonical/pragma/issues/617) [#643](https://github.com/canonical/pragma/issues/643)





## [0.27.1-experimental.0](https://github.com/canonical/pragma/compare/v0.28.0-experimental.0...v0.27.1-experimental.0) (2026-05-21)


### Bug Fixes

* **release:** unblock lerna 9 publish (access via publishConfig) ([#637](https://github.com/canonical/pragma/issues/637)) ([acc1185](https://github.com/canonical/pragma/commit/acc1185b43290c1edd88da25c000f7d9494caee6))





# [0.27.0](https://github.com/canonical/pragma/compare/v0.26.0...v0.27.0) (2026-04-29)

**Note:** Version bump only for package @canonical/summon





# [0.26.0](https://github.com/canonical/pragma/compare/v0.25.0...v0.26.0) (2026-04-24)

**Note:** Version bump only for package @canonical/summon





# [0.25.0](https://github.com/canonical/pragma/compare/v0.24.0...v0.25.0) (2026-04-17)

**Note:** Version bump only for package @canonical/summon





# [0.24.0](https://github.com/canonical/pragma/compare/v0.23.0...v0.24.0) (2026-04-13)

**Note:** Version bump only for package @canonical/summon





# [0.23.0](https://github.com/canonical/pragma/compare/v0.22.1...v0.23.0) (2026-04-07)

**Note:** Version bump only for package @canonical/summon





# [0.22.0](https://github.com/canonical/pragma/compare/v0.22.0-experimental.0...v0.22.0) (2026-04-03)

**Note:** Version bump only for package @canonical/summon





# [0.21.0](https://github.com/canonical/pragma/compare/v0.20.1...v0.21.0) (2026-04-01)

**Note:** Version bump only for package @canonical/summon





# [0.20.0](https://github.com/canonical/pragma/compare/v0.19.0...v0.20.0) (2026-03-26)

**Note:** Version bump only for package @canonical/summon





# [0.19.0](https://github.com/canonical/pragma/compare/v0.18.0...v0.19.0) (2026-03-26)


### Bug Fixes

* **ci:** add missing build step to push workflow, replace workspace: protocol ([#521](https://github.com/canonical/pragma/issues/521)) ([0e88312](https://github.com/canonical/pragma/commit/0e883120c96034d180de0ebdde6e9740d97609fe)), closes [#512](https://github.com/canonical/pragma/issues/512)
* **summon-component:** duplication of "generated by" comment ([#495](https://github.com/canonical/pragma/issues/495)) ([c52a374](https://github.com/canonical/pragma/commit/c52a374a85a9f703d0ff04b3fc3fd6d18370c458))


### Features

* **pragma:** extract summon binary + add shared operations (v0.1-P3b/P4/D3) ([#497](https://github.com/canonical/pragma/issues/497)) ([15bfa93](https://github.com/canonical/pragma/commit/15bfa9381fc9571099467d382f60ae9f70b60bd5))
* **task:** add undo interpreter and --undo flag across CLI ([#538](https://github.com/canonical/pragma/issues/538)) ([8c2fff5](https://github.com/canonical/pragma/commit/8c2fff58eb4e5527e4ca2aa1bd7e9f42b3cf70ee))
