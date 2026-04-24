# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

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
