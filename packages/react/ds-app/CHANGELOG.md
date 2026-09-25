# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.41.0](https://github.com/canonical/pragma/compare/v0.40.0...v0.41.0) (2026-09-25)

### Bug Fixes

* **styles:** make the responsive grid 16 columns on desktop ([#1358](https://github.com/canonical/pragma/issues/1358)) ([4a58572](https://github.com/canonical/pragma/commit/4a58572a7a9bed8f1bb3c5f47ce1c4b269e8db63))


# [0.40.0](https://github.com/canonical/pragma/compare/v0.39.0...v0.40.0) (2026-09-20)

* refactor!: answer the SideNavigation stack's review threads (#1285) ([57096e6](https://github.com/canonical/pragma/commit/57096e694b18cbbacf74819a1465e0609f019e3d)), closes [#1285](https://github.com/canonical/pragma/issues/1285)

### Bug Fixes

* **ds-app:** harden the SideNavigation rail-collapse behaviour ([#1228](https://github.com/canonical/pragma/issues/1228)) ([f3d6279](https://github.com/canonical/pragma/commit/f3d6279676ad07ed230dff86f95a829a9f08beda)), closes [#1227](https://github.com/canonical/pragma/issues/1227) [#main-content](https://github.com/canonical/pragma/issues/main-content)
* **ds-app:** render non-action footer rows as labels and stabilise element keys ([#1229](https://github.com/canonical/pragma/issues/1229)) ([0bebcd2](https://github.com/canonical/pragma/commit/0bebcd21042fd51ad84de92d494f16923aa0d3cb)), closes [canonical/pragma#1208](https://github.com/canonical/pragma/issues/1208) [#1208](https://github.com/canonical/pragma/issues/1208)

### BREAKING CHANGES

* pass the trigger content as ContextualMenu's children
  (`<ContextualMenu items={…}>Actions</ContextualMenu>`) instead of the
  `trigger` prop.

  * refactor(ds-app): restructure ContextSwitcher around a real wrapper element

  The component returned a Fragment pairing an optional GroupHeader with
  the ContextualMenu — a root a consumer cannot address (no className, id,
  or data attribute lands anywhere). The root is now the component's own
  wrapper div carrying the DS class and the spread rest props; the
  caption and the dropdown field are its children.

  One renderer now serves both entry shapes (a context and the
  create-context action), branching on renderLabel — the second
  single-use content component folds away, and with it the
  create-context row's layout moves onto a class only this component's
  renderer emits (.create-context), replacing the surface-scoped selector
  the surfaceClassName removal had orphaned.

  The ContextualMenu passthrough props (open/onOpenChange/positioning)
  are forwarded explicitly now that the rest spread lands on the wrapper,
  and the dropdown's default max width stays the rail width minus its
  row insets, overridable per instance.

  * refactor(ds-app): let ItemExpandable's details element own its open state

  The disclosure mirrored <details>'s native state into React and drove
  the attribute back — a controlled circuit around an element that
  already manages itself, with a toggle handler whose only job was to
  keep the mirror in step. The element is now uncontrolled: the open
  attribute is seeded from a mount-only snapshot of defaultExpanded
  (SSR renders it, and a seed flipping back to false never force-closes
  an open branch), and the two behaviours that genuinely need JS reach
  the DOM through a ref instead of state — the one-way re-open when
  navigation makes this branch the selected one, and the footer's
  collapse-on-child-activation. Every existing behaviour test passes
  unchanged.

  * refactor(ds-app): move useCollapseShortcut into its domain and default-export it

  The hook lived under common/hooks — a grab-bag nesting level below the
  component it serves. It moves to SideNavigation/hooks/useCollapseShortcut,
  the hooks folder of its domain, where the code standards place custom
  hooks.

  The module now has a single default export (the hook); COLLAPSE_SHORTCUT
  was its only other consumer-facing name and is single-use, so it stays
  as an unexported module constant. The boolean gate renames from
  `enabled` to `condition` — the prop names the state it represents
  (the keyboardShortcut prop SideNavigation feeds it), not a bare
  on/off switch.

  * chore(ds-app): trim the vitest setup's ResizeObserver comment

  * chore(deps): regenerate the lockfile after the 0.39.0 bump

  ---------
* **ds-app:** SideNavigation's entire subcomponent surface changes —
  there are no dot-static or named exports; the sidebar is consumed
  data-only via root/footerRoot/contextSwitcher props, and the region and
  row components render exclusively from that data.

  - One navigation landmark: the root is a plain <div>; Content's <nav> is
    the component's single navigation landmark (aria-label forwarded,
    default "Main navigation") — branding, the context switcher and the
    footer's actions sit outside it by design.
  - A visually hidden "Skip to main content" link is the first focusable
    element in the DOM order (target via skipTo, default #main-content).
  - Four regions, all data-driven: Header (branding + collapse toggle), an
    optional ContextSwitcher region (typed contextSwitcher props — a
    role="menu" select-like widget is not navigation, so it renders in
    its own plain-<div> region between Header and Content, outside the
    landmark, and hides when the rail collapses), Content (the landmark;
    links, plain labels and expandable disclosures only) and Footer
    (free-form rows through footerRoot).
  - Strict content vocabulary: interactive action rows belong to the
    Footer, so the landmark's contents always read as destinations. There
    is no JSX escape hatch — the API carries no children props.
  - Footer vocabulary mirrors the content tree's type split: free-form
    leaves (LeafFooterItem — label required, optional icon/url/control/
    slot; action rows via control: "button" + onClick flow through data)
    and depth-1 expandables (ExpandableFooterItem). Leaf rows render as
    links (active when matching the current location, LinkComponent
    integrated); action rows render as buttons.
  - Rail state keys off data-expanded on the root — the single source of
    truth. Collapsed: Content and the switcher region hide, the footer
    degrades to icon-only, and any rendered ItemExpandable discloses its
    sub-items into a floating popover on the inline-end with visible
    labels. Where CSS anchor positioning is supported (Baseline 2026),
    position-try-fallbacks flips the popover above its trigger on viewport
    overflow — browser-measured, plus the mirrored 0.5rem gap; otherwise
    it stays top-anchored. Native <details> throughout: no Esc-close or
    outside-click dismissal by design, Tab navigation stays viable.
  - A nested sub-item whose url becomes active re-opens its collapsed
    parent (one-way: manual collapse is respected, never auto-closed) and
    carries data-active + aria-current under the expanded parent.
  - The rail-collapse shortcut is Ctrl+B, opt-in via keyboardShortcut and
    off by default (pending approval).
  - The sidenav architecture tokens are declared on the component's own
    stylesheet (rail widths, logo sizing, the unified 0.5rem row inset,
    the row-background channel), with motion-token durations.
  - Storybook: data-driven MAAS/LXD stories; a practical
    "with ContextSwitcher" story routes url'd contexts through the hash
    router and shows both ItemExpandable flavours side by side; all root
    fixtures live in storybook/navigation/fixtures.tsx.


# [0.39.0](https://github.com/canonical/pragma/compare/v0.38.0...v0.39.0) (2026-09-18)

* feat(ds-app)!: rebuild SideNavigation into a single data-driven region shell (#1227), closes [#1227](https://github.com/canonical/pragma/issues/1227) [#main-content](https://github.com/canonical/pragma/issues/main-content)

### Features

* **ds-app:** add SideNavigation's data-driven subcomponents ([#1234](https://github.com/canonical/pragma/issues/1234)) ([78c2314](https://github.com/canonical/pragma/commit/78c23146a723c5a2e39649988634885139264127))

### BREAKING CHANGES

* SideNavigation's entire subcomponent surface changes —
  there are no dot-static or named exports; the sidebar is consumed
  data-only via root/footerRoot/contextSwitcher props, and the region and
  row components render exclusively from that data.

  - One navigation landmark: the root is a plain <div>; Content's <nav> is
    the component's single navigation landmark (aria-label forwarded,
    default "Main navigation") — branding, the context switcher and the
    footer's actions sit outside it by design.
  - A visually hidden "Skip to main content" link is the first focusable
    element in the DOM order (target via skipTo, default #main-content).
  - Four regions, all data-driven: Header (branding + collapse toggle), an
    optional ContextSwitcher region (typed contextSwitcher props — a
    role="menu" select-like widget is not navigation, so it renders in
    its own plain-<div> region between Header and Content, outside the
    landmark, and hides when the rail collapses), Content (the landmark;
    links, plain labels and expandable disclosures only) and Footer
    (free-form rows through footerRoot).
  - Strict content vocabulary: interactive action rows belong to the
    Footer, so the landmark's contents always read as destinations. There
    is no JSX escape hatch — the API carries no children props.
  - Footer vocabulary mirrors the content tree's type split: free-form
    leaves (LeafFooterItem — label required, optional icon/url/control/
    slot; action rows via control: "button" + onClick flow through data)
    and depth-1 expandables (ExpandableFooterItem). Leaf rows render as
    links (active when matching the current location, LinkComponent
    integrated); action rows render as buttons.
  - Rail state keys off data-expanded on the root — the single source of
    truth. Collapsed: Content and the switcher region hide, the footer
    degrades to icon-only, and any rendered ItemExpandable discloses its
    sub-items into a floating popover on the inline-end with visible
    labels. Where CSS anchor positioning is supported (Baseline 2026),
    position-try-fallbacks flips the popover above its trigger on viewport
    overflow — browser-measured, plus the mirrored 0.5rem gap; otherwise
    it stays top-anchored. Native <details> throughout: no Esc-close or
    outside-click dismissal by design, Tab navigation stays viable.
  - A nested sub-item whose url becomes active re-opens its collapsed
    parent (one-way: manual collapse is respected, never auto-closed) and
    carries data-active + aria-current under the expanded parent.
  - The rail-collapse shortcut is Ctrl+B, opt-in via keyboardShortcut and
    off by default (pending approval).
  - The sidenav architecture tokens are declared on the component's own
    stylesheet (rail widths, logo sizing, the unified 0.5rem row inset,
    the row-background channel), with motion-token durations.
  - Storybook: data-driven MAAS/LXD stories; a practical
    "with ContextSwitcher" story routes url'd contexts through the hash
    router and shows both ItemExpandable flavours side by side; all root
    fixtures live in storybook/navigation/fixtures.tsx.


# [0.38.0](https://github.com/canonical/pragma/compare/v0.37.0...v0.38.0) (2026-09-16)

* refactor(ds-app)!: wrap the application-tier stylesheets the first four forges missed (#1133) ([eaaa63d](https://github.com/canonical/pragma/commit/eaaa63d2cef38637dabecf17b92642a16223a01d)), closes [#1133](https://github.com/canonical/pragma/issues/1133) [canonical/pragma#1122](https://github.com/canonical/pragma/issues/1122) [#1123](https://github.com/canonical/pragma/issues/1123) [#1127](https://github.com/canonical/pragma/issues/1127) [#1122](https://github.com/canonical/pragma/issues/1122) [canonical/pragma#1122](https://github.com/canonical/pragma/issues/1122) [#1120](https://github.com/canonical/pragma/issues/1120)
* refactor(utils)!: move navigation, debounce and throttle to @canonical/ds-utils (#1109), closes [#1109](https://github.com/canonical/pragma/issues/1109)
* refactor(ds-types)!: require a key or url on the navigation item (#1142) ([cb7f3b4](https://github.com/canonical/pragma/commit/cb7f3b4c07d56eb543d34aaf53ce6f44f2821dd8)), closes [#1142](https://github.com/canonical/pragma/issues/1142)

### Bug Fixes

* **deps:** update canonical to v0.10.0 ([#894](https://github.com/canonical/pragma/issues/894)) ([34a1bb9](https://github.com/canonical/pragma/commit/34a1bb987de4677a83c6f6da3a1521f8d26d18ad))

### BREAKING CHANGES

* @canonical/utils no longer exports debounce, throttle,
  humanizeNumber, pluralize, the HumanizeNumberOptions, HumanizeResult and
  PluralizeOptions types, the AllOrNone type, or any navigation export —
  annotateTree, createNavigationReducer, findAncestorPath,
  getFirstInteractiveChild, getItemId, getLastInteractiveChild, getParentItem,
  isInteractive, prepareIndex, resolveOrientation, NavigationActionType, and the
  NavigationAction, NavigationReducerOptions, NavigationState, NodeStatus,
  Orientation and OrientationConfig types. They are now exported, unchanged, from
  @canonical/ds-utils. Consumers change the import specifier and add
  @canonical/ds-utils as a dependency; no call site changes.
* `Item` requires a `key` or a `url`. Items with neither
  no longer type-check — give a navigable item its `url` and a
  non-navigable one a `key`. Types built on `Item` must use
  `type X = Item & { … }` rather than `interface X extends Item`, and
  `_DistributiveOmit<Item, K>` rather than `Omit<Item, K>`.
  `MenuSeparator.key` is required: write `{ type: "separator", key: "…" }`.
* An application must add `ds` to its root, beside the context
  and density classes it already carries — `<html class="ds app comfortable">`.
  Without it the reset applies nowhere, because it is now confined to the marked
  subtree, and the page's text falls back to the browser's defaults. Components
  are unaffected: each carries `ds` on its own root. Two further consequences: an
  application's unlayered CSS now beats every rule this package ships, where
  before it competed with unlayered rules by source order, so an override that
  used to lose now wins and one that used to win still does; and `normalize.css`
  is no longer a transitive dependency, so an application that was relying on the
  parts of it this package does not use must depend on it directly. To keep the
  layer order in force for your own CSS, put it in a layer of your own above
  ds.components.app — the README's "Migrating to the layered release" section has the
  statement to copy.
* An application's own unlayered CSS now beats every rule
  @canonical/react-ds-app and @canonical/svelte-ds-app ship, whatever the
  selectors on either side, because an unlayered author rule outranks every
  layered one. Before, an application override competed with these stylesheets by
  specificity and source order, so an override that used to lose now wins; one
  that used to win still does. An application that does not want to win by
  accident puts its CSS in a layer — `@layer app`, which is where the summon
  application template now puts a generated application's own stylesheets.
  Separately, an application tier's rule for a component now beats the matching
  global package's by cascade layer instead of by load order. Neither of these two
  packages collides with its global tier today, so no rule changes hands on this
  release.
* The cascade layer these two packages write into is renamed
  from `ds.components.app` to `ds.components.apps`. An application that names
  pragma's component layers in its own order statement, or that writes a rule
  into `ds.components.app` to sit beside them, has to use the new name. The
  layer's position is unchanged — above `ds.components.global`, below the
  consumer's own `app` layer — so nothing computes differently.


# [0.37.0](https://github.com/canonical/pragma/compare/v0.36.0...v0.37.0) (2026-09-02)

### Bug Fixes

* **storybook-addon-utils:** render the story inside the router provider, not into its children ([#1079](https://github.com/canonical/pragma/issues/1079)) ([6b1401c](https://github.com/canonical/pragma/commit/6b1401c96340e8a2afd9dccf6da63a46714bee9d)), closes [#996](https://github.com/canonical/pragma/issues/996) [#961](https://github.com/canonical/pragma/issues/961)


# [0.36.0](https://github.com/canonical/pragma/compare/v0.35.0...v0.36.0) (2026-08-29)

**Note:** Version bump only for package @canonical/react-ds-app





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

**Note:** Version bump only for package @canonical/react-ds-app





# [0.33.0](https://github.com/canonical/pragma/compare/v0.32.0...v0.33.0) (2026-07-24)

**Note:** Version bump only for package @canonical/react-ds-app





# [0.32.0](https://github.com/canonical/pragma/compare/v0.31.0...v0.32.0) (2026-07-20)

**Note:** Version bump only for package @canonical/react-ds-app





# [0.31.0](https://github.com/canonical/pragma/compare/v0.30.0...v0.31.0) (2026-07-17)

**Note:** Version bump only for package @canonical/react-ds-app





# [0.30.0](https://github.com/canonical/pragma/compare/v0.29.1...v0.30.0) (2026-07-14)


### Bug Fixes

* **deps:** unify @canonical/design-tokens pin to 0.6.2-contrasted.0 ([#748](https://github.com/canonical/pragma/issues/748)) ([cf607d7](https://github.com/canonical/pragma/commit/cf607d7ae40f8044208e1e502c8d92178261e73c)), closes [#731](https://github.com/canonical/pragma/issues/731) [#89](https://github.com/canonical/pragma/issues/89)


### Features

* **ds-global:** add navigational Tabs + hoist shared LinkComponentProps ([#730](https://github.com/canonical/pragma/issues/730)) ([7f8937c](https://github.com/canonical/pragma/commit/7f8937cb242d47ba8fcc4aaa87c7d3d47a9e43df)), closes [#17](https://github.com/canonical/pragma/issues/17)





## [0.29.1](https://github.com/canonical/pragma/compare/v0.29.0...v0.29.1) (2026-07-03)

**Note:** Version bump only for package @canonical/react-ds-app





# [0.29.0](https://github.com/canonical/pragma/compare/v0.29.0-experimental.0...v0.29.0) (2026-07-03)

**Note:** Version bump only for package @canonical/react-ds-app





# [0.29.0-experimental.0](https://github.com/canonical/pragma/compare/v0.28.0...v0.29.0-experimental.0) (2026-06-24)

**Note:** Version bump only for package @canonical/react-ds-app





# [0.28.0](https://github.com/canonical/pragma/compare/v0.27.1-experimental.0...v0.28.0) (2026-06-16)


### Features

* **ds-app:** ApplicationLayout, ViewLayout, ContentLayout ([#656](https://github.com/canonical/pragma/issues/656)) ([b2f854a](https://github.com/canonical/pragma/commit/b2f854a127ae1a048de664d6c555475495b9cd70)), closes [#421](https://github.com/canonical/pragma/issues/421) [#421](https://github.com/canonical/pragma/issues/421) [#421](https://github.com/canonical/pragma/issues/421)
* **ds-app:** side navigation plumbing ([#651](https://github.com/canonical/pragma/issues/651)) ([089e4e0](https://github.com/canonical/pragma/commit/089e4e00442387b18fc62d41eedc294656be5d9d)), closes [#649](https://github.com/canonical/pragma/issues/649) [#649](https://github.com/canonical/pragma/issues/649)
* **ds-app:** SideNavigation baseline alignment ([#657](https://github.com/canonical/pragma/issues/657)) ([abbe034](https://github.com/canonical/pragma/commit/abbe034f4d810ca64d349c78a8504b1a38310fba))
* **ds-app:** SideNavigation grouping, enhanced item & generic navigation hook ([#655](https://github.com/canonical/pragma/issues/655)) ([532fca3](https://github.com/canonical/pragma/commit/532fca339f8b3f960d739a5955ff57839515c3ea))





## [0.27.1-experimental.0](https://github.com/canonical/pragma/compare/v0.28.0-experimental.0...v0.27.1-experimental.0) (2026-05-21)

**Note:** Version bump only for package @canonical/react-ds-app





# [0.27.0](https://github.com/canonical/pragma/compare/v0.26.0...v0.27.0) (2026-04-29)

**Note:** Version bump only for package @canonical/react-ds-app





# [0.26.0](https://github.com/canonical/pragma/compare/v0.25.0...v0.26.0) (2026-04-24)

**Note:** Version bump only for package @canonical/react-ds-app





# [0.25.0](https://github.com/canonical/pragma/compare/v0.24.0...v0.25.0) (2026-04-17)

**Note:** Version bump only for package @canonical/react-ds-app





# [0.24.0](https://github.com/canonical/pragma/compare/v0.23.0...v0.24.0) (2026-04-13)

**Note:** Version bump only for package @canonical/react-ds-app





# [0.23.0](https://github.com/canonical/pragma/compare/v0.22.1...v0.23.0) (2026-04-07)

**Note:** Version bump only for package @canonical/react-ds-app





# [0.22.0](https://github.com/canonical/pragma/compare/v0.22.0-experimental.0...v0.22.0) (2026-04-03)

**Note:** Version bump only for package @canonical/react-ds-app





# [0.21.0](https://github.com/canonical/pragma/compare/v0.20.1...v0.21.0) (2026-04-01)

**Note:** Version bump only for package @canonical/react-ds-app





# [0.20.0](https://github.com/canonical/pragma/compare/v0.19.0...v0.20.0) (2026-03-26)

**Note:** Version bump only for package @canonical/react-ds-app





# [0.19.0](https://github.com/canonical/pragma/compare/v0.18.0...v0.19.0) (2026-03-26)


### Bug Fixes

* **ci:** add missing build step to push workflow, replace workspace: protocol ([#521](https://github.com/canonical/pragma/issues/521)) ([0e88312](https://github.com/canonical/pragma/commit/0e883120c96034d180de0ebdde6e9740d97609fe)), closes [#512](https://github.com/canonical/pragma/issues/512)


### Features

* **storybook:** unified Storybook hub for all React packages ([#529](https://github.com/canonical/pragma/issues/529)) ([3a2d56c](https://github.com/canonical/pragma/commit/3a2d56cdceb43bdd5b8c4578d40283518bfce80d)), closes [#31842](https://github.com/canonical/pragma/issues/31842)


### Performance Improvements

* upgrade vite 7 → 8 (Rolldown) for ~10% faster builds ([#527](https://github.com/canonical/pragma/issues/527)) ([04ebac0](https://github.com/canonical/pragma/commit/04ebac09e2f571a611533ebf98ceba3e47fbb8f9))





# [0.18.0](https://github.com/canonical/pragma/compare/v0.17.1...v0.18.0) (2026-03-11)

**Note:** Version bump only for package @canonical/react-ds-app





## [0.17.1](https://github.com/canonical/ds25/compare/v0.17.0...v0.17.1) (2026-03-04)

**Note:** Version bump only for package @canonical/react-ds-app





# [0.17.0](https://github.com/canonical/ds25/compare/v0.16.0...v0.17.0) (2026-03-04)

**Note:** Version bump only for package @canonical/react-ds-app





# [0.16.0](https://github.com/canonical/ds25/compare/v0.16.0-experimental.1...v0.16.0) (2026-03-03)

**Note:** Version bump only for package @canonical/react-ds-app





# [0.16.0-experimental.1](https://github.com/canonical/ds25/compare/v0.16.0-experimental.0...v0.16.0-experimental.1) (2026-03-03)

**Note:** Version bump only for package @canonical/react-ds-app





## [0.15.1](https://github.com/canonical/ds25/compare/v0.15.0...v0.15.1) (2026-02-23)

**Note:** Version bump only for package @canonical/react-ds-app





# [0.15.0](https://github.com/canonical/ds25/compare/v0.15.0-experimental.0...v0.15.0) (2026-02-20)

**Note:** Version bump only for package @canonical/react-ds-app





# [0.15.0-experimental.0](https://github.com/canonical/ds25/compare/v0.14.0...v0.15.0-experimental.0) (2026-02-17)

**Note:** Version bump only for package @canonical/react-ds-app





# [0.14.0](https://github.com/canonical/ds25/compare/v0.13.0...v0.14.0) (2026-02-16)

**Note:** Version bump only for package @canonical/react-ds-app





# [0.13.0](https://github.com/canonical/ds25/compare/v0.13.0-experimental.0...v0.13.0) (2026-02-10)

**Note:** Version bump only for package @canonical/react-ds-app





# [0.13.0-experimental.0](https://github.com/canonical/ds25/compare/v0.12.0...v0.13.0-experimental.0) (2026-02-10)


### Features

* **storybook:** enhance configuration for Svelte support ([#415](https://github.com/canonical/ds25/issues/415)) ([af589bd](https://github.com/canonical/ds25/commit/af589bd9e4a63a3138551b998f7f8fe8d507a023))





# [0.12.0](https://github.com/canonical/ds25/compare/v0.12.0-experimental.0...v0.12.0) (2026-02-06)


### Features

* eap packages ([#409](https://github.com/canonical/ds25/issues/409)) ([f7a6c56](https://github.com/canonical/ds25/commit/f7a6c56d0429d19e521296141805eaef37ce9cb3))





# [0.12.0-experimental.0](https://github.com/canonical/ds25/compare/v0.11.0...v0.12.0-experimental.0) (2026-01-26)


### Features

* **components:** Ft components ([#393](https://github.com/canonical/ds25/issues/393)) ([abbe615](https://github.com/canonical/ds25/commit/abbe6150c52deefffb7e9e7fbfee8a3b6ffb94c6))
* **documentation:** Enhanced documentation ([#389](https://github.com/canonical/ds25/issues/389)) ([03ab19a](https://github.com/canonical/ds25/commit/03ab19aa2fbebf5ef7cd403652f6fa4627ca619e))
* **lib:** Enforces the lib folder convention, driveby global-form fixes ([#391](https://github.com/canonical/ds25/issues/391)) ([c908437](https://github.com/canonical/ds25/commit/c908437c558cb01f79c5a3df246cd25bc65542fb))





# [0.11.0](https://github.com/canonical/ds25/compare/v0.10.0-experimental.8...v0.11.0) (2026-01-18)


### Features

* Dependency updates layers 1-4 ([#381](https://github.com/canonical/ds25/issues/381)) ([e84c7a9](https://github.com/canonical/ds25/commit/e84c7a9909e3c12aa33f346ccde2e9acddf65e2f))
* **monorepo:** Webarchitect consumption ([#378](https://github.com/canonical/ds25/issues/378)) ([badd693](https://github.com/canonical/ds25/commit/badd69313bca1f1de4b02c2947c85fffe830422f))
* Storybook 10 update ([#379](https://github.com/canonical/ds25/issues/379)) ([cc65ea6](https://github.com/canonical/ds25/commit/cc65ea6693f38a72066b711f072ded03bafceb9d))





# [0.10.0](https://github.com/canonical/ds25/compare/v0.10.0-experimental.8...v0.10.0) (2026-01-18)


### Features

* Storybook 10 update ([#379](https://github.com/canonical/ds25/issues/379)) ([cc65ea6](https://github.com/canonical/ds25/commit/cc65ea6693f38a72066b711f072ded03bafceb9d))





# [0.10.0-experimental.8](https://github.com/canonical/ds25/compare/v0.10.0-experimental.7...v0.10.0-experimental.8) (2025-12-04)

**Note:** Version bump only for package @canonical/react-ds-app





# [0.10.0-experimental.7](https://github.com/canonical/ds25/compare/v0.10.0-experimental.6...v0.10.0-experimental.7) (2025-12-03)

**Note:** Version bump only for package @canonical/react-ds-app





# [0.10.0-experimental.6](https://github.com/canonical/ds25/compare/v0.10.0-experimental.5...v0.10.0-experimental.6) (2025-11-24)

**Note:** Version bump only for package @canonical/react-ds-app





# [0.10.0-experimental.5](https://github.com/canonical/ds25/compare/v0.10.0-experimental.4...v0.10.0-experimental.5) (2025-10-17)


### Features

* **React core:** Implement Card component ([#314](https://github.com/canonical/ds25/issues/314)) ([ad3dd81](https://github.com/canonical/ds25/commit/ad3dd8145e76b214532fb1e0293e97cab93cc819))





# [0.10.0-experimental.4](https://github.com/canonical/ds25/compare/v0.10.0-experimental.3...v0.10.0-experimental.4) (2025-09-25)

**Note:** Version bump only for package @canonical/react-ds-app





# [0.10.0-experimental.3](https://github.com/canonical/ds25/compare/v0.10.0-experimental.2...v0.10.0-experimental.3) (2025-09-18)


### Features

* **Badge:** pt. 1 - utilities for the Badge component ([#304](https://github.com/canonical/ds25/issues/304)) ([f556180](https://github.com/canonical/ds25/commit/f5561801c196a55b6b17f18156f0d9cd736da5ea))





# [0.10.0-experimental.0](https://github.com/canonical/ds25/compare/v0.9.1-experimental.0...v0.10.0-experimental.0) (2025-07-30)


### Features

* **react-ds-app:** Added DS-app for react ([#284](https://github.com/canonical/ds25/issues/284)) ([8ae5771](https://github.com/canonical/ds25/commit/8ae577182e1c69f252e8c25bee4bfc1944643113))





# [0.9.0](https://github.com/canonical/ds25/compare/v0.9.0-experimental.22...v0.9.0) (2025-06-27)

**Note:** Version bump only for package @canonical/react-ds-app-lxd





# [0.9.0-experimental.22](https://github.com/canonical/ds25/compare/v0.9.0-experimental.21...v0.9.0-experimental.22) (2025-06-26)

**Note:** Version bump only for package @canonical/react-ds-app-lxd





# [0.9.0-experimental.21](https://github.com/canonical/ds25/compare/v0.9.0-experimental.20...v0.9.0-experimental.21) (2025-06-24)


### Bug Fixes

* **deps:** update storybook monorepo to v9 (major) ([#242](https://github.com/canonical/ds25/issues/242)) ([3bbdb4b](https://github.com/canonical/ds25/commit/3bbdb4b9299565f84081fe882d9a2fd85197b8ee))
* **storybook:** enable addon themes ([#256](https://github.com/canonical/ds25/issues/256)) ([c522fc0](https://github.com/canonical/ds25/commit/c522fc05f48d39ab358773c458a53233a1259835))


### Features

* Initialization of app tiers ([#238](https://github.com/canonical/ds25/issues/238)) ([51b88c8](https://github.com/canonical/ds25/commit/51b88c8f8639b47a25b0c2305bf61711df8854f4))





# [0.9.0-experimental.20](https://github.com/canonical/ds25/compare/v0.9.0-experimental.19...v0.9.0-experimental.20) (2025-05-05)

**Note:** Version bump only for package @canonical/react-ds-core





# [0.9.0-experimental.19](https://github.com/canonical/ds25/compare/v0.9.0-experimental.18...v0.9.0-experimental.19) (2025-04-28)


### Features

* **React Core:** Button uses `children` instead of `label` for contents ([#214](https://github.com/canonical/ds25/issues/214)) ([f31bbed](https://github.com/canonical/ds25/commit/f31bbed41ca6f3945ee1ac18da7e4068b1f2bd59))
* **Styles:** Extract baseline grid css styles to a "debug" styles package ([#203](https://github.com/canonical/ds25/issues/203)) ([30e69e4](https://github.com/canonical/ds25/commit/30e69e44799a1076c7c0b668ddb3b81b36b7d967))





# [0.9.0-experimental.13](https://github.com/canonical/ds25/compare/v0.9.0-experimental.12...v0.9.0-experimental.13) (2025-04-04)


### Features

* **Demo site:** Demo Site pt. 4 - Typographic specimen styling / settings expanded ([#185](https://github.com/canonical/ds25/issues/185)) ([8024841](https://github.com/canonical/ds25/commit/8024841b53a70f2df202de8d8a5ff8cb53b8836d))





# [0.9.0-experimental.12](https://github.com/canonical/ds25/compare/v0.9.0-experimental.11...v0.9.0-experimental.12) (2025-04-03)


### Bug Fixes

* **Tooltip:** Tooltips use position: fixed ([#178](https://github.com/canonical/ds25/issues/178)) ([fe1f0b4](https://github.com/canonical/ds25/commit/fe1f0b4af1ff676b648735bce02c1f32f6d3a380))





# [0.9.0-experimental.11](https://github.com/canonical/ds25/compare/v0.9.0-experimental.10...v0.9.0-experimental.11) (2025-03-20)

**Note:** Version bump only for package @canonical/react-ds-core





# [0.9.0-experimental.10](https://github.com/canonical/ds25/compare/v0.9.0-experimental.9...v0.9.0-experimental.10) (2025-03-19)


### Bug Fixes

* **React Core:** Popups close on Escape, disabled elements will not trigger popups to open ([#151](https://github.com/canonical/ds25/issues/151)) ([6947ab4](https://github.com/canonical/ds25/commit/6947ab47f1b08c493a648ca643af9e51ebe3aae7))
* **React Core:** UseWindowDimension is SSR-safe ([#156](https://github.com/canonical/ds25/issues/156)) ([db3c446](https://github.com/canonical/ds25/commit/db3c446cbc2dac3687d44ed5f0061c4449e18115))





# [0.9.0-experimental.9](https://github.com/canonical/ds25/compare/v0.9.0-experimental.8...v0.9.0-experimental.9) (2025-03-12)


### Features

* **react-ds-core:** Build Tooltip component ([#140](https://github.com/canonical/ds25/issues/140)) ([8aa436c](https://github.com/canonical/ds25/commit/8aa436cd84a3373b5ae36bbc9ec22ddaf5d3daea))





# [0.9.0-experimental.5](https://github.com/canonical/ds25/compare/v0.9.0-experimental.4...v0.9.0-experimental.5) (2025-03-10)

**Note:** Version bump only for package @canonical/react-ds-core





# [0.9.0-experimental.2](https://github.com/canonical/ds25/compare/v0.9.0-experimental.1...v0.9.0-experimental.2) (2025-02-12)


### Features

* **forms:** Added a base package for the form components ([#128](https://github.com/canonical/ds25/issues/128)) ([6f68ead](https://github.com/canonical/ds25/commit/6f68eade4bcee41988bed4826a2a4211a1c25917))
* **storybook:** Modularized the config creation for storybook ([#125](https://github.com/canonical/ds25/issues/125)) ([90189d8](https://github.com/canonical/ds25/commit/90189d89b5a1948a417adea245708336225f598d))





# [0.9.0-experimental.1](https://github.com/canonical/ds25/compare/v0.9.0-experimental.0...v0.9.0-experimental.1) (2025-02-07)

**Note:** Version bump only for package @canonical/react-ds-core





## <small>0.8.1-experimental.0 (2025-02-06)</small>




## <small>0.8.1-experimental.0 (2025-02-04)</small>

* chore: version bump to 0.8.1-experimental.0 ([a3b4f8a](https://github.com/canonical/ds25/commit/a3b4f8a))
* chore(generator): rename style.css to styles.css, rename .test.tsx to .stories.tsx (#121) ([ccf391d](https://github.com/canonical/ds25/commit/ccf391d)), closes [#121](https://github.com/canonical/ds25/issues/121)



## <small>0.7.1-experimental.0 (2025-01-17)</small>

* chore: version bump to 0.7.1-experimental.0 ([636cd2e](https://github.com/canonical/ds25/commit/636cd2e))
* fix(react-core): Export chip component (#114) ([b2db0c6](https://github.com/canonical/ds25/commit/b2db0c6)), closes [#114](https://github.com/canonical/ds25/issues/114)
* Fix: minor monorepo improvements (#111) ([7607ee8](https://github.com/canonical/ds25/commit/7607ee8)), closes [#111](https://github.com/canonical/ds25/issues/111)



## 0.6.0-experimental.0 (2025-01-14)

* chore: version bump to 0.6.0-experimental.0 ([08cae3a](https://github.com/canonical/ds25/commit/08cae3a))
* feat: moved react packages to their domain, added the launchpad tier (#109) ([ee65323](https://github.com/canonical/ds25/commit/ee65323)), closes [#109](https://github.com/canonical/ds25/issues/109)
