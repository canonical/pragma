# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.40.0](https://github.com/canonical/pragma/compare/v0.39.0...v0.40.0) (2026-09-20)

**Note:** Version bump only for package @canonical/styles-vanilla-adapter





# [0.39.0](https://github.com/canonical/pragma/compare/v0.38.0...v0.39.0) (2026-09-18)

**Note:** Version bump only for package @canonical/styles-vanilla-adapter





# [0.38.0](https://github.com/canonical/pragma/compare/v0.37.0...v0.38.0) (2026-09-16)

### Features

* **styles-vanilla-adapter:** the three stylesheets and the README ([#1105](https://github.com/canonical/pragma/issues/1105)) ([5c8503e](https://github.com/canonical/pragma/commit/5c8503e1afb9cc37f4f061524d5b7499014dea8a))

### Tests

* **styles-vanilla-adapter:** computed-style fixtures ([#1108](https://github.com/canonical/pragma/issues/1108)) ([68704f9](https://github.com/canonical/pragma/commit/68704f9f58f03645b9cb7073f6c9ee53a75bb6df)), closes [#1120](https://github.com/canonical/pragma/issues/1120) [#1121](https://github.com/canonical/pragma/issues/1121) [#1134](https://github.com/canonical/pragma/issues/1134)

### BREAKING CHANGES

* **styles-vanilla-adapter:** `ds.components.app` is no longer in the statement; a
  sheet that opens it sorts by first appearance.
* **styles-vanilla-adapter:** a page that writes its own rules into a layer named
  `adapter` has to write `ds.adapter`; the fourteen-name statement changes
  accordingly.
* **styles-vanilla-adapter:** adapter.css now needs the @canonical/styles release
  that ships the three entries.
* **styles-vanilla-adapter:** the `coexist` class on the document element does nothing
  and should be removed; a mixed page imports adapter.css instead of
  @canonical/styles.
* **styles-vanilla-adapter:** the mixed page's root carries `coexist` next to its
  context, density and `light`; the last step drops it instead of adding `ds`.
* **styles-vanilla-adapter:** the mixed page's root carries `coexist` next to its
  context, density and `light`; the last step drops it instead of adding `ds`.
