# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.9.0-experimental.2](https://github.com/canonical/ds25/compare/v0.9.0-experimental.1...v0.9.0-experimental.2) (2025-02-12)


### Bug Fixes

* **storybook-baseline-grid:** Fix storybook baseline grid addon storybook not running ([#127](https://github.com/canonical/ds25/issues/127)) ([27474b3](https://github.com/canonical/ds25/commit/27474b3e13d43260309cc6dcfbea25b10819c826))


### Features

* **forms:** Added a base package for the form components ([#128](https://github.com/canonical/ds25/issues/128)) ([6f68ead](https://github.com/canonical/ds25/commit/6f68eade4bcee41988bed4826a2a4211a1c25917))
* **storybook:** Modularized the config creation for storybook ([#125](https://github.com/canonical/ds25/issues/125)) ([90189d8](https://github.com/canonical/ds25/commit/90189d89b5a1948a417adea245708336225f598d))
* **styles:** Implements the base style packages architecture ([#129](https://github.com/canonical/ds25/issues/129)) ([b2a7b15](https://github.com/canonical/ds25/commit/b2a7b15dac0731826d11a8746d2cb99927281191))





# [0.9.0-experimental.1](https://github.com/canonical/ds25/compare/v0.9.0-experimental.0...v0.9.0-experimental.1) (2025-02-07)

**Note:** Version bump only for package ds25





## 0.9.0-experimental.0 (2025-02-06)

* chore: version bump to 0.9.0-experimental.0 ([5d06233](https://github.com/canonical/ds25/commit/5d06233))
* chore(deps): update actions/setup-node action to v4.2.0 (#118) ([dc2637e](https://github.com/canonical/ds25/commit/dc2637e)), closes [#118](https://github.com/canonical/ds25/issues/118)
* feat(Generator): added shorthands properties `-c` for styles and `-s`for stories. (#124) ([6cd4964](https://github.com/canonical/ds25/commit/6cd4964)), closes [#124](https://github.com/canonical/ds25/issues/124)



## <small>0.8.1-experimental.0 (2025-02-04)</small>

* chore: version bump to 0.8.1-experimental.0 ([a3b4f8a](https://github.com/canonical/ds25/commit/a3b4f8a))
* chore(generator): rename style.css to styles.css, rename .test.tsx to .stories.tsx (#121) ([ccf391d](https://github.com/canonical/ds25/commit/ccf391d)), closes [#121](https://github.com/canonical/ds25/issues/121)
* fix(generator): simple fix to generator react component parent directory pascalcase bug (#122) ([d706c13](https://github.com/canonical/ds25/commit/d706c13)), closes [#122](https://github.com/canonical/ds25/issues/122)



## 0.8.0-experimental.0 (2025-01-17)

* chore: version bump to 0.8.0-experimental.0 ([2dd18de](https://github.com/canonical/ds25/commit/2dd18de))
* feat(generator): Append component re-exports to parent `index.ts` file, rename styles file (#115) ([0dcc78f](https://github.com/canonical/ds25/commit/0dcc78f)), closes [#115](https://github.com/canonical/ds25/issues/115)



## <small>0.7.1-experimental.0 (2025-01-17)</small>

* chore: version bump to 0.7.1-experimental.0 ([636cd2e](https://github.com/canonical/ds25/commit/636cd2e))
* fix(generator): Fixes the generator not being able to import the @canonical/utils package at runtime ([7bb3dee](https://github.com/canonical/ds25/commit/7bb3dee)), closes [#113](https://github.com/canonical/ds25/issues/113)
* fix(react-core): Export chip component (#114) ([b2db0c6](https://github.com/canonical/ds25/commit/b2db0c6)), closes [#114](https://github.com/canonical/ds25/issues/114)
* Fix: minor monorepo improvements (#111) ([7607ee8](https://github.com/canonical/ds25/commit/7607ee8)), closes [#111](https://github.com/canonical/ds25/issues/111)



## 0.7.0-experimental.0 (2025-01-14)

* chore: version bump to 0.7.0-experimental.0 ([11146c0](https://github.com/canonical/ds25/commit/11146c0))
* feat: base ssr (#108) ([acb740c](https://github.com/canonical/ds25/commit/acb740c)), closes [#108](https://github.com/canonical/ds25/issues/108)



## 0.6.0-experimental.0 (2025-01-14)

* chore: version bump to 0.6.0-experimental.0 ([08cae3a](https://github.com/canonical/ds25/commit/08cae3a))
* feat: Add `vitest` for React core UI (#72) ([dfa9c4e](https://github.com/canonical/ds25/commit/dfa9c4e)), closes [#72](https://github.com/canonical/ds25/issues/72)
* feat: Add a font dimension extractor and programmatic nudge reader. (#26) ([e8ef975](https://github.com/canonical/ds25/commit/e8ef975)), closes [#26](https://github.com/canonical/ds25/issues/26)
* feat: moved react packages to their domain, added the launchpad tier (#109) ([ee65323](https://github.com/canonical/ds25/commit/ee65323)), closes [#109](https://github.com/canonical/ds25/issues/109)



## <small>0.5.1-experimental.0 (2024-12-20)</small>

* chore: version bump to 0.5.1-experimental.0 ([90f649b](https://github.com/canonical/ds25/commit/90f649b))
* Readme (#104) ([8a36ce3](https://github.com/canonical/ds25/commit/8a36ce3)), closes [#104](https://github.com/canonical/ds25/issues/104)



## 0.5.0-experimental.0 (2024-12-20)

* chore: Fix storybook addon cleanup2 (#101) ([60527ae](https://github.com/canonical/ds25/commit/60527ae)), closes [#101](https://github.com/canonical/ds25/issues/101)
* chore: storybook addon cleanup (#100) ([fa90e8f](https://github.com/canonical/ds25/commit/fa90e8f)), closes [#100](https://github.com/canonical/ds25/issues/100)
* chore: version bump to 0.5.0-experimental.0 ([df33065](https://github.com/canonical/ds25/commit/df33065))
* Add jira-github issue sync configuration (#82) ([abf6ee9](https://github.com/canonical/ds25/commit/abf6ee9)), closes [#82](https://github.com/canonical/ds25/issues/82)
* chore : Storybook-addon-baseline : Added css in the addon directly, made it configurable, improved d ([c33e468](https://github.com/canonical/ds25/commit/c33e468)), closes [#103](https://github.com/canonical/ds25/issues/103)
* Storybook baseline grid addon (#86) ([2c8647b](https://github.com/canonical/ds25/commit/2c8647b)), closes [#86](https://github.com/canonical/ds25/issues/86)



## <small>0.4.1-experimental.0 (2024-12-16)</small>

* chore: Rename code generator package (#81) ([90f44da](https://github.com/canonical/ds25/commit/90f44da)), closes [#81](https://github.com/canonical/ds25/issues/81)
* chore: version bump to 0.4.1-experimental.0 ([abed757](https://github.com/canonical/ds25/commit/abed757))
* feat: Generator CLI support (#80) ([294460e](https://github.com/canonical/ds25/commit/294460e)), closes [#80](https://github.com/canonical/ds25/issues/80)
* feat: Implement Chip core component (#77) ([4d93e54](https://github.com/canonical/ds25/commit/4d93e54)), closes [#77](https://github.com/canonical/ds25/issues/77)
* Generator component types.ts file imports React as a type (#71) ([4014730](https://github.com/canonical/ds25/commit/4014730)), closes [#71](https://github.com/canonical/ds25/issues/71)
* Moved Button types to a new file (#79) ([062a8ba](https://github.com/canonical/ds25/commit/062a8ba)), closes [#79](https://github.com/canonical/ds25/issues/79)



## 0.4.0-experimental.0 (2024-12-09)

* chore: deps update (#68) ([a331422](https://github.com/canonical/ds25/commit/a331422)), closes [#68](https://github.com/canonical/ds25/issues/68)
* chore: version bump to 0.4.0-experimental.0 ([c1d4c3d](https://github.com/canonical/ds25/commit/c1d4c3d))
* Fix: declare types explicitly in packages to avoid overlapping implicit definitions (#66) ([5bc21ae](https://github.com/canonical/ds25/commit/5bc21ae)), closes [#66](https://github.com/canonical/ds25/issues/66)
* fix(deps): update dependency yeoman-generator to v7 (#56) ([bdaf835](https://github.com/canonical/ds25/commit/bdaf835)), closes [#56](https://github.com/canonical/ds25/issues/56)
* Cleanup `check`, `lint`, `format` package scripts ([45a1ac9](https://github.com/canonical/ds25/commit/45a1ac9))
* Eliminate separate `lint`, `format` commands, add `check:ts` to `check:fix` commands ([e90c18b](https://github.com/canonical/ds25/commit/e90c18b))
* Ensure all biome-controlled packages have biome dev dependencies; bump biome to 1.9.4 ([167301d](https://github.com/canonical/ds25/commit/167301d))



## <small>0.3.2-experimental.0 (2024-12-05)</small>

* chore: version bump to 0.3.2-experimental.0 ([ee6a5ef](https://github.com/canonical/ds25/commit/ee6a5ef))
* fix: Lerna only versions packages that have changed ([103b7ea](https://github.com/canonical/ds25/commit/103b7ea))
* Add generator global install instruction to readme ([2ad00d7](https://github.com/canonical/ds25/commit/2ad00d7))



## <small>0.3.1-experimental.0 (2024-12-04)</small>

* chore: version bump to 0.3.1-experimental.0 ([685e33d](https://github.com/canonical/ds25/commit/685e33d))
* Add baseline grid toggle to Storybook ([cbbcecc](https://github.com/canonical/ds25/commit/cbbcecc))
* Add negative button, move variants to global intents ([78fe56c](https://github.com/canonical/ds25/commit/78fe56c))
* Add style to react component generator output ([9d4847a](https://github.com/canonical/ds25/commit/9d4847a))
* Added basic heading styles ([f5848d2](https://github.com/canonical/ds25/commit/f5848d2))
* Demo the broken intents inheritance ([c22a649](https://github.com/canonical/ds25/commit/c22a649))
* Generate boilerplate with generator ([9bfa833](https://github.com/canonical/ds25/commit/9bfa833))
* Generator decision tree simplification, components default to cwd, css classes are kebab-cased ([4456812](https://github.com/canonical/ds25/commit/4456812))
* generator uses nodenext, other various cleanup ([36d77a8](https://github.com/canonical/ds25/commit/36d77a8))
* minor props/whitespace adjustments ([feb0ae6](https://github.com/canonical/ds25/commit/feb0ae6))
* remove `esModuleInterop` from the generator ([3910dc7](https://github.com/canonical/ds25/commit/3910dc7))
* Remove hardcoded classnames from the component class array ([a9d081b](https://github.com/canonical/ds25/commit/a9d081b))
* retain existing boilerplate (generate it with yeoman in separate PR) ([3de5530](https://github.com/canonical/ds25/commit/3de5530))
* set storybook title to relative component path ([01295ba](https://github.com/canonical/ds25/commit/01295ba))
* Story format documentation ([8be54a8](https://github.com/canonical/ds25/commit/8be54a8))
* styles/story options default to true ([85570fe](https://github.com/canonical/ds25/commit/85570fe))
* Tsconfig docn improvements ([1ce8c72](https://github.com/canonical/ds25/commit/1ce8c72))
* Update intent definitions to include neutral and improve style inheritance and overriding ([cb56369](https://github.com/canonical/ds25/commit/cb56369))
* Yeoman generator - first pass at generating a component ([0f2922a](https://github.com/canonical/ds25/commit/0f2922a))



## 0.3.0-experimental.0 (2024-11-26)

* chore: version bump to 0.3.0-experimental.0 ([49b4177](https://github.com/canonical/ds25/commit/49b4177))
* Ft: css base package (#39) ([7e46b91](https://github.com/canonical/ds25/commit/7e46b91)), closes [#39](https://github.com/canonical/ds25/issues/39)
* Biome docn improvement ([554356a](https://github.com/canonical/ds25/commit/554356a))



## <small>0.2.1-experimental.0 (2024-11-22)</small>

* chore: version bump to 0.2.1-experimental.0 ([e66e935](https://github.com/canonical/ds25/commit/e66e935))



## 0.2.0-experimental.0 (2024-11-22)

* chore: version bump to 0.2.0-experimental.0 ([a7b05ac](https://github.com/canonical/ds25/commit/a7b05ac))
* Add a bit of company personalization to the boilerplate ([1379255](https://github.com/canonical/ds25/commit/1379255))
* add debounce util ([9a7238a](https://github.com/canonical/ds25/commit/9a7238a))
* Add throttle util ([420a1ae](https://github.com/canonical/ds25/commit/420a1ae))
* Allow passing custom button props ([48aaa7b](https://github.com/canonical/ds25/commit/48aaa7b))
* Allow vite to apply paths from tsconfig ([5787950](https://github.com/canonical/ds25/commit/5787950))
* always publish packages after versioning ([45fcb98](https://github.com/canonical/ds25/commit/45fcb98))
* boilerplate is GPL-3 ([09bc9f5](https://github.com/canonical/ds25/commit/09bc9f5))
* build & test on push to `main` ([c83098a](https://github.com/canonical/ds25/commit/c83098a))
* bump bun.lockb ([5279590](https://github.com/canonical/ds25/commit/5279590))
* Button files clean up: ([ee7d74c](https://github.com/canonical/ds25/commit/ee7d74c))
* Button stories clean up ([cf13376](https://github.com/canonical/ds25/commit/cf13376))
* Bye BEM ([9b76dd9](https://github.com/canonical/ds25/commit/9b76dd9))
* change boilerplate setup branch target to `main` ([49200b1](https://github.com/canonical/ds25/commit/49200b1))
* Configure bun as NX JS runtime ([2abd6fe](https://github.com/canonical/ds25/commit/2abd6fe))
* Debounce docstring example ([d4c56da](https://github.com/canonical/ds25/commit/d4c56da))
* debounce tsdoc ([9edf063](https://github.com/canonical/ds25/commit/9edf063))
* Execute build, check sequentially, cache subsequent execs ([6f8886f](https://github.com/canonical/ds25/commit/6f8886f))
* Extract all needed variables for button ([acdc119](https://github.com/canonical/ds25/commit/acdc119))
* Fix broken git context when initializing the boilerplate in a monorepo ([ceb1f60](https://github.com/canonical/ds25/commit/ceb1f60))
* fix build error due to missing react types ([5eba546](https://github.com/canonical/ds25/commit/5eba546))
* Fix build race condition ([29d36df](https://github.com/canonical/ds25/commit/29d36df))
* Fix Button TS error in boilerplate (#41) ([500da2c](https://github.com/canonical/ds25/commit/500da2c)), closes [#41](https://github.com/canonical/ds25/issues/41)
* Fix formatting ([8fbfb00](https://github.com/canonical/ds25/commit/8fbfb00))
* fix tag job running publish when publish_packages is false ([dbf883c](https://github.com/canonical/ds25/commit/dbf883c))
* fix typo in biome config installation instructions ([dc797bc](https://github.com/canonical/ds25/commit/dc797bc))
* format app.tsx ([7f5a6f9](https://github.com/canonical/ds25/commit/7f5a6f9))
* lerna script alias ([72e24b6](https://github.com/canonical/ds25/commit/72e24b6))
* Make vite boilerplate tsconfig more consistent (no composite tsconfig) ([581ace7](https://github.com/canonical/ds25/commit/581ace7))
* Merge utils packages ([38eb28f](https://github.com/canonical/ds25/commit/38eb28f))
* Minor proposals on props/css ([3e9b624](https://github.com/canonical/ds25/commit/3e9b624))
* Move custom className to the end ([3313fa4](https://github.com/canonical/ds25/commit/3313fa4))
* Moving notes out of code, added TS enum proof of concept ([07ce958](https://github.com/canonical/ds25/commit/07ce958))
* Npm executable init script ([a371b86](https://github.com/canonical/ds25/commit/a371b86))
* PoC of button component ([d452936](https://github.com/canonical/ds25/commit/d452936))
* React vite boilerplate ([e946171](https://github.com/canonical/ds25/commit/e946171))
* Remove explicit any from throttle ([fb5bd11](https://github.com/canonical/ds25/commit/fb5bd11))
* Remove exported Header and Page components ([492dcc2](https://github.com/canonical/ds25/commit/492dcc2))
* Remove namespace from tokens ([d80ffb3](https://github.com/canonical/ds25/commit/d80ffb3))
* Remove setup script ([b692e19](https://github.com/canonical/ds25/commit/b692e19))
* remove skipLibCheck from ts example ([29b780c](https://github.com/canonical/ds25/commit/29b780c))
* Remove unnecessary react types ([fd49c36](https://github.com/canonical/ds25/commit/fd49c36))
* rename react vite boilerplate folder ([6a7f254](https://github.com/canonical/ds25/commit/6a7f254))
* resolve package bump merge conflicts ([299a53b](https://github.com/canonical/ds25/commit/299a53b))
* Resolve react+vite lib type checking errors ([476748a](https://github.com/canonical/ds25/commit/476748a))
* rm build config options from app tsconfig ([f3182f0](https://github.com/canonical/ds25/commit/f3182f0))
* rm react types from react tsconfig ([9b15510](https://github.com/canonical/ds25/commit/9b15510))
* run `bun run build` on `prepare` hook to artifacts are built when deps are installed ([41900ad](https://github.com/canonical/ds25/commit/41900ad))
* Simplify boilerplate tsconfigs ([e93a5a4](https://github.com/canonical/ds25/commit/e93a5a4))
* simplify debounce & throttle ([2214c9b](https://github.com/canonical/ds25/commit/2214c9b))
* simplify throttle fn ([274d9c1](https://github.com/canonical/ds25/commit/274d9c1))
* Throttle docstring example ([b22b3dc](https://github.com/canonical/ds25/commit/b22b3dc))
* ts example relies on biome ([9e9e375](https://github.com/canonical/ds25/commit/9e9e375))
* tweak react plugin include, type-check tsc as build step ([59081b0](https://github.com/canonical/ds25/commit/59081b0))
* Tweak tsconfigs for consistency ([f91614e](https://github.com/canonical/ds25/commit/f91614e))
* Update Button styles to use default custom CSS properties, with default values ([a62cf4c](https://github.com/canonical/ds25/commit/a62cf4c))
* update lockfile ([856f8cb](https://github.com/canonical/ds25/commit/856f8cb))
* update lockfile ([ea512cb](https://github.com/canonical/ds25/commit/ea512cb))
* update typescript versions to latest ([1ae0447](https://github.com/canonical/ds25/commit/1ae0447))
* use a `@canonical/ds` component inside the boilerplate ([da0e1fa](https://github.com/canonical/ds25/commit/da0e1fa))



## <small>0.1.1-experimental.0 (2024-11-14)</small>

* chore: version bump to 0.0.1-experimental.8 ([06e6975](https://github.com/canonical/ds25/commit/06e6975))
* chore: version bump to 0.1.0-experimental.0 ([223137b](https://github.com/canonical/ds25/commit/223137b))
* chore: version bump to 0.1.1-experimental.0 ([342f24d](https://github.com/canonical/ds25/commit/342f24d))
* - ([85332b2](https://github.com/canonical/ds25/commit/85332b2))
* Add CD workflows ([1462f9f](https://github.com/canonical/ds25/commit/1462f9f))
* Add CD workflows ([ac9cba9](https://github.com/canonical/ds25/commit/ac9cba9))
* add ds-react-core license, author, homepage, etc metadata, limit its artefact to dist ([d063d8f](https://github.com/canonical/ds25/commit/d063d8f))
* Add NPM publish workflow ([9b86694](https://github.com/canonical/ds25/commit/9b86694))
* Add proper attribution/licensing metadata to biome config package ([59c8cb3](https://github.com/canonical/ds25/commit/59c8cb3))
* Add renovate.json ([0639f39](https://github.com/canonical/ds25/commit/0639f39))
* Add theme switcher to storybook ([b703eef](https://github.com/canonical/ds25/commit/b703eef))
* Add throttle fn ([4d2258e](https://github.com/canonical/ds25/commit/4d2258e))
* Add tsconfig readme, move configs to configs folder & rename the tsconfig package ([4a5b779](https://github.com/canonical/ds25/commit/4a5b779))
* Add typescript dependency ([52a3bd1](https://github.com/canonical/ds25/commit/52a3bd1))
* Add vite lightning css config ([897d265](https://github.com/canonical/ds25/commit/897d265))
* Added .gitattributes to diff bun lockb ([dc1063e](https://github.com/canonical/ds25/commit/dc1063e))
* Added biome config to example ([046ae91](https://github.com/canonical/ds25/commit/046ae91))
* Added check command ([464709e](https://github.com/canonical/ds25/commit/464709e))
* Added peer dep + install instructions ([e9e312a](https://github.com/canonical/ds25/commit/e9e312a))
* alias build-storybook ([0ea90a7](https://github.com/canonical/ds25/commit/0ea90a7))
* Allow importing default from "ui/component" or importing named from "ui" ([3a7e7b1](https://github.com/canonical/ds25/commit/3a7e7b1))
* Apply biome linting/formatting fixes ([05f08ba](https://github.com/canonical/ds25/commit/05f08ba))
* base ([20f24de](https://github.com/canonical/ds25/commit/20f24de))
* Base & react TS configs ([1f9c739](https://github.com/canonical/ds25/commit/1f9c739))
* Base linting and ts config ([5cedebb](https://github.com/canonical/ds25/commit/5cedebb))
* Base monorepo docs & PR template ([a069709](https://github.com/canonical/ds25/commit/a069709))
* Base ts module is Esnext, DS has an exception for NodeNext ([86b4ec0](https://github.com/canonical/ds25/commit/86b4ec0))
* Base TS module is ESNext, not nodeNext ([7a9fc13](https://github.com/canonical/ds25/commit/7a9fc13))
* Base typescript config ([2c698a7](https://github.com/canonical/ds25/commit/2c698a7))
* Build with bun or with tsc; package into dist/ ([d9903b9](https://github.com/canonical/ds25/commit/d9903b9))
* bump bun.lockb ([07ad91b](https://github.com/canonical/ds25/commit/07ad91b))
* bump to 0.0.1-experimental.3 ([96ca156](https://github.com/canonical/ds25/commit/96ca156))
* Bumped react version to 19rc ([6dd4c34](https://github.com/canonical/ds25/commit/6dd4c34))
* bun build docs in readme ([262fb70](https://github.com/canonical/ds25/commit/262fb70))
* bun install in CI with frozen lockfile ([85735cc](https://github.com/canonical/ds25/commit/85735cc))
* Clean branch ([d964b85](https://github.com/canonical/ds25/commit/d964b85))
* cleanup ([e43d526](https://github.com/canonical/ds25/commit/e43d526))
* Cleanup ts example npm scripts ([14ec968](https://github.com/canonical/ds25/commit/14ec968))
* Configured workspaces ([f11491f](https://github.com/canonical/ds25/commit/f11491f))
* CSS is being copied to the dist folder ([b61bdc5](https://github.com/canonical/ds25/commit/b61bdc5))
* Delete main.tsx and remove dev npm command ([9aaa2b7](https://github.com/canonical/ds25/commit/9aaa2b7))
* Disable allowSyntheticDefaultImports in ds package ([ee87f6f](https://github.com/canonical/ds25/commit/ee87f6f))
* Disable storybook telemetry ([987bbac](https://github.com/canonical/ds25/commit/987bbac))
* document `lerna version` re-formatting ([6370352](https://github.com/canonical/ds25/commit/6370352))
* DS readme adjustment ([d220d84](https://github.com/canonical/ds25/commit/d220d84))
* Enable typescript check on storybook config ([aeadaba](https://github.com/canonical/ds25/commit/aeadaba))
* Expose `src/assets/` storybook files at `/assets` ([5c33782](https://github.com/canonical/ds25/commit/5c33782))
* Extract env setup to a composite action ([04523f9](https://github.com/canonical/ds25/commit/04523f9))
* Extract versioning script to its own composite action ([5dfc7c4](https://github.com/canonical/ds25/commit/5dfc7c4))
* Fix CI errors - set biome jsx runtime ([7d6267b](https://github.com/canonical/ds25/commit/7d6267b))
* fix css nesting, rename tsconfig.package ([f7fc11c](https://github.com/canonical/ds25/commit/f7fc11c))
* fix gha bun install error ([179de42](https://github.com/canonical/ds25/commit/179de42))
* fix missing `build-storybook` command ([780b487](https://github.com/canonical/ds25/commit/780b487))
* fix missing check:fix in biome config package ([c66c0de](https://github.com/canonical/ds25/commit/c66c0de))
* fix typo in versioning workflow ([4940523](https://github.com/canonical/ds25/commit/4940523))
* Further tsconfig/package.json tweaks ([3d2690a](https://github.com/canonical/ds25/commit/3d2690a))
* Give names to PR steps ([c28ae02](https://github.com/canonical/ds25/commit/c28ae02))
* Harmonized exports and imports locally ([899a2f6](https://github.com/canonical/ds25/commit/899a2f6))
* harmonized ts build configs ([ba720de](https://github.com/canonical/ds25/commit/ba720de))
* ignore storybook-static directory (it is a build artifact) ([0d85106](https://github.com/canonical/ds25/commit/0d85106))
* ignore storybook-static directory (it is a build artifact) ([e3c145b](https://github.com/canonical/ds25/commit/e3c145b))
* Initial commit ([8e5055e](https://github.com/canonical/ds25/commit/8e5055e))
* Initial package.json & gitignore ([0ed2cc8](https://github.com/canonical/ds25/commit/0ed2cc8))
* Minor changes in the build commands ([cbd7275](https://github.com/canonical/ds25/commit/cbd7275))
* move bun lockfile instructions ([38c6614](https://github.com/canonical/ds25/commit/38c6614))
* Move publish to its own job ([0fefbeb](https://github.com/canonical/ds25/commit/0fefbeb))
* only run on main branch ([3d2f2ef](https://github.com/canonical/ds25/commit/3d2f2ef))
* Package-specific tsconfig for ds components build, remove declaration from base tsconfig ([19c4c03](https://github.com/canonical/ds25/commit/19c4c03))
* Parameterize bun version in setup-env ([392619b](https://github.com/canonical/ds25/commit/392619b))
* PR tests run before building ([05ffac9](https://github.com/canonical/ds25/commit/05ffac9))
* prerelease arg cleanup, refs/heads/main is a constant ([1e3d7ca](https://github.com/canonical/ds25/commit/1e3d7ca))
* prune react app from storybook ([daa8df7](https://github.com/canonical/ds25/commit/daa8df7))
* Push version changes with deploy key ([6882f26](https://github.com/canonical/ds25/commit/6882f26))
* React TS config - allow importing with TS extensions ([d4a6280](https://github.com/canonical/ds25/commit/d4a6280))
* reconcile CI work with pair programming PRs ([c7eaf30](https://github.com/canonical/ds25/commit/c7eaf30))
* Reinstalled packages ([ef3ddf0](https://github.com/canonical/ds25/commit/ef3ddf0))
* Remove "clean" script ([195574d](https://github.com/canonical/ds25/commit/195574d))
* remove bun build-storybook from ds build ([790d8be](https://github.com/canonical/ds25/commit/790d8be))
* remove declaration flag ([a6ad351](https://github.com/canonical/ds25/commit/a6ad351))
* remove index.css (empty it) ([1aea4a0](https://github.com/canonical/ds25/commit/1aea4a0))
* Removed @types/react ([d2bb858](https://github.com/canonical/ds25/commit/d2bb858))
* Removed emit command (already taken care of by the main tsc) ([dab92a4](https://github.com/canonical/ds25/commit/dab92a4))
* Removed nodemon, updated install instructions ([3df6917](https://github.com/canonical/ds25/commit/3df6917))
* Removed unnecessary commands ([a4a098d](https://github.com/canonical/ds25/commit/a4a098d))
* Rename packages/ds directory to packages/ds-react-core ([e778a8d](https://github.com/canonical/ds25/commit/e778a8d))
* rename react storybook to ds-react-core ([33097c2](https://github.com/canonical/ds25/commit/33097c2))
* rename to ds25 ([c33c3fc](https://github.com/canonical/ds25/commit/c33c3fc))
* rm conventional commits ([1e3d32b](https://github.com/canonical/ds25/commit/1e3d32b))
* rm separate release workflow ([e75c34c](https://github.com/canonical/ds25/commit/e75c34c))
* Run checks across the whole monorepo with lerna ([668466b](https://github.com/canonical/ds25/commit/668466b))
* run tests on PRs using lerna ([5eae3e0](https://github.com/canonical/ds25/commit/5eae3e0))
* separate build/test job ([4ca3c4f](https://github.com/canonical/ds25/commit/4ca3c4f))
* Set monorepo root to private package ([1746ff9](https://github.com/canonical/ds25/commit/1746ff9))
* Simplified bun build ([a1685f8](https://github.com/canonical/ds25/commit/a1685f8))
* Simplified commands ([5e2baa9](https://github.com/canonical/ds25/commit/5e2baa9))
* Simplified commands ([f6edb58](https://github.com/canonical/ds25/commit/f6edb58))
* simplify publish auth ([3763268](https://github.com/canonical/ds25/commit/3763268))
* Slight tweaks to tsconfig readmes ([f856287](https://github.com/canonical/ds25/commit/f856287))
* Storybook init ([c15737f](https://github.com/canonical/ds25/commit/c15737f))
* Storybook lint fixes ([fe74ac7](https://github.com/canonical/ds25/commit/fe74ac7))
* Storybook run ([fa00821](https://github.com/canonical/ds25/commit/fa00821))
* Test shared typescript config ([035b80c](https://github.com/canonical/ds25/commit/035b80c))
* top level package.json scripts adjustments ([c9240bb](https://github.com/canonical/ds25/commit/c9240bb))
* TS example is a private package ([5fc928e](https://github.com/canonical/ds25/commit/5fc928e))
* TSconfig cleanup ([bec36fc](https://github.com/canonical/ds25/commit/bec36fc))
* tweak pr template to remove holdover from vanilla ([823f3be](https://github.com/canonical/ds25/commit/823f3be))
* tweak tsconfig & build ([fa6d16d](https://github.com/canonical/ds25/commit/fa6d16d))
* Type check is passing ([502135e](https://github.com/canonical/ds25/commit/502135e))
* unextract publish action ([e873a7c](https://github.com/canonical/ds25/commit/e873a7c))
* update cd workflows to use checkout v4 ([625cdf2](https://github.com/canonical/ds25/commit/625cdf2))
* Update dependency @chromatic-com/storybook to v3 (#20) ([6889f5d](https://github.com/canonical/ds25/commit/6889f5d)), closes [#20](https://github.com/canonical/ds25/issues/20)
* Update LICENSE ([43d6660](https://github.com/canonical/ds25/commit/43d6660))
* Update PULL_REQUEST_TEMPLATE.md ([d519fa9](https://github.com/canonical/ds25/commit/d519fa9))
* update react JSX runtime to modern react-jsx ([aba3a77](https://github.com/canonical/ds25/commit/aba3a77))
* Updated lockfile ([2116c12](https://github.com/canonical/ds25/commit/2116c12))
* v0.0.1-experimental.0 ([96ab587](https://github.com/canonical/ds25/commit/96ab587))
* v0.0.1-experimental.1 ([1ba0254](https://github.com/canonical/ds25/commit/1ba0254))
* v0.0.1-experimental.2 ([f831ee4](https://github.com/canonical/ds25/commit/f831ee4))
* feat: Base storybook (#7) ([045ad27](https://github.com/canonical/ds25/commit/045ad27)), closes [#7](https://github.com/canonical/ds25/issues/7)
