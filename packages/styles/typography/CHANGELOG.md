# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.39.0](https://github.com/canonical/pragma/compare/v0.38.0...v0.39.0) (2026-09-18)

**Note:** Version bump only for package @canonical/styles-typography





# [0.38.0](https://github.com/canonical/pragma/compare/v0.37.0...v0.38.0) (2026-09-16)

* feat(styles)!: tokens, elements and layout entries (#1146) ([3c5bd8c](https://github.com/canonical/pragma/commit/3c5bd8c2cbe7d530d4bc3d2718a92ea1ba510c9e)), closes [#1146](https://github.com/canonical/pragma/issues/1146)
* refactor(styles-typography)!: tokens and elements as separate files (#1145) ([8c37c0b](https://github.com/canonical/pragma/commit/8c37c0b69dfd69e7c3f6735d93634a3e33e17690)), closes [#1145](https://github.com/canonical/pragma/issues/1145) [high-density](https://github.com/hi/issues/density)
* feat(styles-typography)!: the mapper and the engines in ds.typography (#1143) ([c3ac09b](https://github.com/canonical/pragma/commit/c3ac09b93e6d343943692b3271664af4fcd4c77f)), closes [#1143](https://github.com/canonical/pragma/issues/1143)

### Bug Fixes

* **deps:** update canonical to v0.10.0 ([#894](https://github.com/canonical/pragma/issues/894)) ([34a1bb9](https://github.com/canonical/pragma/commit/34a1bb987de4677a83c6f6da3a1521f8d26d18ad))
* **styles-typography:** the baseline unit works undeclared, in rem or px ([#1144](https://github.com/canonical/pragma/issues/1144)) ([92720ee](https://github.com/canonical/pragma/commit/92720ee8a7ff4e1546bbdf1f81ceee89cdcc6ac0)), closes [high-density](https://github.com/hi/issues/density)

### Documentation

* **styles:** the cascade contract ([#1132](https://github.com/canonical/pragma/issues/1132)) ([9e65162](https://github.com/canonical/pragma/commit/9e6516276a1c23d49a359aa8788d59a7f04c18c3)), closes [high-density](https://github.com/hi/issues/density)

### Features

* **styles:** prefer exact typography line heights ([#1106](https://github.com/canonical/pragma/issues/1106)) ([964f6f1](https://github.com/canonical/pragma/commit/964f6f12916c8977dfce5fc87afc77f5043f2ef1))

### BREAKING CHANGES

* **styles:** `ds.components.app` is retired. A package that wrapped its
  stylesheets in it moves to the tier it belongs to — `ds.components.apps` for the
  shared applications package, and its own `ds.components.apps-<name>`, declared
  by the package itself, for one application's tier. An application that copied
  the order statement to put its own CSS above the design system's replaces the
  two component names with the five.
* **styles:** `ds.components.app` is retired. A package that wrapped its
  stylesheets in it moves to the tier it belongs to — `ds.components.apps` for the
  shared applications package, and its own `ds.components.apps-<name>`, declared
  by the package itself, for one application's tier. An application that copied
  the order statement to put its own CSS above the design system's replaces the
  two component names with the five.
* **styles:** An application must add `ds` to its root, beside the context
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
* **styles:** Everything this package ships is now in a named cascade layer,
  so an application's own unlayered CSS beats every rule here, where before it
  competed with unlayered rules by source order and specificity. An override that
  used to lose now wins, and one that used to win still does. To keep the layer
  order in force for your own CSS, put it in a layer above `ds.components.app` —
  the README's "Migrating to the layered release" section has the statement to
  copy. There is nothing to add to your markup. `normalize.css` is also no longer
  a transitive dependency: an application relying on the parts of it this package
  does not use must depend on it directly.
* **styles:** mapper.css no longer exists. An application importing
  @canonical/styles-typography, or one of the three engines, is unaffected — the
  composed entry delivers exactly what it did. An application that imported
  mapper.css by path takes tokens.css and elements.css instead, in that order, or
  the composed entry if it wants the engine too. An application that imported an
  engine by path and relied on it dragging in the mapper now imports tokens.css and
  elements.css alongside it.
* mapper.css no longer exists. An application importing
  @canonical/styles-typography, or one of the three engines, is unaffected — the
  composed entry delivers exactly what it did. An application that imported
  mapper.css by path takes tokens.css and elements.css instead, in that order, or
  the composed entry if it wants the engine too. An application that imported an
  engine by path and relied on it dragging in the mapper now imports tokens.css and
  elements.css alongside it.
* **styles:** The package now declares an `exports` map entry for
  ./package.json and three new entries, and `main` is joined by `type: module`.
  Nothing that imported @canonical/styles or one of its existing subpaths changes.
* **styles:** The package now declares an `exports` map entry for
  ./package.json and three new entries, and `main` is joined by `type: module`.
  Nothing that imported @canonical/styles or one of its existing subpaths changes.
* The package now declares an `exports` map entry for
  ./package.json and three new entries, and `main` is joined by `type: module`.
  Nothing that imported @canonical/styles or one of its existing subpaths changes.
* **styles:** The typographic engine now applies only inside an element
  carrying the class `ds`, and nowhere else. An application that is the design
  system's throughout adds the class to its document element, beside the context
  and density classes it already carries: `<html class="ds app comfortable">`.
  Without it, headings and paragraphs fall back to the browser's own defaults and
  no baseline alignment happens. An application that is only partly the design
  system's marks the regions it has migrated, and the rest of its page keeps its
  own typography — which is the point: this package no longer restyles bare
  elements it does not own. A heading, paragraph or code element that is itself
  the marked element is styled only where a `:scope` twin exists (`.p`, `.code`,
  `.editorial`); put the mark on the region rather than on a single heading.
  Below the `@scope` floor (Chrome 118, Safari 17.4, Firefox 146) the whole block
  is dropped and none of this package applies.
* **styles:** These rules are now in cascade layers, so an application's own
  unlayered CSS beats them where before the two competed by source order. An
  override that used to win still wins; one that used to lose now wins too. To
  keep the design system's order in force for your own CSS, put that CSS in a
  layer above ds.components.app. What each element computes is unchanged.
* **styles:** These rules are now in cascade layers, so an application's own
  unlayered CSS beats them where before the two competed by source order. An
  override that used to win still wins; one that used to lose now wins too. To keep
  the design system's order in force for your own CSS, put that CSS in a layer
  above ds.components.app. What each element computes is unchanged.
* These rules are now in cascade layers, so an application's own
  unlayered CSS beats them where before the two competed by source order. An
  override that used to win still wins; one that used to lose now wins too. To keep
  the design system's order in force for your own CSS, put that CSS in a layer
  above ds.components.app. What each element computes is unchanged.
* **styles-typography:** These rules are now in cascade layers, so an application's own
  unlayered CSS beats them where before the two competed by source order. An
  override that used to win still wins; one that used to lose now wins too. To keep
  the design system's order in force for your own CSS, put that CSS in a layer
  above ds.components.app. What each element computes is unchanged.
* These rules are now in cascade layers, so an application's own
  unlayered CSS beats them where before the two competed by source order. An
  override that used to win still wins; one that used to lose now wins too. To keep
  the design system's order in force for your own CSS, put that CSS in a layer
  above ds.components.app. What each element computes is unchanged.


# [0.37.0](https://github.com/canonical/pragma/compare/v0.36.0...v0.37.0) (2026-09-02)

**Note:** Version bump only for package @canonical/styles-typography





# [0.36.0](https://github.com/canonical/pragma/compare/v0.35.0...v0.36.0) (2026-08-29)

**Note:** Version bump only for package @canonical/styles-typography





# [0.35.0](https://github.com/canonical/pragma/compare/v0.34.0...v0.35.0) (2026-08-28)


### Bug Fixes

* **deps:** batch package dependency updates ([#963](https://github.com/canonical/pragma/issues/963)) ([923f482](https://github.com/canonical/pragma/commit/923f4825325ecd1afc93ec9bbeca7437a4a4569f)), closes [#958](https://github.com/canonical/pragma/issues/958) [#935](https://github.com/canonical/pragma/issues/935) [#919](https://github.com/canonical/pragma/issues/919) [#918](https://github.com/canonical/pragma/issues/918) [#894](https://github.com/canonical/pragma/issues/894)





# [0.34.0](https://github.com/canonical/pragma/compare/v0.33.0...v0.34.0) (2026-08-21)

**Note:** Version bump only for package @canonical/styles-typography





# [0.33.0](https://github.com/canonical/pragma/compare/v0.32.0...v0.33.0) (2026-07-24)

**Note:** Version bump only for package @canonical/styles-typography





# [0.32.0](https://github.com/canonical/pragma/compare/v0.31.0...v0.32.0) (2026-07-20)


### Bug Fixes

* **components:** design-review batch — h5 small-caps, SwitchField, Tabs, ContextualMenu, Field.Description, density retune ([#871](https://github.com/canonical/pragma/issues/871)) ([d9a568e](https://github.com/canonical/pragma/commit/d9a568ecd8ec0b2a5481c8f6827aece698eec751))





# [0.31.0](https://github.com/canonical/pragma/compare/v0.30.0...v0.31.0) (2026-07-17)


### Features

* **styles:** 4px baseline shim + typography example upgrade ([#790](https://github.com/canonical/pragma/issues/790)) ([1b11a25](https://github.com/canonical/pragma/commit/1b11a25f5c361186db8c7613fdf66f8cbf14c0c9))





# [0.30.0](https://github.com/canonical/pragma/compare/v0.29.1...v0.30.0) (2026-07-14)


### Bug Fixes

* **deps:** unify @canonical/design-tokens pin to 0.6.2-contrasted.0 ([#748](https://github.com/canonical/pragma/issues/748)) ([cf607d7](https://github.com/canonical/pragma/commit/cf607d7ae40f8044208e1e502c8d92178261e73c)), closes [#731](https://github.com/canonical/pragma/issues/731) [#89](https://github.com/canonical/pragma/issues/89)





# [0.29.0](https://github.com/canonical/pragma/compare/v0.29.0-experimental.0...v0.29.0) (2026-07-03)


### Features

* **ds-global:** InlineCode, .code baseline utility, KeyboardKey(s) tier + token rewire ([#717](https://github.com/canonical/pragma/issues/717)) ([9911f68](https://github.com/canonical/pragma/commit/9911f689c4193bee3fdbebea8f475c2dcd80d2d1))





# [0.28.0](https://github.com/canonical/pragma/compare/v0.27.1-experimental.0...v0.28.0) (2026-06-16)

**Note:** Version bump only for package @canonical/styles-typography





## [0.27.1-experimental.0](https://github.com/canonical/pragma/compare/v0.28.0-experimental.0...v0.27.1-experimental.0) (2026-05-21)


### Bug Fixes

* **release:** unblock lerna 9 publish (access via publishConfig) ([#637](https://github.com/canonical/pragma/issues/637)) ([acc1185](https://github.com/canonical/pragma/commit/acc1185b43290c1edd88da25c000f7d9494caee6))





# [0.27.0](https://github.com/canonical/pragma/compare/v0.26.0...v0.27.0) (2026-04-29)

**Note:** Version bump only for package @canonical/styles-typography





# [0.26.0](https://github.com/canonical/pragma/compare/v0.25.0...v0.26.0) (2026-04-24)

**Note:** Version bump only for package @canonical/styles-typography





# [0.25.0](https://github.com/canonical/pragma/compare/v0.24.0...v0.25.0) (2026-04-17)

**Note:** Version bump only for package @canonical/styles-typography





# [0.24.0](https://github.com/canonical/pragma/compare/v0.23.0...v0.24.0) (2026-04-13)

**Note:** Version bump only for package @canonical/styles-typography





# [0.23.0](https://github.com/canonical/pragma/compare/v0.22.1...v0.23.0) (2026-04-07)

**Note:** Version bump only for package @canonical/styles-typography





# [0.22.0](https://github.com/canonical/pragma/compare/v0.22.0-experimental.0...v0.22.0) (2026-04-03)

**Note:** Version bump only for package @canonical/styles-typography





# [0.21.0](https://github.com/canonical/pragma/compare/v0.20.1...v0.21.0) (2026-04-01)


### Features

* **form,styles,typography:** baseline grid alignment for form fields ([#571](https://github.com/canonical/pragma/issues/571)) ([2f9c5aa](https://github.com/canonical/pragma/commit/2f9c5aafbd69815867a7449d16771d3d3c729912))
* **styles:** spacing tokens, canonical borders, self-hosted fonts, addon-utils toolbar ([#552](https://github.com/canonical/pragma/issues/552)) ([b7f0adc](https://github.com/canonical/pragma/commit/b7f0adc3f83dabf95b7272ce60e01de3110706c4))





# [0.20.0](https://github.com/canonical/pragma/compare/v0.19.0...v0.20.0) (2026-03-26)

**Note:** Version bump only for package @canonical/styles-typography





# [0.19.0](https://github.com/canonical/pragma/compare/v0.18.0...v0.19.0) (2026-03-26)


### Bug Fixes

* **pragma:** critical bugs, SPARQL hardening, contract types, package rename ([#549](https://github.com/canonical/pragma/issues/549)) ([ebacb6e](https://github.com/canonical/pragma/commit/ebacb6ef54eca92d720fb5ccc05459748f854849))


### Features

* **pragma-cli:** unify lookup orchestration and IRI queries ([#551](https://github.com/canonical/pragma/issues/551)) ([48c2870](https://github.com/canonical/pragma/commit/48c2870ccdf21135d97c53283ed5c028bfbcc769))





# [0.18.0](https://github.com/canonical/pragma/compare/v0.17.1...v0.18.0) (2026-03-11)

**Note:** Version bump only for package @canonical/styles-typography
