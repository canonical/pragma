# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

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
