# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.40.0](https://github.com/canonical/pragma/compare/v0.39.0...v0.40.0) (2026-09-20)

### Bug Fixes

* **ds-app:** render non-action footer rows as labels and stabilise element keys ([#1229](https://github.com/canonical/pragma/issues/1229)) ([0bebcd2](https://github.com/canonical/pragma/commit/0bebcd21042fd51ad84de92d494f16923aa0d3cb)), closes [canonical/pragma#1208](https://github.com/canonical/pragma/issues/1208) [#1208](https://github.com/canonical/pragma/issues/1208)


# [0.39.0](https://github.com/canonical/pragma/compare/v0.38.0...v0.39.0) (2026-09-18)

**Note:** Version bump only for package @canonical/ds-utils





# [0.38.0](https://github.com/canonical/pragma/compare/v0.37.0...v0.38.0) (2026-09-16)

* refactor(utils)!: move navigation, debounce and throttle to @canonical/ds-utils (#1109), closes [#1109](https://github.com/canonical/pragma/issues/1109)

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
