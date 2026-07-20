# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.32.0](https://github.com/canonical/pragma/compare/v0.31.0...v0.32.0) (2026-07-20)

**Note:** Version bump only for package @canonical/pragma-cli





# Unreleased


### BREAKING CHANGES

The v2 CLI reshapes the command surface. Migrate as follows:

| v1 | v2 | Notes |
| --- | --- | --- |
| `pragma data …` | `pragma sources …` | The `data` noun is renamed `sources`. Build the store with `pragma sources update`; inspect it with `pragma sources status`. |
| `pragma update-refs` | `pragma sources update` | The standalone refs-update command is removed. `sources update` resolves every configured package, builds the store, and writes `pragma.lock.json` in one step. |
| the `llm` tool | `pragma capabilities` + MCP handshake instructions | The `llm` orientation tool is retired. Agents are oriented by the MCP handshake `instructions` sent on `initialize` and by the `capabilities` tool/verb, both derived from the live grammar. |
| `pragma tokens …` / `tokens_*` tools | `pragma token …` / `token_*` tools | The token noun and its tools are singular now: `token list`, `token lookup`, `token sample`, `token add-config`. |
| `--format text` | `--format plain` | The default text format is renamed `plain`. Output modes are `--format plain`, `--format json`, and the `--llm` condensed-Markdown flag (auto-on when piped) — there is no `llm` format value. |

See [docs/getting-started.md](./docs/getting-started.md) for the v2 workflow and [docs/reference/index.md](./docs/reference/index.md) for the full command and tool surface.


### Features

* **cli:** add `pragma colophon` — a self-describing, pack-extensible toolchain colophon (storeless self-verb + MCP tool + a pack-grammar `colophon` markdown field), rendered plain/llm/json

# [0.31.0](https://github.com/canonical/pragma/compare/v0.30.0...v0.31.0) (2026-07-17)


### Bug Fixes

