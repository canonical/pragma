# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.43.0](https://github.com/canonical/pragma-web/compare/v0.42.0...v0.43.0) (2026-09-30)

* chore(monorepo)!: consume the core packages from npm (#1388) ([86e48a4](https://github.com/canonical/pragma-web/commit/86e48a4f166821f8a2d5352314ac65ba94ff2846)), closes [#1388](https://github.com/canonical/pragma-web/issues/1388)

### Features

* **ds-assets:** add stream control and swap icons, redraw fullscreen and stop ([#1401](https://github.com/canonical/pragma-web/issues/1401)) ([9249fb3](https://github.com/canonical/pragma-web/commit/9249fb3005a66122dc612b37e3bdfcfb79c12206))

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

* chore(monorepo)!: move to TypeScript 7 (#1374) ([713d307](https://github.com/canonical/pragma/commit/713d3071d3980539a849ea95823736e8b343a1b1)), closes [#1374](https://github.com/canonical/pragma/issues/1374) [#lib](https://github.com/canonical/pragma/issues/lib) [#domains](https://github.com/canonical/pragma/issues/domains) [#i18n](https://github.com/canonical/pragma/issues/i18n) [#relay](https://github.com/canonical/pragma/issues/relay) [#styles](https://github.com/canonical/pragma/issues/styles)

### BREAKING CHANGES

* the shared TypeScript configs, storybook-config,
  vitest-config-react and styles-typography no longer accept TypeScript 5 as
  a peer, and the tsconfig presets no longer set or expect baseUrl.

  * chore(configs): keep TypeScript 5.9 and 6 in the typescript peer ranges

  The shared configs, the Storybook config, the Vitest React config and
  @canonical/typography now accept TypeScript ^5.9.3 || ^6.0.0 || ^7.0.0,
  so consumers still on 5.9 or 6 are not pushed off by this upgrade. The
  Svelte config keeps ^5.9.3 || ^6.0.0, because its consumers compile
  declarations with TypeScript 6.

  * chore(boilerplate-vite,summon-application): drop the tsconfig paths for # imports


# [0.41.0](https://github.com/canonical/pragma/compare/v0.40.0...v0.41.0) (2026-09-25)

**Note:** Version bump only for package @canonical/ds-assets





# [0.40.0](https://github.com/canonical/pragma/compare/v0.39.0...v0.40.0) (2026-09-20)

**Note:** Version bump only for package @canonical/ds-assets





# [0.39.0](https://github.com/canonical/pragma/compare/v0.38.0...v0.39.0) (2026-09-18)

**Note:** Version bump only for package @canonical/ds-assets





# [0.38.0](https://github.com/canonical/pragma/compare/v0.37.0...v0.38.0) (2026-09-16)

### Features

* **ds-assets:** add cut and paste icons, redraw copy ([#1185](https://github.com/canonical/pragma/issues/1185)) ([b68a1d9](https://github.com/canonical/pragma/commit/b68a1d90fc3b8c8d7f5a09ee9189f44c5082d4ab))
* **storybook:** searchable icon explorer for the Icon docs page ([#1111](https://github.com/canonical/pragma/issues/1111)) ([7709673](https://github.com/canonical/pragma/commit/7709673b8775ce45d16a4023b68952be1faad374))


# [0.37.0](https://github.com/canonical/pragma/compare/v0.36.0...v0.37.0) (2026-09-02)

**Note:** Version bump only for package @canonical/ds-assets





# [0.36.0](https://github.com/canonical/pragma/compare/v0.35.0...v0.36.0) (2026-08-29)

**Note:** Version bump only for package @canonical/ds-assets





# [0.35.0](https://github.com/canonical/pragma/compare/v0.34.0...v0.35.0) (2026-08-28)


### Bug Fixes

* **deps:** batch package dependency updates ([#963](https://github.com/canonical/pragma/issues/963)) ([923f482](https://github.com/canonical/pragma/commit/923f4825325ecd1afc93ec9bbeca7437a4a4569f)), closes [#958](https://github.com/canonical/pragma/issues/958) [#935](https://github.com/canonical/pragma/issues/935) [#919](https://github.com/canonical/pragma/issues/919) [#918](https://github.com/canonical/pragma/issues/918) [#894](https://github.com/canonical/pragma/issues/894)





# [0.34.0](https://github.com/canonical/pragma/compare/v0.33.0...v0.34.0) (2026-08-21)

**Note:** Version bump only for package @canonical/ds-assets





# [0.33.0](https://github.com/canonical/pragma/compare/v0.32.0...v0.33.0) (2026-07-24)

**Note:** Version bump only for package @canonical/ds-assets





# [0.32.0](https://github.com/canonical/pragma/compare/v0.31.0...v0.32.0) (2026-07-20)

**Note:** Version bump only for package @canonical/ds-assets





# [0.31.0](https://github.com/canonical/pragma/compare/v0.30.0...v0.31.0) (2026-07-17)


### Features

* **ds-assets:** add image-registries icon ([#823](https://github.com/canonical/pragma/issues/823)) ([0d91182](https://github.com/canonical/pragma/commit/0d91182c9473702acdf4a6b1dbdb1673799e325e)), closes [#720](https://github.com/canonical/pragma/issues/720)





# [0.30.0](https://github.com/canonical/pragma/compare/v0.29.1...v0.30.0) (2026-07-14)

**Note:** Version bump only for package @canonical/ds-assets





# [0.29.0](https://github.com/canonical/pragma/compare/v0.29.0-experimental.0...v0.29.0) (2026-07-03)

**Note:** Version bump only for package @canonical/ds-assets





# [0.29.0-experimental.0](https://github.com/canonical/pragma/compare/v0.28.0...v0.29.0-experimental.0) (2026-06-24)

**Note:** Version bump only for package @canonical/ds-assets





# [0.28.0](https://github.com/canonical/pragma/compare/v0.27.1-experimental.0...v0.28.0) (2026-06-16)


### Features

* **ds-app:** side navigation plumbing ([#651](https://github.com/canonical/pragma/issues/651)) ([089e4e0](https://github.com/canonical/pragma/commit/089e4e00442387b18fc62d41eedc294656be5d9d)), closes [#649](https://github.com/canonical/pragma/issues/649) [#649](https://github.com/canonical/pragma/issues/649)
* **ds-assets:** add maximize, minimize, and clipboard icons ([#688](https://github.com/canonical/pragma/issues/688)) ([b1b8247](https://github.com/canonical/pragma/commit/b1b82476aee33897aa43845ac899c0e846ca2b53)), closes [#567](https://github.com/canonical/pragma/issues/567) [#567](https://github.com/canonical/pragma/issues/567) [#567](https://github.com/canonical/pragma/issues/567) [#567](https://github.com/canonical/pragma/issues/567) [#567](https://github.com/canonical/pragma/issues/567) [#567](https://github.com/canonical/pragma/issues/567)
* **ds-assets:** add table, chart, and theme selector icons ([#687](https://github.com/canonical/pragma/issues/687)) ([6e142ce](https://github.com/canonical/pragma/commit/6e142ced9ecc31fb12cde7d4b010d3615e7f1a85)), closes [#653](https://github.com/canonical/pragma/issues/653) [#654](https://github.com/canonical/pragma/issues/654)





## [0.27.1-experimental.0](https://github.com/canonical/pragma/compare/v0.28.0-experimental.0...v0.27.1-experimental.0) (2026-05-21)


### Bug Fixes

* **release:** unblock lerna 9 publish (access via publishConfig) ([#637](https://github.com/canonical/pragma/issues/637)) ([acc1185](https://github.com/canonical/pragma/commit/acc1185b43290c1edd88da25c000f7d9494caee6))





# [0.27.0](https://github.com/canonical/pragma/compare/v0.26.0...v0.27.0) (2026-04-29)

**Note:** Version bump only for package @canonical/ds-assets





# [0.26.0](https://github.com/canonical/pragma/compare/v0.25.0...v0.26.0) (2026-04-24)

**Note:** Version bump only for package @canonical/ds-assets





# [0.25.0](https://github.com/canonical/pragma/compare/v0.24.0...v0.25.0) (2026-04-17)

**Note:** Version bump only for package @canonical/ds-assets





# [0.24.0](https://github.com/canonical/pragma/compare/v0.23.0...v0.24.0) (2026-04-13)

**Note:** Version bump only for package @canonical/ds-assets





# [0.23.0](https://github.com/canonical/pragma/compare/v0.22.1...v0.23.0) (2026-04-07)

**Note:** Version bump only for package @canonical/ds-assets





# [0.22.0](https://github.com/canonical/pragma/compare/v0.22.0-experimental.0...v0.22.0) (2026-04-03)

**Note:** Version bump only for package @canonical/ds-assets





# [0.21.0](https://github.com/canonical/pragma/compare/v0.20.1...v0.21.0) (2026-04-01)


### Features

* **styles:** spacing tokens, canonical borders, self-hosted fonts, addon-utils toolbar ([#552](https://github.com/canonical/pragma/issues/552)) ([b7f0adc](https://github.com/canonical/pragma/commit/b7f0adc3f83dabf95b7272ce60e01de3110706c4))





# [0.20.0](https://github.com/canonical/pragma/compare/v0.19.0...v0.20.0) (2026-03-26)

**Note:** Version bump only for package @canonical/ds-assets





# [0.19.0](https://github.com/canonical/pragma/compare/v0.18.0...v0.19.0) (2026-03-26)


### Performance Improvements

* upgrade vite 7 → 8 (Rolldown) for ~10% faster builds ([#527](https://github.com/canonical/pragma/issues/527)) ([04ebac0](https://github.com/canonical/pragma/commit/04ebac09e2f571a611533ebf98ceba3e47fbb8f9))





# [0.18.0](https://github.com/canonical/pragma/compare/v0.17.1...v0.18.0) (2026-03-11)

**Note:** Version bump only for package @canonical/ds-assets





## [0.17.1](https://github.com/canonical/ds25/compare/v0.17.0...v0.17.1) (2026-03-04)

**Note:** Version bump only for package @canonical/ds-assets





# [0.17.0](https://github.com/canonical/ds25/compare/v0.16.0...v0.17.0) (2026-03-04)

**Note:** Version bump only for package @canonical/ds-assets





# [0.16.0](https://github.com/canonical/ds25/compare/v0.16.0-experimental.1...v0.16.0) (2026-03-03)

**Note:** Version bump only for package @canonical/ds-assets





# [0.16.0-experimental.1](https://github.com/canonical/ds25/compare/v0.16.0-experimental.0...v0.16.0-experimental.1) (2026-03-03)

**Note:** Version bump only for package @canonical/ds-assets





## [0.15.1](https://github.com/canonical/ds25/compare/v0.15.0...v0.15.1) (2026-02-23)

**Note:** Version bump only for package @canonical/ds-assets





# [0.15.0](https://github.com/canonical/ds25/compare/v0.15.0-experimental.0...v0.15.0) (2026-02-20)

**Note:** Version bump only for package @canonical/ds-assets





# [0.14.0](https://github.com/canonical/ds25/compare/v0.13.0...v0.14.0) (2026-02-16)

**Note:** Version bump only for package @canonical/ds-assets





# [0.13.0](https://github.com/canonical/ds25/compare/v0.13.0-experimental.0...v0.13.0) (2026-02-10)

**Note:** Version bump only for package @canonical/ds-assets





# [0.12.0](https://github.com/canonical/ds25/compare/v0.12.0-experimental.0...v0.12.0) (2026-02-06)

**Note:** Version bump only for package @canonical/ds-assets





# [0.12.0-experimental.0](https://github.com/canonical/ds25/compare/v0.11.0...v0.12.0-experimental.0) (2026-01-26)


### Features

* **documentation:** Enhanced documentation ([#389](https://github.com/canonical/ds25/issues/389)) ([03ab19a](https://github.com/canonical/ds25/commit/03ab19aa2fbebf5ef7cd403652f6fa4627ca619e))





# [0.11.0](https://github.com/canonical/ds25/compare/v0.10.0-experimental.8...v0.11.0) (2026-01-18)


### Features

* Dependency updates layers 1-4 ([#381](https://github.com/canonical/ds25/issues/381)) ([e84c7a9](https://github.com/canonical/ds25/commit/e84c7a9909e3c12aa33f346ccde2e9acddf65e2f))
* **monorepo:** Webarchitect consumption ([#378](https://github.com/canonical/ds25/issues/378)) ([badd693](https://github.com/canonical/ds25/commit/badd69313bca1f1de4b02c2947c85fffe830422f))





# [0.10.0](https://github.com/canonical/ds25/compare/v0.10.0-experimental.8...v0.10.0) (2026-01-18)

**Note:** Version bump only for package @canonical/ds-assets





# [0.10.0-experimental.8](https://github.com/canonical/ds25/compare/v0.10.0-experimental.7...v0.10.0-experimental.8) (2025-12-04)


### Bug Fixes

* **assets:** Update SVG icons to use currentColor for fill attribute ([#376](https://github.com/canonical/ds25/issues/376)) ([c855099](https://github.com/canonical/ds25/commit/c855099fe4367fd744ac6f865303756237f2a54f))





# [0.10.0-experimental.7](https://github.com/canonical/ds25/compare/v0.10.0-experimental.6...v0.10.0-experimental.7) (2025-12-03)


### Bug Fixes

* **assets:** Update SVG icons to use currentColor for fill attribute ([#375](https://github.com/canonical/ds25/issues/375)) ([144667c](https://github.com/canonical/ds25/commit/144667cce9741d68e00ef920bdefbe6b90ab7f93))





# [0.10.0-experimental.6](https://github.com/canonical/ds25/compare/v0.10.0-experimental.5...v0.10.0-experimental.6) (2025-11-24)


### Bug Fixes

* **assets:** Remove SVGs attributes left as text ([#371](https://github.com/canonical/ds25/issues/371)) ([60dd929](https://github.com/canonical/ds25/commit/60dd929d04913952f5ac3bb18746f33a8a569042))





# [0.10.0-experimental.5](https://github.com/canonical/ds25/compare/v0.10.0-experimental.4...v0.10.0-experimental.5) (2025-10-17)


### Bug Fixes

* **React Core:** Remove/rename unneeded icons ([#354](https://github.com/canonical/ds25/issues/354)) ([3dc9c46](https://github.com/canonical/ds25/commit/3dc9c4632d41284f973795c783446e8e02e47e6b)), closes [/github.com/canonical/pragma/issues/333#issuecomment-3364617394](https://github.com//github.com/canonical/pragma/issues/333/issues/issuecomment-3364617394) [/github.com/canonical/pragma/pull/354#issuecomment-3381138505](https://github.com//github.com/canonical/pragma/pull/354/issues/issuecomment-3381138505)





# [0.10.0-experimental.4](https://github.com/canonical/ds25/compare/v0.10.0-experimental.3...v0.10.0-experimental.4) (2025-09-25)


### Features

* **Assets:** Add Icon assets ([#323](https://github.com/canonical/ds25/issues/323)) ([199f572](https://github.com/canonical/ds25/commit/199f572840da74a3dcc12a836bc1acf0c815b52f))
* **React Core:** Build Icon component ([#325](https://github.com/canonical/ds25/issues/325)) ([5319d51](https://github.com/canonical/ds25/commit/5319d518fb75d63787fcd994a0c981e7beadb8ff))
