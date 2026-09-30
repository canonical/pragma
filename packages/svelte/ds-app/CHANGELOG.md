# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.43.0](https://github.com/canonical/pragma-web/compare/v0.42.0...v0.43.0) (2026-09-30)

* chore(monorepo)!: consume the core packages from npm (#1388) ([86e48a4](https://github.com/canonical/pragma-web/commit/86e48a4f166821f8a2d5352314ac65ba94ff2846)), closes [#1388](https://github.com/canonical/pragma-web/issues/1388)

### Bug Fixes

* **apps:** load the design system's CSS before the app ([#1393](https://github.com/canonical/pragma-web/issues/1393)) ([06a9c6f](https://github.com/canonical/pragma-web/commit/06a9c6f16891a0bb71584b52532e8b4d9cc58e4a))

### BREAKING CHANGES

* the core packages are no longer workspace members;
  local changes to them are made in canonical/pragma-core.

  * ci: drop the embedded-pack refresh and the dead Chromatic path filters

  The version action refreshed the pragma CLI's embedded pack, which no longer lives here; the step, its script, its token input and tag.yml's PACKS_READ_TOKEN go. The Chromatic workflows watched packages/utils and packages/tokens, neither of which exists in this repository any more.

  * chore(monorepo): name canonical/pragma-web in the implementation graph

  ds.config.json's repository is stamped into every source link the collector writes; data/ is regenerated with it.

  * chore(monorepo): take the Renovate preset and the Biome config's owners from pragma-core

  renovate.json extends the preset published from canonical/pragma-core. The /configs/biome/ ownership line moves with the folder.

  * docs: point the toolchain references at canonical/pragma-core

  README, AGENTS.md and docs/ describe this repository without the toolchain packages; links into the deleted folders point at canonical/pragma-core, CONSTITUTION.md becomes a link to its one copy there, the publishing guides name canonical/pragma-web as the trusted-publisher repository, and the CLI's perf-budget notes leave with the CLI.

  * test(prism-pragma-provider): check the live emission against the contract

  The compiler-goldens gate left with the compiler. The provider already boots the pinned @canonical/ke-graphql over its hermetic corpus, so it checks that emission against the contract; a compiler bump that breaks conformance is red on the bump. The contract README names this as the gate against a real emission.

  * docs: correct the references the toolchain move left stale

  The storybook hub's CLI page no longer claims a workspace pragma binary; AGENTS.md's scope examples and package count, the adding-a-package example pins and tool-package section, the constitution link and the provider READMEs' links to canonical/pragma-core.

  * docs: tighten the conformance-gate notes and two stale examples

  The provider README names its live contract check, the contract README says it runs over the test corpus and keeps its wrap, AGENTS.md drops the last CLI scope example, and the no-magic link carries its anchor.

  * chore(deps): pin the core packages to their 0.43.0-experimental releases

  Each core package takes its own experimental release from the registry: biome-config, typescript-config, webarchitect, ke and ke-graphql at 0.43.0-experimental.0; utils, design-tokens and design-system at 0.43.0-experimental.1.

  * chore(monorepo): name canonical/pragma-web as the repository

  npm refuses a trusted-publisher publish whose repository.url names a different repository, so every manifest's repository, bugs and homepage, and ds.config.json's repository (stamped into the implementation graph's source links, regenerated here), name canonical/pragma-web, as do the clone instructions and the trusted-publisher setup in the docs. tag.yml refuses to run from any other repository, so a release dispatched before the rename stops before anything is versioned or tagged.

  * fix(styles-debug): accept any 0.x design-tokens as the optional peer

  An exact peer makes npm refuse styles-debug next to any other design-tokens release; its stylesheet only reads token custom properties, which 0.10.0 and 0.43.0 ship identically. The range matches the repository's other peers.

  * fix(svelte-ds-app-launchpad): depend on design-tokens at runtime

  The published styles.css imports @canonical/design-tokens' stylesheets, so it is a dependency, not a devDependency.

  * docs: say how to get the pragma CLI and where the core pins come from

  The CLI is no longer a workspace member, so the README's prerequisites name @canonical/pragma-cli and how to install it, and the adding-a-package guide installs it before pragma create package and says to copy the core pins from a sibling manifest. The ranges test's historical comment says the package it describes has left.

  * ci: drop the repository guard from the release workflow

  * chore(deps): pin the core packages to 0.43.0

  pragma-core's first stable release: biome-config, typescript-config, webarchitect, utils, ke, ke-graphql, design-tokens and design-system move from their 0.43.0-experimental builds to 0.43.0.


# [0.42.0](https://github.com/canonical/pragma/compare/v0.41.0...v0.42.0) (2026-09-28)

**Note:** Version bump only for package @canonical/svelte-ds-app





# [0.41.0](https://github.com/canonical/pragma/compare/v0.40.0...v0.41.0) (2026-09-25)

### Bug Fixes

* **styles:** make the responsive grid 16 columns on desktop ([#1358](https://github.com/canonical/pragma/issues/1358)) ([4a58572](https://github.com/canonical/pragma/commit/4a58572a7a9bed8f1bb3c5f47ce1c4b269e8db63))


# [0.40.0](https://github.com/canonical/pragma/compare/v0.39.0...v0.40.0) (2026-09-20)

**Note:** Version bump only for package @canonical/svelte-ds-app





# [0.39.0](https://github.com/canonical/pragma/compare/v0.38.0...v0.39.0) (2026-09-18)

**Note:** Version bump only for package @canonical/svelte-ds-app





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
