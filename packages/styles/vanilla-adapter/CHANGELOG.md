# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

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

### Features

* **styles:** Allow permeable pragma elements with the adapter ([#1362](https://github.com/canonical/pragma/issues/1362)) ([fe39f00](https://github.com/canonical/pragma/commit/fe39f007831609527b039b4bed99c6fde14594c3))


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
