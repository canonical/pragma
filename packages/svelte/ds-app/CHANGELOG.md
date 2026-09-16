# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.38.0](https://github.com/canonical/pragma/compare/v0.37.0...v0.38.0) (2026-09-16)

* refactor(ds-app)!: wrap the application-tier stylesheets the first four forges missed (#1133) ([eaaa63d](https://github.com/canonical/pragma/commit/eaaa63d2cef38637dabecf17b92642a16223a01d)), closes [#1133](https://github.com/canonical/pragma/issues/1133) [canonical/pragma#1122](https://github.com/canonical/pragma/issues/1122) [#1123](https://github.com/canonical/pragma/issues/1123) [#1127](https://github.com/canonical/pragma/issues/1127) [#1122](https://github.com/canonical/pragma/issues/1122) [canonical/pragma#1122](https://github.com/canonical/pragma/issues/1122) [#1120](https://github.com/canonical/pragma/issues/1120)

### Bug Fixes

* **deps:** update canonical to v0.10.0 ([#894](https://github.com/canonical/pragma/issues/894)) ([34a1bb9](https://github.com/canonical/pragma/commit/34a1bb987de4677a83c6f6da3a1521f8d26d18ad))

### BREAKING CHANGES

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

**Note:** Version bump only for package @canonical/svelte-ds-app





# [0.36.0](https://github.com/canonical/pragma/compare/v0.35.0...v0.36.0) (2026-08-29)

**Note:** Version bump only for package @canonical/svelte-ds-app





# [0.35.0](https://github.com/canonical/pragma/compare/v0.34.0...v0.35.0) (2026-08-28)


### Bug Fixes

* **deps:** batch package dependency updates ([#963](https://github.com/canonical/pragma/issues/963)) ([923f482](https://github.com/canonical/pragma/commit/923f4825325ecd1afc93ec9bbeca7437a4a4569f)), closes [#958](https://github.com/canonical/pragma/issues/958) [#935](https://github.com/canonical/pragma/issues/935) [#919](https://github.com/canonical/pragma/issues/919) [#918](https://github.com/canonical/pragma/issues/918) [#894](https://github.com/canonical/pragma/issues/894)





# [0.34.0](https://github.com/canonical/pragma/compare/v0.33.0...v0.34.0) (2026-08-21)

**Note:** Version bump only for package @canonical/svelte-ds-app





# [0.33.0](https://github.com/canonical/pragma/compare/v0.32.0...v0.33.0) (2026-07-24)


### Features

* **svelte-ds-app:** Port React core layouts ([#660](https://github.com/canonical/pragma/issues/660)) ([d85002e](https://github.com/canonical/pragma/commit/d85002e307af828c090b340e8494d5e5c3a1d2f8))





# [0.32.0](https://github.com/canonical/pragma/compare/v0.31.0...v0.32.0) (2026-07-20)

**Note:** Version bump only for package @canonical/svelte-ds-app





# [0.31.0](https://github.com/canonical/pragma/compare/v0.30.0...v0.31.0) (2026-07-17)

**Note:** Version bump only for package @canonical/svelte-ds-app





*Note:** Version bump only for package @canonical/svelte-ds-app
