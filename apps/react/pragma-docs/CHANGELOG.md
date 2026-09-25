# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.41.0](https://github.com/canonical/pragma/compare/v0.40.0...v0.41.0) (2026-09-25)

**Note:** Version bump only for package @canonical/pragma-docs





# [0.40.0](https://github.com/canonical/pragma/compare/v0.39.0...v0.40.0) (2026-09-20)

**Note:** Version bump only for package @canonical/pragma-docs





# [0.39.0](https://github.com/canonical/pragma/compare/v0.38.0...v0.39.0) (2026-09-18)

**Note:** Version bump only for package @canonical/pragma-docs





# [0.38.0](https://github.com/canonical/pragma/compare/v0.37.0...v0.38.0) (2026-09-16)

* feat(react-head)!: render head tags so server rendering emits them (#1192) ([76ac99d](https://github.com/canonical/pragma/commit/76ac99dde1d80790d8ac518c485548831a69c26a)), closes [#1192](https://github.com/canonical/pragma/issues/1192)

### Features

* **pragma-docs:** add the documentation site ([#1112](https://github.com/canonical/pragma/issues/1112)) ([25bb918](https://github.com/canonical/pragma/commit/25bb91878979f029c7784fb79036d6d5265cf0b9))
* **prism-pragma-provider:** compile pragma's TTL corpus into a schema ([#1110](https://github.com/canonical/pragma/issues/1110)) ([2137b6b](https://github.com/canonical/pragma/commit/2137b6b8b9df5a0aa049a0de85750f71d3a00304))
* **react-hooks:** add usePreferredShortcuts, a switch for single-key shortcuts ([#1265](https://github.com/canonical/pragma/issues/1265)) ([b4b1b1f](https://github.com/canonical/pragma/commit/b4b1b1f9718fb20c97ec4d59225fac3244dc4b93))

### BREAKING CHANGES

* `useHead`, `createHeadCollector`, `HeadTags` and
  `HeadCollector` are gone, and `HeadProvider` no longer takes a `collector`.
  `HeadMeta` and `HeadLink` survive as the elements own props rather than
  hand-written attribute lists, so a page can declare the preload, icon and
  hreflang links the old shapes rejected.
  Replace a `useHead({ title, meta, link })` call with a `<Head title meta link />`
  element rendered by the page, and move any per-page title suffix into the root
  `<HeadProvider titleTemplate={…}>`. A `deps` array has no successor and needs
