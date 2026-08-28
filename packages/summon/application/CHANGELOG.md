# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.35.0](https://github.com/canonical/pragma/compare/v0.34.0...v0.35.0) (2026-08-28)


### Bug Fixes

* **boilerplate,summon-application:** declare the root surface classes ([#1001](https://github.com/canonical/pragma/issues/1001)) ([73ba2f1](https://github.com/canonical/pragma/commit/73ba2f136862e0b4609df5f4346fd55233dabee9))
* **deps:** batch package dependency updates ([#963](https://github.com/canonical/pragma/issues/963)) ([923f482](https://github.com/canonical/pragma/commit/923f4825325ecd1afc93ec9bbeca7437a4a4569f)), closes [#958](https://github.com/canonical/pragma/issues/958) [#935](https://github.com/canonical/pragma/issues/935) [#919](https://github.com/canonical/pragma/issues/919) [#918](https://github.com/canonical/pragma/issues/918) [#894](https://github.com/canonical/pragma/issues/894)
* **summon-application:** version fallback, safe route undo, input validation, workspace detection ([#982](https://github.com/canonical/pragma/issues/982)) ([098b87b](https://github.com/canonical/pragma/commit/098b87be7f6bd463cbb76fd638cb1a614aee009f))


* feat(pragma)!: mount summon's generators instead of mirroring them (#1005) ([299e206](https://github.com/canonical/pragma/commit/299e206a4dd76b62fc48a6d436d33d06652e6fdf)), closes [#1005](https://github.com/canonical/pragma/issues/1005)
* feat(router)!: pre-1.0 API consolidation — one constructor, adapters as the axis, block(), warm() (re-land of #973) (#981) ([416d596](https://github.com/canonical/pragma/commit/416d59636f94cafae7a9fbb0b377edabed6438bf)), closes [#973](https://github.com/canonical/pragma/issues/973) [#981](https://github.com/canonical/pragma/issues/981) [#973](https://github.com/canonical/pragma/issues/973) [#973](https://github.com/canonical/pragma/issues/973) [#973](https://github.com/canonical/pragma/issues/973)


### Features

* **boilerplate-vite:** align the reference app and overhaul the router docs (re-land of [#979](https://github.com/canonical/pragma/issues/979)) ([#990](https://github.com/canonical/pragma/issues/990)) ([8fe2792](https://github.com/canonical/pragma/commit/8fe27927613e7b5b9ff6c4c6596d6d9228063c2b))
* **boilerplate-vite:** serialize Relay data across the SSR boundary ([#993](https://github.com/canonical/pragma/issues/993)) ([d4ad306](https://github.com/canonical/pragma/commit/d4ad3063de8560a6f700aa760e345f8bcb311398)), closes [#968](https://github.com/canonical/pragma/issues/968)
* **summon-application:** port the i18n feature to the templates behind an --intl flag ([#992](https://github.com/canonical/pragma/issues/992)) ([d0117b9](https://github.com/canonical/pragma/commit/d0117b9bc671f1d8ec7d080c0d5cf137a8d451f9))


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
* navigate() and setSearchParams() throw on a router
constructed without an adapter instead of doing nothing.

* refactor(router)!: collapse router factories onto the adapter axis

createRouter(routes, { adapter, ... }) is now the one constructor. The
preset factories were one-line sugar over an adapter choice; under the
minimal-API principle the adapter is the whole axis:

- delete createBrowserRouter, createHashRouter, createMemoryRouter and
  createStaticRouter from router-core (the browser adapter already
  resolves Navigation API -> History API internally)
- delete router-react's createHydratedRouter; its __INITIAL_DATA__
  reading survives as readDehydratedState(), passed to createRouter as
  hydratedState — which also removes the incoherence where the hydrated
  path was history-only while createBrowserRouter preferred the
  Navigation API
- migrate every in-repo consumer (boilerplate entries, summon templates,
  storybook harnesses, story-utils) to createRouter + adapters; the
  static-router recipe (match + synchronous hydrate) is inlined at the
  two SSR entry points that used it
* createBrowserRouter, createHashRouter,
createMemoryRouter, createStaticRouter and createHydratedRouter are
removed. Use createRouter(routes, { adapter: createBrowserAdapter() |
createHashAdapter() | createMemoryAdapter(url) | createServerAdapter(url),
hydratedState: readDehydratedState() ?? undefined }).

* refactor(router)!: reshape blockers to router.block() and fix useBlocker reactivity

Five members (registerBlocker/unregisterBlocker/blockerState/
proceedNavigation/cancelNavigation) collapse into one:
router.block(isActive) returns a handle with { state, proceed, cancel,
subscribe, dispose }, backed by a dedicated blocker-state subject.

This also fixes a real bug: useBlocker subscribed to the store, but a
blocked navigate() never touched the store, so the documented
confirmation-dialog pattern never rendered — the old test had to poke
the store manually to observe the blocked state. The hook now subscribes
to the handle and re-renders on the block itself; the dialog pattern is
asserted end-to-end.

Disposing (or unmounting) while blocked discards the pending navigation
— previously implicit, now documented handle behavior.
* registerBlocker, unregisterBlocker, blockerState,
proceedNavigation and cancelNavigation are removed from Router; use
router.block(isActive). The RouterBlocker type is replaced by
RouterBlockerHandle. useBlocker's public shape is unchanged.

* refactor(router)!: shrink the public surface — internal store, one-arg StatusResponse

- Remove store from the public Router interface. It was reachable on
  every router yet documented nowhere, and no production code consumed
  it; the package's own tests reach the concrete object's store through
  an explicit internal accessor instead. createRouterStore and the
  RouterStore type remain exported as standalone primitives.
- StatusResponse's data argument is now optional — new StatusResponse(401)
  works, as the READMEs already wrote.
* Router no longer exposes store. Subscribe via
subscribe/subscribeToNavigation/subscribeToSearchParam, read via
getState/getTrackedLocation.

* refactor(router)!: rename prefetch to warm

'prefetch' imports the wrong mental model: in every other router a
prefetch/loader hands data to the component, and readers kept filing the
hook's fire-and-forget design as a bug. 'warm' says what the hook is
for — warming a cache ahead of navigation — and cannot be confused with
a data loader.

Renamed atomically across router-core (route/wrapper hook, router.warm(),
WarmFn, internals), router-react (Link's hover warm-up), the reference
app and summon templates, and the router docs. TanStack's prefetchQuery
in examples is unrelated third-party API and keeps its name.
* the route/wrapper 'prefetch' hook is now 'warm';
router.prefetch() is router.warm(); the PrefetchFn type is WarmFn.

* fix(router-core): make StatusResponse's optional payload type-safe





# [0.34.0](https://github.com/canonical/pragma/compare/v0.33.0...v0.34.0) (2026-08-21)

**Note:** Version bump only for package @canonical/summon-application





# [0.33.0](https://github.com/canonical/pragma/compare/v0.32.0...v0.33.0) (2026-07-24)

**Note:** Version bump only for package @canonical/summon-application





# [0.32.0](https://github.com/canonical/pragma/compare/v0.31.0...v0.32.0) (2026-07-20)


### Bug Fixes

* **relay:** SSR-breaking type-only imports patched + summon relay-21 refresh with workspace-aware patch emission ([#866](https://github.com/canonical/pragma/issues/866)) ([47bc18d](https://github.com/canonical/pragma/commit/47bc18d2d4c786727a72d1bb44829acf5631b418))





# [0.31.0](https://github.com/canonical/pragma/compare/v0.30.0...v0.31.0) (2026-07-17)

**Note:** Version bump only for package @canonical/summon-application





# [0.30.0](https://github.com/canonical/pragma/compare/v0.29.1...v0.30.0) (2026-07-14)


### Bug Fixes

* **summon:** run under plain Node + fix publish-time breakages ([#721](https://github.com/canonical/pragma/issues/721)) ([c24295f](https://github.com/canonical/pragma/commit/c24295f7c67f5d3577d77f0abad818073871bd2e))


### Features

* **boilerplate:** app-level CSS compilation via Lightning CSS + declared browser floor ([#769](https://github.com/canonical/pragma/issues/769)) ([98281ba](https://github.com/canonical/pragma/commit/98281bace083fd841af0d52c0baf37bc2dd77fd1))
* **summon-application:** opt-in Relay data layer for generated apps (--relay) ([#753](https://github.com/canonical/pragma/issues/753)) ([b64f51c](https://github.com/canonical/pragma/commit/b64f51cbac49c790828a73d6601e1a87fcba6b5f)), closes [#751](https://github.com/canonical/pragma/issues/751) [advl/lit-relay#32](https://github.com/advl/lit-relay/issues/32)





# [0.29.0](https://github.com/canonical/pragma/compare/v0.29.0-experimental.0...v0.29.0) (2026-07-03)

**Note:** Version bump only for package @canonical/summon-application





# [0.29.0-experimental.0](https://github.com/canonical/pragma/compare/v0.28.0...v0.29.0-experimental.0) (2026-06-24)

**Note:** Version bump only for package @canonical/summon-application





# [0.28.0](https://github.com/canonical/pragma/compare/v0.27.1-experimental.0...v0.28.0) (2026-06-16)


### Bug Fixes

* **react-ssr:** serve dev SSR assets and resolve module-only deps (viteFetchMiddleware) ([#648](https://github.com/canonical/pragma/issues/648)) ([662783d](https://github.com/canonical/pragma/commit/662783d6d4da18039d9a04e42bd118e1ad161815))


### Features

* **react-hooks:** SSR theme wiring + Lighthouse-100 boilerplate ([#652](https://github.com/canonical/pragma/issues/652)) ([dd61a4d](https://github.com/canonical/pragma/commit/dd61a4d45f9e868a53b80ae0c77c029e13fede47))
* **react-ssr:** compiled preview SSR path + 2x3 server matrix ([#650](https://github.com/canonical/pragma/issues/650)) ([b490591](https://github.com/canonical/pragma/commit/b490591e863c1d09d2b4b9b3d7eed1a2e467aaf2))
* **summon-application:** add domain, route, and wrapper generators ([#626](https://github.com/canonical/pragma/issues/626)) ([6744b08](https://github.com/canonical/pragma/commit/6744b084236175b121f7aec36859976b5028a33e)), closes [#617](https://github.com/canonical/pragma/issues/617) [#643](https://github.com/canonical/pragma/issues/643)
