# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.35.0](https://github.com/canonical/pragma/compare/v0.34.0...v0.35.0) (2026-08-28)


### Bug Fixes

* **deps:** batch package dependency updates ([#963](https://github.com/canonical/pragma/issues/963)) ([923f482](https://github.com/canonical/pragma/commit/923f4825325ecd1afc93ec9bbeca7437a4a4569f)), closes [#958](https://github.com/canonical/pragma/issues/958) [#935](https://github.com/canonical/pragma/issues/935) [#919](https://github.com/canonical/pragma/issues/919) [#918](https://github.com/canonical/pragma/issues/918) [#894](https://github.com/canonical/pragma/issues/894)
* **summon-package:** make every generated flag combination installable ([#975](https://github.com/canonical/pragma/issues/975)) ([987e68f](https://github.com/canonical/pragma/commit/987e68f551ee614c2c7adcc09178fedaff09f5f8))


* feat(pragma)!: mount summon's generators instead of mirroring them (#1005) ([299e206](https://github.com/canonical/pragma/commit/299e206a4dd76b62fc48a6d436d33d06652e6fdf)), closes [#1005](https://github.com/canonical/pragma/issues/1005)


### BREAKING CHANGES

* summon-core no longer exposes an embedded template store —
callers pass a real path to `loadTemplate`. `GeneratorCliHost`,
`registerGeneratorCommands` on the main projection subpath, the
`writeUsageError` hook and the message-only usage-error exports are gone.
`summon application react` no longer accepts `--no-ssr`/`--no-router`.

* feat(pragma)!: mount summon's generators instead of mirroring them

pragma's `create` verb hand-maintained a copy of summon's generator surface —
a flag list in `constants.ts`, an adapter that mapped it back, and a PROTECTED
test asserting the copy still matched. Every generator change had to be made
twice, and that test was the only thing between a drifted mirror and a
silently wrong CLI.

`mount.ts` replaces all of it, adapting the projection summon-core now exposes
onto pragma's kernel: synthesising VerbSpecs, wiring dispatch and completion,
enforcing the path jail, and emitting the generated reference. There is one
description of a generator's surface and both binaries read it. `--intl`
arriving on application/react needed no edit here at all; under the mirror it
would have needed two.

Kernel changes that made the mount possible: `kernel/spec` gains the types and
emitters for a synthesised verb, `dispatch` and `completion/model` handle a
verb tree resolved at runtime, and `error/types`/`renderError` carry the
generator error codes so an invalid answer exits 2 rather than surfacing as an
internal error.

`create` help now renders in pragma's house style like every other noun —
previously it emitted no colour at all and bypassed the style seam, so
`NO_COLOR` and theming never reached it. Because presentation is now
deliberately host-owned, the cross-CLI contract's help cells assert structural
parity (same groups, rows, order, defaults) with a non-empty guard, while
every other cell stays byte-for-byte.

Also here: the perf gate's `globalSetup` builds `dist` once behind a
cross-process lock instead of once per worker, `scripts/codegen.ts` generates
the create surface the covenant checks against, and the retired-flag migration
handler no longer matches commands that never carried the flag.
* `--ssr` and `--router` are gone from `pragma create
application` — the generator no longer declares them. The
`@canonical/summon-component/embedded` subpath export is removed along with
its last consumer.

* fix(pragma-cli,summon): make build-lock waiters re-acquire before re-statting freshness

The waiter arm of buildUnderLock (pragma-cli src/testing/perf/
globalSetup.ts:187, summon twin src/testing/globalSetup.ts:142) paired a
lock-free existsSync with an isFresh() stat — two unsynchronised
observations. After existsSync saw no lock, a new holder could acquire it
and begin an in-place rebuild; the waiter then read mid-flight mtimes as
fresh and consumed the torn artifact the lock exists to prevent. The
waiter now always loops back to acquire the lock and re-stats only under
it, in both TWIN copies, keeping their shared docblock in step.

The contention test's driver isFresh is now also an ownership sentinel:
it drops a violation file whenever it runs while the lockfile is absent
or carries another pid, so any freshness observation outside the
waiter's own lock goes red deterministically (verified red against the
removed fast path).

* fix(pragma-cli): stop offering mutation flags on mounted namespace completions

toMountedEntry (src/kernel/completion/model.ts:250) stamped the owning
verb's mutates onto every node of a mounted subtree, so the completion
walk offered --dry-run/--undo/--yes at a namespace position — but
registerGeneratorCommands registers the host mutation trio on runnable
leaves only, so an accepted suggestion like `create component --dry-run
react` exits 2 as an unknown option (verified live). A node with
children is now non-mutating for completion; the verb's mutability
descends to the leaves. The literal namespace-tier pin and the
emitSurface agreement assertion are updated to the registered grammar.

* fix(pragma-cli): complete registered positional-prompt flags on create leaves

leafChild (src/capabilities/create/mount.ts:466) filtered positional
prompts out of a leaf's completion flag list, but addPromptOptions
(summon-core registerGeneratorCommands.ts:94) registers EVERY prompt as
an option with no positional filter — `--component-path <value>` and
`--app-path <value>` are real registered flags (they appear in the
leaf's own --help) that completion silently withheld. Every prompt now
contributes its flag; the positional argument stays an additional
spelling. The literal leaf-tier pins gain the positional-prompt flags.

* fix(pragma-cli): stop retired-flag detection reading past the option terminator

handleProgramError's retired-grammar scan (src/bin.ts:314) matched
--framework anywhere in stripped argv, so a parse failure on `create
component react --bogus -- --framework` — where --framework is an
operand — emitted the R1 migration message instead of the real
`unknown option '--bogus'` (verified live). The scan now reuses
globalFlags' option-terminator concept via the newly exported
selectScanSpan (src/kernel/project/cli/globalFlags.ts), restricting
detection to the pre-`--` span; a subprocess regression test pins the
honest error.





# [0.34.0](https://github.com/canonical/pragma/compare/v0.33.0...v0.34.0) (2026-08-21)


### Bug Fixes

* **summon-package:** library template emits a buildable, discoverable package ([#912](https://github.com/canonical/pragma/issues/912)) ([0d9bdbb](https://github.com/canonical/pragma/commit/0d9bdbbafd744db2ba2bf82bc9e95d616e0be1b7))
* **summon-package:** read the own version through a layout-proof walk, not a JSON self-import ([#921](https://github.com/canonical/pragma/issues/921)) ([07f50f4](https://github.com/canonical/pragma/commit/07f50f4db96d57564bc186b0ae0059748e63c0f1)), closes [#913](https://github.com/canonical/pragma/issues/913)
* **summon:** compile summon-monorepo and summon-package to JavaScript ([#913](https://github.com/canonical/pragma/issues/913)) ([8a46245](https://github.com/canonical/pragma/commit/8a462450fffead7f0cd0c9b7126101832779b3ec))





# [0.33.0](https://github.com/canonical/pragma/compare/v0.32.0...v0.33.0) (2026-07-24)

**Note:** Version bump only for package @canonical/summon-package





# [0.32.0](https://github.com/canonical/pragma/compare/v0.31.0...v0.32.0) (2026-07-20)

**Note:** Version bump only for package @canonical/summon-package





# [0.31.0](https://github.com/canonical/pragma/compare/v0.30.0...v0.31.0) (2026-07-17)

**Note:** Version bump only for package @canonical/summon-package





# [0.30.0](https://github.com/canonical/pragma/compare/v0.29.1...v0.30.0) (2026-07-14)


### Bug Fixes

* **summon-package:** make the per-package PR template opt-in ([#749](https://github.com/canonical/pragma/issues/749)) ([4847e38](https://github.com/canonical/pragma/commit/4847e38d9f4993f60577330c445ba45ddbb6b79f)), closes [canonical/pragma#684](https://github.com/canonical/pragma/issues/684) [#686](https://github.com/canonical/pragma/issues/686) [canonical/pragma#684](https://github.com/canonical/pragma/issues/684)





# [0.29.0](https://github.com/canonical/pragma/compare/v0.29.0-experimental.0...v0.29.0) (2026-07-03)

**Note:** Version bump only for package @canonical/summon-package





# [0.29.0-experimental.0](https://github.com/canonical/pragma/compare/v0.28.0...v0.29.0-experimental.0) (2026-06-24)

**Note:** Version bump only for package @canonical/summon-package





# [0.28.0](https://github.com/canonical/pragma/compare/v0.27.1-experimental.0...v0.28.0) (2026-06-16)


### Features

* **pragma:** trace, MCP resources, summon template loading, framework config ([#645](https://github.com/canonical/pragma/issues/645)) ([4f0a341](https://github.com/canonical/pragma/commit/4f0a341a050facbf3a87419ed7a9b3c29c0a9ade)), closes [#1](https://github.com/canonical/pragma/issues/1) [#551](https://github.com/canonical/pragma/issues/551) [#569](https://github.com/canonical/pragma/issues/569) [#641](https://github.com/canonical/pragma/issues/641) [#641](https://github.com/canonical/pragma/issues/641)





## [0.27.1-experimental.0](https://github.com/canonical/pragma/compare/v0.28.0-experimental.0...v0.27.1-experimental.0) (2026-05-21)


### Bug Fixes

* **release:** unblock lerna 9 publish (access via publishConfig) ([#637](https://github.com/canonical/pragma/issues/637)) ([acc1185](https://github.com/canonical/pragma/commit/acc1185b43290c1edd88da25c000f7d9494caee6))





# [0.27.0](https://github.com/canonical/pragma/compare/v0.26.0...v0.27.0) (2026-04-29)

**Note:** Version bump only for package @canonical/summon-package





# [0.26.0](https://github.com/canonical/pragma/compare/v0.25.0...v0.26.0) (2026-04-24)

**Note:** Version bump only for package @canonical/summon-package





# [0.25.0](https://github.com/canonical/pragma/compare/v0.24.0...v0.25.0) (2026-04-17)

**Note:** Version bump only for package @canonical/summon-package





# [0.24.0](https://github.com/canonical/pragma/compare/v0.23.0...v0.24.0) (2026-04-13)

**Note:** Version bump only for package @canonical/summon-package





# [0.23.0](https://github.com/canonical/pragma/compare/v0.22.1...v0.23.0) (2026-04-07)

**Note:** Version bump only for package @canonical/summon-package





# [0.22.0](https://github.com/canonical/pragma/compare/v0.22.0-experimental.0...v0.22.0) (2026-04-03)

**Note:** Version bump only for package @canonical/summon-package





# [0.21.0](https://github.com/canonical/pragma/compare/v0.20.1...v0.21.0) (2026-04-01)

**Note:** Version bump only for package @canonical/summon-package





# [0.20.0](https://github.com/canonical/pragma/compare/v0.19.0...v0.20.0) (2026-03-26)

**Note:** Version bump only for package @canonical/summon-package





# [0.19.0](https://github.com/canonical/pragma/compare/v0.18.0...v0.19.0) (2026-03-26)


### Bug Fixes

* **summon-component:** duplication of "generated by" comment ([#495](https://github.com/canonical/pragma/issues/495)) ([c52a374](https://github.com/canonical/pragma/commit/c52a374a85a9f703d0ff04b3fc3fd6d18370c458))


### Features

* **pragma:** add generator commands (`pragma create`) (v0.2-D14) ([#515](https://github.com/canonical/pragma/issues/515)) ([80c9da6](https://github.com/canonical/pragma/commit/80c9da6f5c0ba0a6d23c444bff382b6d21f4c232))
* **summon:** add PR template to package generator ([#526](https://github.com/canonical/pragma/issues/526)) ([7aced71](https://github.com/canonical/pragma/commit/7aced71d3fe5234f34ce7787b24089d69cc3ac56))
* **task,summon-core:** extract @canonical/task, restructure summon as @canonical/summon-core (v0.1-P1+P2) ([#484](https://github.com/canonical/pragma/issues/484)) ([1493baf](https://github.com/canonical/pragma/commit/1493baf6b28a9d5cbd7e4e13009f105945df72a9))





# [0.18.0](https://github.com/canonical/pragma/compare/v0.17.1...v0.18.0) (2026-03-11)


### Features

* **tokens-viz:** pt1, scaffholding ([#461](https://github.com/canonical/pragma/issues/461)) ([e6a1c7a](https://github.com/canonical/pragma/commit/e6a1c7a4fda74ba4fe37c570d7351472c8e735c4))





## [0.17.1](https://github.com/canonical/pragma/compare/v0.17.0...v0.17.1) (2026-03-04)

**Note:** Version bump only for package @canonical/summon-package





# [0.17.0](https://github.com/canonical/pragma/compare/v0.16.0...v0.17.0) (2026-03-04)

**Note:** Version bump only for package @canonical/summon-package





# [0.16.0](https://github.com/canonical/pragma/compare/v0.16.0-experimental.1...v0.16.0) (2026-03-03)

**Note:** Version bump only for package @canonical/summon-package





# [0.16.0-experimental.1](https://github.com/canonical/pragma/compare/v0.16.0-experimental.0...v0.16.0-experimental.1) (2026-03-03)

**Note:** Version bump only for package @canonical/summon-package





## [0.15.1](https://github.com/canonical/pragma/compare/v0.15.0...v0.15.1) (2026-02-23)

**Note:** Version bump only for package @canonical/summon-package





# [0.15.0](https://github.com/canonical/pragma/compare/v0.15.0-experimental.0...v0.15.0) (2026-02-20)

**Note:** Version bump only for package @canonical/summon-package





# [0.14.0](https://github.com/canonical/pragma/compare/v0.13.0...v0.14.0) (2026-02-16)

**Note:** Version bump only for package @canonical/summon-package





# [0.13.0](https://github.com/canonical/pragma/compare/v0.13.0-experimental.0...v0.13.0) (2026-02-10)

**Note:** Version bump only for package @canonical/summon-package





# [0.13.0-experimental.0](https://github.com/canonical/pragma/compare/v0.12.0...v0.13.0-experimental.0) (2026-02-10)


### Features

* **storybook:** enhance configuration for Svelte support ([#415](https://github.com/canonical/pragma/issues/415)) ([af589bd](https://github.com/canonical/pragma/commit/af589bd9e4a63a3138551b998f7f8fe8d507a023))





# [0.12.0](https://github.com/canonical/pragma/compare/v0.12.0-experimental.0...v0.12.0) (2026-02-06)

**Note:** Version bump only for package @canonical/summon-package





# [0.12.0-experimental.0](https://github.com/canonical/pragma/compare/v0.11.0...v0.12.0-experimental.0) (2026-01-26)


### Features

* **summon:** new codegen  ([#388](https://github.com/canonical/pragma/issues/388)) ([bcd1f35](https://github.com/canonical/pragma/commit/bcd1f350fd8799a580511e783a4292911fd5cc33))
