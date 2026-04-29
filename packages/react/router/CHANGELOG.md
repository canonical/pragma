# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.27.0](https://github.com/canonical/pragma/compare/v0.26.0...v0.27.0) (2026-04-29)

**Note:** Version bump only for package @canonical/router-react





# [0.26.0](https://github.com/canonical/pragma/compare/v0.25.0...v0.26.0) (2026-04-24)


* feat(router)!: prefetch rename, remove data threading, Navigation API adapter (#614) ([cb3baff](https://github.com/canonical/pragma/commit/cb3baffe299c386137bcc5130de10fc6f7815c87)), closes [#614](https://github.com/canonical/pragma/issues/614)


### Features

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

**Note:** Version bump only for package @canonical/router-react





# [0.24.0](https://github.com/canonical/pragma/compare/v0.23.0...v0.24.0) (2026-04-13)

**Note:** Version bump only for package @canonical/router-react





# [0.23.0](https://github.com/canonical/pragma/compare/v0.22.1...v0.23.0) (2026-04-07)


### Features

* **router-react:** React bindings for @canonical/router-core ([#602](https://github.com/canonical/pragma/issues/602)) ([86a4089](https://github.com/canonical/pragma/commit/86a40895f9dd83e9b38c13a5501e2e54dc9b99da))
