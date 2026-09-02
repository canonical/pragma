# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.37.0](https://github.com/canonical/pragma/compare/v0.36.0...v0.37.0) (2026-09-02)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.36.0](https://github.com/canonical/pragma/compare/v0.35.0...v0.36.0) (2026-08-29)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.35.0](https://github.com/canonical/pragma/compare/v0.34.0...v0.35.0) (2026-08-28)


### Bug Fixes

* **boilerplate,summon-application:** declare the root surface classes ([#1001](https://github.com/canonical/pragma/issues/1001)) ([73ba2f1](https://github.com/canonical/pragma/commit/73ba2f136862e0b4609df5f4346fd55233dabee9))
* **deps:** batch package dependency updates ([#963](https://github.com/canonical/pragma/issues/963)) ([923f482](https://github.com/canonical/pragma/commit/923f4825325ecd1afc93ec9bbeca7437a4a4569f)), closes [#958](https://github.com/canonical/pragma/issues/958) [#935](https://github.com/canonical/pragma/issues/935) [#919](https://github.com/canonical/pragma/issues/919) [#918](https://github.com/canonical/pragma/issues/918) [#894](https://github.com/canonical/pragma/issues/894)


* feat(router)!: pre-1.0 API consolidation — one constructor, adapters as the axis, block(), warm() (re-land of #973) (#981) ([416d596](https://github.com/canonical/pragma/commit/416d59636f94cafae7a9fbb0b377edabed6438bf)), closes [#973](https://github.com/canonical/pragma/issues/973) [#981](https://github.com/canonical/pragma/issues/981) [#973](https://github.com/canonical/pragma/issues/973) [#973](https://github.com/canonical/pragma/issues/973) [#973](https://github.com/canonical/pragma/issues/973)


### Features

* **boilerplate-vite:** align the reference app and overhaul the router docs (re-land of [#979](https://github.com/canonical/pragma/issues/979)) ([#990](https://github.com/canonical/pragma/issues/990)) ([8fe2792](https://github.com/canonical/pragma/commit/8fe27927613e7b5b9ff6c4c6596d6d9228063c2b))
* **boilerplate-vite:** serialize Relay data across the SSR boundary ([#993](https://github.com/canonical/pragma/issues/993)) ([d4ad306](https://github.com/canonical/pragma/commit/d4ad3063de8560a6f700aa760e345f8bcb311398)), closes [#968](https://github.com/canonical/pragma/issues/968)
* **summon-application:** port the i18n feature to the templates behind an --intl flag ([#992](https://github.com/canonical/pragma/issues/992)) ([d0117b9](https://github.com/canonical/pragma/commit/d0117b9bc671f1d8ec7d080c0d5cf137a8d451f9))


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

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.33.0](https://github.com/canonical/pragma/compare/v0.32.0...v0.33.0) (2026-07-24)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.32.0](https://github.com/canonical/pragma/compare/v0.31.0...v0.32.0) (2026-07-20)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.31.0](https://github.com/canonical/pragma/compare/v0.30.0...v0.31.0) (2026-07-17)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.30.0](https://github.com/canonical/pragma/compare/v0.29.1...v0.30.0) (2026-07-14)


### Features

* **boilerplate:** app-level CSS compilation via Lightning CSS + declared browser floor ([#769](https://github.com/canonical/pragma/issues/769)) ([98281ba](https://github.com/canonical/pragma/commit/98281bace083fd841af0d52c0baf37bc2dd77fd1))
* **ds-global:** overlay components — Tooltip, Popover, ContextualMenu (+ submenus, logical placement, RTL) ([#731](https://github.com/canonical/pragma/issues/731)) ([4012a46](https://github.com/canonical/pragma/commit/4012a4630e18c02759a154232baec33850902916)), closes [#89](https://github.com/canonical/pragma/issues/89) [post-#745](https://github.com/post-/issues/745) [#745](https://github.com/canonical/pragma/issues/745)
* **i18n-core:** native-Intl framework-agnostic i18n core ([#684](https://github.com/canonical/pragma/issues/684)) ([62f3f36](https://github.com/canonical/pragma/commit/62f3f36fed5f689ae72ff66a600a5ca5daecdf8c))
* **react-boilerplate-vite:** Relay data layer (CSR) with local mock schema and storybook mocking ([#751](https://github.com/canonical/pragma/issues/751)) ([15c918c](https://github.com/canonical/pragma/commit/15c918c2939447b675ce6854ec3f6e2a5c02cd03))
* **react-boilerplate-vite:** working multi-language messages via @canonical/i18n-react ([#752](https://github.com/canonical/pragma/issues/752)) ([b16e17f](https://github.com/canonical/pragma/commit/b16e17f82d67bc55887142f6b675d820a94978c8))
* **router-core:** schema validation for URL params via Standard Schema v1 ([#760](https://github.com/canonical/pragma/issues/760)) ([eb6398f](https://github.com/canonical/pragma/commit/eb6398f16a91ae51f977c442a4baa50657bd2dd1))





## [0.29.1](https://github.com/canonical/pragma/compare/v0.29.0...v0.29.1) (2026-07-03)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.29.0](https://github.com/canonical/pragma/compare/v0.29.0-experimental.0...v0.29.0) (2026-07-03)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.29.0-experimental.0](https://github.com/canonical/pragma/compare/v0.28.0...v0.29.0-experimental.0) (2026-06-24)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.28.0](https://github.com/canonical/pragma/compare/v0.27.1-experimental.0...v0.28.0) (2026-06-16)


### Bug Fixes

* **react-ssr:** serve dev SSR assets and resolve module-only deps (viteFetchMiddleware) ([#648](https://github.com/canonical/pragma/issues/648)) ([662783d](https://github.com/canonical/pragma/commit/662783d6d4da18039d9a04e42bd118e1ad161815))


### Features

* **react-hooks:** SSR theme wiring + Lighthouse-100 boilerplate ([#652](https://github.com/canonical/pragma/issues/652)) ([dd61a4d](https://github.com/canonical/pragma/commit/dd61a4d45f9e868a53b80ae0c77c029e13fede47))
* **react-ssr:** compiled preview SSR path + 2x3 server matrix ([#650](https://github.com/canonical/pragma/issues/650)) ([b490591](https://github.com/canonical/pragma/commit/b490591e863c1d09d2b4b9b3d7eed1a2e467aaf2))
* **summon-application:** add domain, route, and wrapper generators ([#626](https://github.com/canonical/pragma/issues/626)) ([6744b08](https://github.com/canonical/pragma/commit/6744b084236175b121f7aec36859976b5028a33e)), closes [#617](https://github.com/canonical/pragma/issues/617) [#643](https://github.com/canonical/pragma/issues/643)





## [0.27.1-experimental.0](https://github.com/canonical/pragma/compare/v0.28.0-experimental.0...v0.27.1-experimental.0) (2026-05-21)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.27.0](https://github.com/canonical/pragma/compare/v0.26.0...v0.27.0) (2026-04-29)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.26.0](https://github.com/canonical/pragma/compare/v0.25.0...v0.26.0) (2026-04-24)


### Features

* **boilerplate-vite:** router integration with SSR, head management, and middleware ([#617](https://github.com/canonical/pragma/issues/617)) ([7a2693e](https://github.com/canonical/pragma/commit/7a2693e7e66268d7849cb1682a87288ffae30c28))





# [0.25.0](https://github.com/canonical/pragma/compare/v0.24.0...v0.25.0) (2026-04-17)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.24.0](https://github.com/canonical/pragma/compare/v0.23.0...v0.24.0) (2026-04-13)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.23.0](https://github.com/canonical/pragma/compare/v0.22.1...v0.23.0) (2026-04-07)


### Features

* **react-ssr:** decouple renderers from HTTP, add web streams + sitemap ([#593](https://github.com/canonical/pragma/issues/593)) ([9050feb](https://github.com/canonical/pragma/commit/9050feb55484fad8f9035f0b2ca4fffa7592f7e3))


### BREAKING CHANGES

* **react-ssr:** renderToStream renamed to renderToPipeableStream,
render methods return content instead of writing to res,
serveStream/serveString accept factory functions.

* fix: regenerate bun.lock for updated dependencies

The lockfile was committed from a stale state before dependency changes
(domhandler removed, express moved to peerDependencies, vitest added).

* fix(demo, boilerplate-vite): migrate SSR consumers to new renderer API

- serveStream now takes a factory (req) => Renderer
- renderToStream renamed to renderToPipeableStream
- Renderer constructed per-request via createRenderer factory

* fix(demo, boilerplate-vite): fix biome formatting (tabs → spaces)





# [0.22.0](https://github.com/canonical/pragma/compare/v0.22.0-experimental.0...v0.22.0) (2026-04-03)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.21.0](https://github.com/canonical/pragma/compare/v0.20.1...v0.21.0) (2026-04-01)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.20.0](https://github.com/canonical/pragma/compare/v0.19.0...v0.20.0) (2026-03-26)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.19.0](https://github.com/canonical/pragma/compare/v0.18.0...v0.19.0) (2026-03-26)


### Bug Fixes

* **ci:** add missing build step to push workflow, replace workspace: protocol ([#521](https://github.com/canonical/pragma/issues/521)) ([0e88312](https://github.com/canonical/pragma/commit/0e883120c96034d180de0ebdde6e9740d97609fe)), closes [#512](https://github.com/canonical/pragma/issues/512)


### Features

* **storybook:** unified Storybook hub for all React packages ([#529](https://github.com/canonical/pragma/issues/529)) ([3a2d56c](https://github.com/canonical/pragma/commit/3a2d56cdceb43bdd5b8c4578d40283518bfce80d)), closes [#31842](https://github.com/canonical/pragma/issues/31842)


### Performance Improvements

* upgrade vite 7 → 8 (Rolldown) for ~10% faster builds ([#527](https://github.com/canonical/pragma/issues/527)) ([04ebac0](https://github.com/canonical/pragma/commit/04ebac09e2f571a611533ebf98ceba3e47fbb8f9))





# [0.18.0](https://github.com/canonical/pragma/compare/v0.17.1...v0.18.0) (2026-03-11)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





## [0.17.1](https://github.com/canonical/pragma/compare/v0.17.0...v0.17.1) (2026-03-04)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.17.0](https://github.com/canonical/pragma/compare/v0.16.0...v0.17.0) (2026-03-04)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.16.0](https://github.com/canonical/pragma/compare/v0.16.0-experimental.1...v0.16.0) (2026-03-03)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.16.0-experimental.1](https://github.com/canonical/pragma/compare/v0.16.0-experimental.0...v0.16.0-experimental.1) (2026-03-03)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





## [0.15.1](https://github.com/canonical/pragma/compare/v0.15.0...v0.15.1) (2026-02-23)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.15.0](https://github.com/canonical/pragma/compare/v0.15.0-experimental.0...v0.15.0) (2026-02-20)


### Features

* **react/ssr:** add StringRenderer and some refactoring ([#411](https://github.com/canonical/pragma/issues/411)) ([fede428](https://github.com/canonical/pragma/commit/fede428fcf7a5bf5b90c9b1ff59482af04a2c287))





# [0.15.0-experimental.0](https://github.com/canonical/pragma/compare/v0.14.0...v0.15.0-experimental.0) (2026-02-17)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.14.0](https://github.com/canonical/pragma/compare/v0.13.0...v0.14.0) (2026-02-16)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.13.0](https://github.com/canonical/pragma/compare/v0.13.0-experimental.0...v0.13.0) (2026-02-10)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.13.0-experimental.0](https://github.com/canonical/pragma/compare/v0.12.0...v0.13.0-experimental.0) (2026-02-10)


### Features

* **storybook:** enhance configuration for Svelte support ([#415](https://github.com/canonical/pragma/issues/415)) ([af589bd](https://github.com/canonical/pragma/commit/af589bd9e4a63a3138551b998f7f8fe8d507a023))





# [0.12.0](https://github.com/canonical/pragma/compare/v0.12.0-experimental.0...v0.12.0) (2026-02-06)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.12.0-experimental.0](https://github.com/canonical/pragma/compare/v0.11.0...v0.12.0-experimental.0) (2026-01-26)


### Features

* **components:** Ft components ([#393](https://github.com/canonical/pragma/issues/393)) ([abbe615](https://github.com/canonical/pragma/commit/abbe6150c52deefffb7e9e7fbfee8a3b6ffb94c6))





# [0.11.0](https://github.com/canonical/pragma/compare/v0.10.0-experimental.8...v0.11.0) (2026-01-18)


### Features

* Dependency updates layers 1-4 ([#381](https://github.com/canonical/pragma/issues/381)) ([e84c7a9](https://github.com/canonical/pragma/commit/e84c7a9909e3c12aa33f346ccde2e9acddf65e2f))
* Storybook 10 update ([#379](https://github.com/canonical/pragma/issues/379)) ([cc65ea6](https://github.com/canonical/pragma/commit/cc65ea6693f38a72066b711f072ded03bafceb9d))





# [0.10.0](https://github.com/canonical/pragma/compare/v0.10.0-experimental.8...v0.10.0) (2026-01-18)


### Features

* Storybook 10 update ([#379](https://github.com/canonical/pragma/issues/379)) ([cc65ea6](https://github.com/canonical/pragma/commit/cc65ea6693f38a72066b711f072ded03bafceb9d))





# [0.10.0-experimental.8](https://github.com/canonical/pragma/compare/v0.10.0-experimental.7...v0.10.0-experimental.8) (2025-12-04)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.10.0-experimental.7](https://github.com/canonical/pragma/compare/v0.10.0-experimental.6...v0.10.0-experimental.7) (2025-12-03)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.10.0-experimental.6](https://github.com/canonical/pragma/compare/v0.10.0-experimental.5...v0.10.0-experimental.6) (2025-11-24)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.10.0-experimental.5](https://github.com/canonical/pragma/compare/v0.10.0-experimental.4...v0.10.0-experimental.5) (2025-10-17)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.10.0-experimental.4](https://github.com/canonical/pragma/compare/v0.10.0-experimental.3...v0.10.0-experimental.4) (2025-09-25)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.10.0-experimental.3](https://github.com/canonical/pragma/compare/v0.10.0-experimental.2...v0.10.0-experimental.3) (2025-09-18)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.10.0-experimental.0](https://github.com/canonical/pragma/compare/v0.9.1-experimental.0...v0.10.0-experimental.0) (2025-07-30)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.9.0](https://github.com/canonical/pragma/compare/v0.9.0-experimental.22...v0.9.0) (2025-06-27)


### Bug Fixes

* Fix implciit dependencies ([#276](https://github.com/canonical/pragma/issues/276)) ([a1b007c](https://github.com/canonical/pragma/commit/a1b007c0d6ab26318c745e48f250a0c0c30a0716))





# [0.9.0-experimental.22](https://github.com/canonical/pragma/compare/v0.9.0-experimental.21...v0.9.0-experimental.22) (2025-06-26)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.9.0-experimental.21](https://github.com/canonical/pragma/compare/v0.9.0-experimental.20...v0.9.0-experimental.21) (2025-06-24)


### Bug Fixes

* **deps:** update storybook monorepo to v9 (major) ([#242](https://github.com/canonical/pragma/issues/242)) ([3bbdb4b](https://github.com/canonical/pragma/commit/3bbdb4b9299565f84081fe882d9a2fd85197b8ee))


### Features

* **ds-core-form:** Middleware examples, MSW, Stories ([#225](https://github.com/canonical/pragma/issues/225)) ([301cbb8](https://github.com/canonical/pragma/commit/301cbb8256531b5ee8ff4a7d0359dd317a6d430f))





# [0.9.0-experimental.20](https://github.com/canonical/ds25/compare/v0.9.0-experimental.19...v0.9.0-experimental.20) (2025-05-05)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.9.0-experimental.19](https://github.com/canonical/ds25/compare/v0.9.0-experimental.18...v0.9.0-experimental.19) (2025-04-28)


### Features

* **React Core:** Button uses `children` instead of `label` for contents ([#214](https://github.com/canonical/ds25/issues/214)) ([f31bbed](https://github.com/canonical/ds25/commit/f31bbed41ca6f3945ee1ac18da7e4068b1f2bd59))
* **Styles:** Extract baseline grid css styles to a "debug" styles package ([#203](https://github.com/canonical/ds25/issues/203)) ([30e69e4](https://github.com/canonical/ds25/commit/30e69e44799a1076c7c0b668ddb3b81b36b7d967))





# [0.9.0-experimental.13](https://github.com/canonical/ds25/compare/v0.9.0-experimental.12...v0.9.0-experimental.13) (2025-04-04)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.9.0-experimental.12](https://github.com/canonical/ds25/compare/v0.9.0-experimental.11...v0.9.0-experimental.12) (2025-04-03)


### Features

* **boilerplate:** Add storybook ([#162](https://github.com/canonical/ds25/issues/162)) ([db1fb76](https://github.com/canonical/ds25/commit/db1fb7693a48fe076ac11c52e1068845f457216e))





# [0.9.0-experimental.11](https://github.com/canonical/ds25/compare/v0.9.0-experimental.10...v0.9.0-experimental.11) (2025-03-20)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.9.0-experimental.10](https://github.com/canonical/ds25/compare/v0.9.0-experimental.9...v0.9.0-experimental.10) (2025-03-19)


### Bug Fixes

* **React Core:** UseWindowDimension is SSR-safe ([#156](https://github.com/canonical/ds25/issues/156)) ([db3c446](https://github.com/canonical/ds25/commit/db3c446cbc2dac3687d44ed5f0061c4449e18115))





# [0.9.0-experimental.9](https://github.com/canonical/ds25/compare/v0.9.0-experimental.8...v0.9.0-experimental.9) (2025-03-12)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.9.0-experimental.5](https://github.com/canonical/ds25/compare/v0.9.0-experimental.4...v0.9.0-experimental.5) (2025-03-10)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.9.0-experimental.4](https://github.com/canonical/ds25/compare/v0.9.0-experimental.3...v0.9.0-experimental.4) (2025-02-17)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.9.0-experimental.2](https://github.com/canonical/ds25/compare/v0.9.0-experimental.1...v0.9.0-experimental.2) (2025-02-12)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.9.0-experimental.1](https://github.com/canonical/ds25/compare/v0.9.0-experimental.0...v0.9.0-experimental.1) (2025-02-07)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





## 0.9.0-experimental.0 (2025-02-06)

* chore: version bump to 0.9.0-experimental.0 ([5d06233](https://github.com/canonical/ds25/commit/5d06233))



## <small>0.8.1-experimental.0 (2025-02-04)</small>

* chore: version bump to 0.8.1-experimental.0 ([a3b4f8a](https://github.com/canonical/ds25/commit/a3b4f8a))



## <small>0.7.1-experimental.0 (2025-01-17)</small>

* chore: version bump to 0.7.1-experimental.0 ([636cd2e](https://github.com/canonical/ds25/commit/636cd2e))
* Fix: minor monorepo improvements (#111) ([7607ee8](https://github.com/canonical/ds25/commit/7607ee8)), closes [#111](https://github.com/canonical/ds25/issues/111)
