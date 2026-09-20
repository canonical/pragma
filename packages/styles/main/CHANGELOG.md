# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.40.0](https://github.com/canonical/pragma/compare/v0.39.0...v0.40.0) (2026-09-20)

**Note:** Version bump only for package @canonical/styles





# [0.39.0](https://github.com/canonical/pragma/compare/v0.38.0...v0.39.0) (2026-09-18)

**Note:** Version bump only for package @canonical/styles





# [0.38.0](https://github.com/canonical/pragma/compare/v0.37.0...v0.38.0) (2026-09-16)

* feat(styles)!: the component-tier layers follow the tier tree (#1153) ([dd99204](https://github.com/canonical/pragma/commit/dd99204020714c35752fb71f5d64715778a694c4)), closes [#1153](https://github.com/canonical/pragma/issues/1153)
* feat(styles)!: tokens, elements and layout entries (#1146) ([3c5bd8c](https://github.com/canonical/pragma/commit/3c5bd8c2cbe7d530d4bc3d2718a92ea1ba510c9e)), closes [#1146](https://github.com/canonical/pragma/issues/1146)
* feat(templates)!: the root contract and the imports (#1122) ([e7cb864](https://github.com/canonical/pragma/commit/e7cb8643f6d2b12373a218194d45a3177d6105ab)), closes [#1122](https://github.com/canonical/pragma/issues/1122) [#552](https://github.com/canonical/pragma/issues/552)
* feat(styles)!: layer everything @canonical/styles ships (#1120) ([e166c63](https://github.com/canonical/pragma/commit/e166c63f7d57a17161cac075b585b6da5d2fb105)), closes [#1120](https://github.com/canonical/pragma/issues/1120)

### Bug Fixes

* **deps:** update canonical to v0.10.0 ([#894](https://github.com/canonical/pragma/issues/894)) ([34a1bb9](https://github.com/canonical/pragma/commit/34a1bb987de4677a83c6f6da3a1521f8d26d18ad))

### Documentation

* **styles:** the cascade contract ([#1132](https://github.com/canonical/pragma/issues/1132)) ([9e65162](https://github.com/canonical/pragma/commit/9e6516276a1c23d49a359aa8788d59a7f04c18c3)), closes [high-density](https://github.com/hi/issues/density)

### Features

* **styles:** export density and spacing subpaths ([#1102](https://github.com/canonical/pragma/issues/1102)) ([7fa3e67](https://github.com/canonical/pragma/commit/7fa3e67e391da4bd0470e49261f661c883b13e10))
* **styles:** export modifier shim subpaths ([#1099](https://github.com/canonical/pragma/issues/1099)) ([ab060ae](https://github.com/canonical/pragma/commit/ab060ae0a573a14f8cedbf433db3dd0ffa0e3864))

### BREAKING CHANGES

* `@canonical/react-ds-global` now declares an `exports` map, so
  the package answers only to the paths it lists: the package name, `./index.css`,
  `./package.json` and any published file under `./dist/` named exactly. Two forms
  that used to resolve no longer do. A folder in place of a file —
  `@canonical/react-ds-global/dist/esm`, or
  `@canonical/react-ds-global/dist/esm/lib/component/Button` — no longer finds the
  `index.js` inside it; name the file. Anything outside `dist` —
  `@canonical/react-ds-global/README.md`, or a `src/…` path that happened to
  resolve in a workspace checkout — now fails with `ERR_PACKAGE_PATH_NOT_EXPORTED`;
  those files were never published. Importing the package by name, or the
  stylesheet by its subpath, is unaffected.
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
* `ds.components.app` is retired. A package that wrapped its
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
* **styles:** Everything this package ships is now in a named cascade layer,
  so an application's own unlayered CSS beats every rule here, where before it
  competed with unlayered rules by source order and specificity. An override that
  used to lose now wins, and one that used to win still does. To keep the layer
  order in force for your own CSS, put it in a layer above `ds.components.app` —
  the README's "Migrating to the layered release" section has the statement to
  copy. There is nothing to add to your markup. `normalize.css` is also no longer
  a transitive dependency: an application relying on the parts of it this package
  does not use must depend on it directly.
* Everything this package ships is now in a named cascade layer,
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
* **styles:** The package now declares an `exports` map entry for
  ./package.json and three new entries, and `main` is joined by `type: module`.
  Nothing that imported @canonical/styles or one of its existing subpaths changes.
* **styles:** The package now declares an `exports` map entry for
  ./package.json and three new entries, and `main` is joined by `type: module`.
  Nothing that imported @canonical/styles or one of its existing subpaths changes.
* The package now declares an `exports` map entry for
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


# [0.37.0](https://github.com/canonical/pragma/compare/v0.36.0...v0.37.0) (2026-09-02)

**Note:** Version bump only for package @canonical/styles





# [0.36.0](https://github.com/canonical/pragma/compare/v0.35.0...v0.36.0) (2026-08-29)

**Note:** Version bump only for package @canonical/styles





# [0.35.0](https://github.com/canonical/pragma/compare/v0.34.0...v0.35.0) (2026-08-28)

**Note:** Version bump only for package @canonical/styles





# [0.34.0](https://github.com/canonical/pragma/compare/v0.33.0...v0.34.0) (2026-08-21)

**Note:** Version bump only for package @canonical/styles





# [0.33.0](https://github.com/canonical/pragma/compare/v0.32.0...v0.33.0) (2026-07-24)

**Note:** Version bump only for package @canonical/styles





# [0.32.0](https://github.com/canonical/pragma/compare/v0.31.0...v0.32.0) (2026-07-20)


### Bug Fixes

* **components:** design-review batch — h5 small-caps, SwitchField, Tabs, ContextualMenu, Field.Description, density retune ([#871](https://github.com/canonical/pragma/issues/871)) ([d9a568e](https://github.com/canonical/pragma/commit/d9a568ecd8ec0b2a5481c8f6827aece698eec751))


### Features

* **components:** intrinsic control seat — one seat, no fixed heights (AV-323, AV-327) ([#873](https://github.com/canonical/pragma/issues/873)) ([4d5cbe8](https://github.com/canonical/pragma/commit/4d5cbe8631855864f48805a1ca07c76dd0cfb7bf)), closes [#871](https://github.com/canonical/pragma/issues/871) [#15](https://github.com/canonical/pragma/issues/15)





# [0.31.0](https://github.com/canonical/pragma/compare/v0.30.0...v0.31.0) (2026-07-17)


### Bug Fixes

* **density:** seat ds-global Button + restore control sizes ([#813](https://github.com/canonical/pragma/issues/813)) ([#814](https://github.com/canonical/pragma/issues/814)) ([78c8ed1](https://github.com/canonical/pragma/commit/78c8ed1ee4d21ec20c863edc2f7d68f4c3643dc6)), closes [#803](https://github.com/canonical/pragma/issues/803) [#812](https://github.com/canonical/pragma/issues/812) [#812](https://github.com/canonical/pragma/issues/812)
* **ds-global,ds-global-form,styles:** token, colour & typography corrections from design review ([#764](https://github.com/canonical/pragma/issues/764)) ([89f8d44](https://github.com/canonical/pragma/commit/89f8d440a98f4ff0b3d42f17611f134e835d4295)), closes [#748](https://github.com/canonical/pragma/issues/748) [#748](https://github.com/canonical/pragma/issues/748)
* **ds-global:** sizing, spacing & alignment from design review ([#766](https://github.com/canonical/pragma/issues/766)) ([a78939a](https://github.com/canonical/pragma/commit/a78939afaa20d63f96225f3ff484fac02d15ffc2)), closes [#764](https://github.com/canonical/pragma/issues/764) [#801](https://github.com/canonical/pragma/issues/801)


### Features

* **styles:** 4px baseline in styles-main + debug overlay ([#803](https://github.com/canonical/pragma/issues/803)) ([35308ae](https://github.com/canonical/pragma/commit/35308ae07ca9d5364626af85c66f80a2ecebe35f))





# [0.30.0](https://github.com/canonical/pragma/compare/v0.29.1...v0.30.0) (2026-07-14)


### Features

* **ds-global:** implement Announcement with criticality variants ([#746](https://github.com/canonical/pragma/issues/746)) ([8e26c95](https://github.com/canonical/pragma/commit/8e26c950a7feea87e65f7a4bb1772cb656b116ce))
* **ds-global:** overlay components — Tooltip, Popover, ContextualMenu (+ submenus, logical placement, RTL) ([#731](https://github.com/canonical/pragma/issues/731)) ([4012a46](https://github.com/canonical/pragma/commit/4012a4630e18c02759a154232baec33850902916)), closes [#89](https://github.com/canonical/pragma/issues/89) [post-#745](https://github.com/post-/issues/745) [#745](https://github.com/canonical/pragma/issues/745)
* **ds-global:** reconcile + fully style Button (re-target to main) ([#734](https://github.com/canonical/pragma/issues/734)) ([8e4cdbc](https://github.com/canonical/pragma/commit/8e4cdbc7052ae5e899ecb6d98090d45b6391b79a))





# [0.29.0](https://github.com/canonical/pragma/compare/v0.29.0-experimental.0...v0.29.0) (2026-07-03)

**Note:** Version bump only for package @canonical/styles





# [0.28.0](https://github.com/canonical/pragma/compare/v0.27.1-experimental.0...v0.28.0) (2026-06-16)


### Features

* **ds-app:** side navigation plumbing ([#651](https://github.com/canonical/pragma/issues/651)) ([089e4e0](https://github.com/canonical/pragma/commit/089e4e00442387b18fc62d41eedc294656be5d9d)), closes [#649](https://github.com/canonical/pragma/issues/649) [#649](https://github.com/canonical/pragma/issues/649)





## [0.27.1-experimental.0](https://github.com/canonical/pragma/compare/v0.28.0-experimental.0...v0.27.1-experimental.0) (2026-05-21)


### Bug Fixes

* **release:** unblock lerna 9 publish (access via publishConfig) ([#637](https://github.com/canonical/pragma/issues/637)) ([acc1185](https://github.com/canonical/pragma/commit/acc1185b43290c1edd88da25c000f7d9494caee6))





# [0.27.0](https://github.com/canonical/pragma/compare/v0.26.0...v0.27.0) (2026-04-29)

**Note:** Version bump only for package @canonical/styles





# [0.26.0](https://github.com/canonical/pragma/compare/v0.25.0...v0.26.0) (2026-04-24)

**Note:** Version bump only for package @canonical/styles





# [0.25.0](https://github.com/canonical/pragma/compare/v0.24.0...v0.25.0) (2026-04-17)

**Note:** Version bump only for package @canonical/styles





# [0.24.0](https://github.com/canonical/pragma/compare/v0.23.0...v0.24.0) (2026-04-13)

**Note:** Version bump only for package @canonical/styles





# [0.23.0](https://github.com/canonical/pragma/compare/v0.22.1...v0.23.0) (2026-04-07)

**Note:** Version bump only for package @canonical/styles





# [0.22.0](https://github.com/canonical/pragma/compare/v0.22.0-experimental.0...v0.22.0) (2026-04-03)

**Note:** Version bump only for package @canonical/styles





# [0.21.0](https://github.com/canonical/pragma/compare/v0.20.1...v0.21.0) (2026-04-01)


### Features

* **form,styles,typography:** baseline grid alignment for form fields ([#571](https://github.com/canonical/pragma/issues/571)) ([2f9c5aa](https://github.com/canonical/pragma/commit/2f9c5aafbd69815867a7449d16771d3d3c729912))
* **styles:** spacing tokens, canonical borders, self-hosted fonts, addon-utils toolbar ([#552](https://github.com/canonical/pragma/issues/552)) ([b7f0adc](https://github.com/canonical/pragma/commit/b7f0adc3f83dabf95b7272ce60e01de3110706c4))





# [0.20.0](https://github.com/canonical/pragma/compare/v0.19.0...v0.20.0) (2026-03-26)

**Note:** Version bump only for package @canonical/styles





# [0.19.0](https://github.com/canonical/pragma/compare/v0.18.0...v0.19.0) (2026-03-26)


### Bug Fixes

* **pragma:** critical bugs, SPARQL hardening, contract types, package rename ([#549](https://github.com/canonical/pragma/issues/549)) ([ebacb6e](https://github.com/canonical/pragma/commit/ebacb6ef54eca92d720fb5ccc05459748f854849))


### Features

* **ds-global-form:** styles pt1 and addon-form ([#493](https://github.com/canonical/pragma/issues/493)) ([b1b2068](https://github.com/canonical/pragma/commit/b1b2068f2541df5b47e9f462b9124cefa4a28efb)), closes [storybookjs/storybook#31842](https://github.com/storybookjs/storybook/issues/31842)
* **pragma-cli:** unify lookup orchestration and IRI queries ([#551](https://github.com/canonical/pragma/issues/551)) ([48c2870](https://github.com/canonical/pragma/commit/48c2870ccdf21135d97c53283ed5c028bfbcc769))
* **storybook:** unified Storybook hub for all React packages ([#529](https://github.com/canonical/pragma/issues/529)) ([3a2d56c](https://github.com/canonical/pragma/commit/3a2d56cdceb43bdd5b8c4578d40283518bfce80d)), closes [#31842](https://github.com/canonical/pragma/issues/31842)





# [0.18.0](https://github.com/canonical/pragma/compare/v0.17.1...v0.18.0) (2026-03-11)

**Note:** Version bump only for package @canonical/styles
