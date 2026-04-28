# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

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
