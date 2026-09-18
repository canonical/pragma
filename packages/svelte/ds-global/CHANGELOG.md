# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.39.0](https://github.com/canonical/pragma/compare/v0.38.0...v0.39.0) (2026-09-18)

**Note:** Version bump only for package @canonical/svelte-ds-global





# [0.38.0](https://github.com/canonical/pragma/compare/v0.37.0...v0.38.0) (2026-09-16)

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


# [0.37.0](https://github.com/canonical/pragma/compare/v0.36.0...v0.37.0) (2026-09-02)

### Features

* **svelte-ds-global:** Upstream Svelte `Announcement` from WPE tier to Global ([#961](https://github.com/canonical/pragma/issues/961)) ([5bad77e](https://github.com/canonical/pragma/commit/5bad77e66e9da624cee6364ddb3548e95230813e))


# [0.36.0](https://github.com/canonical/pragma/compare/v0.35.0...v0.36.0) (2026-08-29)

**Note:** Version bump only for package @canonical/svelte-ds-global





# [0.35.0](https://github.com/canonical/pragma/compare/v0.34.0...v0.35.0) (2026-08-28)


### Bug Fixes

* **deps:** batch package dependency updates ([#963](https://github.com/canonical/pragma/issues/963)) ([923f482](https://github.com/canonical/pragma/commit/923f4825325ecd1afc93ec9bbeca7437a4a4569f)), closes [#958](https://github.com/canonical/pragma/issues/958) [#935](https://github.com/canonical/pragma/issues/935) [#919](https://github.com/canonical/pragma/issues/919) [#918](https://github.com/canonical/pragma/issues/918) [#894](https://github.com/canonical/pragma/issues/894)


### Features

* **collect:** export the implementation graph as turtle in the release ([#1010](https://github.com/canonical/pragma/issues/1010)) ([15c4878](https://github.com/canonical/pragma/commit/15c48788c8b5c696e8cfd756b5232628e232c93b))
* **pragma-cli:** the implementation graph reaches the CLI, and the release ships it ([#1029](https://github.com/canonical/pragma/issues/1029)) ([6e865b9](https://github.com/canonical/pragma/commit/6e865b981b92496d50135e9ba9dcb5278d958618)), closes [#1017](https://github.com/canonical/pragma/issues/1017) [#1033](https://github.com/canonical/pragma/issues/1033) [#1010](https://github.com/canonical/pragma/issues/1010)
* **svelte-ds-global:** Upstream `SkipLink` from WPE tier to Global tier ([#859](https://github.com/canonical/pragma/issues/859)) ([b1f6b4f](https://github.com/canonical/pragma/commit/b1f6b4fdbc917e027666dcae579b0d87f330b7a2))





# [0.34.0](https://github.com/canonical/pragma/compare/v0.33.0...v0.34.0) (2026-08-21)

**Note:** Version bump only for package @canonical/svelte-ds-global





# [0.33.0](https://github.com/canonical/pragma/compare/v0.32.0...v0.33.0) (2026-07-24)

**Note:** Version bump only for package @canonical/svelte-ds-global





# [0.32.0](https://github.com/canonical/pragma/compare/v0.31.0...v0.32.0) (2026-07-20)

**Note:** Version bump only for package @canonical/svelte-ds-global





# [0.31.0](https://github.com/canonical/pragma/compare/v0.30.0...v0.31.0) (2026-07-17)


### Features

* **ds-global:** Implement Svelte `<Breadcrumbs>`, a11y improvements to React `<Breadcrumbs>` ([#739](https://github.com/canonical/pragma/issues/739)) ([c47d403](https://github.com/canonical/pragma/commit/c47d403629b00cb602382fec81341bba3a36c725))





# [0.30.0](https://github.com/canonical/pragma/compare/v0.29.1...v0.30.0) (2026-07-14)


### Bug Fixes

* **deps:** unify @canonical/design-tokens pin to 0.6.2-contrasted.0 ([#748](https://github.com/canonical/pragma/issues/748)) ([cf607d7](https://github.com/canonical/pragma/commit/cf607d7ae40f8044208e1e502c8d92178261e73c)), closes [#731](https://github.com/canonical/pragma/issues/731) [#89](https://github.com/canonical/pragma/issues/89)





*Note:** Version bump only for package @canonical/svelte-ds-global
