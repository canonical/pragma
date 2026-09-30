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

**Note:** Version bump only for package @canonical/prism-pragma-provider





# [0.40.0](https://github.com/canonical/pragma/compare/v0.39.0...v0.40.0) (2026-09-20)

**Note:** Version bump only for package @canonical/prism-pragma-provider





# [0.39.0](https://github.com/canonical/pragma/compare/v0.38.0...v0.39.0) (2026-09-18)

**Note:** Version bump only for package @canonical/prism-pragma-provider





# [0.38.0](https://github.com/canonical/pragma/compare/v0.37.0...v0.38.0) (2026-09-16)

### Features

* **prism-pragma-provider:** compile pragma's TTL corpus into a schema ([#1110](https://github.com/canonical/pragma/issues/1110)) ([2137b6b](https://github.com/canonical/pragma/commit/2137b6b8b9df5a0aa049a0de85750f71d3a00304))
