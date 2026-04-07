# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.23.0](https://github.com/canonical/pragma/compare/v0.22.1...v0.23.0) (2026-04-07)


### Features

* **react-ssr:** decouple renderers from HTTP, add web streams + sitemap ([#593](https://github.com/canonical/pragma/issues/593)) ([9050feb](https://github.com/canonical/pragma/commit/9050feb55484fad8f9035f0b2ca4fffa7592f7e3))


### BREAKING CHANGES

* **react-ssr:** renderToStream renamed to renderToPipeableStream,
render methods return content instead of writing to res,
serveStream/serveString accept factory functions.

* fix: regenerate bun.lock for updated dependencies

The lockfile was committed from a stale state before dependency changes
(domhandler removed, express moved to peerDependencies, vitest added).

* fix(demo, boilerplate-vite): migrate SSR consumers to new renderer API

- serveStream now takes a factory (req) => Renderer
- renderToStream renamed to renderToPipeableStream
- Renderer constructed per-request via createRenderer factory

* fix(demo, boilerplate-vite): fix biome formatting (tabs → spaces)





# [0.22.0](https://github.com/canonical/pragma/compare/v0.22.0-experimental.0...v0.22.0) (2026-04-03)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.21.0](https://github.com/canonical/pragma/compare/v0.20.1...v0.21.0) (2026-04-01)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.20.0](https://github.com/canonical/pragma/compare/v0.19.0...v0.20.0) (2026-03-26)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.19.0](https://github.com/canonical/pragma/compare/v0.18.0...v0.19.0) (2026-03-26)


### Bug Fixes

* **ci:** add missing build step to push workflow, replace workspace: protocol ([#521](https://github.com/canonical/pragma/issues/521)) ([0e88312](https://github.com/canonical/pragma/commit/0e883120c96034d180de0ebdde6e9740d97609fe)), closes [#512](https://github.com/canonical/pragma/issues/512)


### Features

* **storybook:** unified Storybook hub for all React packages ([#529](https://github.com/canonical/pragma/issues/529)) ([3a2d56c](https://github.com/canonical/pragma/commit/3a2d56cdceb43bdd5b8c4578d40283518bfce80d)), closes [#31842](https://github.com/canonical/pragma/issues/31842)


### Performance Improvements

* upgrade vite 7 → 8 (Rolldown) for ~10% faster builds ([#527](https://github.com/canonical/pragma/issues/527)) ([04ebac0](https://github.com/canonical/pragma/commit/04ebac09e2f571a611533ebf98ceba3e47fbb8f9))





# [0.18.0](https://github.com/canonical/pragma/compare/v0.17.1...v0.18.0) (2026-03-11)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





## [0.17.1](https://github.com/canonical/pragma/compare/v0.17.0...v0.17.1) (2026-03-04)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.17.0](https://github.com/canonical/pragma/compare/v0.16.0...v0.17.0) (2026-03-04)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.16.0](https://github.com/canonical/pragma/compare/v0.16.0-experimental.1...v0.16.0) (2026-03-03)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.16.0-experimental.1](https://github.com/canonical/pragma/compare/v0.16.0-experimental.0...v0.16.0-experimental.1) (2026-03-03)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





## [0.15.1](https://github.com/canonical/pragma/compare/v0.15.0...v0.15.1) (2026-02-23)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.15.0](https://github.com/canonical/pragma/compare/v0.15.0-experimental.0...v0.15.0) (2026-02-20)


### Features

* **react/ssr:** add StringRenderer and some refactoring ([#411](https://github.com/canonical/pragma/issues/411)) ([fede428](https://github.com/canonical/pragma/commit/fede428fcf7a5bf5b90c9b1ff59482af04a2c287))





# [0.15.0-experimental.0](https://github.com/canonical/pragma/compare/v0.14.0...v0.15.0-experimental.0) (2026-02-17)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.14.0](https://github.com/canonical/pragma/compare/v0.13.0...v0.14.0) (2026-02-16)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.13.0](https://github.com/canonical/pragma/compare/v0.13.0-experimental.0...v0.13.0) (2026-02-10)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.13.0-experimental.0](https://github.com/canonical/pragma/compare/v0.12.0...v0.13.0-experimental.0) (2026-02-10)


### Features

* **storybook:** enhance configuration for Svelte support ([#415](https://github.com/canonical/pragma/issues/415)) ([af589bd](https://github.com/canonical/pragma/commit/af589bd9e4a63a3138551b998f7f8fe8d507a023))





# [0.12.0](https://github.com/canonical/pragma/compare/v0.12.0-experimental.0...v0.12.0) (2026-02-06)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.12.0-experimental.0](https://github.com/canonical/pragma/compare/v0.11.0...v0.12.0-experimental.0) (2026-01-26)


### Features

* **components:** Ft components ([#393](https://github.com/canonical/pragma/issues/393)) ([abbe615](https://github.com/canonical/pragma/commit/abbe6150c52deefffb7e9e7fbfee8a3b6ffb94c6))





# [0.11.0](https://github.com/canonical/pragma/compare/v0.10.0-experimental.8...v0.11.0) (2026-01-18)


### Features

* Dependency updates layers 1-4 ([#381](https://github.com/canonical/pragma/issues/381)) ([e84c7a9](https://github.com/canonical/pragma/commit/e84c7a9909e3c12aa33f346ccde2e9acddf65e2f))
* Storybook 10 update ([#379](https://github.com/canonical/pragma/issues/379)) ([cc65ea6](https://github.com/canonical/pragma/commit/cc65ea6693f38a72066b711f072ded03bafceb9d))





# [0.10.0](https://github.com/canonical/pragma/compare/v0.10.0-experimental.8...v0.10.0) (2026-01-18)


### Features

* Storybook 10 update ([#379](https://github.com/canonical/pragma/issues/379)) ([cc65ea6](https://github.com/canonical/pragma/commit/cc65ea6693f38a72066b711f072ded03bafceb9d))





# [0.10.0-experimental.8](https://github.com/canonical/pragma/compare/v0.10.0-experimental.7...v0.10.0-experimental.8) (2025-12-04)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.10.0-experimental.7](https://github.com/canonical/pragma/compare/v0.10.0-experimental.6...v0.10.0-experimental.7) (2025-12-03)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.10.0-experimental.6](https://github.com/canonical/pragma/compare/v0.10.0-experimental.5...v0.10.0-experimental.6) (2025-11-24)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.10.0-experimental.5](https://github.com/canonical/pragma/compare/v0.10.0-experimental.4...v0.10.0-experimental.5) (2025-10-17)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.10.0-experimental.4](https://github.com/canonical/pragma/compare/v0.10.0-experimental.3...v0.10.0-experimental.4) (2025-09-25)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.10.0-experimental.3](https://github.com/canonical/pragma/compare/v0.10.0-experimental.2...v0.10.0-experimental.3) (2025-09-18)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.10.0-experimental.0](https://github.com/canonical/pragma/compare/v0.9.1-experimental.0...v0.10.0-experimental.0) (2025-07-30)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.9.0](https://github.com/canonical/pragma/compare/v0.9.0-experimental.22...v0.9.0) (2025-06-27)


### Bug Fixes

* Fix implciit dependencies ([#276](https://github.com/canonical/pragma/issues/276)) ([a1b007c](https://github.com/canonical/pragma/commit/a1b007c0d6ab26318c745e48f250a0c0c30a0716))





# [0.9.0-experimental.22](https://github.com/canonical/pragma/compare/v0.9.0-experimental.21...v0.9.0-experimental.22) (2025-06-26)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.9.0-experimental.21](https://github.com/canonical/pragma/compare/v0.9.0-experimental.20...v0.9.0-experimental.21) (2025-06-24)


### Bug Fixes

* **deps:** update storybook monorepo to v9 (major) ([#242](https://github.com/canonical/pragma/issues/242)) ([3bbdb4b](https://github.com/canonical/pragma/commit/3bbdb4b9299565f84081fe882d9a2fd85197b8ee))


### Features

* **ds-core-form:** Middleware examples, MSW, Stories ([#225](https://github.com/canonical/pragma/issues/225)) ([301cbb8](https://github.com/canonical/pragma/commit/301cbb8256531b5ee8ff4a7d0359dd317a6d430f))





# [0.9.0-experimental.20](https://github.com/canonical/ds25/compare/v0.9.0-experimental.19...v0.9.0-experimental.20) (2025-05-05)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.9.0-experimental.19](https://github.com/canonical/ds25/compare/v0.9.0-experimental.18...v0.9.0-experimental.19) (2025-04-28)


### Features

* **React Core:** Button uses `children` instead of `label` for contents ([#214](https://github.com/canonical/ds25/issues/214)) ([f31bbed](https://github.com/canonical/ds25/commit/f31bbed41ca6f3945ee1ac18da7e4068b1f2bd59))
* **Styles:** Extract baseline grid css styles to a "debug" styles package ([#203](https://github.com/canonical/ds25/issues/203)) ([30e69e4](https://github.com/canonical/ds25/commit/30e69e44799a1076c7c0b668ddb3b81b36b7d967))





# [0.9.0-experimental.13](https://github.com/canonical/ds25/compare/v0.9.0-experimental.12...v0.9.0-experimental.13) (2025-04-04)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.9.0-experimental.12](https://github.com/canonical/ds25/compare/v0.9.0-experimental.11...v0.9.0-experimental.12) (2025-04-03)


### Features

* **boilerplate:** Add storybook ([#162](https://github.com/canonical/ds25/issues/162)) ([db1fb76](https://github.com/canonical/ds25/commit/db1fb7693a48fe076ac11c52e1068845f457216e))





# [0.9.0-experimental.11](https://github.com/canonical/ds25/compare/v0.9.0-experimental.10...v0.9.0-experimental.11) (2025-03-20)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.9.0-experimental.10](https://github.com/canonical/ds25/compare/v0.9.0-experimental.9...v0.9.0-experimental.10) (2025-03-19)


### Bug Fixes

* **React Core:** UseWindowDimension is SSR-safe ([#156](https://github.com/canonical/ds25/issues/156)) ([db3c446](https://github.com/canonical/ds25/commit/db3c446cbc2dac3687d44ed5f0061c4449e18115))





# [0.9.0-experimental.9](https://github.com/canonical/ds25/compare/v0.9.0-experimental.8...v0.9.0-experimental.9) (2025-03-12)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.9.0-experimental.5](https://github.com/canonical/ds25/compare/v0.9.0-experimental.4...v0.9.0-experimental.5) (2025-03-10)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.9.0-experimental.4](https://github.com/canonical/ds25/compare/v0.9.0-experimental.3...v0.9.0-experimental.4) (2025-02-17)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.9.0-experimental.2](https://github.com/canonical/ds25/compare/v0.9.0-experimental.1...v0.9.0-experimental.2) (2025-02-12)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





# [0.9.0-experimental.1](https://github.com/canonical/ds25/compare/v0.9.0-experimental.0...v0.9.0-experimental.1) (2025-02-07)

**Note:** Version bump only for package @canonical/react-boilerplate-vite





## 0.9.0-experimental.0 (2025-02-06)

* chore: version bump to 0.9.0-experimental.0 ([5d06233](https://github.com/canonical/ds25/commit/5d06233))



## <small>0.8.1-experimental.0 (2025-02-04)</small>

* chore: version bump to 0.8.1-experimental.0 ([a3b4f8a](https://github.com/canonical/ds25/commit/a3b4f8a))



## <small>0.7.1-experimental.0 (2025-01-17)</small>

* chore: version bump to 0.7.1-experimental.0 ([636cd2e](https://github.com/canonical/ds25/commit/636cd2e))
* Fix: minor monorepo improvements (#111) ([7607ee8](https://github.com/canonical/ds25/commit/7607ee8)), closes [#111](https://github.com/canonical/ds25/issues/111)
