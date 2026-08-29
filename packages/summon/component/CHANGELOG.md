# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.36.0](https://github.com/canonical/pragma/compare/v0.35.0...v0.36.0) (2026-08-29)


### Bug Fixes

* **pragma-cli:** make every setup row actionable, reversible and honestly reported ([#1044](https://github.com/canonical/pragma/issues/1044)) ([4e8d5ed](https://github.com/canonical/pragma/commit/4e8d5ede0bb36b66a682d2098f3db93ac57ed015))





# [0.35.0](https://github.com/canonical/pragma/compare/v0.34.0...v0.35.0) (2026-08-28)


### Bug Fixes

* **deps:** batch package dependency updates ([#963](https://github.com/canonical/pragma/issues/963)) ([923f482](https://github.com/canonical/pragma/commit/923f4825325ecd1afc93ec9bbeca7437a4a4569f)), closes [#958](https://github.com/canonical/pragma/issues/958) [#935](https://github.com/canonical/pragma/issues/935) [#919](https://github.com/canonical/pragma/issues/919) [#918](https://github.com/canonical/pragma/issues/918) [#894](https://github.com/canonical/pragma/issues/894)
* **summon-component:** test naming, exists guard, honest lit answers, portable template keys ([#978](https://github.com/canonical/pragma/issues/978)) ([fbdec01](https://github.com/canonical/pragma/commit/fbdec01df90947b147f64219baa7381fcecf57e5)), closes [#974](https://github.com/canonical/pragma/issues/974)
* **task:** collect undos against real host state with fail-backtracking ([#971](https://github.com/canonical/pragma/issues/971)) ([5231ce5](https://github.com/canonical/pragma/commit/5231ce53a82aac704183723d2ca2ced791a338d7))


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

**Note:** Version bump only for package @canonical/summon-component





# [0.33.0](https://github.com/canonical/pragma/compare/v0.32.0...v0.33.0) (2026-07-24)

**Note:** Version bump only for package @canonical/summon-component





# [0.32.0](https://github.com/canonical/pragma/compare/v0.31.0...v0.32.0) (2026-07-20)

**Note:** Version bump only for package @canonical/summon-component





# [0.31.0](https://github.com/canonical/pragma/compare/v0.30.0...v0.31.0) (2026-07-17)


### Bug Fixes

* **cli:** generator validation, --no- flags, auto-LLM detection, coverage ([#816](https://github.com/canonical/pragma/issues/816)) ([c9436f4](https://github.com/canonical/pragma/commit/c9436f471095edc2034157a21afce0cce50edfe7))
* **deps:** bump stale ^0.29.0 peerDependencies to ^0.30.0 ([#799](https://github.com/canonical/pragma/issues/799)) ([0702733](https://github.com/canonical/pragma/commit/0702733c48bd7838658be95589483192b5593cbe))





# [0.30.0](https://github.com/canonical/pragma/compare/v0.29.1...v0.30.0) (2026-07-14)


### Bug Fixes

* **summon:** run under plain Node + fix publish-time breakages ([#721](https://github.com/canonical/pragma/issues/721)) ([c24295f](https://github.com/canonical/pragma/commit/c24295f7c67f5d3577d77f0abad818073871bd2e))





# [0.29.0](https://github.com/canonical/pragma/compare/v0.29.0-experimental.0...v0.29.0) (2026-07-03)

**Note:** Version bump only for package @canonical/summon-component





# [0.29.0-experimental.0](https://github.com/canonical/pragma/compare/v0.28.0...v0.29.0-experimental.0) (2026-06-24)

**Note:** Version bump only for package @canonical/summon-component





# [0.28.0](https://github.com/canonical/pragma/compare/v0.27.1-experimental.0...v0.28.0) (2026-06-16)


### Bug Fixes

* **summon-component:** Fix Svelte component output failing type-checking ([#642](https://github.com/canonical/pragma/issues/642)) ([1331c96](https://github.com/canonical/pragma/commit/1331c963a5691f20b826bbb8b081ab283bde8584))


### Features

* **pragma:** trace, MCP resources, summon template loading, framework config ([#645](https://github.com/canonical/pragma/issues/645)) ([4f0a341](https://github.com/canonical/pragma/commit/4f0a341a050facbf3a87419ed7a9b3c29c0a9ade)), closes [#1](https://github.com/canonical/pragma/issues/1) [#551](https://github.com/canonical/pragma/issues/551) [#569](https://github.com/canonical/pragma/issues/569) [#641](https://github.com/canonical/pragma/issues/641) [#641](https://github.com/canonical/pragma/issues/641)





## [0.27.1-experimental.0](https://github.com/canonical/pragma/compare/v0.28.0-experimental.0...v0.27.1-experimental.0) (2026-05-21)


### Bug Fixes

* **release:** unblock lerna 9 publish (access via publishConfig) ([#637](https://github.com/canonical/pragma/issues/637)) ([acc1185](https://github.com/canonical/pragma/commit/acc1185b43290c1edd88da25c000f7d9494caee6))





# [0.27.0](https://github.com/canonical/pragma/compare/v0.26.0...v0.27.0) (2026-04-29)

**Note:** Version bump only for package @canonical/summon-component





# [0.26.0](https://github.com/canonical/pragma/compare/v0.25.0...v0.26.0) (2026-04-24)

**Note:** Version bump only for package @canonical/summon-component





# [0.25.0](https://github.com/canonical/pragma/compare/v0.24.0...v0.25.0) (2026-04-17)

**Note:** Version bump only for package @canonical/summon-component





# [0.24.0](https://github.com/canonical/pragma/compare/v0.23.0...v0.24.0) (2026-04-13)

**Note:** Version bump only for package @canonical/summon-component





# [0.23.0](https://github.com/canonical/pragma/compare/v0.22.1...v0.23.0) (2026-04-07)

**Note:** Version bump only for package @canonical/summon-component





# [0.22.0](https://github.com/canonical/pragma/compare/v0.22.0-experimental.0...v0.22.0) (2026-04-03)

**Note:** Version bump only for package @canonical/summon-component





# [0.21.0](https://github.com/canonical/pragma/compare/v0.20.1...v0.21.0) (2026-04-01)

**Note:** Version bump only for package @canonical/summon-component





# [0.20.0](https://github.com/canonical/pragma/compare/v0.19.0...v0.20.0) (2026-03-26)

**Note:** Version bump only for package @canonical/summon-component





# [0.19.0](https://github.com/canonical/pragma/compare/v0.18.0...v0.19.0) (2026-03-26)


### Bug Fixes

* **summon-component:** duplication of "generated by" comment ([#495](https://github.com/canonical/pragma/issues/495)) ([c52a374](https://github.com/canonical/pragma/commit/c52a374a85a9f703d0ff04b3fc3fd6d18370c458))


### Features

* **react-ds-global:** announcement component ([#554](https://github.com/canonical/pragma/issues/554)) ([e5434d0](https://github.com/canonical/pragma/commit/e5434d05421090cb77c227ccaa6025983c9a292c))
* **task,summon-core:** extract @canonical/task, restructure summon as @canonical/summon-core (v0.1-P1+P2) ([#484](https://github.com/canonical/pragma/issues/484)) ([1493baf](https://github.com/canonical/pragma/commit/1493baf6b28a9d5cbd7e4e13009f105945df72a9))
* **task:** add undo interpreter and --undo flag across CLI ([#538](https://github.com/canonical/pragma/issues/538)) ([8c2fff5](https://github.com/canonical/pragma/commit/8c2fff58eb4e5527e4ca2aa1bd7e9f42b3cf70ee))





# [0.18.0](https://github.com/canonical/pragma/compare/v0.17.1...v0.18.0) (2026-03-11)

**Note:** Version bump only for package @canonical/summon-component





## [0.17.1](https://github.com/canonical/pragma/compare/v0.17.0...v0.17.1) (2026-03-04)

**Note:** Version bump only for package @canonical/summon-component





# [0.17.0](https://github.com/canonical/pragma/compare/v0.16.0...v0.17.0) (2026-03-04)


### Features

* **summon:** summon component webcomponents ([#448](https://github.com/canonical/pragma/issues/448)) ([ae5d33d](https://github.com/canonical/pragma/commit/ae5d33d052f7c05be292e6a565cf371f47868274))





# [0.16.0](https://github.com/canonical/pragma/compare/v0.16.0-experimental.1...v0.16.0) (2026-03-03)

**Note:** Version bump only for package @canonical/summon-component





# [0.16.0-experimental.1](https://github.com/canonical/pragma/compare/v0.16.0-experimental.0...v0.16.0-experimental.1) (2026-03-03)

**Note:** Version bump only for package @canonical/summon-component





# [0.16.0-experimental.0](https://github.com/canonical/pragma/compare/v0.15.1...v0.16.0-experimental.0) (2026-02-24)


### Features

* **svelte-ds-app-launchpad:** upstream Chip component and update styles ([#423](https://github.com/canonical/pragma/issues/423)) ([26d1047](https://github.com/canonical/pragma/commit/26d104771a0df4ece538bd268b2141c30267b60c))





## [0.15.1](https://github.com/canonical/pragma/compare/v0.15.0...v0.15.1) (2026-02-23)

**Note:** Version bump only for package @canonical/summon-component





# [0.15.0](https://github.com/canonical/pragma/compare/v0.15.0-experimental.0...v0.15.0) (2026-02-20)


### Bug Fixes

* **react-ds-global:** Fixes transitional export patterns for components ([#426](https://github.com/canonical/pragma/issues/426)) ([db8a1db](https://github.com/canonical/pragma/commit/db8a1dba10419153f6be82ffee570c9db929dff7))





# [0.15.0-experimental.0](https://github.com/canonical/pragma/compare/v0.14.0...v0.15.0-experimental.0) (2026-02-17)


### Features

* **svelte-generator:** update Svelte component templates ([#422](https://github.com/canonical/pragma/issues/422)) ([f1fb13f](https://github.com/canonical/pragma/commit/f1fb13fa08463b844e611ae5cd0f94a06b13ff30))





# [0.14.0](https://github.com/canonical/pragma/compare/v0.13.0...v0.14.0) (2026-02-16)

**Note:** Version bump only for package @canonical/summon-component





# [0.13.0](https://github.com/canonical/pragma/compare/v0.13.0-experimental.0...v0.13.0) (2026-02-10)

**Note:** Version bump only for package @canonical/summon-component





# [0.12.0](https://github.com/canonical/pragma/compare/v0.12.0-experimental.0...v0.12.0) (2026-02-06)

**Note:** Version bump only for package @canonical/summon-component





# [0.12.0-experimental.0](https://github.com/canonical/pragma/compare/v0.11.0...v0.12.0-experimental.0) (2026-01-26)


### Features

* **components:** Ft components ([#393](https://github.com/canonical/pragma/issues/393)) ([abbe615](https://github.com/canonical/pragma/commit/abbe6150c52deefffb7e9e7fbfee8a3b6ffb94c6))
* **summon:** new codegen  ([#388](https://github.com/canonical/pragma/issues/388)) ([bcd1f35](https://github.com/canonical/pragma/commit/bcd1f350fd8799a580511e783a4292911fd5cc33))