* **cli:** boot the ke store resiliently and name the offending file ([#798](https://github.com/canonical/pragma/issues/798)) ([dda93bb](https://github.com/canonical/pragma/commit/dda93bb9cc588e7a186ba8ab8d4a5d60ec424728))
* **cli:** core input/output correctness — completions, exit codes, validation ([#815](https://github.com/canonical/pragma/issues/815)) ([26b761d](https://github.com/canonical/pragma/commit/26b761d00c145a6e0a564c9f70d001805240e139))
* **cli:** don't boot the ke store for `create` scaffolding ([#797](https://github.com/canonical/pragma/issues/797)) ([298f8c4](https://github.com/canonical/pragma/commit/298f8c4233db0dafd89a7a801aeb45bdf9c5c9a8))
* **cli:** flag & command UX — unknown-verb, --version, config, graph query ([#817](https://github.com/canonical/pragma/issues/817)) ([82816d0](https://github.com/canonical/pragma/commit/82816d05e9e5308ff9747dcb361115994d8d70a3))
* **cli:** generator validation, --no- flags, auto-LLM detection, coverage ([#816](https://github.com/canonical/pragma/issues/816)) ([c9436f4](https://github.com/canonical/pragma/commit/c9436f471095edc2034157a21afce0cce50edfe7))
* **cli:** setup real-execution + harness detection, hang & help fixes, validation ([#818](https://github.com/canonical/pragma/issues/818)) ([59fea44](https://github.com/canonical/pragma/commit/59fea4471a036d8dc24f12ddbd3cd3f859c3a0d0))


### Features

* **cli:** add `create application` generator (CLI + MCP) ([#828](https://github.com/canonical/pragma/issues/828)) ([fbc8797](https://github.com/canonical/pragma/commit/fbc8797edc922aa31d40deed9aa1f917e08b3cb1))
* **cli:** bundled story-pack mechanism; migrate tier to a pack (P1, re-land) ([#844](https://github.com/canonical/pragma/issues/844)) ([7b6580b](https://github.com/canonical/pragma/commit/7b6580b23e03fd221ada608bae95fd55a46cafc6))
* **cli:** first-run onboarding — welcome note + global config creation ([#843](https://github.com/canonical/pragma/issues/843)) ([ea11862](https://github.com/canonical/pragma/commit/ea118628bb82301ef886ffe963ffb224ae958bcd))
* **cli:** generator packs — data-driven create surface ([#835](https://github.com/canonical/pragma/issues/835)) ([125ffbd](https://github.com/canonical/pragma/commit/125ffbd7519f9bb8f9266a87d1f6cbc901de766c))
* **cli:** package-declared prefixes + bare-core boot (P0) ([#824](https://github.com/canonical/pragma/issues/824)) ([b4f8a4a](https://github.com/canonical/pragma/commit/b4f8a4abbe36a89c47b472aec0cb94139a928dc4))
* **cli:** pragma create reuses summon's rich Ink UI when interactive ([#819](https://github.com/canonical/pragma/issues/819)) ([23d88b0](https://github.com/canonical/pragma/commit/23d88b0f080650da5e50546e0d416b9e844bb6ae))
* **cli:** task-oriented root --help with real descriptions ([#809](https://github.com/canonical/pragma/issues/809)) ([6c0c065](https://github.com/canonical/pragma/commit/6c0c065f40a22f27fa9a6e8717176714acb59a77))
* **doctor:** legible output with sub-items and inline remedies ([#800](https://github.com/canonical/pragma/issues/800)) ([d1ea747](https://github.com/canonical/pragma/commit/d1ea747950867a2f4b1695ecfc88c6261c1f6eeb))





# [0.30.0](https://github.com/canonical/pragma/compare/v0.29.1...v0.30.0) (2026-07-14)


### Bug Fixes

* **cli:** partial-failure-safe lookupMany, bundledLoader hardening, remove dead sem MCP server ([#763](https://github.com/canonical/pragma/issues/763)) ([e85cf27](https://github.com/canonical/pragma/commit/e85cf275e20ce5d12c9f6aa6787e22fb63d6deb1))
* **harnesses:** stop setup mcp from destroying valid JSONC configs (SEC-1) ([#743](https://github.com/canonical/pragma/issues/743)) ([1cf47a2](https://github.com/canonical/pragma/commit/1cf47a20889f1f25208110550398990bc11067e5))


* refactor(cli)!: collapse the executor mode ladder; retire the interactive handoff (#772) ([34eb691](https://github.com/canonical/pragma/commit/34eb6916852ffd98670e4375a3692a90bb8443f9)), closes [#772](https://github.com/canonical/pragma/issues/772)


### Features

* **cli:** bundled loader serves embedded story definitions ([#781](https://github.com/canonical/pragma/issues/781)) ([511328a](https://github.com/canonical/pragma/commit/511328a4ca5e987f2f73e108a305848a65d6f03a))
* **cli:** byte-identical output for pragma create and summon; summon on the shared core ([#761](https://github.com/canonical/pragma/issues/761)) ([c10e133](https://github.com/canonical/pragma/commit/c10e1332e3a1f7e4f815da7cc40ecb4f95fbb045))
* **cli:** declarative list filters for story packs ([#780](https://github.com/canonical/pragma/issues/780)) ([87e0b0d](https://github.com/canonical/pragma/commit/87e0b0d9f86548da34d8bb1d7f0423b9904a6d45))
* **cli:** one prompting model — dialog-first prompts through the executor seam ([#758](https://github.com/canonical/pragma/issues/758)) ([ace9246](https://github.com/canonical/pragma/commit/ace9246de5e5e72231b2637b69443d55d9d0cfb8))
* **cli:** redesign MCP resources — TBox/ABox grouping, autocomplete, correctness fixes ([#784](https://github.com/canonical/pragma/issues/784)) ([7d08aec](https://github.com/canonical/pragma/commit/7d08aec79f54ea8a768f8d76e0f2cbe71be33c99))
* **cli:** story packs — declarative read stories for any ontology (experimental) ([#778](https://github.com/canonical/pragma/issues/778)) ([23f1227](https://github.com/canonical/pragma/commit/23f122701a88668dba8bee6d0652d40417d5dbf5))
* **pragma-cli:** graphql serve + config-driven build/check over semantic packages ([#682](https://github.com/canonical/pragma/issues/682)) ([d3a09f5](https://github.com/canonical/pragma/commit/d3a09f56b113bad0adc63158c38715c7eb39ec1f))


### BREAKING CHANGES

* cli-core no longer exports InteractiveSpec, InteractiveHandler,
createInteractiveResult, or the "interactive" CommandResult variant; consumers
inject a PromptSession via CommandContext.promptSession instead.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DF9ExVCukzqpe1Fus9V1no

* test(cli): assert exit-code propagation; fix stale CommandResult docs

Adversarial review of the mode-ladder collapse surfaced two gaps:

- registerAll.handleResult's exit branch is the sole path by which
  executeGenerator's exit 3 (non-interactive, missing flags) and exit
  130 (Ctrl-C) reach process.exitCode, yet every test drove it with
  code 0 — a mutation to that assignment would have gone unnoticed. Add
  a regression test that dispatches a non-zero exit result and asserts
  process.exitCode.
- cli-core's README still described CommandResult as a three-variant
  union listing the retired "interactive" variant. Update it to the
  two-variant (output | exit) union the type now defines.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DF9ExVCukzqpe1Fus9V1no

* fix(cli): don't construct a prompt session off a TTY; distinct headers

runInteractiveExecution called the injected promptSession factory before
checking the terminal, so a non-interactive run with a no-default
required prompt would open a readline handle and discard it undisposed.
Construct the session only on an interactive terminal.

Also give the two "interaction unavailable" failure modes accurate
headers: a non-interactive stdin/stdout versus an interactive terminal
with no injected session — the latter previously misreported itself as a
non-interactive terminal.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DF9ExVCukzqpe1Fus9V1no





# [0.29.0](https://github.com/canonical/pragma/compare/v0.29.0-experimental.0...v0.29.0) (2026-07-03)

**Note:** Version bump only for package @canonical/pragma-cli





# [0.29.0-experimental.0](https://github.com/canonical/pragma/compare/v0.28.0...v0.29.0-experimental.0) (2026-06-24)

**Note:** Version bump only for package @canonical/pragma-cli





# [0.28.0](https://github.com/canonical/pragma/compare/v0.27.1-experimental.0...v0.28.0) (2026-06-16)


### Features

* **ke-graphql:** demo dev server + benchmark script ([#673](https://github.com/canonical/pragma/issues/673)) ([152aaad](https://github.com/canonical/pragma/commit/152aaadcb37084d7c205bd2648ee99096d46d92a))
* **pragma:** parallel doctor checks + S-grade empty-result recovery hints ([#641](https://github.com/canonical/pragma/issues/641)) ([060b9f5](https://github.com/canonical/pragma/commit/060b9f5291aef1ad525744b625b4164ff25c3f7b)), closes [#543](https://github.com/canonical/pragma/issues/543)
* **pragma:** trace, MCP resources, summon template loading, framework config ([#645](https://github.com/canonical/pragma/issues/645)) ([4f0a341](https://github.com/canonical/pragma/commit/4f0a341a050facbf3a87419ed7a9b3c29c0a9ade)), closes [#1](https://github.com/canonical/pragma/issues/1) [#551](https://github.com/canonical/pragma/issues/551) [#569](https://github.com/canonical/pragma/issues/569) [#641](https://github.com/canonical/pragma/issues/641) [#641](https://github.com/canonical/pragma/issues/641)





## [0.27.1-experimental.0](https://github.com/canonical/pragma/compare/v0.28.0-experimental.0...v0.27.1-experimental.0) (2026-05-21)


### Bug Fixes

* **release:** unblock lerna 9 publish (access via publishConfig) ([#637](https://github.com/canonical/pragma/issues/637)) ([acc1185](https://github.com/canonical/pragma/commit/acc1185b43290c1edd88da25c000f7d9494caee6))





# [0.27.0](https://github.com/canonical/pragma/compare/v0.26.0...v0.27.0) (2026-04-29)

**Note:** Version bump only for package @canonical/pragma-cli





# [0.26.0](https://github.com/canonical/pragma/compare/v0.25.0...v0.26.0) (2026-04-24)


### Features

* **cli:** configurable package sources with git ref resolution ([#621](https://github.com/canonical/pragma/issues/621)) ([66dc0dc](https://github.com/canonical/pragma/commit/66dc0dcf6891d697d5e4b134db76fe34901520d9))





# [0.25.0](https://github.com/canonical/pragma/compare/v0.24.0...v0.25.0) (2026-04-17)

**Note:** Version bump only for package @canonical/pragma-cli





# [0.24.0](https://github.com/canonical/pragma/compare/v0.23.0...v0.24.0) (2026-04-13)

**Note:** Version bump only for package @canonical/pragma-cli





# [0.23.0](https://github.com/canonical/pragma/compare/v0.22.1...v0.23.0) (2026-04-07)

**Note:** Version bump only for package @canonical/pragma-cli





# [0.22.0](https://github.com/canonical/pragma/compare/v0.22.0-experimental.0...v0.22.0) (2026-04-03)

**Note:** Version bump only for package @canonical/pragma-cli





# [0.22.0-experimental.0](https://github.com/canonical/pragma/compare/v0.21.0...v0.22.0-experimental.0) (2026-04-02)


### Bug Fixes

* **pragma-cli:** embed oxigraph WASM in compiled binary ([#584](https://github.com/canonical/pragma/issues/584)) ([929dad6](https://github.com/canonical/pragma/commit/929dad6ee8f770b659b5fb1387419648bcc32fa0))





# [0.21.0](https://github.com/canonical/pragma/compare/v0.20.1...v0.21.0) (2026-04-01)


### Features

* **cli-core:** support interactive pragma generators ([#576](https://github.com/canonical/pragma/issues/576)) ([fc53e23](https://github.com/canonical/pragma/commit/fc53e237a70436cf2d9a0843e17801926c878f31))
* **pragma-cli:** compile to linux-x64 binary for npm publish ([#581](https://github.com/canonical/pragma/issues/581)) ([80648dc](https://github.com/canonical/pragma/commit/80648dca3dfd48694ee64a18e267496f93647569))
* **pragma-cli:** rich TUI rendering for list and lookup commands ([#577](https://github.com/canonical/pragma/issues/577)) ([ebeb4e0](https://github.com/canonical/pragma/commit/ebeb4e023d92239614d281cb4825ded493bbaff5))





# [0.20.0](https://github.com/canonical/pragma/compare/v0.19.0...v0.20.0) (2026-03-26)

**Note:** Version bump only for package @canonical/pragma-cli





# [0.19.0](https://github.com/canonical/pragma/compare/v0.18.0...v0.19.0) (2026-03-26)


### Bug Fixes

* **ci:** add missing build step to push workflow, replace workspace: protocol ([#521](https://github.com/canonical/pragma/issues/521)) ([0e88312](https://github.com/canonical/pragma/commit/0e883120c96034d180de0ebdde6e9740d97609fe)), closes [#512](https://github.com/canonical/pragma/issues/512)
* **cli-core:** show contextual help at each command level ([#534](https://github.com/canonical/pragma/issues/534)) ([e4ad03b](https://github.com/canonical/pragma/commit/e4ad03bbb95f7c16caf591a0d8136dac9bd245ee))
* **pragma:** critical bugs, SPARQL hardening, contract types, package rename ([#549](https://github.com/canonical/pragma/issues/549)) ([ebacb6e](https://github.com/canonical/pragma/commit/ebacb6ef54eca92d720fb5ccc05459748f854849))
* **pragma:** resolve skill sources via require.resolve ([#535](https://github.com/canonical/pragma/issues/535)) ([8b5bb77](https://github.com/canonical/pragma/commit/8b5bb77e3ca261d8cbd5ae4fa69c197933157339))
* **pragma:** resolve TTL sources via require.resolve, thread cwd through ke ([#533](https://github.com/canonical/pragma/issues/533)) ([615f9fe](https://github.com/canonical/pragma/commit/615f9fe7f61629c408f60f94ba788018acb8662e))


### Features

* **cli-framework:** add cli-framework package, build and webarchitect checks (v0.1-P3) ([#490](https://github.com/canonical/pragma/issues/490)) ([549806d](https://github.com/canonical/pragma/commit/549806dc5626a8f0165ca6daeb1abc65bb52d32b))
* **cli-framework:** add generator-to-CLI bridge modules (v0.1-P3b) ([#494](https://github.com/canonical/pragma/issues/494)) ([8bbaf5f](https://github.com/canonical/pragma/commit/8bbaf5fa68507b5f7de8301a9f481103e9aaf211))
* **pragma-cli:** unify lookup orchestration and IRI queries ([#551](https://github.com/canonical/pragma/issues/551)) ([48c2870](https://github.com/canonical/pragma/commit/48c2870ccdf21135d97c53283ed5c028bfbcc769))
* **pragma:** add `pragma _completions-server` and `pragma --completions` (v0.2-D10) ([#522](https://github.com/canonical/pragma/issues/522)) ([d9a6026](https://github.com/canonical/pragma/commit/d9a6026a78ade6058a61e4d02a5208c66cd10064))
* **pragma:** add `pragma doctor` environment health check (v0.3-04) ([#518](https://github.com/canonical/pragma/issues/518)) ([7b4e699](https://github.com/canonical/pragma/commit/7b4e699aac5aed8f7b726a17db992becbe748fdf))
* **pragma:** add `pragma info` and `pragma upgrade` commands (v0.2-D9) ([#503](https://github.com/canonical/pragma/issues/503)) ([aee3440](https://github.com/canonical/pragma/commit/aee3440bf91ff62c714e9f62ce81b43088fd2554))
* **pragma:** add `pragma llm` decision trees (v0.2-D13) ([#517](https://github.com/canonical/pragma/issues/517)) ([99c1376](https://github.com/canonical/pragma/commit/99c1376d7484f0e1512d41bb91e84446ccc546d2))
* **pragma:** add agent skills setup + list commands (v0.3-09) ([#520](https://github.com/canonical/pragma/issues/520)) ([6d981c6](https://github.com/canonical/pragma/commit/6d981c6e268a73ec618f114b6a45ad8849484f6a))
* **pragma:** add canonical fixture and integration test suite ([#531](https://github.com/canonical/pragma/issues/531)) ([70207ad](https://github.com/canonical/pragma/commit/70207ad3780dd3c46a7c8957b12991cad48aa962))
* **pragma:** add CLI adapter with federation, output formatting, and error rendering (v0.1-D2) ([#492](https://github.com/canonical/pragma/issues/492)) ([1586fa3](https://github.com/canonical/pragma/commit/1586fa33b1b8316c36490c79893c3439cd633e6a))
* **pragma:** add component commands (v0.2-D4) ([#506](https://github.com/canonical/pragma/issues/506)) ([5ea1835](https://github.com/canonical/pragma/commit/5ea183551e475862556dcee23bfa784f281fff13))
* **pragma:** add config commands (v0.2-D6) ([#505](https://github.com/canonical/pragma/issues/505)) ([5c7435b](https://github.com/canonical/pragma/commit/5c7435bc3950b8a3bf1a8303cb0bbc5c67c97b6f))
* **pragma:** add generator commands (`pragma create`) (v0.2-D14) ([#515](https://github.com/canonical/pragma/issues/515)) ([80c9da6](https://github.com/canonical/pragma/commit/80c9da6f5c0ba0a6d23c444bff382b6d21f4c232))
* **pragma:** add graph + ontology shared operations (v0.2-D7) ([#504](https://github.com/canonical/pragma/issues/504)) ([5d7264c](https://github.com/canonical/pragma/commit/5d7264c2d4f602f3751c3cd67baab5b7566ed467))
* **pragma:** add graph-driven MCP resources (v0.2-D12) ([#516](https://github.com/canonical/pragma/issues/516)) ([8df3165](https://github.com/canonical/pragma/commit/8df31659c3026bc881036875649f9e7cf7b18e6f))
* **pragma:** add MCP adapter (v0.2-D11) ([#508](https://github.com/canonical/pragma/issues/508)) ([277681c](https://github.com/canonical/pragma/commit/277681c4bd9629145aa724775a789524e8b81250))
* **pragma:** add modifier, tier, and token commands (v0.2-D8) ([#513](https://github.com/canonical/pragma/issues/513)) ([71fb8af](https://github.com/canonical/pragma/commit/71fb8afe3d4f31ffa2179605d96bc6d004df7655))
* **pragma:** add setup commands (v0.2-D15) ([#519](https://github.com/canonical/pragma/issues/519)) ([65adca7](https://github.com/canonical/pragma/commit/65adca795f72e70ba54ad535ab1c1c683ad15a47))
* **pragma:** add standard commands (v0.2-D5) ([#507](https://github.com/canonical/pragma/issues/507)) ([c441e43](https://github.com/canonical/pragma/commit/c441e43437494e1d6fc03652ca56070dc6febdf4))
* **pragma:** extract summon binary + add shared operations (v0.1-P3b/P4/D3) ([#497](https://github.com/canonical/pragma/issues/497)) ([15bfa93](https://github.com/canonical/pragma/commit/15bfa9381fc9571099467d382f60ae9f70b60bd5))
* **pragma:** reconcile MCP surface, response envelope, and unified boot ([#530](https://github.com/canonical/pragma/issues/530)) ([d7b7743](https://github.com/canonical/pragma/commit/d7b7743f68638f1f7bf9352a6b2a9d6d6abb2e41))
* **pragma:** rename get→lookup, add batch_lookup tools, remove names filter from list ([#539](https://github.com/canonical/pragma/issues/539)) ([d61fedd](https://github.com/canonical/pragma/commit/d61fedd64e66920722ac856649354d624e0d6d81))
* **pragma:** scaffold @canonical/pragma package ([#483](https://github.com/canonical/pragma/issues/483)) ([4d1ba99](https://github.com/canonical/pragma/commit/4d1ba991e789bc493ae3970822f9ffb7bb095ea8))
* **pragma:** structured recovery, surface parity, block rename, disclosure, batch ([#537](https://github.com/canonical/pragma/issues/537)) ([855bdc5](https://github.com/canonical/pragma/commit/855bdc546e5600e40c0b1ebc5e780fb86fad89d9))
* **pragma:** validate WASM embedding in bun build --compile (v0.1-E1) ([#491](https://github.com/canonical/pragma/issues/491)) ([6d3f7e9](https://github.com/canonical/pragma/commit/6d3f7e9fa74beb3b6294b254a53508de57423a9d))
* **task:** add undo interpreter and --undo flag across CLI ([#538](https://github.com/canonical/pragma/issues/538)) ([8c2fff5](https://github.com/canonical/pragma/commit/8c2fff58eb4e5527e4ca2aa1bd7e9f42b3cf70ee))


### Performance Improvements

* **ci:** parallel jobs with Nx remote cache server ([#523](https://github.com/canonical/pragma/issues/523)) ([053a2ec](https://github.com/canonical/pragma/commit/053a2ec8a7ea4dc05e4e31000c09a56fc15f77bf))


### BREAKING CHANGES

* **pragma:** MCP tool names drop `pragma_` prefix. Response
format changes from raw data to `{ ok, data, meta }` envelope.
Config file changes from pragma.config.toml to pragma.config.json.

* style(pragma): apply biome formatting and import sorting

* refactor(pragma): split wrapTool into single-export files

Move serializeErrorPayload and estimateTokens into their own files
per packaging/naming/single-export-file and packaging/export/shape
code standards. Each file now has exactly one default export.

* chore(pragma): update bun.lock after removing smol-toml
