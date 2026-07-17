# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.31.0](https://github.com/canonical/pragma/compare/v0.30.0...v0.31.0) (2026-07-17)

**Note:** Version bump only for package @canonical/task





# [0.30.0](https://github.com/canonical/pragma/compare/v0.29.1...v0.30.0) (2026-07-14)


### Bug Fixes

* **task:** route effect exceptions through recovery and trampoline preview/undo interpreters ([#740](https://github.com/canonical/pragma/issues/740)) ([6ad8b65](https://github.com/canonical/pragma/commit/6ad8b6518134f259f12acf76b21e1ce985e75403))


* refactor(task)!: scope @canonical/task to its consumer-used surface (#755) ([cdc725d](https://github.com/canonical/pragma/commit/cdc725d481d24ede55fc2f5b82cfad9b7dc088bc)), closes [#755](https://github.com/canonical/pragma/issues/755) [#741](https://github.com/canonical/pragma/issues/741) [#742](https://github.com/canonical/pragma/issues/742)


### Features

* **task:** content-addressable effect identity — canonicalJSON, EffectId, per-tag descriptors ([#741](https://github.com/canonical/pragma/issues/741)) ([f1a3a0b](https://github.com/canonical/pragma/commit/f1a3a0bacb607b51d89cf8f7d206a8252b7842bf))
* **task:** journal record/replay for deterministic effect execution ([#742](https://github.com/canonical/pragma/issues/742)) ([703db92](https://github.com/canonical/pragma/commit/703db927cf0bf9f937948817a2a2f7ba5cd1f87a))


### BREAKING CHANGES

* the journal/effect-identity exports are gone from
@canonical/task; RunTaskOptions no longer accepts `journal`.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DF9ExVCukzqpe1Fus9V1no

* chore(task): drop imports orphaned by the journal-seam test removal

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DF9ExVCukzqpe1Fus9V1no





# [0.29.0](https://github.com/canonical/pragma/compare/v0.29.0-experimental.0...v0.29.0) (2026-07-03)

**Note:** Version bump only for package @canonical/task





# [0.29.0-experimental.0](https://github.com/canonical/pragma/compare/v0.28.0...v0.29.0-experimental.0) (2026-06-24)


### Features

* **task:** stack-safe trampoline interpreter + effect-alphabet generics ([#691](https://github.com/canonical/pragma/issues/691)) ([7dc66a3](https://github.com/canonical/pragma/commit/7dc66a3b6ca939bf9970903af241d947b6187fd0))





# [0.28.0](https://github.com/canonical/pragma/compare/v0.27.1-experimental.0...v0.28.0) (2026-06-16)


### Features

* **summon-application:** add domain, route, and wrapper generators ([#626](https://github.com/canonical/pragma/issues/626)) ([6744b08](https://github.com/canonical/pragma/commit/6744b084236175b121f7aec36859976b5028a33e)), closes [#617](https://github.com/canonical/pragma/issues/617) [#643](https://github.com/canonical/pragma/issues/643)





## [0.27.1-experimental.0](https://github.com/canonical/pragma/compare/v0.28.0-experimental.0...v0.27.1-experimental.0) (2026-05-21)


### Bug Fixes

* **release:** unblock lerna 9 publish (access via publishConfig) ([#637](https://github.com/canonical/pragma/issues/637)) ([acc1185](https://github.com/canonical/pragma/commit/acc1185b43290c1edd88da25c000f7d9494caee6))





# [0.27.0](https://github.com/canonical/pragma/compare/v0.26.0...v0.27.0) (2026-04-29)

**Note:** Version bump only for package @canonical/task





# [0.26.0](https://github.com/canonical/pragma/compare/v0.25.0...v0.26.0) (2026-04-24)

**Note:** Version bump only for package @canonical/task





# [0.25.0](https://github.com/canonical/pragma/compare/v0.24.0...v0.25.0) (2026-04-17)

**Note:** Version bump only for package @canonical/task





# [0.24.0](https://github.com/canonical/pragma/compare/v0.23.0...v0.24.0) (2026-04-13)

**Note:** Version bump only for package @canonical/task





# [0.23.0](https://github.com/canonical/pragma/compare/v0.22.1...v0.23.0) (2026-04-07)

**Note:** Version bump only for package @canonical/task





# [0.22.0](https://github.com/canonical/pragma/compare/v0.22.0-experimental.0...v0.22.0) (2026-04-03)

**Note:** Version bump only for package @canonical/task





# [0.21.0](https://github.com/canonical/pragma/compare/v0.20.1...v0.21.0) (2026-04-01)


### Features

* **styles:** spacing tokens, canonical borders, self-hosted fonts, addon-utils toolbar ([#552](https://github.com/canonical/pragma/issues/552)) ([b7f0adc](https://github.com/canonical/pragma/commit/b7f0adc3f83dabf95b7272ce60e01de3110706c4))





# [0.20.0](https://github.com/canonical/pragma/compare/v0.19.0...v0.20.0) (2026-03-26)

**Note:** Version bump only for package @canonical/task





# [0.19.0](https://github.com/canonical/pragma/compare/v0.18.0...v0.19.0) (2026-03-26)


### Features

* **cli-framework:** add cli-framework package, build and webarchitect checks (v0.1-P3) ([#490](https://github.com/canonical/pragma/issues/490)) ([549806d](https://github.com/canonical/pragma/commit/549806dc5626a8f0165ca6daeb1abc65bb52d32b))
* **cli-framework:** add generator-to-CLI bridge modules (v0.1-P3b) ([#494](https://github.com/canonical/pragma/issues/494)) ([8bbaf5f](https://github.com/canonical/pragma/commit/8bbaf5fa68507b5f7de8301a9f481103e9aaf211))
* **harness:** creates the @canonical/harnesses package ([#486](https://github.com/canonical/pragma/issues/486)) ([6e11f7d](https://github.com/canonical/pragma/commit/6e11f7d0a9bd1849edd3d95ffa1124deecbdd182))
* **task,summon-core:** extract @canonical/task, restructure summon as @canonical/summon-core (v0.1-P1+P2) ([#484](https://github.com/canonical/pragma/issues/484)) ([1493baf](https://github.com/canonical/pragma/commit/1493baf6b28a9d5cbd7e4e13009f105945df72a9))
* **task:** add Symlink effect, switchMap, gen(), suppressed errors, AbortSignal (v0.1-P1b) ([#489](https://github.com/canonical/pragma/issues/489)) ([b199523](https://github.com/canonical/pragma/commit/b19952348be60e815e8c33477dbb02380ff4e139))
* **task:** add undo interpreter and --undo flag across CLI ([#538](https://github.com/canonical/pragma/issues/538)) ([8c2fff5](https://github.com/canonical/pragma/commit/8c2fff58eb4e5527e4ca2aa1bd7e9f42b3cf70ee))
