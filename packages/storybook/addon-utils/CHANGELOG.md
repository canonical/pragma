# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.36.0](https://github.com/canonical/pragma/compare/v0.35.0...v0.36.0) (2026-08-29)

**Note:** Version bump only for package @canonical/storybook-addon-utils





# [0.35.0](https://github.com/canonical/pragma/compare/v0.34.0...v0.35.0) (2026-08-28)


### Bug Fixes

* **deps:** batch package dependency updates ([#963](https://github.com/canonical/pragma/issues/963)) ([923f482](https://github.com/canonical/pragma/commit/923f4825325ecd1afc93ec9bbeca7437a4a4569f)), closes [#958](https://github.com/canonical/pragma/issues/958) [#935](https://github.com/canonical/pragma/issues/935) [#919](https://github.com/canonical/pragma/issues/919) [#918](https://github.com/canonical/pragma/issues/918) [#894](https://github.com/canonical/pragma/issues/894)


* feat(router)!: pre-1.0 API consolidation — one constructor, adapters as the axis, block(), warm() (re-land of #973) (#981) ([416d596](https://github.com/canonical/pragma/commit/416d59636f94cafae7a9fbb0b377edabed6438bf)), closes [#973](https://github.com/canonical/pragma/issues/973) [#981](https://github.com/canonical/pragma/issues/981) [#973](https://github.com/canonical/pragma/issues/973) [#973](https://github.com/canonical/pragma/issues/973) [#973](https://github.com/canonical/pragma/issues/973)


### BREAKING CHANGES

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

**Note:** Version bump only for package @canonical/storybook-addon-utils





# [0.33.0](https://github.com/canonical/pragma/compare/v0.32.0...v0.33.0) (2026-07-24)

**Note:** Version bump only for package @canonical/storybook-addon-utils





# [0.32.0](https://github.com/canonical/pragma/compare/v0.31.0...v0.32.0) (2026-07-20)

**Note:** Version bump only for package @canonical/storybook-addon-utils





# [0.31.0](https://github.com/canonical/pragma/compare/v0.30.0...v0.31.0) (2026-07-17)


### Bug Fixes

* **storybook/addon-utils:** framework-agnostic withUtilStyles — stop wrapping stories in React elements ([#846](https://github.com/canonical/pragma/issues/846)) ([f98c071](https://github.com/canonical/pragma/commit/f98c07116c2a419d2b048d304fe122c93c7b0c61)), closes [#807](https://github.com/canonical/pragma/issues/807) [#839](https://github.com/canonical/pragma/issues/839) [pre-#807](https://github.com/pre-/issues/807) [#839](https://github.com/canonical/pragma/issues/839)


### Features

* **addon-utils:** density / context / grid Storybook toolbar ([#804](https://github.com/canonical/pragma/issues/804)) ([13233b0](https://github.com/canonical/pragma/commit/13233b00c68de20c227a4f6b130707afbe7b3b15))
* **ds-global:** Cards group — shared-subgrid card layout with aligned sections ([#807](https://github.com/canonical/pragma/issues/807)) ([550fdc0](https://github.com/canonical/pragma/commit/550fdc0dd2d1877bde7836dbe0a788107e0b580b))





# [0.30.0](https://github.com/canonical/pragma/compare/v0.29.1...v0.30.0) (2026-07-14)

**Note:** Version bump only for package @canonical/storybook-addon-utils





# [0.29.0](https://github.com/canonical/pragma/compare/v0.29.0-experimental.0...v0.29.0) (2026-07-03)


### Bug Fixes

* **storybook-addon-utils:** force autodocs pages to light scheme ([#716](https://github.com/canonical/pragma/issues/716)) ([bb14644](https://github.com/canonical/pragma/commit/bb14644ab814f0a62ecb7467a587bf4b6f5e0a43))
* **storybook-addon-utils:** top-align the grid on the story root ([#714](https://github.com/canonical/pragma/issues/714)) ([b32639b](https://github.com/canonical/pragma/commit/b32639b0f1ca81fe9ad252a9b2a8de122b9f8ff9))





# [0.29.0-experimental.0](https://github.com/canonical/pragma/compare/v0.28.0...v0.29.0-experimental.0) (2026-06-24)

**Note:** Version bump only for package @canonical/storybook-addon-utils





# [0.28.0](https://github.com/canonical/pragma/compare/v0.27.1-experimental.0...v0.28.0) (2026-06-16)


### Features

* **ds-app:** side navigation plumbing ([#651](https://github.com/canonical/pragma/issues/651)) ([089e4e0](https://github.com/canonical/pragma/commit/089e4e00442387b18fc62d41eedc294656be5d9d)), closes [#649](https://github.com/canonical/pragma/issues/649) [#649](https://github.com/canonical/pragma/issues/649)
* **ds-app:** SideNavigation grouping, enhanced item & generic navigation hook ([#655](https://github.com/canonical/pragma/issues/655)) ([532fca3](https://github.com/canonical/pragma/commit/532fca339f8b3f960d739a5955ff57839515c3ea))





## [0.27.1-experimental.0](https://github.com/canonical/pragma/compare/v0.28.0-experimental.0...v0.27.1-experimental.0) (2026-05-21)


### Bug Fixes

* **release:** unblock lerna 9 publish (access via publishConfig) ([#637](https://github.com/canonical/pragma/issues/637)) ([acc1185](https://github.com/canonical/pragma/commit/acc1185b43290c1edd88da25c000f7d9494caee6))





# [0.27.0](https://github.com/canonical/pragma/compare/v0.26.0...v0.27.0) (2026-04-29)

**Note:** Version bump only for package @canonical/storybook-addon-utils





# [0.26.0](https://github.com/canonical/pragma/compare/v0.25.0...v0.26.0) (2026-04-24)

**Note:** Version bump only for package @canonical/storybook-addon-utils





# [0.25.0](https://github.com/canonical/pragma/compare/v0.24.0...v0.25.0) (2026-04-17)

**Note:** Version bump only for package @canonical/storybook-addon-utils





# [0.24.0](https://github.com/canonical/pragma/compare/v0.23.0...v0.24.0) (2026-04-13)

**Note:** Version bump only for package @canonical/storybook-addon-utils





# [0.23.0](https://github.com/canonical/pragma/compare/v0.22.1...v0.23.0) (2026-04-07)

**Note:** Version bump only for package @canonical/storybook-addon-utils





# [0.22.0](https://github.com/canonical/pragma/compare/v0.22.0-experimental.0...v0.22.0) (2026-04-03)

**Note:** Version bump only for package @canonical/storybook-addon-utils





# [0.21.0](https://github.com/canonical/pragma/compare/v0.20.1...v0.21.0) (2026-04-01)


### Features

* **form,styles,typography:** baseline grid alignment for form fields ([#571](https://github.com/canonical/pragma/issues/571)) ([2f9c5aa](https://github.com/canonical/pragma/commit/2f9c5aafbd69815867a7449d16771d3d3c729912))
* **styles:** spacing tokens, canonical borders, self-hosted fonts, addon-utils toolbar ([#552](https://github.com/canonical/pragma/issues/552)) ([b7f0adc](https://github.com/canonical/pragma/commit/b7f0adc3f83dabf95b7272ce60e01de3110706c4))





# [0.20.0](https://github.com/canonical/pragma/compare/v0.19.0...v0.20.0) (2026-03-26)

**Note:** Version bump only for package @canonical/storybook-addon-baseline-grid





# [0.19.0](https://github.com/canonical/pragma/compare/v0.18.0...v0.19.0) (2026-03-26)


### Features

* **storybook:** unified Storybook hub for all React packages ([#529](https://github.com/canonical/pragma/issues/529)) ([3a2d56c](https://github.com/canonical/pragma/commit/3a2d56cdceb43bdd5b8c4578d40283518bfce80d)), closes [#31842](https://github.com/canonical/pragma/issues/31842)


### Performance Improvements

* upgrade vite 7 → 8 (Rolldown) for ~10% faster builds ([#527](https://github.com/canonical/pragma/issues/527)) ([04ebac0](https://github.com/canonical/pragma/commit/04ebac09e2f571a611533ebf98ceba3e47fbb8f9))





# [0.18.0](https://github.com/canonical/pragma/compare/v0.17.1...v0.18.0) (2026-03-11)

**Note:** Version bump only for package @canonical/storybook-addon-baseline-grid





## [0.17.1](https://github.com/canonical/ds25/compare/v0.17.0...v0.17.1) (2026-03-04)

**Note:** Version bump only for package @canonical/storybook-addon-baseline-grid





# [0.17.0](https://github.com/canonical/ds25/compare/v0.16.0...v0.17.0) (2026-03-04)

**Note:** Version bump only for package @canonical/storybook-addon-baseline-grid





# [0.16.0](https://github.com/canonical/ds25/compare/v0.16.0-experimental.1...v0.16.0) (2026-03-03)

**Note:** Version bump only for package @canonical/storybook-addon-baseline-grid





# [0.16.0-experimental.1](https://github.com/canonical/ds25/compare/v0.16.0-experimental.0...v0.16.0-experimental.1) (2026-03-03)

**Note:** Version bump only for package @canonical/storybook-addon-baseline-grid





## [0.15.1](https://github.com/canonical/ds25/compare/v0.15.0...v0.15.1) (2026-02-23)

**Note:** Version bump only for package @canonical/storybook-addon-baseline-grid





# [0.15.0](https://github.com/canonical/ds25/compare/v0.15.0-experimental.0...v0.15.0) (2026-02-20)

**Note:** Version bump only for package @canonical/storybook-addon-baseline-grid





# [0.14.0](https://github.com/canonical/ds25/compare/v0.13.0...v0.14.0) (2026-02-16)

**Note:** Version bump only for package @canonical/storybook-addon-baseline-grid





# [0.13.0](https://github.com/canonical/ds25/compare/v0.13.0-experimental.0...v0.13.0) (2026-02-10)

**Note:** Version bump only for package @canonical/storybook-addon-baseline-grid





# [0.13.0-experimental.0](https://github.com/canonical/ds25/compare/v0.12.0...v0.13.0-experimental.0) (2026-02-10)


### Features

* **storybook:** enhance configuration for Svelte support ([#415](https://github.com/canonical/ds25/issues/415)) ([af589bd](https://github.com/canonical/ds25/commit/af589bd9e4a63a3138551b998f7f8fe8d507a023))





# [0.12.0](https://github.com/canonical/ds25/compare/v0.12.0-experimental.0...v0.12.0) (2026-02-06)

**Note:** Version bump only for package @canonical/storybook-addon-baseline-grid





# [0.12.0-experimental.0](https://github.com/canonical/ds25/compare/v0.11.0...v0.12.0-experimental.0) (2026-01-26)


### Features

* **components:** Ft components ([#393](https://github.com/canonical/ds25/issues/393)) ([abbe615](https://github.com/canonical/ds25/commit/abbe6150c52deefffb7e9e7fbfee8a3b6ffb94c6))
* **documentation:** Enhanced documentation ([#389](https://github.com/canonical/ds25/issues/389)) ([03ab19a](https://github.com/canonical/ds25/commit/03ab19aa2fbebf5ef7cd403652f6fa4627ca619e))
* **lib:** Enforces the lib folder convention, driveby global-form fixes ([#391](https://github.com/canonical/ds25/issues/391)) ([c908437](https://github.com/canonical/ds25/commit/c908437c558cb01f79c5a3df246cd25bc65542fb))





# [0.11.0](https://github.com/canonical/ds25/compare/v0.10.0-experimental.8...v0.11.0) (2026-01-18)


### Features

* Dependency updates layers 1-4 ([#381](https://github.com/canonical/ds25/issues/381)) ([e84c7a9](https://github.com/canonical/ds25/commit/e84c7a9909e3c12aa33f346ccde2e9acddf65e2f))
* Storybook 10 update ([#379](https://github.com/canonical/ds25/issues/379)) ([cc65ea6](https://github.com/canonical/ds25/commit/cc65ea6693f38a72066b711f072ded03bafceb9d))





# [0.10.0](https://github.com/canonical/ds25/compare/v0.10.0-experimental.8...v0.10.0) (2026-01-18)


### Features

* Storybook 10 update ([#379](https://github.com/canonical/ds25/issues/379)) ([cc65ea6](https://github.com/canonical/ds25/commit/cc65ea6693f38a72066b711f072ded03bafceb9d))





# [0.10.0-experimental.4](https://github.com/canonical/ds25/compare/v0.10.0-experimental.3...v0.10.0-experimental.4) (2025-09-25)

**Note:** Version bump only for package @canonical/storybook-addon-baseline-grid





# [0.10.0-experimental.3](https://github.com/canonical/ds25/compare/v0.10.0-experimental.2...v0.10.0-experimental.3) (2025-09-18)

**Note:** Version bump only for package @canonical/storybook-addon-baseline-grid





# [0.10.0-experimental.0](https://github.com/canonical/ds25/compare/v0.9.1-experimental.0...v0.10.0-experimental.0) (2025-07-30)

**Note:** Version bump only for package @canonical/storybook-addon-baseline-grid





# [0.9.0](https://github.com/canonical/ds25/compare/v0.9.0-experimental.22...v0.9.0) (2025-06-27)

**Note:** Version bump only for package @canonical/storybook-addon-baseline-grid





# [0.9.0-experimental.21](https://github.com/canonical/ds25/compare/v0.9.0-experimental.20...v0.9.0-experimental.21) (2025-06-24)


### Features

* **storybook:** Storybook addon MSW ([#255](https://github.com/canonical/ds25/issues/255)) ([08e506c](https://github.com/canonical/ds25/commit/08e506c72eb01d599ba5b2fddb66b30095305ea7))





# [0.9.0-experimental.19](https://github.com/canonical/ds25/compare/v0.9.0-experimental.18...v0.9.0-experimental.19) (2025-04-28)


### Features

* **Styles:** Extract baseline grid css styles to a "debug" styles package ([#203](https://github.com/canonical/ds25/issues/203)) ([30e69e4](https://github.com/canonical/ds25/commit/30e69e44799a1076c7c0b668ddb3b81b36b7d967))





# [0.9.0-experimental.12](https://github.com/canonical/ds25/compare/v0.9.0-experimental.11...v0.9.0-experimental.12) (2025-04-03)

**Note:** Version bump only for package @canonical/storybook-addon-baseline-grid





# [0.9.0-experimental.2](https://github.com/canonical/ds25/compare/v0.9.0-experimental.1...v0.9.0-experimental.2) (2025-02-12)


### Bug Fixes

* **storybook-baseline-grid:** Fix storybook baseline grid addon storybook not running ([#127](https://github.com/canonical/ds25/issues/127)) ([27474b3](https://github.com/canonical/ds25/commit/27474b3e13d43260309cc6dcfbea25b10819c826))





# [0.9.0-experimental.1](https://github.com/canonical/ds25/compare/v0.9.0-experimental.0...v0.9.0-experimental.1) (2025-02-07)

**Note:** Version bump only for package @canonical/storybook-addon-baseline-grid





## 0.6.0-experimental.0 (2025-02-06)




## 0.6.0-experimental.0 (2025-01-14)

* chore: version bump to 0.6.0-experimental.0 ([08cae3a](https://github.com/canonical/ds25/commit/08cae3a))
* feat: Add a font dimension extractor and programmatic nudge reader. (#26) ([e8ef975](https://github.com/canonical/ds25/commit/e8ef975)), closes [#26](https://github.com/canonical/ds25/issues/26)



## <small>0.5.1-experimental.0 (2024-12-20)</small>

* chore: version bump to 0.5.1-experimental.0 ([90f649b](https://github.com/canonical/ds25/commit/90f649b))
* Readme (#104) ([8a36ce3](https://github.com/canonical/ds25/commit/8a36ce3)), closes [#104](https://github.com/canonical/ds25/issues/104)



## 0.5.0-experimental.0 (2024-12-20)

* chore: Fix storybook addon cleanup2 (#101) ([60527ae](https://github.com/canonical/ds25/commit/60527ae)), closes [#101](https://github.com/canonical/ds25/issues/101)
* chore: storybook addon cleanup (#100) ([fa90e8f](https://github.com/canonical/ds25/commit/fa90e8f)), closes [#100](https://github.com/canonical/ds25/issues/100)
* chore: version bump to 0.5.0-experimental.0 ([df33065](https://github.com/canonical/ds25/commit/df33065))
* chore : Storybook-addon-baseline : Added css in the addon directly, made it configurable, improved d ([c33e468](https://github.com/canonical/ds25/commit/c33e468)), closes [#103](https://github.com/canonical/ds25/issues/103)
* Storybook baseline grid addon (#86) ([2c8647b](https://github.com/canonical/ds25/commit/2c8647b)), closes [#86](https://github.com/canonical/ds25/issues/86)
