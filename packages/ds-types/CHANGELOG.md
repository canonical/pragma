# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.43.0](https://github.com/canonical/pragma-web/compare/v0.42.0...v0.43.0) (2026-09-30)

* chore(monorepo)!: consume the core packages from npm (#1388) ([86e48a4](https://github.com/canonical/pragma-web/commit/86e48a4f166821f8a2d5352314ac65ba94ff2846)), closes [#1388](https://github.com/canonical/pragma-web/issues/1388)

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

**Note:** Version bump only for package @canonical/ds-types





# [0.40.0](https://github.com/canonical/pragma/compare/v0.39.0...v0.40.0) (2026-09-20)

### Bug Fixes

* **ds-app:** render non-action footer rows as labels and stabilise element keys ([#1229](https://github.com/canonical/pragma/issues/1229)) ([0bebcd2](https://github.com/canonical/pragma/commit/0bebcd21042fd51ad84de92d494f16923aa0d3cb)), closes [canonical/pragma#1208](https://github.com/canonical/pragma/issues/1208) [#1208](https://github.com/canonical/pragma/issues/1208)


# [0.39.0](https://github.com/canonical/pragma/compare/v0.38.0...v0.39.0) (2026-09-18)

**Note:** Version bump only for package @canonical/ds-types





# [0.38.0](https://github.com/canonical/pragma/compare/v0.37.0...v0.38.0) (2026-09-16)

* feat(ds-types)!: separate "not an item" from "you may not choose this" (#1150) ([195b67c](https://github.com/canonical/pragma/commit/195b67caf205122e587555b84b445a1e5f146e6e)), closes [#1150](https://github.com/canonical/pragma/issues/1150)
* refactor(ds-types)!: require a key or url on the navigation item (#1142) ([cb7f3b4](https://github.com/canonical/pragma/commit/cb7f3b4c07d56eb543d34aaf53ce6f44f2821dd8)), closes [#1142](https://github.com/canonical/pragma/issues/1142)
* refactor(ds-global)!: ContextualMenu takes a flat items list with first-class separators (#811), closes [#811](https://github.com/canonical/pragma/issues/811)

### BREAKING CHANGES

* `_Item<A | B>` now resolves per union member instead of to the
  union's common keys. Code that relied on the collapsed shape must instantiate
  `_Item` with the whole entry union.
* `ContextualMenu`'s `groups: MenuItem[]` prop is replaced by
  `items: MenuEntry[]`, a flat list of menu items and `{ type: "separator" }`
  entries. Migrate by concatenating each group's `items` and placing a separator
  between them.

  The `role="group"` wrappers and their `aria-label`s are gone with the grouped
  model, so labelled sections ("Recent", "All items") can no longer be expressed —
  a separator divides sections visually and for assistive technology, but does not
  name them.

  Removed, the grouped menu being their only consumer: `createCrossGroupStateReducer`
  and `getFirstEnabledLeaf` from `@canonical/utils`; `getMenuGroupProps` and
  `MenuGroupPropsResult` from `@canonical/react-hooks`; `getGroupProps` from
  `useContextualMenu`.
* `getFirstEnabledChild` and `getLastEnabledChild` are renamed to
  `getFirstInteractiveChild` and `getLastInteractiveChild`. They now skip
  presentational nodes as well as disabled ones, so "enabled" no longer describes
  what they select. There is no alias — the old name would report the old
  behaviour.
* `Item` requires a `key` or a `url`. Items with neither
  no longer type-check — give a navigable item its `url` and a
  non-navigable one a `key`. Types built on `Item` must use
  `type X = Item & { … }` rather than `interface X extends Item`, and
  `_DistributiveOmit<Item, K>` rather than `Omit<Item, K>`.
  `MenuSeparator.key` is required: write `{ type: "separator", key: "…" }`.


# [0.37.0](https://github.com/canonical/pragma/compare/v0.36.0...v0.37.0) (2026-09-02)

**Note:** Version bump only for package @canonical/ds-types





# [0.36.0](https://github.com/canonical/pragma/compare/v0.35.0...v0.36.0) (2026-08-29)

**Note:** Version bump only for package @canonical/ds-types





# [0.35.0](https://github.com/canonical/pragma/compare/v0.34.0...v0.35.0) (2026-08-28)

**Note:** Version bump only for package @canonical/ds-types





# [0.34.0](https://github.com/canonical/pragma/compare/v0.33.0...v0.34.0) (2026-08-21)

**Note:** Version bump only for package @canonical/ds-types





# [0.33.0](https://github.com/canonical/pragma/compare/v0.32.0...v0.33.0) (2026-07-24)

**Note:** Version bump only for package @canonical/ds-types





# [0.32.0](https://github.com/canonical/pragma/compare/v0.31.0...v0.32.0) (2026-07-20)

**Note:** Version bump only for package @canonical/ds-types





# [0.31.0](https://github.com/canonical/pragma/compare/v0.30.0...v0.31.0) (2026-07-17)

**Note:** Version bump only for package @canonical/ds-types





# [0.30.0](https://github.com/canonical/pragma/compare/v0.29.1...v0.30.0) (2026-07-14)

**Note:** Version bump only for package @canonical/ds-types





# [0.29.0](https://github.com/canonical/pragma/compare/v0.29.0-experimental.0...v0.29.0) (2026-07-03)

**Note:** Version bump only for package @canonical/ds-types





# [0.29.0-experimental.0](https://github.com/canonical/pragma/compare/v0.28.0...v0.29.0-experimental.0) (2026-06-24)

**Note:** Version bump only for package @canonical/ds-types





# [0.28.0](https://github.com/canonical/pragma/compare/v0.27.1-experimental.0...v0.28.0) (2026-06-16)


### Features

* **ds-app:** ApplicationLayout, ViewLayout, ContentLayout ([#656](https://github.com/canonical/pragma/issues/656)) ([b2f854a](https://github.com/canonical/pragma/commit/b2f854a127ae1a048de664d6c555475495b9cd70)), closes [#421](https://github.com/canonical/pragma/issues/421) [#421](https://github.com/canonical/pragma/issues/421) [#421](https://github.com/canonical/pragma/issues/421)
* **ds-app:** SideNavigation grouping, enhanced item & generic navigation hook ([#655](https://github.com/canonical/pragma/issues/655)) ([532fca3](https://github.com/canonical/pragma/commit/532fca339f8b3f960d739a5955ff57839515c3ea))





## [0.27.1-experimental.0](https://github.com/canonical/pragma/compare/v0.28.0-experimental.0...v0.27.1-experimental.0) (2026-05-21)


### Bug Fixes

* **release:** unblock lerna 9 publish (access via publishConfig) ([#637](https://github.com/canonical/pragma/issues/637)) ([acc1185](https://github.com/canonical/pragma/commit/acc1185b43290c1edd88da25c000f7d9494caee6))





# [0.27.0](https://github.com/canonical/pragma/compare/v0.26.0...v0.27.0) (2026-04-29)

**Note:** Version bump only for package @canonical/ds-types





# [0.26.0](https://github.com/canonical/pragma/compare/v0.25.0...v0.26.0) (2026-04-24)

**Note:** Version bump only for package @canonical/ds-types





# [0.25.0](https://github.com/canonical/pragma/compare/v0.24.0...v0.25.0) (2026-04-17)

**Note:** Version bump only for package @canonical/ds-types





# [0.24.0](https://github.com/canonical/pragma/compare/v0.23.0...v0.24.0) (2026-04-13)

**Note:** Version bump only for package @canonical/ds-types





# [0.23.0](https://github.com/canonical/pragma/compare/v0.22.1...v0.23.0) (2026-04-07)

**Note:** Version bump only for package @canonical/ds-types





# [0.22.0](https://github.com/canonical/pragma/compare/v0.22.0-experimental.0...v0.22.0) (2026-04-03)

**Note:** Version bump only for package @canonical/ds-types





# [0.21.0](https://github.com/canonical/pragma/compare/v0.20.1...v0.21.0) (2026-04-01)

**Note:** Version bump only for package @canonical/ds-types





# [0.20.0](https://github.com/canonical/pragma/compare/v0.19.0...v0.20.0) (2026-03-26)

**Note:** Version bump only for package @canonical/ds-types





# [0.19.0](https://github.com/canonical/pragma/compare/v0.18.0...v0.19.0) (2026-03-26)

**Note:** Version bump only for package @canonical/ds-types





# [0.18.0](https://github.com/canonical/pragma/compare/v0.17.1...v0.18.0) (2026-03-11)

**Note:** Version bump only for package @canonical/ds-types





## [0.17.1](https://github.com/canonical/ds25/compare/v0.17.0...v0.17.1) (2026-03-04)

**Note:** Version bump only for package @canonical/ds-types





# [0.17.0](https://github.com/canonical/ds25/compare/v0.16.0...v0.17.0) (2026-03-04)

**Note:** Version bump only for package @canonical/ds-types





# [0.16.0](https://github.com/canonical/ds25/compare/v0.16.0-experimental.1...v0.16.0) (2026-03-03)

**Note:** Version bump only for package @canonical/ds-types





# [0.16.0-experimental.1](https://github.com/canonical/ds25/compare/v0.16.0-experimental.0...v0.16.0-experimental.1) (2026-03-03)

**Note:** Version bump only for package @canonical/ds-types





## [0.15.1](https://github.com/canonical/ds25/compare/v0.15.0...v0.15.1) (2026-02-23)

**Note:** Version bump only for package @canonical/ds-types





# [0.15.0](https://github.com/canonical/ds25/compare/v0.15.0-experimental.0...v0.15.0) (2026-02-20)

**Note:** Version bump only for package @canonical/ds-types





# [0.14.0](https://github.com/canonical/ds25/compare/v0.13.0...v0.14.0) (2026-02-16)

**Note:** Version bump only for package @canonical/ds-types





# [0.13.0](https://github.com/canonical/ds25/compare/v0.13.0-experimental.0...v0.13.0) (2026-02-10)

**Note:** Version bump only for package @canonical/ds-types





# [0.12.0](https://github.com/canonical/ds25/compare/v0.12.0-experimental.0...v0.12.0) (2026-02-06)


### Features

* eap packages ([#409](https://github.com/canonical/ds25/issues/409)) ([f7a6c56](https://github.com/canonical/ds25/commit/f7a6c56d0429d19e521296141805eaef37ce9cb3))





# [0.12.0-experimental.0](https://github.com/canonical/ds25/compare/v0.11.0...v0.12.0-experimental.0) (2026-01-26)


### Features

* **components:** Ft components ([#393](https://github.com/canonical/ds25/issues/393)) ([abbe615](https://github.com/canonical/ds25/commit/abbe6150c52deefffb7e9e7fbfee8a3b6ffb94c6))
* **documentation:** Enhanced documentation ([#389](https://github.com/canonical/ds25/issues/389)) ([03ab19a](https://github.com/canonical/ds25/commit/03ab19aa2fbebf5ef7cd403652f6fa4627ca619e))





# [0.11.0](https://github.com/canonical/ds25/compare/v0.10.0-experimental.8...v0.11.0) (2026-01-18)


### Features

* Dependency updates layers 1-4 ([#381](https://github.com/canonical/ds25/issues/381)) ([e84c7a9](https://github.com/canonical/ds25/commit/e84c7a9909e3c12aa33f346ccde2e9acddf65e2f))
* **monorepo:** Webarchitect consumption ([#378](https://github.com/canonical/ds25/issues/378)) ([badd693](https://github.com/canonical/ds25/commit/badd69313bca1f1de4b02c2947c85fffe830422f))





# [0.10.0](https://github.com/canonical/ds25/compare/v0.10.0-experimental.8...v0.10.0) (2026-01-18)

**Note:** Version bump only for package @canonical/ds-types





# [0.10.0-experimental.4](https://github.com/canonical/ds25/compare/v0.10.0-experimental.3...v0.10.0-experimental.4) (2025-09-25)

**Note:** Version bump only for package @canonical/ds-types





# [0.10.0-experimental.3](https://github.com/canonical/ds25/compare/v0.10.0-experimental.2...v0.10.0-experimental.3) (2025-09-18)


### Features

* **Badge:** pt.2 - Badge component implementation / styling ([#302](https://github.com/canonical/ds25/issues/302)) ([847d75d](https://github.com/canonical/ds25/commit/847d75dc31966d2559dcd4591e557a99deece19b))
* **React Core:** Build Rule component ([#320](https://github.com/canonical/ds25/issues/320)) ([4edbbd3](https://github.com/canonical/ds25/commit/4edbbd3ee4fa0ebd68fdfa8f85f7c52ccd8dd92f))
