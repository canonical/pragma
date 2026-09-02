# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.37.0](https://github.com/canonical/pragma/compare/v0.36.0...v0.37.0) (2026-09-02)

* feat(router)!: type-level truth — reject what the runtime cannot do (#1063) ([8d12c0f](https://github.com/canonical/pragma/commit/8d12c0f2bdd162d640bec393b69d4f4de6bb6da3)), closes [#1063](https://github.com/canonical/pragma/issues/1063)

### BREAKING CHANGES

* the legacy hand-rolled schema shape
  `{ "~standard": { output, validate } }` is no longer accepted — use full
  Standard Schema v1. A validator returning neither `{ value }` nor `{ issues }`
  now throws instead of passing the value through, and
  `StandardSchemaIssue.message` is required.

  Removed public types: `SchemaLike`, `StandardSchemaLike`, `StripParamModifier`,
  `UnionToIntersection`, `BuildPathFn`, `NavigateFn`, `WarmFn`, and
  `LinkBuildOptions` (use `PathBuildOptions`).

  Build-side `search` is now typed by the schema's *input* type rather than its
  output, and both `search` and `params` build values are constrained to
  serializable scalars. `NavigationIntent.search` matches.

  `useRoute`, `useSearchParam` and `useSearchParams` no longer take type
  parameters. `MemoryAdapter.getLocation()` returns `URL`, not `string | URL`.
  `setSearchParams` with an explicit `undefined` now removes the param instead
  of serializing the string "undefined".


# [0.36.0](https://github.com/canonical/pragma/compare/v0.35.0...v0.36.0) (2026-08-29)

**Note:** Version bump only for package @canonical/router-core





# [0.35.0](https://github.com/canonical/pragma/compare/v0.34.0...v0.35.0) (2026-08-28)


### Bug Fixes

* **deps:** batch package dependency updates ([#963](https://github.com/canonical/pragma/issues/963)) ([923f482](https://github.com/canonical/pragma/commit/923f4825325ecd1afc93ec9bbeca7437a4a4569f)), closes [#958](https://github.com/canonical/pragma/issues/958) [#935](https://github.com/canonical/pragma/issues/935) [#919](https://github.com/canonical/pragma/issues/919) [#918](https://github.com/canonical/pragma/issues/918) [#894](https://github.com/canonical/pragma/issues/894)
* **router:** runtime hardening — navigation adapter, async prefetch control flow, SSR status ([#965](https://github.com/canonical/pragma/issues/965)) ([bb27037](https://github.com/canonical/pragma/commit/bb27037ab4402edbc0b28b9c56a1372cb653e820))


* feat(router)!: pre-1.0 API consolidation — one constructor, adapters as the axis, block(), warm() (re-land of #973) (#981) ([416d596](https://github.com/canonical/pragma/commit/416d59636f94cafae7a9fbb0b377edabed6438bf)), closes [#973](https://github.com/canonical/pragma/issues/973) [#981](https://github.com/canonical/pragma/issues/981) [#973](https://github.com/canonical/pragma/issues/973) [#973](https://github.com/canonical/pragma/issues/973) [#973](https://github.com/canonical/pragma/issues/973)


### Features

* **boilerplate-vite:** align the reference app and overhaul the router docs (re-land of [#979](https://github.com/canonical/pragma/issues/979)) ([#990](https://github.com/canonical/pragma/issues/990)) ([8fe2792](https://github.com/canonical/pragma/commit/8fe27927613e7b5b9ff6c4c6596d6d9228063c2b))
* **router-core:** tie the Navigation API intercept handler to the router load ([#991](https://github.com/canonical/pragma/issues/991)) ([9d9fc06](https://github.com/canonical/pragma/commit/9d9fc06fe6352496ae8af2b1dd1c53f9bf707f49)), closes [#966](https://github.com/canonical/pragma/issues/966) [#966](https://github.com/canonical/pragma/issues/966)


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

**Note:** Version bump only for package @canonical/router-core





# [0.33.0](https://github.com/canonical/pragma/compare/v0.32.0...v0.33.0) (2026-07-24)

**Note:** Version bump only for package @canonical/router-core





# [0.32.0](https://github.com/canonical/pragma/compare/v0.31.0...v0.32.0) (2026-07-20)


### Features

* **router-core:** history-delegate option for the memory adapter ([#862](https://github.com/canonical/pragma/issues/862)) ([d6d74b8](https://github.com/canonical/pragma/commit/d6d74b86e783b6a85549948f28960674f0650053))





# [0.31.0](https://github.com/canonical/pragma/compare/v0.30.0...v0.31.0) (2026-07-17)

**Note:** Version bump only for package @canonical/router-core





# [0.30.0](https://github.com/canonical/pragma/compare/v0.29.1...v0.30.0) (2026-07-14)


### Features

* **router-core:** schema validation for URL params via Standard Schema v1 ([#760](https://github.com/canonical/pragma/issues/760)) ([eb6398f](https://github.com/canonical/pragma/commit/eb6398f16a91ae51f977c442a4baa50657bd2dd1))





# [0.29.0](https://github.com/canonical/pragma/compare/v0.29.0-experimental.0...v0.29.0) (2026-07-03)

**Note:** Version bump only for package @canonical/router-core





# [0.29.0-experimental.0](https://github.com/canonical/pragma/compare/v0.28.0...v0.29.0-experimental.0) (2026-06-24)

**Note:** Version bump only for package @canonical/router-core





# [0.28.0](https://github.com/canonical/pragma/compare/v0.27.1-experimental.0...v0.28.0) (2026-06-16)


### Features

* **summon-application:** add domain, route, and wrapper generators ([#626](https://github.com/canonical/pragma/issues/626)) ([6744b08](https://github.com/canonical/pragma/commit/6744b084236175b121f7aec36859976b5028a33e)), closes [#617](https://github.com/canonical/pragma/issues/617) [#643](https://github.com/canonical/pragma/issues/643)





## [0.27.1-experimental.0](https://github.com/canonical/pragma/compare/v0.28.0-experimental.0...v0.27.1-experimental.0) (2026-05-21)


### Bug Fixes

* **release:** unblock lerna 9 publish (access via publishConfig) ([#637](https://github.com/canonical/pragma/issues/637)) ([acc1185](https://github.com/canonical/pragma/commit/acc1185b43290c1edd88da25c000f7d9494caee6))





# [0.27.0](https://github.com/canonical/pragma/compare/v0.26.0...v0.27.0) (2026-04-29)

**Note:** Version bump only for package @canonical/router-core





# [0.26.0](https://github.com/canonical/pragma/compare/v0.25.0...v0.26.0) (2026-04-24)


* feat(router)!: prefetch rename, remove data threading, Navigation API adapter (#614) ([cb3baff](https://github.com/canonical/pragma/commit/cb3baffe299c386137bcc5130de10fc6f7815c87)), closes [#614](https://github.com/canonical/pragma/issues/614)


### Features

* **boilerplate-vite:** router integration with SSR, head management, and middleware ([#617](https://github.com/canonical/pragma/issues/617)) ([7a2693e](https://github.com/canonical/pragma/commit/7a2693e7e66268d7849cb1682a87288ffae30c28))
* **router:** add setSearchParams() and useBlocker() navigation blocking ([#615](https://github.com/canonical/pragma/issues/615)) ([b885b07](https://github.com/canonical/pragma/commit/b885b075b566daed741050173f892305084f2ddd))
* **router:** router factories, @canonical/react-head package, SSR docs ([#616](https://github.com/canonical/pragma/issues/616)) ([621618c](https://github.com/canonical/pragma/commit/621618c019cf4ac541eabdd2e09bbb74a87aee8a))


### BREAKING CHANGES

* Routes and wrappers use `prefetch` instead of `fetch`.
`prefetch()` is fire-and-forget — it does not return data to `content()`.
`content()` receives only `params` and `search`, no `data` prop.
Wrapper components receive only `children`, no `data` prop.
Route and wrapper `.error` properties are removed — use React error
boundaries with `StatusResponse` instead.
`routeData`, `wrapperData`, and `errorBoundary` are removed from
`RouterLoadResult` and `RouterDehydratedState`.
Wrapper data is no longer cached across sibling navigations.
`WrapperDefinition` takes one generic (`TRendered`) instead of two.

* feat(router-core): add Navigation API adapter with History API fallback

Add createNavigationAdapter using the Navigation API (Baseline Newly
Available since January 2026). Rename the existing pushState/popstate
adapter to createHistoryAdapter. The public createBrowserAdapter now
auto-detects: Navigation API when available, History API otherwise.

Both createHistoryAdapter and createNavigationAdapter are exported for
consumers who need explicit control.

* docs(router): update READMEs for prefetch rename, data ownership, and Navigation API

Update both router-core and router-react READMEs to reflect:
- fetch→prefetch rename and fire-and-forget semantics
- content() receives params and search, not data
- error handling via StatusResponse and React error boundaries (no
  router-provided error boundary component)
- data ownership: components own their data via cache libraries
- Navigation API as primary browser adapter with History fallback
- platform adapter documentation (createBrowserAdapter, createHistoryAdapter,
  createNavigationAdapter)
- SSR section updated: consumers wire their own render tree
- removed references to renderToStream convenience function

* fix(router-react): use createHistoryAdapter in createHydratedRouter

createBrowserAdapter no longer accepts a window argument (it auto-detects).
createHydratedRouter passes a custom browserWindow for testing, so it
needs createHistoryAdapter which accepts the window parameter directly.





# [0.25.0](https://github.com/canonical/pragma/compare/v0.24.0...v0.25.0) (2026-04-17)

**Note:** Version bump only for package @canonical/router-core





# [0.24.0](https://github.com/canonical/pragma/compare/v0.23.0...v0.24.0) (2026-04-13)

**Note:** Version bump only for package @canonical/router-core





# [0.23.0](https://github.com/canonical/pragma/compare/v0.22.1...v0.23.0) (2026-04-07)


### Features

* **router-core:** platform-agnostic router with typed navigation and SSR ([#601](https://github.com/canonical/pragma/issues/601)) ([ee26e29](https://github.com/canonical/pragma/commit/ee26e294fc255e8ea27767abd0f2663c11c0ee70))
