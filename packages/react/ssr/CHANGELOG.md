# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.23.0](https://github.com/canonical/pragma/compare/v0.22.1...v0.23.0) (2026-04-07)


### Features

* **react-ssr:** add TextRenderer + migrate consumers to new API ([#594](https://github.com/canonical/pragma/issues/594)) ([78c9737](https://github.com/canonical/pragma/commit/78c973714ef6792bceec5a57c7426d9f24406cf6))
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

**Note:** Version bump only for package @canonical/react-ssr





# [0.21.0](https://github.com/canonical/pragma/compare/v0.20.1...v0.21.0) (2026-04-01)


### Bug Fixes

* **deps:** update dependency domhandler to v6 ([#547](https://github.com/canonical/pragma/issues/547)) ([d823ba0](https://github.com/canonical/pragma/commit/d823ba0e4d9518357049b78e18d571400792f2a3))





# [0.20.0](https://github.com/canonical/pragma/compare/v0.19.0...v0.20.0) (2026-03-26)

**Note:** Version bump only for package @canonical/react-ssr





# [0.19.0](https://github.com/canonical/pragma/compare/v0.18.0...v0.19.0) (2026-03-26)

**Note:** Version bump only for package @canonical/react-ssr





# [0.18.0](https://github.com/canonical/pragma/compare/v0.17.1...v0.18.0) (2026-03-11)

**Note:** Version bump only for package @canonical/react-ssr





## [0.17.1](https://github.com/canonical/ds25/compare/v0.17.0...v0.17.1) (2026-03-04)

**Note:** Version bump only for package @canonical/react-ssr





# [0.17.0](https://github.com/canonical/ds25/compare/v0.16.0...v0.17.0) (2026-03-04)

**Note:** Version bump only for package @canonical/react-ssr





# [0.16.0](https://github.com/canonical/ds25/compare/v0.16.0-experimental.1...v0.16.0) (2026-03-03)

**Note:** Version bump only for package @canonical/react-ssr





# [0.16.0-experimental.1](https://github.com/canonical/ds25/compare/v0.16.0-experimental.0...v0.16.0-experimental.1) (2026-03-03)


### Features

* **react/ssr:** add option to pass custom callbacks to renderer ([#427](https://github.com/canonical/ds25/issues/427)) ([b56ee62](https://github.com/canonical/ds25/commit/b56ee622c7c8b4ff4c54d9c6d90910d14aa63cfd))





## [0.15.1](https://github.com/canonical/ds25/compare/v0.15.0...v0.15.1) (2026-02-23)

**Note:** Version bump only for package @canonical/react-ssr





# [0.15.0](https://github.com/canonical/ds25/compare/v0.15.0-experimental.0...v0.15.0) (2026-02-20)


### Features

* **react/ssr:** add StringRenderer and some refactoring ([#411](https://github.com/canonical/ds25/issues/411)) ([fede428](https://github.com/canonical/ds25/commit/fede428fcf7a5bf5b90c9b1ff59482af04a2c287))





# [0.14.0](https://github.com/canonical/ds25/compare/v0.13.0...v0.14.0) (2026-02-16)

**Note:** Version bump only for package @canonical/react-ssr





# [0.13.0](https://github.com/canonical/ds25/compare/v0.13.0-experimental.0...v0.13.0) (2026-02-10)

**Note:** Version bump only for package @canonical/react-ssr





# [0.12.0](https://github.com/canonical/ds25/compare/v0.12.0-experimental.0...v0.12.0) (2026-02-06)

**Note:** Version bump only for package @canonical/react-ssr





# [0.12.0-experimental.0](https://github.com/canonical/ds25/compare/v0.11.0...v0.12.0-experimental.0) (2026-01-26)


### Features

* **documentation:** Enhanced documentation ([#389](https://github.com/canonical/ds25/issues/389)) ([03ab19a](https://github.com/canonical/ds25/commit/03ab19aa2fbebf5ef7cd403652f6fa4627ca619e))





# [0.11.0](https://github.com/canonical/ds25/compare/v0.10.0-experimental.8...v0.11.0) (2026-01-18)


### Features

* Dependency updates layers 1-4 ([#381](https://github.com/canonical/ds25/issues/381)) ([e84c7a9](https://github.com/canonical/ds25/commit/e84c7a9909e3c12aa33f346ccde2e9acddf65e2f))
* **monorepo:** Webarchitect consumption ([#378](https://github.com/canonical/ds25/issues/378)) ([badd693](https://github.com/canonical/ds25/commit/badd69313bca1f1de4b02c2947c85fffe830422f))





# [0.10.0](https://github.com/canonical/ds25/compare/v0.10.0-experimental.8...v0.10.0) (2026-01-18)

**Note:** Version bump only for package @canonical/react-ssr





# [0.10.0-experimental.4](https://github.com/canonical/ds25/compare/v0.10.0-experimental.3...v0.10.0-experimental.4) (2025-09-25)

**Note:** Version bump only for package @canonical/react-ssr





# [0.10.0-experimental.3](https://github.com/canonical/ds25/compare/v0.10.0-experimental.2...v0.10.0-experimental.3) (2025-09-18)

**Note:** Version bump only for package @canonical/react-ssr





# [0.10.0-experimental.0](https://github.com/canonical/ds25/compare/v0.9.1-experimental.0...v0.10.0-experimental.0) (2025-07-30)

**Note:** Version bump only for package @canonical/react-ssr





# [0.9.0](https://github.com/canonical/ds25/compare/v0.9.0-experimental.22...v0.9.0) (2025-06-27)

**Note:** Version bump only for package @canonical/react-ssr





# [0.9.0-experimental.21](https://github.com/canonical/ds25/compare/v0.9.0-experimental.20...v0.9.0-experimental.21) (2025-06-24)

**Note:** Version bump only for package @canonical/react-ssr





# [0.9.0-experimental.12](https://github.com/canonical/ds25/compare/v0.9.0-experimental.11...v0.9.0-experimental.12) (2025-04-03)

**Note:** Version bump only for package @canonical/react-ssr





# [0.9.0-experimental.10](https://github.com/canonical/ds25/compare/v0.9.0-experimental.9...v0.9.0-experimental.10) (2025-03-19)

**Note:** Version bump only for package @canonical/react-ssr





# [0.9.0-experimental.9](https://github.com/canonical/ds25/compare/v0.9.0-experimental.8...v0.9.0-experimental.9) (2025-03-12)

**Note:** Version bump only for package @canonical/react-ssr





# [0.9.0-experimental.4](https://github.com/canonical/ds25/compare/v0.9.0-experimental.3...v0.9.0-experimental.4) (2025-02-17)

**Note:** Version bump only for package @canonical/react-ssr





# [0.9.0-experimental.2](https://github.com/canonical/ds25/compare/v0.9.0-experimental.1...v0.9.0-experimental.2) (2025-02-12)

**Note:** Version bump only for package @canonical/react-ssr





# [0.9.0-experimental.1](https://github.com/canonical/ds25/compare/v0.9.0-experimental.0...v0.9.0-experimental.1) (2025-02-07)

**Note:** Version bump only for package @canonical/react-ssr





## 0.9.0-experimental.0 (2025-02-06)

* chore: version bump to 0.9.0-experimental.0 ([5d06233](https://github.com/canonical/ds25/commit/5d06233))



## <small>0.7.1-experimental.0 (2025-01-17)</small>

* chore: version bump to 0.7.1-experimental.0 ([636cd2e](https://github.com/canonical/ds25/commit/636cd2e))
* Fix: minor monorepo improvements (#111) ([7607ee8](https://github.com/canonical/ds25/commit/7607ee8)), closes [#111](https://github.com/canonical/ds25/issues/111)



## 0.7.0-experimental.0 (2025-01-14)

* chore: version bump to 0.7.0-experimental.0 ([11146c0](https://github.com/canonical/ds25/commit/11146c0))
* feat: base ssr (#108) ([acb740c](https://github.com/canonical/ds25/commit/acb740c)), closes [#108](https://github.com/canonical/ds25/issues/108)
