# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.42.0](https://github.com/canonical/pragma/compare/v0.41.0...v0.42.0) (2026-09-28)

* chore(monorepo)!: move to TypeScript 7 (#1374) ([713d307](https://github.com/canonical/pragma/commit/713d3071d3980539a849ea95823736e8b343a1b1)), closes [#1374](https://github.com/canonical/pragma/issues/1374) [#lib](https://github.com/canonical/pragma/issues/lib) [#domains](https://github.com/canonical/pragma/issues/domains) [#i18n](https://github.com/canonical/pragma/issues/i18n) [#relay](https://github.com/canonical/pragma/issues/relay) [#styles](https://github.com/canonical/pragma/issues/styles)
* feat(summon-application,pragma-cli)!: replace the route generator with a page generator (#1373) ([02ee6cd](https://github.com/canonical/pragma/commit/02ee6cd62835aa8b036e749b2dfcf71f07782b60)), closes [#1373](https://github.com/canonical/pragma/issues/1373)

### BREAKING CHANGES

* the `route` generator is removed. Use
  `summon page <domain>/<name>` and add the printed import and route entry
  to the domain's routes.ts by hand.

  * docs(summon-application): document the page generator in place of the route generator

  The package README documents `summon page`, including the routing
  examples it prints. The conventions, the scaffolded app's README, the
  repository README and the router middleware cookbook name the page
  generator where they named the route generator.

  * fix(summon-application): make the page path a required answer

  The page generator's names come only from its argument. A default
  "example/page" would let a run with --yes, or a tool call with no
  arguments, pick a domain and page name nobody gave, so the prompt has no
  default and a missing path is refused.

  * fix(summon-application): refuse a page path with a leading slash

  "/invoices/detail" reads as a url or an absolute path, and the page path
  is neither: it is two name segments. Refusing it, instead of silently
  stripping the slash, also keeps the page path prompt in line with the
  other positional path prompts, which reject absolute paths.

  * fix(summon-core): let a generator guard on a file that must already exist

  Before running a generator, execute builds it once without touching the
  disk to list its effects for the outcome summary. That walk cannot see
  the host, so every existence check in it answers "absent", and a
  generator that adds to existing code (one that refuses unless the folder
  it adds to is there) failed in that walk however the host looked: it could
  never run from either CLI.

  When the plain walk fails, the summary walk is now repeated letting each
  existence check take the other answer where the first led to a failure,
  which is the plan of the run in which the guards pass. The real run that
  follows still enforces every guard against the host, with the guard's own
  message.

  * fix(summon-application): report a missing domain or a taken page name as an invalid answer

  The page generator's refusals are the answer's fault: the domain it names
  does not exist, or the page name is already taken. They now carry summon's
  invalid-answer code, so a host reports them as a usage error rather than
  as an internal error to file a bug about.

  * fix(summon-application): name no command in the missing-domain refusal

  The page generator runs under more than one CLI, so its refusal and its
  help text no longer tell the user to run a command the invoking CLI may
  not have; they say the domain must be created first.

  * feat(pragma-cli): add create page

  `pragma create page <domain>/<name>` (MCP tool `create_page`) runs the
  application generator package's page generator, like the other create
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
