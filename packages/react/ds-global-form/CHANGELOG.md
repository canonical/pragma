# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.33.0](https://github.com/canonical/pragma/compare/v0.32.0...v0.33.0) (2026-07-24)

**Note:** Version bump only for package @canonical/react-ds-global-form





# [0.32.0](https://github.com/canonical/pragma/compare/v0.31.0...v0.32.0) (2026-07-20)


### Bug Fixes

* **components:** design-review batch — h5 small-caps, SwitchField, Tabs, ContextualMenu, Field.Description, density retune ([#871](https://github.com/canonical/pragma/issues/871)) ([d9a568e](https://github.com/canonical/pragma/commit/d9a568ecd8ec0b2a5481c8f6827aece698eec751))
* **form:** centre checkbox/switch on the label's first line (AV-325) ([#870](https://github.com/canonical/pragma/issues/870)) ([15cf3be](https://github.com/canonical/pragma/commit/15cf3bed7a16618cad535660e95e19ee4032f622))
* **react/ds-global-form:** design-review gate — validation scope, disabled border, 8px label gap ([#860](https://github.com/canonical/pragma/issues/860)) ([e14ec8e](https://github.com/canonical/pragma/commit/e14ec8ea91e967d28d6a766208d34fdced27fa75))


### Features

* **components:** intrinsic control seat — one seat, no fixed heights (AV-323, AV-327) ([#873](https://github.com/canonical/pragma/issues/873)) ([4d5cbe8](https://github.com/canonical/pragma/commit/4d5cbe8631855864f48805a1ca07c76dd0cfb7bf)), closes [#871](https://github.com/canonical/pragma/issues/871) [#15](https://github.com/canonical/pragma/issues/15)





# [0.31.0](https://github.com/canonical/pragma/compare/v0.30.0...v0.31.0) (2026-07-17)


### Bug Fixes

* **density:** seat ds-global Button + restore control sizes ([#813](https://github.com/canonical/pragma/issues/813)) ([#814](https://github.com/canonical/pragma/issues/814)) ([78c8ed1](https://github.com/canonical/pragma/commit/78c8ed1ee4d21ec20c863edc2f7d68f4c3643dc6)), closes [#803](https://github.com/canonical/pragma/issues/803) [#812](https://github.com/canonical/pragma/issues/812) [#812](https://github.com/canonical/pragma/issues/812)
* **ds-global-form:** min/max & file validation, helper story, danger label ([#802](https://github.com/canonical/pragma/issues/802)) ([5cc9cec](https://github.com/canonical/pragma/commit/5cc9cec114ed3486ec51880295b1573a43add4e6))
* **ds-global,ds-global-form,styles:** token, colour & typography corrections from design review ([#764](https://github.com/canonical/pragma/issues/764)) ([89f8d44](https://github.com/canonical/pragma/commit/89f8d440a98f4ff0b3d42f17611f134e835d4295)), closes [#748](https://github.com/canonical/pragma/issues/748) [#748](https://github.com/canonical/pragma/issues/748)
* **ds-global:** sizing, spacing & alignment from design review ([#766](https://github.com/canonical/pragma/issues/766)) ([a78939a](https://github.com/canonical/pragma/commit/a78939afaa20d63f96225f3ff484fac02d15ffc2)), closes [#764](https://github.com/canonical/pragma/issues/764) [#801](https://github.com/canonical/pragma/issues/801)
* **react/ds-global-form:** re-render field error when message changes on cross-field revalidation ([#850](https://github.com/canonical/pragma/issues/850)) ([749ecb7](https://github.com/canonical/pragma/commit/749ecb76a4d88cca3da440987a68bb13dc3ea802))


### Features

* **density:** density model + 2×3 form-channel matrix, prose partition, guides ([#805](https://github.com/canonical/pragma/issues/805)) ([2f04495](https://github.com/canonical/pragma/commit/2f0449508fc25ccffeecf01942756eca66832ba7)), closes [#804](https://github.com/canonical/pragma/issues/804) [#806](https://github.com/canonical/pragma/issues/806)





# [0.30.0](https://github.com/canonical/pragma/compare/v0.29.1...v0.30.0) (2026-07-14)


### Bug Fixes

* **deps:** unify @canonical/design-tokens pin to 0.6.2-contrasted.0 ([#748](https://github.com/canonical/pragma/issues/748)) ([cf607d7](https://github.com/canonical/pragma/commit/cf607d7ae40f8044208e1e502c8d92178261e73c)), closes [#731](https://github.com/canonical/pragma/issues/731) [#89](https://github.com/canonical/pragma/issues/89)
* **ds-global-form:** clear all selections on multiple-combobox reset ([#724](https://github.com/canonical/pragma/issues/724)) ([ff5c972](https://github.com/canonical/pragma/commit/ff5c9729adaba2ea032ae8c7830757dfee15e8a6))


### Features

* **ds-global-form:** add RatingInput (work in progress) ([#735](https://github.com/canonical/pragma/issues/735)) ([35f0736](https://github.com/canonical/pragma/commit/35f073619a414d5ff60d66d3fe2be9b25015c9b1))
* **ds-global-form:** SwitchInput + SwitchField ([#722](https://github.com/canonical/pragma/issues/722)) ([4047696](https://github.com/canonical/pragma/commit/4047696371de06f850f7287e225de096a8e80bd1))





## [0.29.1](https://github.com/canonical/pragma/compare/v0.29.0...v0.29.1) (2026-07-03)


### Bug Fixes

* **storybook:** sidebar order + tier-scope stories to work-in-progress + docs ([#719](https://github.com/canonical/pragma/issues/719)) ([a26fe7f](https://github.com/canonical/pragma/commit/a26fe7ffdec6ed701fd242ae725461054a006c04)), closes [#31842](https://github.com/canonical/pragma/issues/31842) [storybookjs/storybook#31842](https://github.com/storybookjs/storybook/issues/31842)





# [0.29.0](https://github.com/canonical/pragma/compare/v0.29.0-experimental.0...v0.29.0) (2026-07-03)


### Code Refactoring

* **ds-global-form:** rename SimpleChoicesField→ChoicesField, ChoicesField→RichChoicesField ([#711](https://github.com/canonical/pragma/issues/711)) ([4a4a498](https://github.com/canonical/pragma/commit/4a4a4988a25df45f9f102f2540efa4ac958e82ae))


### Features

* **ds-global-form:** required/optional marking, checkbox checkmark colour, choices columns ([#706](https://github.com/canonical/pragma/issues/706)) ([85963c9](https://github.com/canonical/pragma/commit/85963c9235b3dec86ca0a78cb53f478f2ef9c5dd))
* **react-ds-global-form:** PhoneInput dial-code sort + emoji-flag option ([#703](https://github.com/canonical/pragma/issues/703)) ([2ff5643](https://github.com/canonical/pragma/commit/2ff564309418eb29a51f0865f40d996fe07bab02))
* **react-ds-global-form:** RangeField synced number + slider (DE080) ([#705](https://github.com/canonical/pragma/issues/705)) ([7c3d59a](https://github.com/canonical/pragma/commit/7c3d59aeae7d616958c8a192ea9d28d6ec09a31a))


### BREAKING CHANGES

* **ds-global-form:** the 'simple-choices'/'choices' inputType strings and the
.ds.form-* class names change, so consumers selecting these via <Field> or
theming the classes must update.

tsc + biome + full suite (236) pass; storybook builds.

* refactor(storybook-config): upstream the ontology-tier story order

Move the sidebar story order from ds-global-form's local preview override into
the shared @canonical/storybook-config, so every Storybook orders by ontology
tier: Documentation, subcomponents, components, patterns, common, utils, and a
trailing _work_in_progress folder for not-yet-tiered stories.

Drop the non-folder entries from the order list — the nested
[Introduction, Getting Started, Guides] docs sub-array (docs order is out of
scope here) and the '*' wildcard — since every story is foldered. ds-global-form
now inherits the order and no longer overrides storySort locally.

Replaces the previous maturity order (Stable/Beta/Experimental) shared config
default; this changes the sidebar order for all consumers.

check passes for both packages; form storybook builds against the rebuilt config.





# [0.29.0-experimental.0](https://github.com/canonical/pragma/compare/v0.28.0...v0.29.0-experimental.0) (2026-06-24)

**Note:** Version bump only for package @canonical/react-ds-global-form





# [0.28.0](https://github.com/canonical/pragma/compare/v0.27.1-experimental.0...v0.28.0) (2026-06-16)

**Note:** Version bump only for package @canonical/react-ds-global-form





## [0.27.1-experimental.0](https://github.com/canonical/pragma/compare/v0.28.0-experimental.0...v0.27.1-experimental.0) (2026-05-21)


### Bug Fixes

* **release:** unblock lerna 9 publish (access via publishConfig) ([#637](https://github.com/canonical/pragma/issues/637)) ([acc1185](https://github.com/canonical/pragma/commit/acc1185b43290c1edd88da25c000f7d9494caee6))





# [0.27.0](https://github.com/canonical/pragma/compare/v0.26.0...v0.27.0) (2026-04-29)

**Note:** Version bump only for package @canonical/react-ds-global-form





# [0.26.0](https://github.com/canonical/pragma/compare/v0.25.0...v0.26.0) (2026-04-24)

**Note:** Version bump only for package @canonical/react-ds-global-form





# [0.25.0](https://github.com/canonical/pragma/compare/v0.24.0...v0.25.0) (2026-04-17)

**Note:** Version bump only for package @canonical/react-ds-global-form





# [0.24.0](https://github.com/canonical/pragma/compare/v0.23.0...v0.24.0) (2026-04-13)

**Note:** Version bump only for package @canonical/react-ds-global-form





# [0.23.0](https://github.com/canonical/pragma/compare/v0.22.1...v0.23.0) (2026-04-07)

**Note:** Version bump only for package @canonical/react-ds-global-form





# [0.22.0](https://github.com/canonical/pragma/compare/v0.22.0-experimental.0...v0.22.0) (2026-04-03)

**Note:** Version bump only for package @canonical/react-ds-global-form





# [0.21.0](https://github.com/canonical/pragma/compare/v0.20.1...v0.21.0) (2026-04-01)


### Features

* **form,styles,typography:** baseline grid alignment for form fields ([#571](https://github.com/canonical/pragma/issues/571)) ([2f9c5aa](https://github.com/canonical/pragma/commit/2f9c5aafbd69815867a7449d16771d3d3c729912))
* **styles:** spacing tokens, canonical borders, self-hosted fonts, addon-utils toolbar ([#552](https://github.com/canonical/pragma/issues/552)) ([b7f0adc](https://github.com/canonical/pragma/commit/b7f0adc3f83dabf95b7272ce60e01de3110706c4))





# [0.20.0](https://github.com/canonical/pragma/compare/v0.19.0...v0.20.0) (2026-03-26)

**Note:** Version bump only for package @canonical/react-ds-global-form





# [0.19.0](https://github.com/canonical/pragma/compare/v0.18.0...v0.19.0) (2026-03-26)


### Bug Fixes

* **ci:** add missing build step to push workflow, replace workspace: protocol ([#521](https://github.com/canonical/pragma/issues/521)) ([0e88312](https://github.com/canonical/pragma/commit/0e883120c96034d180de0ebdde6e9740d97609fe)), closes [#512](https://github.com/canonical/pragma/issues/512)
* **react-ds-global-form:** fix runtime bugs, add Form component and testing utils ([#481](https://github.com/canonical/pragma/issues/481)) ([8a3bcc7](https://github.com/canonical/pragma/commit/8a3bcc734ab10c39a854ef9beeea492a3eff6280))


### Features

* **ds-global-form:** add Date,   FileUpload, Color, Phone, and Choices inputs (P3 pt3) ([#499](https://github.com/canonical/pragma/issues/499)) ([9ea831d](https://github.com/canonical/pragma/commit/9ea831dd9c581b003f3e2baabcc21ad23e862897))
* **ds-global-form:** add token layer, input chrome, and semantic class rename ([#496](https://github.com/canonical/pragma/issues/496)) ([00c6f16](https://github.com/canonical/pragma/commit/00c6f16e862ced706f93f1cfb37e59cb0ec2e8ae))
* **ds-global-form:** styles pt1 and addon-form ([#493](https://github.com/canonical/pragma/issues/493)) ([b1b2068](https://github.com/canonical/pragma/commit/b1b2068f2541df5b47e9f462b9124cefa4a28efb)), closes [storybookjs/storybook#31842](https://github.com/storybookjs/storybook/issues/31842)
* **storybook:** unified Storybook hub for all React packages ([#529](https://github.com/canonical/pragma/issues/529)) ([3a2d56c](https://github.com/canonical/pragma/commit/3a2d56cdceb43bdd5b8c4578d40283518bfce80d)), closes [#31842](https://github.com/canonical/pragma/issues/31842)


### Performance Improvements

* upgrade vite 7 → 8 (Rolldown) for ~10% faster builds ([#527](https://github.com/canonical/pragma/issues/527)) ([04ebac0](https://github.com/canonical/pragma/commit/04ebac09e2f571a611533ebf98ceba3e47fbb8f9))





# [0.18.0](https://github.com/canonical/pragma/compare/v0.17.1...v0.18.0) (2026-03-11)

**Note:** Version bump only for package @canonical/react-ds-global-form





## [0.17.1](https://github.com/canonical/ds25/compare/v0.17.0...v0.17.1) (2026-03-04)

**Note:** Version bump only for package @canonical/react-ds-global-form





# [0.17.0](https://github.com/canonical/ds25/compare/v0.16.0...v0.17.0) (2026-03-04)

**Note:** Version bump only for package @canonical/react-ds-global-form





# [0.16.0](https://github.com/canonical/ds25/compare/v0.16.0-experimental.1...v0.16.0) (2026-03-03)

**Note:** Version bump only for package @canonical/react-ds-global-form





# [0.16.0-experimental.1](https://github.com/canonical/ds25/compare/v0.16.0-experimental.0...v0.16.0-experimental.1) (2026-03-03)

**Note:** Version bump only for package @canonical/react-ds-global-form





## [0.15.1](https://github.com/canonical/ds25/compare/v0.15.0...v0.15.1) (2026-02-23)

**Note:** Version bump only for package @canonical/react-ds-global-form





# [0.15.0](https://github.com/canonical/ds25/compare/v0.15.0-experimental.0...v0.15.0) (2026-02-20)

**Note:** Version bump only for package @canonical/react-ds-global-form





# [0.15.0-experimental.0](https://github.com/canonical/ds25/compare/v0.14.0...v0.15.0-experimental.0) (2026-02-17)

**Note:** Version bump only for package @canonical/react-ds-global-form





# [0.14.0](https://github.com/canonical/ds25/compare/v0.13.0...v0.14.0) (2026-02-16)

**Note:** Version bump only for package @canonical/react-ds-global-form





# [0.13.0](https://github.com/canonical/ds25/compare/v0.13.0-experimental.0...v0.13.0) (2026-02-10)

**Note:** Version bump only for package @canonical/react-ds-global-form





# [0.13.0-experimental.0](https://github.com/canonical/ds25/compare/v0.12.0...v0.13.0-experimental.0) (2026-02-10)


### Features

* **storybook:** enhance configuration for Svelte support ([#415](https://github.com/canonical/ds25/issues/415)) ([af589bd](https://github.com/canonical/ds25/commit/af589bd9e4a63a3138551b998f7f8fe8d507a023))





# [0.12.0](https://github.com/canonical/ds25/compare/v0.12.0-experimental.0...v0.12.0) (2026-02-06)


### Features

* eap packages ([#409](https://github.com/canonical/ds25/issues/409)) ([f7a6c56](https://github.com/canonical/ds25/commit/f7a6c56d0429d19e521296141805eaef37ce9cb3))





# [0.12.0-experimental.0](https://github.com/canonical/ds25/compare/v0.11.0...v0.12.0-experimental.0) (2026-01-26)


### Features

* **components:** Ft components ([#393](https://github.com/canonical/ds25/issues/393)) ([abbe615](https://github.com/canonical/ds25/commit/abbe6150c52deefffb7e9e7fbfee8a3b6ffb94c6))
* **documentation:** Enhanced documentation ([#389](https://github.com/canonical/ds25/issues/389)) ([03ab19a](https://github.com/canonical/ds25/commit/03ab19aa2fbebf5ef7cd403652f6fa4627ca619e))
* **lib:** Enforces the lib folder convention, driveby global-form fixes ([#391](https://github.com/canonical/ds25/issues/391)) ([c908437](https://github.com/canonical/ds25/commit/c908437c558cb01f79c5a3df246cd25bc65542fb))





# [0.11.0](https://github.com/canonical/ds25/compare/v0.10.0-experimental.8...v0.11.0) (2026-01-18)


### Features

* Dependency updates layers 1-4 ([#381](https://github.com/canonical/ds25/issues/381)) ([e84c7a9](https://github.com/canonical/ds25/commit/e84c7a9909e3c12aa33f346ccde2e9acddf65e2f))
* **monorepo:** Webarchitect consumption ([#378](https://github.com/canonical/ds25/issues/378)) ([badd693](https://github.com/canonical/ds25/commit/badd69313bca1f1de4b02c2947c85fffe830422f))
* Storybook 10 update ([#379](https://github.com/canonical/ds25/issues/379)) ([cc65ea6](https://github.com/canonical/ds25/commit/cc65ea6693f38a72066b711f072ded03bafceb9d))





# [0.10.0](https://github.com/canonical/ds25/compare/v0.10.0-experimental.8...v0.10.0) (2026-01-18)


### Features

* Storybook 10 update ([#379](https://github.com/canonical/ds25/issues/379)) ([cc65ea6](https://github.com/canonical/ds25/commit/cc65ea6693f38a72066b711f072ded03bafceb9d))





# [0.10.0-experimental.8](https://github.com/canonical/ds25/compare/v0.10.0-experimental.7...v0.10.0-experimental.8) (2025-12-04)

**Note:** Version bump only for package @canonical/react-ds-core-form





# [0.10.0-experimental.7](https://github.com/canonical/ds25/compare/v0.10.0-experimental.6...v0.10.0-experimental.7) (2025-12-03)

**Note:** Version bump only for package @canonical/react-ds-core-form





# [0.10.0-experimental.6](https://github.com/canonical/ds25/compare/v0.10.0-experimental.5...v0.10.0-experimental.6) (2025-11-24)

**Note:** Version bump only for package @canonical/react-ds-core-form





# [0.10.0-experimental.5](https://github.com/canonical/ds25/compare/v0.10.0-experimental.4...v0.10.0-experimental.5) (2025-10-17)

**Note:** Version bump only for package @canonical/react-ds-core-form





# [0.10.0-experimental.4](https://github.com/canonical/ds25/compare/v0.10.0-experimental.3...v0.10.0-experimental.4) (2025-09-25)

**Note:** Version bump only for package @canonical/react-ds-core-form





# [0.10.0-experimental.3](https://github.com/canonical/ds25/compare/v0.10.0-experimental.2...v0.10.0-experimental.3) (2025-09-18)


### Features

* **Badge:** pt. 1 - utilities for the Badge component ([#304](https://github.com/canonical/ds25/issues/304)) ([f556180](https://github.com/canonical/ds25/commit/f5561801c196a55b6b17f18156f0d9cd736da5ea))





# [0.10.0-experimental.0](https://github.com/canonical/ds25/compare/v0.9.1-experimental.0...v0.10.0-experimental.0) (2025-07-30)

**Note:** Version bump only for package @canonical/react-ds-core-form





# [0.9.0](https://github.com/canonical/ds25/compare/v0.9.0-experimental.22...v0.9.0) (2025-06-27)


### Bug Fixes

* Fix implciit dependencies ([#276](https://github.com/canonical/ds25/issues/276)) ([a1b007c](https://github.com/canonical/ds25/commit/a1b007c0d6ab26318c745e48f250a0c0c30a0716))





# [0.9.0-experimental.22](https://github.com/canonical/ds25/compare/v0.9.0-experimental.21...v0.9.0-experimental.22) (2025-06-26)

**Note:** Version bump only for package @canonical/react-ds-core-form





# [0.9.0-experimental.21](https://github.com/canonical/ds25/compare/v0.9.0-experimental.20...v0.9.0-experimental.21) (2025-06-24)


### Bug Fixes

* **deps:** update storybook monorepo to v9 (major) ([#242](https://github.com/canonical/ds25/issues/242)) ([3bbdb4b](https://github.com/canonical/ds25/commit/3bbdb4b9299565f84081fe882d9a2fd85197b8ee))
* **storybook:** enable addon themes ([#256](https://github.com/canonical/ds25/issues/256)) ([c522fc0](https://github.com/canonical/ds25/commit/c522fc05f48d39ab358773c458a53233a1259835))


### Features

* **ds-core-form:** Middleware examples, MSW, Stories ([#225](https://github.com/canonical/ds25/issues/225)) ([301cbb8](https://github.com/canonical/ds25/commit/301cbb8256531b5ee8ff4a7d0359dd317a6d430f))
* **storybook:** Storybook addon MSW ([#255](https://github.com/canonical/ds25/issues/255)) ([08e506c](https://github.com/canonical/ds25/commit/08e506c72eb01d599ba5b2fddb66b30095305ea7))





# [0.9.0-experimental.20](https://github.com/canonical/ds25/compare/v0.9.0-experimental.19...v0.9.0-experimental.20) (2025-05-05)


### Features

* **form:** tokens ([#219](https://github.com/canonical/ds25/issues/219)) ([f355abd](https://github.com/canonical/ds25/commit/f355abd4a5c3be13d417e3e381fc74485f218917))





# [0.9.0-experimental.19](https://github.com/canonical/ds25/compare/v0.9.0-experimental.18...v0.9.0-experimental.19) (2025-04-28)


### Features

* **React Core:** Button uses `children` instead of `label` for contents ([#214](https://github.com/canonical/ds25/issues/214)) ([f31bbed](https://github.com/canonical/ds25/commit/f31bbed41ca6f3945ee1ac18da7e4068b1f2bd59))





# [0.9.0-experimental.13](https://github.com/canonical/ds25/compare/v0.9.0-experimental.12...v0.9.0-experimental.13) (2025-04-04)

**Note:** Version bump only for package @canonical/react-ds-core-form





# [0.9.0-experimental.12](https://github.com/canonical/ds25/compare/v0.9.0-experimental.11...v0.9.0-experimental.12) (2025-04-03)


### Features

* **Demo site:** Demo site pt. 3 - Form components & form state ([#184](https://github.com/canonical/ds25/issues/184)) ([b203e1b](https://github.com/canonical/ds25/commit/b203e1b23b9ccb53656f70105e27d30ab328ab87))
* **ds-core-form:** boilerplate pt 4 ([#167](https://github.com/canonical/ds25/issues/167)) ([7efd638](https://github.com/canonical/ds25/commit/7efd638384f454d8aaeb0e8d39d9cbe47d6ec0ee))
* **ds-core-form:** part 5: styling and drive-bys ([#176](https://github.com/canonical/ds25/issues/176)) ([9471cc7](https://github.com/canonical/ds25/commit/9471cc745c089f4cb6b4ef030903fdcffa12fdf2))
* **form:** Ft form boilerplate pt6 - Core Combobox, No styling ([#180](https://github.com/canonical/ds25/issues/180)) ([48d0aaa](https://github.com/canonical/ds25/commit/48d0aaa4e7ba2793558779ffb6e3eded5ee4774f))
* **form:** Hidden input ([#182](https://github.com/canonical/ds25/issues/182)) ([a9365b9](https://github.com/canonical/ds25/commit/a9365b9bd12991e61801a039143bd72cf4c5b55d))
* **form:** Multiple Combobox. No styling ([#183](https://github.com/canonical/ds25/issues/183)) ([945244a](https://github.com/canonical/ds25/commit/945244aaafac37632051b9d48f976562edd68f33))





# [0.9.0-experimental.11](https://github.com/canonical/ds25/compare/v0.9.0-experimental.10...v0.9.0-experimental.11) (2025-03-20)


### Features

* **ds-core-form:** form boilerplate pt3 ([#150](https://github.com/canonical/ds25/issues/150)) ([e6193b2](https://github.com/canonical/ds25/commit/e6193b2639c0952736fab0ce82eadbf622bb3344))





# [0.9.0-experimental.10](https://github.com/canonical/ds25/compare/v0.9.0-experimental.9...v0.9.0-experimental.10) (2025-03-19)

**Note:** Version bump only for package @canonical/react-ds-core-form





# [0.9.0-experimental.9](https://github.com/canonical/ds25/compare/v0.9.0-experimental.8...v0.9.0-experimental.9) (2025-03-12)

**Note:** Version bump only for package @canonical/react-ds-core-form





# [0.9.0-experimental.5](https://github.com/canonical/ds25/compare/v0.9.0-experimental.4...v0.9.0-experimental.5) (2025-03-10)


### Features

* **form:** Ft form boilerplate ([#141](https://github.com/canonical/ds25/issues/141)) ([fee7586](https://github.com/canonical/ds25/commit/fee75868b2a084fad1addd4afcc2e661701051e0))
* **form:** Ft form boilerplate pt2 ([#143](https://github.com/canonical/ds25/issues/143)) ([b3aa16e](https://github.com/canonical/ds25/commit/b3aa16e0c41acbc24027438edd3184376a26bf86))





# [0.9.0-experimental.2](https://github.com/canonical/ds25/compare/v0.9.0-experimental.1...v0.9.0-experimental.2) (2025-02-12)


### Features

* **forms:** Added a base package for the form components ([#128](https://github.com/canonical/ds25/issues/128)) ([6f68ead](https://github.com/canonical/ds25/commit/6f68eade4bcee41988bed4826a2a4211a1c25917))
