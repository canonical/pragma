# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.33.0](https://github.com/canonical/pragma/compare/v0.32.0...v0.33.0) (2026-07-24)


* feat(harnesses)!: AI-harness detection — platform paths, live signals, scope model, dedup + OpenDesign (#867) ([6e0df18](https://github.com/canonical/pragma/commit/6e0df1806cfd1d941c094c4f83a31488c36958cc)), closes [#867](https://github.com/canonical/pragma/issues/867)


### BREAKING CHANGES

* `HarnessDefinition` now requires a `scope` field, and
global/both harnesses must declare `homeConfigPath`.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012B41xiqaum5nwecX5mVghF

* feat(harnesses): config-target dedup + re-enable Cline (project scope)

Add `configTargets.ts`: `groupConfigTargets` deduplicates detected harnesses'
resolved targets two ways — prompt-dedup by path (one choice per shared file,
labelled with every harness) and write-dedup by (path, mcpKey) (one write per
distinct key, each preserving the other). The scope→band mapping
(`bandsForScope`, `harnessInBand`, `harnessesForBand`, `groupTargetsForScope`)
implements 7f: `both` runs both bands with dual-scope writing project only;
`global`/`project` run a single band. Re-enable Cline (scope project,
mcpKey mcpServers) — it and VS Code both write .vscode/mcp.json under different
keys (VERIFY(7a)). Registry is 9 harnesses.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012B41xiqaum5nwecX5mVghF

* fix(harnesses): guard extension glob against a missing extensions dir

Globbing a non-existent `~/.vscode/extensions` throws ENOENT under the real
interpreter, which would abort detection (and every setup/doctor run in a
project without VS Code extensions). Check the directory exists first, else the
extension signal is simply absent.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012B41xiqaum5nwecX5mVghF

* feat(harnesses): single-write multi-key writer for shared config files

`writeMcpConfigTargets(targets, name, config)` writes one server entry under
every mcpKey of a group of targets that share ONE file (VS Code `servers` +
Cline `mcpServers` in .vscode/mcp.json) in a SINGLE read-modify-write. This
preserves each key and — crucially — is dry-run safe: two sequential
writeMcpConfigTo calls to the same new file made the second read the file the
first virtually created (mock content → false "unparseable" abort under the
recap preview). `writeMcpConfigTo` now delegates to the shared multi-key core.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012B41xiqaum5nwecX5mVghF

* feat(harnesses): add OpenDesign harness (dual-scope) + env map normalization

Add the `opendesign` entry (scope both): detects a `.od` dir or an `od` binary
whose --version identifies OpenDesign (a `verify` guard against the Unix `od`
octal-dump false positive, VERIFY(7g)); project config `.od/mcp-config.json`,
home config `~/.od/mcp-config.json`, skills `.od/skills`, mcpKey mcpServers.
`normalizeEnv: true` forces a written server entry's `env` to a JSON object/map
(OpenDesign rejects a non-map env) via `normalizeOdEnv`, threaded through the
target-based writers. Registry is 10 harnesses.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012B41xiqaum5nwecX5mVghF

* fix(harnesses): guard verify-exec, probe PATHEXT on win32, drop Cline false-positive

Address the crash/false-positive review findings on the harness-detection work:

- checkProcess: wrap the `verify` exec in recover(...=>pure(false)) so a spawn
  failure (ENOENT/EACCES, or the probed binary erroring) resolves to an
  unverified `false` instead of rejecting all of detectHarnesses — one harness's
  probe must never crash `setup`/`doctor` (the `od --version` verify runs every
  detection pass).
- checkProcess: probe every PATHEXT suffix on win32, not just `.exe` — npm
  installs CLI harnesses (`claude`, `codex`, `od`…) as `.cmd`/`.bat` shims, which
  an `.exe`-only probe missed entirely on Windows.
- harnesses: detect Cline ONLY by its saoudrizwan.claude-dev extension. The
  `.vscode` directory belongs to VS Code, so keying off it false-detected Cline
  (and wrote an inert `mcpServers` block) in every VS Code project.

harnesses: 184 tests, 100% coverage.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012B41xiqaum5nwecX5mVghF

* fix(harnesses): review cleanup — fork detection, darwin config path, dead code, verb-first names

Follow-up review polish on the harness-detection work:

- signals: broaden `checkExtension` to the whole VS Code family — Cursor
  (~/.cursor), VSCodium (~/.vscode-oss), Windsurf (~/.windsurf) alongside stock
  ~/.vscode. Any match counts; each dir is exists-guarded before globbing.
- platformPaths: delete the dead `windowsHostUserBase` (nothing resolved through
  it); fix the darwin `userConfigBase` collision — `~/Library/Preferences`, now
  distinct from the data base (`~/Library/Application Support`); extract the pure
  `buildPlatformEnv` core so the OS-family + WSL branches stay coverage-checked
  and the `v8 ignore` wraps only the live host read; reword the header to be
  honest that 100% coverage proves the code RAN, not that the darwin/win32/WSL
  guesses are correct (real-host validation tracked in AV-287).
- verb-first renames (web-code-standards): signalTier -> toSignalTier,
  bandsForScope -> resolveBandsForScope, harnessInBand -> isHarnessInBand,
  harnessesForBand -> listHarnessesForBand. No external consumers; no aliases.

harnesses: 188 tests, 100% coverage.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012B41xiqaum5nwecX5mVghF

* fix(harnesses): match extension dirs by manifest, not directory name

The `glob` effect lists files only, so checkExtension's bare `<id>-<version>`
directory pattern never matched a real extension directory — extension detection
silently never fired. Exposed by making Cline extension-only (it would otherwise
be undetectable). Glob for the `package.json` manifest that every VS Code
extension carries at its root, under each versioned directory, so an installed
extension actually resolves.

harnesses: 188 tests, 100% coverage.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012B41xiqaum5nwecX5mVghF





# [0.32.0](https://github.com/canonical/pragma/compare/v0.31.0...v0.32.0) (2026-07-20)

**Note:** Version bump only for package @canonical/harnesses





# [0.31.0](https://github.com/canonical/pragma/compare/v0.30.0...v0.31.0) (2026-07-17)

**Note:** Version bump only for package @canonical/harnesses





# [0.30.0](https://github.com/canonical/pragma/compare/v0.29.1...v0.30.0) (2026-07-14)


### Bug Fixes

* **harnesses:** stop setup mcp from destroying valid JSONC configs (SEC-1) ([#743](https://github.com/canonical/pragma/issues/743)) ([1cf47a2](https://github.com/canonical/pragma/commit/1cf47a20889f1f25208110550398990bc11067e5))





# [0.29.0](https://github.com/canonical/pragma/compare/v0.29.0-experimental.0...v0.29.0) (2026-07-03)

**Note:** Version bump only for package @canonical/harnesses





# [0.29.0-experimental.0](https://github.com/canonical/pragma/compare/v0.28.0...v0.29.0-experimental.0) (2026-06-24)

**Note:** Version bump only for package @canonical/harnesses





# [0.28.0](https://github.com/canonical/pragma/compare/v0.27.1-experimental.0...v0.28.0) (2026-06-16)

**Note:** Version bump only for package @canonical/harnesses





## [0.27.1-experimental.0](https://github.com/canonical/pragma/compare/v0.28.0-experimental.0...v0.27.1-experimental.0) (2026-05-21)


### Bug Fixes

* **release:** unblock lerna 9 publish (access via publishConfig) ([#637](https://github.com/canonical/pragma/issues/637)) ([acc1185](https://github.com/canonical/pragma/commit/acc1185b43290c1edd88da25c000f7d9494caee6))





# [0.27.0](https://github.com/canonical/pragma/compare/v0.26.0...v0.27.0) (2026-04-29)

**Note:** Version bump only for package @canonical/harnesses





# [0.26.0](https://github.com/canonical/pragma/compare/v0.25.0...v0.26.0) (2026-04-24)

**Note:** Version bump only for package @canonical/harnesses





# [0.25.0](https://github.com/canonical/pragma/compare/v0.24.0...v0.25.0) (2026-04-17)

**Note:** Version bump only for package @canonical/harnesses





# [0.24.0](https://github.com/canonical/pragma/compare/v0.23.0...v0.24.0) (2026-04-13)

**Note:** Version bump only for package @canonical/harnesses





# [0.23.0](https://github.com/canonical/pragma/compare/v0.22.1...v0.23.0) (2026-04-07)

**Note:** Version bump only for package @canonical/harnesses





# [0.22.0](https://github.com/canonical/pragma/compare/v0.22.0-experimental.0...v0.22.0) (2026-04-03)

**Note:** Version bump only for package @canonical/harnesses





# [0.21.0](https://github.com/canonical/pragma/compare/v0.20.1...v0.21.0) (2026-04-01)

**Note:** Version bump only for package @canonical/harnesses





# [0.20.0](https://github.com/canonical/pragma/compare/v0.19.0...v0.20.0) (2026-03-26)

**Note:** Version bump only for package @canonical/harnesses





# [0.19.0](https://github.com/canonical/pragma/compare/v0.18.0...v0.19.0) (2026-03-26)


### Bug Fixes

* **ci:** add missing build step to push workflow, replace workspace: protocol ([#521](https://github.com/canonical/pragma/issues/521)) ([0e88312](https://github.com/canonical/pragma/commit/0e883120c96034d180de0ebdde6e9740d97609fe)), closes [#512](https://github.com/canonical/pragma/issues/512)


### Features

* **harness:** creates the @canonical/harnesses package ([#486](https://github.com/canonical/pragma/issues/486)) ([6e11f7d](https://github.com/canonical/pragma/commit/6e11f7d0a9bd1849edd3d95ffa1124deecbdd182))
* **task:** add undo interpreter and --undo flag across CLI ([#538](https://github.com/canonical/pragma/issues/538)) ([8c2fff5](https://github.com/canonical/pragma/commit/8c2fff58eb4e5527e4ca2aa1bd7e9f42b3cf70ee))
