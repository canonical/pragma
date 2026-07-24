# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.33.0](https://github.com/canonical/pragma/compare/v0.32.0...v0.33.0) (2026-07-24)


### Bug Fixes

* **svelte-ds-app-launchpad:** suppress "upgrade to modal" close event ([#887](https://github.com/canonical/pragma/issues/887)) ([92df40e](https://github.com/canonical/pragma/commit/92df40e5aa8ecdb52576c9df7da637669a05d5c4))


### chore

* **next:** scaffold @canonical/pragma-next package + CI wiring + budgets skeleton ([#874](https://github.com/canonical/pragma/issues/874)) ([f48c379](https://github.com/canonical/pragma/commit/f48c379b91dab4fda8a7afbc0fed818b3ae0df25))


* feat(cli)!: CLI surface consistency (verb/flag renames) + output model (--llm removal) (#875) ([50b66b9](https://github.com/canonical/pragma/commit/50b66b9d71b374e58eb5566699bb9c1d707459b7)), closes [#875](https://github.com/canonical/pragma/issues/875) [#874](https://github.com/canonical/pragma/issues/874)
* feat(cli)!: setup --scope band model + doctor local/global grouping (#868) ([b60c194](https://github.com/canonical/pragma/commit/b60c194b5212bf23b9b93cc403397f2722b9c55f)), closes [#868](https://github.com/canonical/pragma/issues/868) [#868](https://github.com/canonical/pragma/issues/868)
* feat(harnesses)!: AI-harness detection — platform paths, live signals, scope model, dedup + OpenDesign (#867) ([6e0df18](https://github.com/canonical/pragma/commit/6e0df1806cfd1d941c094c4f83a31488c36958cc)), closes [#867](https://github.com/canonical/pragma/issues/867)


### Features

* **cli:** pragma setup detects already-present config (idempotent, state-aware) ([#883](https://github.com/canonical/pragma/issues/883)) ([55f0afb](https://github.com/canonical/pragma/commit/55f0afb1bc08e96590584a1b5e03e2e3279ca110))
* **DescriptionList:** migrate to design tokens ([#888](https://github.com/canonical/pragma/issues/888)) ([24fe66c](https://github.com/canonical/pragma/commit/24fe66cb0b4b72fb2b34d048b7434d3fdc7803b2))
* **svelte-ds-app:** Port React core layouts ([#660](https://github.com/canonical/pragma/issues/660)) ([d85002e](https://github.com/canonical/pragma/commit/d85002e307af828c090b340e8494d5e5c3a1d2f8))
* **svelte-wpe:** Add KeyboardKey component ([#878](https://github.com/canonical/pragma/issues/878)) ([464939b](https://github.com/canonical/pragma/commit/464939b321618b3f15ace224c955d3cd6343c6ea))
* **svelte-wpe:** add Spinner subcomponent ([#886](https://github.com/canonical/pragma/issues/886)) ([4da56e0](https://github.com/canonical/pragma/commit/4da56e0bed25f52a0c0642905597a22bfa3131e1))
* **UserAvatar:** migrate to design tokens ([#892](https://github.com/canonical/pragma/issues/892)) ([446fc46](https://github.com/canonical/pragma/commit/446fc466a05eaa4ca257e842fc145d8a69817b6a))


### BREAKING CHANGES

* the covenant tool `ontology_show` is superseded by
`ontology_lookup` as the primary by-name ontology read. `ontology_show`
remains callable as a deprecated alias but should be migrated to
`ontology_lookup`; the covenant tool count changes 40 -> 41.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012B41xiqaum5nwecX5mVghF

* feat(cli)!: retire config field-verbs in favor of config set

Remove the per-field `config tier` / `config channel` / `config detail`
setters (tools `config_tier`/`config_channel`/`config_detail`) in favour of
the single `config set <key> <value>` command. `config set tier <v>` /
`config set channel <v>` / `config set detail <v>` are the migration path;
`config show` and `config set` are unchanged. The soft-deprecation hint added
earlier is now moot and removed.

The `CONFIG_FIELDS` table survives as the shared source of truth that drives
`config set` (its `<key>` enum, reset sentinels, enum validation, positional
shaping) via `runSet` -> `runField`; only the verb generation is gone.

- fields.ts: drop `fieldVerb`/`configFieldVerbs`/`fieldPositional`/the
  `preferSetHint` nudge; keep `CONFIG_FIELDS` + `ConfigFieldSpec`.
- show.verb.ts: the config module is now just `show` + `set`.
- surface.v2.json: remove the 3 field-verbs + 3 tools (41 -> 38).
- hints.ts / catalog.ts / doctor checkConfigFile: retarget the removed tools
  and the migration prose at `config set`.
- tests: delete field.test.ts (its coverage is mirrored by set.test.ts),
  retarget the config completion list, the eval cases, and the frozen
  tool count (38); regenerate the eval snapshot.
* the covenant tools `config_tier`, `config_channel`, and
`config_detail` (and the CLI verbs `config tier|channel|detail`) are removed.
Use `config set <field> <value>` instead (e.g. `config set tier apps/lxd`,
`config set channel experimental`); the covenant tool count changes 41 -> 38.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012B41xiqaum5nwecX5mVghF

* feat(cli)!: unify create include-flags on the --with-X convention

Rename `create application`'s bare include-flags `--ssr`/`--router`/`--forms`
to `--with-ssr`/`--with-router`/`--with-forms`, matching the `--with-X`
convention already used by `create component` (`--with-styles`, ...) and
`create package` (`--with-react`, ...).

The summon generator prompt names (`ssr`/`router`/`forms`) — and their
embedded templates and byte-equality goldens — are kept STABLE: the CLI
grammar exposes the `--with-X` params (`withSsr`/`withRouter`/`withForms`) and
`runCreate` normalizes them back to the generator prompt names at the single
CLI↔generator boundary (`toGeneratorAnswers` / `INCLUDE_FLAG_ALIASES`). No
cross-package churn; the summon-* packages are untouched.

- create.verb.ts: rename the application mirror to the `--with-X` names; add
  the alias map + boundary normalizer; every summon call reads the
  generator-facing `answers` bag.
- surface.v2.json: `create application` flags -> `--with-ssr`/`--with-router`/
  `--with-forms` (tool count unchanged).
- create.test.ts: bridge the parity comparison through the alias (kinds +
  defaults still checked against the real generator) and guard the rename.
- byteEquality.test.ts: the pragma path receives the `--with-X` params, the
  summon path the bare prompt names — both write the byte-identical tree,
  proving the boundary remap.

Note: `--relay` (opt-in, default false) is intentionally left as-is per the
approved scope, so it remains a bare boolean include-flag.
* `create application`'s `--ssr`, `--router`, and `--forms`
flags are renamed to `--with-ssr`, `--with-router`, and `--with-forms`. The
covenant `create application` flag set changes accordingly (the
`create_application` tool name is unchanged).

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012B41xiqaum5nwecX5mVghF

* feat(cli)!: unify --relay on the --with-X convention

Complete AV-228 B8: rename `create application`'s last bare include-flag
`--relay` to `--with-relay`, so all four application include-flags
(`--with-ssr`/`--with-router`/`--with-forms`/`--with-relay`) are on the single
`--with-X` convention.

Uses the mechanism already in place: the CLI grammar exposes the `withRelay`
param and `runCreate` normalizes it back to the summon generator's stable
prompt name `relay` at the one CLI↔generator boundary
(`INCLUDE_FLAG_ALIASES.application`). The generator prompt name and its
embedded templates / byte-equality goldens are untouched — no summon-package
churn.

- create.verb.ts: rename the application mirror `relay` -> `withRelay`; add
  `withRelay: "relay"` to the alias map; update the usage example
  (`--relay` -> `--with-relay`).
- surface.v2.json: `create application` flags -> `--with-relay` (tool count
  unchanged).
- byteEquality.test.ts: the pragma path receives `withRelay`, the summon path
  the bare `relay` — both write the byte-identical tree.
- create.test.ts: extend the parity bridge + rename guard to cover withRelay.
* `create application`'s `--relay` flag is renamed to
`--with-relay`. The covenant `create application` flag set changes accordingly
(the `create_application` tool name is unchanged).

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012B41xiqaum5nwecX5mVghF

* feat(cli)!: remove --llm flag, auto-detect output, beautify TTY

Fold the dedicated `--llm` global flag into `--format {plain|llm|json}`:
non-interactive stdout still auto-selects the condensed form via the existing
autoLlm detection (now the sole implicit trigger), `--format llm` forces it on
a TTY, and `--format plain` forces human output down a pipe. Ratifies the new
frozen globalFlags surface, updating the conformance golden, the help/completion
projections, and every --llm-referencing test.

Beautify the human (TTY) path only: `config show`, `sources status`, and the
shared lookup renderer gain alignment + subtle color through a chalk-backed
RenderStyle seam. Piped / MCP / redirected output stays byte-identical — the
styler is inert off a TTY, so the agent contract is unchanged.

Also folds AV-228 B2 (tier/prompt lookups now head at H2 like every other
entity read, with H3 sub-sections) and B7 (tier/prompt plain lookups gain the
shared ═ underline rule).
* the `--llm` global flag is removed. Use `--format llm` for
condensed Markdown, or rely on auto-detection when stdout is non-interactive.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012B41xiqaum5nwecX5mVghF

* fix(cli): gate doctor/colophon plain color behind stdout isTTY (F1)

`doctor --format plain` and `colophon --format plain` gated their color on
`chalk.level` alone. `supports-color` reports a non-zero level with no TTY under
GITHUB_ACTIONS / FORCE_COLOR, so a piped `pragma doctor --format plain | tee`
leaked ANSI into the byte-stable plain contract this lane established. Worse,
doctor baked `chalk.green("✓")` and friends at MODULE LOAD, freezing ANSI into
the glyphs whenever the module first loaded under color.

Route both plain paths through the shared `kernel/render/style.ts` seam
(`defaultStyle()` gates on `process.stdout.isTTY === true` AND a non-zero chalk
level), so piped / redirected / CI output renders the color-free form byte-for-
byte while an attended terminal stays fully colored. Doctor glyphs are now plain
constants tinted at render time (never baked); markdownTerminal threads a
`RenderStyle` (H1 underline reaches for chalk only when enabled). New/updated
tests pin ZERO ANSI off a TTY even at chalk.level 3, and color ON an attended
TTY, for both verbs.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012B41xiqaum5nwecX5mVghF

* fix(cli): single-source tier/prompt lookup frame + TTY styling (F3)

The tier and prompt lookups hand-replicated the shared `##`/`═` frame inline
instead of delegating to `renderLookupPlain`, so (a) the contract could drift
from block/skill lookups and (b) they never consulted the style seam — on a TTY
a tier/prompt lookup title stayed unstyled while block/skill titles were bold
with a dim rule.

- tier plain now delegates to the shared `renderLookupPlain` (title `name (uri)`
  + a single `blocks` inline field), single-sourcing the frame AND the TTY tint.
  Blocks are `ds:name` display strings, so the renderer's URI compaction is a
  no-op and piped output stays byte-stable. The tier llm path is a byte-frozen,
  never-styled agent contract that diverges from the generic renderer (H2 `name`
  title, backtick-wrapped IRI/blocks), so it is kept inline with a note.
- prompt plain routes the title, rule, and field label through the SAME style
  seam. Full delegation is infeasible here (the description line has no field
  label and the template body is appended raw), so the bespoke body stays inline
  while the title finally styles on a TTY.

Off a TTY the styler is inert, so both piped paths remain byte-identical; new
tests pin ANSI-on-TTY and byte-stable-off-TTY for both.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012B41xiqaum5nwecX5mVghF

* test(cli): pin that the removed --llm flag is now an unknown option (F2)

The output-model lane's whole premise is that the dedicated `--llm` flag is gone,
folded into `--format llm` (and the piped auto-default). Add a spawn-observed
covenant test that a REAL command — `pragma block list --llm` — fails as a usage
error (exit 2, "unknown option '--llm'") rather than silently accepting or
ignoring the flag. Commander rejects the unknown option during parse, before the
action runs, so no store is needed.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012B41xiqaum5nwecX5mVghF

* test(cli): refresh format validOptions fixtures to plain/llm/json (F4)

The invalid-`--format` error the CLI actually raises (bin.ts) now carries
`["plain", "llm", "json"]`, but the PragmaError factory and error-matrix fixtures
still constructed the two-element `["plain", "json"]`. Update them to the live
three-element set so the fixtures mirror the real error.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012B41xiqaum5nwecX5mVghF

* docs(cli): retarget CLI.mdx output modes to the --format model (F5)

The v2 CLI doc still presented `--llm` as a flag. Replace the output-modes table
with the `--format {plain|llm|json}` model and document the auto-detect note:
when `--format` is omitted, an interactive terminal gets `plain` while a non-
interactive stdout (pipe / redirect / MCP capture) auto-selects `llm`, and
`--format plain` forces human output down a pipe. Doc-only.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012B41xiqaum5nwecX5mVghF

* fix(cli): reconcile docs + guards with main after rebase (--format llm, config set)

Rebasing the surface lane onto main — which now carries the v2 doc set + drift
* **next:** the v2 CLI reshapes the command surface — the `data` noun
becomes `sources`, `update-refs` folds into `sources update`, the `llm`
orientation tool is retired in favour of the MCP handshake instructions and the
`capabilities` tool, the plural `tokens` noun/tools become singular `token`, and
`--format text` is renamed `--format plain`. See the changelog migration table.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012B41xiqaum5nwecX5mVghF

* test(cli): extend doc-example grammar checks and add a fast reference regen

Broaden the Tier 1 doc-example test to grammar-check the fenced `pragma`
examples in every hand-written doc (README, getting-started, mcp-integration,
config-model, architecture, skills), not just the first two. Present the manual
MCP launch as a harness JSON config so the hidden `pragma mcp` entry is shown
without tripping the (hidden-excluding) grammar check.

Add `scripts/genReference.ts` (and a `gen:reference` package script): the same
`writeReferenceDocs` step the build runs, isolated so a doc refresh needs no
binary compile.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012B41xiqaum5nwecX5mVghF

* fix(cli): call the discovery sequence four-stage in the capabilities doc

`buildDiscoverySequence` returns FOUR stages (capabilities → sources_status →
*_sample → domain tools), but the `capabilities` verb's `doc` string still
called it a "3-stage" sequence. Correct the source doc-string and regenerate
the reference so `docs/reference/commands.md` and `tools.md` re-sync — the
number now matches the actual sequence the catalog builds and the MCP handshake
renders.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012B41xiqaum5nwecX5mVghF

* docs: fix discovery-sequence stage count and scope the setup preview

Two hand-written docs echoed the stale "three-stage discovery sequence" wording;
correct both to "four-stage" to match `buildDiscoverySequence`. Also point the
MCP preview line at `pragma setup mcp --dry-run` (the precise preview for the
`pragma setup mcp` step it teaches) instead of `pragma setup --dry-run`, which
previews the whole wizard.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012B41xiqaum5nwecX5mVghF

* fix(cli): prune orphaned reference pages and sharpen a tie-break comment

`writeReferenceDocs` only ever wrote pages; a `.md` for a removed noun would
linger until the drift-guard flagged it. After writing the emitted set, unlink
any top-level `.md` the emitter no longer produces (deterministic, sorted), so
the reference tree self-heals on the next build. No-op on today's tree.

Also tighten the `compareDocVerbs` v8-ignore reason to state the real invariant:
no registered grammar produces a `[noun, noun]` path (a verb equal to its own
noun), so within one noun every verb-label is unique and the equal tie-break is
unreachable.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012B41xiqaum5nwecX5mVghF

* test(cli): cover the resource, prompt, and non-destructive render paths

`fixtureReferenceModule` claimed to exercise every `emitReference` render path,
but three had no independent assertion: `renderNonToolSurface`'s Resources and
Prompts bullets (no fixture set `mcpResources`/`mcpPrompts`) and
`formatToolAnnotations`'s "Non-destructive." line (no `mutates:true,
destructive:false` verb). Extend the fixture with an `mcpResources` template
surface, an `mcpPrompts` native surface, and a non-destructive mutating `gizmo
tidy` verb (no-op `register` hooks — the emitter reads neither), making the
docstring's claim true, and assert all three rendered strings directly.

Also add a non-circular exhaustiveness check over `errors.md`: iterate the
closed `ERROR_CODES` tuple and assert each code's catalog row is present, so a
code added to the kernel without a description fails here — not just the two
spot-checked codes.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012B41xiqaum5nwecX5mVghF

* test(cli): derive Tier-2 doc-example params from the real CLI parser

Tier-2 hand-supplied each read's param bag, so a documented positional in the
wrong slot would still pass (the bag ignored the string's token order). Parse
the documented command through the real grammar instead — a `preAction` hook
captures the routed verb and Commander operands/options and throws before
dispatch (no runtime boots), then `extractParams` derives the bag. Assert the
routed key and derived bag against the oracle, then execute the DERIVED bag
against the canonical fixture graph. A mis-slotted token now routes elsewhere or
yields a different bag and fails.

Also note in `staleCommands.test.ts` that CHANGELOG.md is deliberately exempt
from the retired-vocabulary scan (its migration table legitimately cites `data`,
`update-refs`, and plural `tokens`), making the "every doc" intent explicit.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012B41xiqaum5nwecX5mVghF
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

* feat(cli)!: --scope band selection for setup, band-grouped doctor report

Add a `--scope {project,global,both}` enum (default both) plus `--global`/
`--local` boolean sugars to `setup`/`setup mcp`/`setup skills` (not
completions/lsp). The resolved scope threads runSetup → buildSetupPlan:
availableSteps drops steps whose band the scope doesn't run (completions/lsp
are global, skills project, MCP spans both via its groups); MCP targets are the
deduped per-file TargetGroups for the scope, written once per file. The MCP
result carries {name, band, path} per target and the recap groups them
MACHINE/PROJECT; composeMcp/composeSkills emit band-prefixed manifest lines.
Item 6: per-file narrowing is opt-in — a "customize?" gate (default no) guards
the per-file multiselect, so "all" configures every deduped file. Doctor: each
check carries an optional band (MCP/skills project, completions global); the
report renders MACHINE/PROJECT sections before the tally. Covenant: the three
band-aware verbs gain the scope flags in surface.v2.json (globalFlags
untouched); the scope/band types are redeclared CLI-side so the lazy module
graph never statically pulls @canonical/harnesses.

Global-band skills are deferred — FOLLOW-UP(AV-284).
* `pragma setup`/`setup mcp`/`setup skills` add the
--scope/--global/--local flags; the `setup mcp` JSON result gains a `targets`
array.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012B41xiqaum5nwecX5mVghF

* fix(cli): address setup/doctor scope review findings + reconcile Cline detection
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


### Bug Fixes

* **components:** design-review batch — h5 small-caps, SwitchField, Tabs, ContextualMenu, Field.Description, density retune ([#871](https://github.com/canonical/pragma/issues/871)) ([d9a568e](https://github.com/canonical/pragma/commit/d9a568ecd8ec0b2a5481c8f6827aece698eec751))
* **form:** centre checkbox/switch on the label's first line (AV-325) ([#870](https://github.com/canonical/pragma/issues/870)) ([15cf3be](https://github.com/canonical/pragma/commit/15cf3bed7a16618cad535660e95e19ee4032f622))
* **react/ds-global-form:** design-review gate — validation scope, disabled border, 8px label gap ([#860](https://github.com/canonical/pragma/issues/860)) ([e14ec8e](https://github.com/canonical/pragma/commit/e14ec8ea91e967d28d6a766208d34fdced27fa75))
* **relay:** SSR-breaking type-only imports patched + summon relay-21 refresh with workspace-aware patch emission ([#866](https://github.com/canonical/pragma/issues/866)) ([47bc18d](https://github.com/canonical/pragma/commit/47bc18d2d4c786727a72d1bb44829acf5631b418))


### Features

* **components:** intrinsic control seat — one seat, no fixed heights (AV-323, AV-327) ([#873](https://github.com/canonical/pragma/issues/873)) ([4d5cbe8](https://github.com/canonical/pragma/commit/4d5cbe8631855864f48805a1ca07c76dd0cfb7bf)), closes [#871](https://github.com/canonical/pragma/issues/871) [#15](https://github.com/canonical/pragma/issues/15)
* **router-core:** history-delegate option for the memory adapter ([#862](https://github.com/canonical/pragma/issues/862)) ([d6d74b8](https://github.com/canonical/pragma/commit/d6d74b86e783b6a85549948f28960674f0650053))





# [0.31.0](https://github.com/canonical/pragma/compare/v0.30.0...v0.31.0) (2026-07-17)


### Bug Fixes

* **cli:** boot the ke store resiliently and name the offending file ([#798](https://github.com/canonical/pragma/issues/798)) ([dda93bb](https://github.com/canonical/pragma/commit/dda93bb9cc588e7a186ba8ab8d4a5d60ec424728))
* **cli:** core input/output correctness — completions, exit codes, validation ([#815](https://github.com/canonical/pragma/issues/815)) ([26b761d](https://github.com/canonical/pragma/commit/26b761d00c145a6e0a564c9f70d001805240e139))
* **cli:** don't boot the ke store for `create` scaffolding ([#797](https://github.com/canonical/pragma/issues/797)) ([298f8c4](https://github.com/canonical/pragma/commit/298f8c4233db0dafd89a7a801aeb45bdf9c5c9a8))
* **cli:** flag & command UX — unknown-verb, --version, config, graph query ([#817](https://github.com/canonical/pragma/issues/817)) ([82816d0](https://github.com/canonical/pragma/commit/82816d05e9e5308ff9747dcb361115994d8d70a3))
* **cli:** generator validation, --no- flags, auto-LLM detection, coverage ([#816](https://github.com/canonical/pragma/issues/816)) ([c9436f4](https://github.com/canonical/pragma/commit/c9436f471095edc2034157a21afce0cce50edfe7))
* **cli:** setup real-execution + harness detection, hang & help fixes, validation ([#818](https://github.com/canonical/pragma/issues/818)) ([59fea44](https://github.com/canonical/pragma/commit/59fea4471a036d8dc24f12ddbd3cd3f859c3a0d0))
* **density:** seat ds-global Button + restore control sizes ([#813](https://github.com/canonical/pragma/issues/813)) ([#814](https://github.com/canonical/pragma/issues/814)) ([78c8ed1](https://github.com/canonical/pragma/commit/78c8ed1ee4d21ec20c863edc2f7d68f4c3643dc6)), closes [#803](https://github.com/canonical/pragma/issues/803) [#812](https://github.com/canonical/pragma/issues/812) [#812](https://github.com/canonical/pragma/issues/812)
* **deps:** bump stale ^0.29.0 peerDependencies to ^0.30.0 ([#799](https://github.com/canonical/pragma/issues/799)) ([0702733](https://github.com/canonical/pragma/commit/0702733c48bd7838658be95589483192b5593cbe))
* **ds-global-form:** min/max & file validation, helper story, danger label ([#802](https://github.com/canonical/pragma/issues/802)) ([5cc9cec](https://github.com/canonical/pragma/commit/5cc9cec114ed3486ec51880295b1573a43add4e6))
* **ds-global,ds-global-form,styles:** token, colour & typography corrections from design review ([#764](https://github.com/canonical/pragma/issues/764)) ([89f8d44](https://github.com/canonical/pragma/commit/89f8d440a98f4ff0b3d42f17611f134e835d4295)), closes [#748](https://github.com/canonical/pragma/issues/748) [#748](https://github.com/canonical/pragma/issues/748)
* **ds-global:** sizing, spacing & alignment from design review ([#766](https://github.com/canonical/pragma/issues/766)) ([a78939a](https://github.com/canonical/pragma/commit/a78939afaa20d63f96225f3ff484fac02d15ffc2)), closes [#764](https://github.com/canonical/pragma/issues/764) [#801](https://github.com/canonical/pragma/issues/801)
* **react/ds-global-form:** re-render field error when message changes on cross-field revalidation ([#850](https://github.com/canonical/pragma/issues/850)) ([749ecb7](https://github.com/canonical/pragma/commit/749ecb76a4d88cca3da440987a68bb13dc3ea802))
* **react/ds-global:** SSR-safe portal gating via shared useIsMounted hook ([#822](https://github.com/canonical/pragma/issues/822)) ([2274577](https://github.com/canonical/pragma/commit/2274577be9b31344b671d93d77797740379e48a3)), closes [#663](https://github.com/canonical/pragma/issues/663)
* **storybook/addon-utils:** framework-agnostic withUtilStyles — stop wrapping stories in React elements ([#846](https://github.com/canonical/pragma/issues/846)) ([f98c071](https://github.com/canonical/pragma/commit/f98c07116c2a419d2b048d304fe122c93c7b0c61)), closes [#807](https://github.com/canonical/pragma/issues/807) [#839](https://github.com/canonical/pragma/issues/839) [pre-#807](https://github.com/pre-/issues/807) [#839](https://github.com/canonical/pragma/issues/839)


### Features

* **addon-utils:** density / context / grid Storybook toolbar ([#804](https://github.com/canonical/pragma/issues/804)) ([13233b0](https://github.com/canonical/pragma/commit/13233b00c68de20c227a4f6b130707afbe7b3b15))
* **cli:** add `create application` generator (CLI + MCP) ([#828](https://github.com/canonical/pragma/issues/828)) ([fbc8797](https://github.com/canonical/pragma/commit/fbc8797edc922aa31d40deed9aa1f917e08b3cb1))
* **cli:** bundled story-pack mechanism; migrate tier to a pack (P1, re-land) ([#844](https://github.com/canonical/pragma/issues/844)) ([7b6580b](https://github.com/canonical/pragma/commit/7b6580b23e03fd221ada608bae95fd55a46cafc6))
* **cli:** first-run onboarding — welcome note + global config creation ([#843](https://github.com/canonical/pragma/issues/843)) ([ea11862](https://github.com/canonical/pragma/commit/ea118628bb82301ef886ffe963ffb224ae958bcd))
* **cli:** generator packs — data-driven create surface ([#835](https://github.com/canonical/pragma/issues/835)) ([125ffbd](https://github.com/canonical/pragma/commit/125ffbd7519f9bb8f9266a87d1f6cbc901de766c))
* **cli:** package-declared prefixes + bare-core boot (P0) ([#824](https://github.com/canonical/pragma/issues/824)) ([b4f8a4a](https://github.com/canonical/pragma/commit/b4f8a4abbe36a89c47b472aec0cb94139a928dc4))
* **cli:** pragma create reuses summon's rich Ink UI when interactive ([#819](https://github.com/canonical/pragma/issues/819)) ([23d88b0](https://github.com/canonical/pragma/commit/23d88b0f080650da5e50546e0d416b9e844bb6ae))
* **cli:** task-oriented root --help with real descriptions ([#809](https://github.com/canonical/pragma/issues/809)) ([6c0c065](https://github.com/canonical/pragma/commit/6c0c065f40a22f27fa9a6e8717176714acb59a77))
* **density:** density model + 2×3 form-channel matrix, prose partition, guides ([#805](https://github.com/canonical/pragma/issues/805)) ([2f04495](https://github.com/canonical/pragma/commit/2f0449508fc25ccffeecf01942756eca66832ba7)), closes [#804](https://github.com/canonical/pragma/issues/804) [#806](https://github.com/canonical/pragma/issues/806)
* **doctor:** legible output with sub-items and inline remedies ([#800](https://github.com/canonical/pragma/issues/800)) ([d1ea747](https://github.com/canonical/pragma/commit/d1ea747950867a2f4b1695ecfc88c6261c1f6eeb))
* **ds-app-launchpad:** start migration to pragma design tokens ([#808](https://github.com/canonical/pragma/issues/808)) ([87a2b13](https://github.com/canonical/pragma/commit/87a2b13d14046b47344e1161a1d7285572d01267))
* **ds-assets:** add image-registries icon ([#823](https://github.com/canonical/pragma/issues/823)) ([0d91182](https://github.com/canonical/pragma/commit/0d91182c9473702acdf4a6b1dbdb1673799e325e)), closes [#720](https://github.com/canonical/pragma/issues/720)
* **ds-global:** Cards group — shared-subgrid card layout with aligned sections ([#807](https://github.com/canonical/pragma/issues/807)) ([550fdc0](https://github.com/canonical/pragma/commit/550fdc0dd2d1877bde7836dbe0a788107e0b580b))
* **ds-global:** Implement Svelte `<Breadcrumbs>`, a11y improvements to React `<Breadcrumbs>` ([#739](https://github.com/canonical/pragma/issues/739)) ([c47d403](https://github.com/canonical/pragma/commit/c47d403629b00cb602382fec81341bba3a36c725))
* **lit:** per-component export paths for tree-shaking ([#833](https://github.com/canonical/pragma/issues/833)) ([566a9f4](https://github.com/canonical/pragma/commit/566a9f4322acdfb4e3ad746d443009cb89c285a3)), closes [#480](https://github.com/canonical/pragma/issues/480) [#480](https://github.com/canonical/pragma/issues/480)
* **styles:** 4px baseline in styles-main + debug overlay ([#803](https://github.com/canonical/pragma/issues/803)) ([35308ae](https://github.com/canonical/pragma/commit/35308ae07ca9d5364626af85c66f80a2ecebe35f))
* **styles:** 4px baseline shim + typography example upgrade ([#790](https://github.com/canonical/pragma/issues/790)) ([1b11a25](https://github.com/canonical/pragma/commit/1b11a25f5c361186db8c7613fdf66f8cbf14c0c9))
* **svelte-wpe:** Add `Announcement` component ([#858](https://github.com/canonical/pragma/issues/858)) ([32233b9](https://github.com/canonical/pragma/commit/32233b944a2619fd8c30e23ce76e09dd783c1c8b))
* **webarchitect:** require exports map in the svelte package ruleset ([#827](https://github.com/canonical/pragma/issues/827)) ([7ad80ec](https://github.com/canonical/pragma/commit/7ad80ecc4dc22ce3ba90700a048ccb5d113e79e7)), closes [#407](https://github.com/canonical/pragma/issues/407)





# [0.30.0](https://github.com/canonical/pragma/compare/v0.29.1...v0.30.0) (2026-07-14)


### Bug Fixes

* **ci:** publish version guards + dist-tag routing; migrate Renovate config ([#762](https://github.com/canonical/pragma/issues/762)) ([772700a](https://github.com/canonical/pragma/commit/772700a67d0690208590cd0c48330c5b173de92a)), closes [#575](https://github.com/canonical/pragma/issues/575)
* **cli:** partial-failure-safe lookupMany, bundledLoader hardening, remove dead sem MCP server ([#763](https://github.com/canonical/pragma/issues/763)) ([e85cf27](https://github.com/canonical/pragma/commit/e85cf275e20ce5d12c9f6aa6787e22fb63d6deb1))
* **deps:** unify @canonical/design-tokens pin to 0.6.2-contrasted.0 ([#748](https://github.com/canonical/pragma/issues/748)) ([cf607d7](https://github.com/canonical/pragma/commit/cf607d7ae40f8044208e1e502c8d92178261e73c)), closes [#731](https://github.com/canonical/pragma/issues/731) [#89](https://github.com/canonical/pragma/issues/89)
* **ds-global-form:** clear all selections on multiple-combobox reset ([#724](https://github.com/canonical/pragma/issues/724)) ([ff5c972](https://github.com/canonical/pragma/commit/ff5c9729adaba2ea032ae8c7830757dfee15e8a6))
* **ds-global:** story polish — accordion heading/caret, surface stories, core-api notes ([#723](https://github.com/canonical/pragma/issues/723)) ([9a148a7](https://github.com/canonical/pragma/commit/9a148a790aa253a7a2f5cbe45317b232a864b037))
* **harnesses:** stop setup mcp from destroying valid JSONC configs (SEC-1) ([#743](https://github.com/canonical/pragma/issues/743)) ([1cf47a2](https://github.com/canonical/pragma/commit/1cf47a20889f1f25208110550398990bc11067e5))
* **ke-graphql:** latent compiler correctness fixes (ancestor ordering + sh:in scoping) ([#683](https://github.com/canonical/pragma/issues/683)) ([17916b5](https://github.com/canonical/pragma/commit/17916b54fac3d5a634a8eff784549e8df6b0162d))
* **ke-graphql:** peer @canonical/ke range follows the stable release line ([#775](https://github.com/canonical/pragma/issues/775)) ([80de54e](https://github.com/canonical/pragma/commit/80de54eafa4711ac22d00bccdcf5adf602d1da53))
* **react:** SSR-safe useHead and resurrect silently-skipped ds-global tests ([#759](https://github.com/canonical/pragma/issues/759)) ([0bcae12](https://github.com/canonical/pragma/commit/0bcae12008e14f8564f55426424a7fa1fdf60468)), closes [#663](https://github.com/canonical/pragma/issues/663) [#663](https://github.com/canonical/pragma/issues/663) [#663](https://github.com/canonical/pragma/issues/663) [post-#715](https://github.com/post-/issues/715) [#662](https://github.com/canonical/pragma/issues/662) [#662](https://github.com/canonical/pragma/issues/662) [#663](https://github.com/canonical/pragma/issues/663) [#731](https://github.com/canonical/pragma/issues/731)
* **summon-package:** make the per-package PR template opt-in ([#749](https://github.com/canonical/pragma/issues/749)) ([4847e38](https://github.com/canonical/pragma/commit/4847e38d9f4993f60577330c445ba45ddbb6b79f)), closes [canonical/pragma#684](https://github.com/canonical/pragma/issues/684) [#686](https://github.com/canonical/pragma/issues/686) [canonical/pragma#684](https://github.com/canonical/pragma/issues/684)
* **summon:** run under plain Node + fix publish-time breakages ([#721](https://github.com/canonical/pragma/issues/721)) ([c24295f](https://github.com/canonical/pragma/commit/c24295f7c67f5d3577d77f0abad818073871bd2e))
* **task:** route effect exceptions through recovery and trampoline preview/undo interpreters ([#740](https://github.com/canonical/pragma/issues/740)) ([6ad8b65](https://github.com/canonical/pragma/commit/6ad8b6518134f259f12acf76b21e1ce985e75403))


* refactor(cli)!: collapse the executor mode ladder; retire the interactive handoff (#772) ([34eb691](https://github.com/canonical/pragma/commit/34eb6916852ffd98670e4375a3692a90bb8443f9)), closes [#772](https://github.com/canonical/pragma/issues/772)
* refactor(task)!: scope @canonical/task to its consumer-used surface (#755) ([cdc725d](https://github.com/canonical/pragma/commit/cdc725d481d24ede55fc2f5b82cfad9b7dc088bc)), closes [#755](https://github.com/canonical/pragma/issues/755) [#741](https://github.com/canonical/pragma/issues/741) [#742](https://github.com/canonical/pragma/issues/742)


### Features

* **boilerplate:** app-level CSS compilation via Lightning CSS + declared browser floor ([#769](https://github.com/canonical/pragma/issues/769)) ([98281ba](https://github.com/canonical/pragma/commit/98281bace083fd841af0d52c0baf37bc2dd77fd1))
* **cli:** bundled loader serves embedded story definitions ([#781](https://github.com/canonical/pragma/issues/781)) ([511328a](https://github.com/canonical/pragma/commit/511328a4ca5e987f2f73e108a305848a65d6f03a))
* **cli:** byte-identical output for pragma create and summon; summon on the shared core ([#761](https://github.com/canonical/pragma/issues/761)) ([c10e133](https://github.com/canonical/pragma/commit/c10e1332e3a1f7e4f815da7cc40ecb4f95fbb045))
* **cli:** declarative list filters for story packs ([#780](https://github.com/canonical/pragma/issues/780)) ([87e0b0d](https://github.com/canonical/pragma/commit/87e0b0d9f86548da34d8bb1d7f0423b9904a6d45))
* **cli:** one prompting model — dialog-first prompts through the executor seam ([#758](https://github.com/canonical/pragma/issues/758)) ([ace9246](https://github.com/canonical/pragma/commit/ace9246de5e5e72231b2637b69443d55d9d0cfb8))
* **cli:** redesign MCP resources — TBox/ABox grouping, autocomplete, correctness fixes ([#784](https://github.com/canonical/pragma/issues/784)) ([7d08aec](https://github.com/canonical/pragma/commit/7d08aec79f54ea8a768f8d76e0f2cbe71be33c99))
* **cli:** story packs — declarative read stories for any ontology (experimental) ([#778](https://github.com/canonical/pragma/issues/778)) ([23f1227](https://github.com/canonical/pragma/commit/23f122701a88668dba8bee6d0652d40417d5dbf5))
* **ds-global-form:** add RatingInput (work in progress) ([#735](https://github.com/canonical/pragma/issues/735)) ([35f0736](https://github.com/canonical/pragma/commit/35f073619a414d5ff60d66d3fe2be9b25015c9b1))
* **ds-global-form:** SwitchInput + SwitchField ([#722](https://github.com/canonical/pragma/issues/722)) ([4047696](https://github.com/canonical/pragma/commit/4047696371de06f850f7287e225de096a8e80bd1))
* **ds-global:** add navigational Tabs + hoist shared LinkComponentProps ([#730](https://github.com/canonical/pragma/issues/730)) ([7f8937c](https://github.com/canonical/pragma/commit/7f8937cb242d47ba8fcc4aaa87c7d3d47a9e43df)), closes [#17](https://github.com/canonical/pragma/issues/17)
* **ds-global:** add Spinner subcomponent ([#726](https://github.com/canonical/pragma/issues/726)) ([1c307db](https://github.com/canonical/pragma/commit/1c307dbf857bde68883155364869b87ba03437f5))
* **ds-global:** implement Announcement with criticality variants ([#746](https://github.com/canonical/pragma/issues/746)) ([8e26c95](https://github.com/canonical/pragma/commit/8e26c950a7feea87e65f7a4bb1772cb656b116ce))
* **ds-global:** overlay components — Tooltip, Popover, ContextualMenu (+ submenus, logical placement, RTL) ([#731](https://github.com/canonical/pragma/issues/731)) ([4012a46](https://github.com/canonical/pragma/commit/4012a4630e18c02759a154232baec33850902916)), closes [#89](https://github.com/canonical/pragma/issues/89) [post-#745](https://github.com/post-/issues/745) [#745](https://github.com/canonical/pragma/issues/745)
* **ds-global:** overlay hooks — useDisclosure, useContextualMenu, arrow offset ([#727](https://github.com/canonical/pragma/issues/727)) ([4a8562e](https://github.com/canonical/pragma/commit/4a8562e585641a37b493685b6e0b27b1699b0cf2))
* **ds-global:** reconcile + fully style Button (re-target to main) ([#734](https://github.com/canonical/pragma/issues/734)) ([8e4cdbc](https://github.com/canonical/pragma/commit/8e4cdbc7052ae5e899ecb6d98090d45b6391b79a))
* **ds-global:** reconcile + promote Card and Tile ([#736](https://github.com/canonical/pragma/issues/736)) ([2213c47](https://github.com/canonical/pragma/commit/2213c47272989ef05ff8842127ded37f91ea3566)), closes [#723](https://github.com/canonical/pragma/issues/723) [#730](https://github.com/canonical/pragma/issues/730) [#723](https://github.com/canonical/pragma/issues/723)
* **i18n-core:** native-Intl framework-agnostic i18n core ([#684](https://github.com/canonical/pragma/issues/684)) ([62f3f36](https://github.com/canonical/pragma/commit/62f3f36fed5f689ae72ff66a600a5ca5daecdf8c))
* **i18n-react:** React bindings for @canonical/i18n-core ([#685](https://github.com/canonical/pragma/issues/685)) ([47b3be9](https://github.com/canonical/pragma/commit/47b3be9fde607b86ae88ef9e842b455aca2a3cf1)), closes [#684](https://github.com/canonical/pragma/issues/684) [#749](https://github.com/canonical/pragma/issues/749)
* **pragma-cli:** graphql serve + config-driven build/check over semantic packages ([#682](https://github.com/canonical/pragma/issues/682)) ([d3a09f5](https://github.com/canonical/pragma/commit/d3a09f56b113bad0adc63158c38715c7eb39ec1f))
* **react-boilerplate-vite:** Relay data layer (CSR) with local mock schema and storybook mocking ([#751](https://github.com/canonical/pragma/issues/751)) ([15c918c](https://github.com/canonical/pragma/commit/15c918c2939447b675ce6854ec3f6e2a5c02cd03))
* **react-boilerplate-vite:** working multi-language messages via @canonical/i18n-react ([#752](https://github.com/canonical/pragma/issues/752)) ([b16e17f](https://github.com/canonical/pragma/commit/b16e17f82d67bc55887142f6b675d820a94978c8))
* **router-core:** schema validation for URL params via Standard Schema v1 ([#760](https://github.com/canonical/pragma/issues/760)) ([eb6398f](https://github.com/canonical/pragma/commit/eb6398f16a91ae51f977c442a4baa50657bd2dd1))
* **storybook-addon-relay:** mock Relay environments for React stories ([#750](https://github.com/canonical/pragma/issues/750)) ([283cfce](https://github.com/canonical/pragma/commit/283cfce433fa3186022638ecec93caaa72cf802e))
* **summon-application:** opt-in Relay data layer for generated apps (--relay) ([#753](https://github.com/canonical/pragma/issues/753)) ([b64f51c](https://github.com/canonical/pragma/commit/b64f51cbac49c790828a73d6601e1a87fcba6b5f)), closes [#751](https://github.com/canonical/pragma/issues/751) [advl/lit-relay#32](https://github.com/advl/lit-relay/issues/32)
* **task:** content-addressable effect identity — canonicalJSON, EffectId, per-tag descriptors ([#741](https://github.com/canonical/pragma/issues/741)) ([f1a3a0b](https://github.com/canonical/pragma/commit/f1a3a0bacb607b51d89cf8f7d206a8252b7842bf))
* **task:** journal record/replay for deterministic effect execution ([#742](https://github.com/canonical/pragma/issues/742)) ([703db92](https://github.com/canonical/pragma/commit/703db927cf0bf9f937948817a2a2f7ba5cd1f87a))


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
* the journal/effect-identity exports are gone from
@canonical/task; RunTaskOptions no longer accepts `journal`.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DF9ExVCukzqpe1Fus9V1no

* chore(task): drop imports orphaned by the journal-seam test removal

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DF9ExVCukzqpe1Fus9V1no





## [0.29.1](https://github.com/canonical/pragma/compare/v0.29.0...v0.29.1) (2026-07-03)


### Bug Fixes

* **storybook:** sidebar order + tier-scope stories to work-in-progress + docs ([#719](https://github.com/canonical/pragma/issues/719)) ([a26fe7f](https://github.com/canonical/pragma/commit/a26fe7ffdec6ed701fd242ae725461054a006c04)), closes [#31842](https://github.com/canonical/pragma/issues/31842) [storybookjs/storybook#31842](https://github.com/storybookjs/storybook/issues/31842)





# [0.29.0](https://github.com/canonical/pragma/compare/v0.29.0-experimental.0...v0.29.0) (2026-07-03)


### Bug Fixes

* **storybook-addon-utils:** force autodocs pages to light scheme ([#716](https://github.com/canonical/pragma/issues/716)) ([bb14644](https://github.com/canonical/pragma/commit/bb14644ab814f0a62ecb7467a587bf4b6f5e0a43))
* **storybook-addon-utils:** top-align the grid on the story root ([#714](https://github.com/canonical/pragma/issues/714)) ([b32639b](https://github.com/canonical/pragma/commit/b32639b0f1ca81fe9ad252a9b2a8de122b9f8ff9))


### Code Refactoring

* **ds-global-form:** rename SimpleChoicesField→ChoicesField, ChoicesField→RichChoicesField ([#711](https://github.com/canonical/pragma/issues/711)) ([4a4a498](https://github.com/canonical/pragma/commit/4a4a4988a25df45f9f102f2540efa4ac958e82ae))


### Features

* **ds-global-form:** required/optional marking, checkbox checkmark colour, choices columns ([#706](https://github.com/canonical/pragma/issues/706)) ([85963c9](https://github.com/canonical/pragma/commit/85963c9235b3dec86ca0a78cb53f478f2ef9c5dd))
* **ds-global:** InlineCode, .code baseline utility, KeyboardKey(s) tier + token rewire ([#717](https://github.com/canonical/pragma/issues/717)) ([9911f68](https://github.com/canonical/pragma/commit/9911f689c4193bee3fdbebea8f475c2dcd80d2d1))
* **react-ds-global-form:** PhoneInput dial-code sort + emoji-flag option ([#703](https://github.com/canonical/pragma/issues/703)) ([2ff5643](https://github.com/canonical/pragma/commit/2ff564309418eb29a51f0865f40d996fe07bab02))
* **react-ds-global-form:** RangeField synced number + slider (DE080) ([#705](https://github.com/canonical/pragma/issues/705)) ([7c3d59a](https://github.com/canonical/pragma/commit/7c3d59aeae7d616958c8a192ea9d28d6ec09a31a))
* **scripts:** show npm provenance (OIDC) status in publish:status ([#708](https://github.com/canonical/pragma/issues/708)) ([da13740](https://github.com/canonical/pragma/commit/da13740c90f9692560635ce9ace5fdc2e699f593))
* **svelte-ds-app-launchpad:** allow SSR-opened dialogs ([#695](https://github.com/canonical/pragma/issues/695)) ([2af3abe](https://github.com/canonical/pragma/commit/2af3abe90fcae84bf30d6f782dd48f5a6706948e))


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


### Features

* **svelte-wpe:** Add `SkipLink` component ([#659](https://github.com/canonical/pragma/issues/659)) ([26253e9](https://github.com/canonical/pragma/commit/26253e94a25ef8ff8a00816b71212a931288b248))
* **task:** stack-safe trampoline interpreter + effect-alphabet generics ([#691](https://github.com/canonical/pragma/issues/691)) ([7dc66a3](https://github.com/canonical/pragma/commit/7dc66a3b6ca939bf9970903af241d947b6187fd0))
* **webarchitect:** add --license parameter (defaults to LGPL-3.0) ([#690](https://github.com/canonical/pragma/issues/690)) ([0a6f795](https://github.com/canonical/pragma/commit/0a6f79529a47171c5015fa67e79ce65f63eca501))





# [0.28.0](https://github.com/canonical/pragma/compare/v0.27.1-experimental.0...v0.28.0) (2026-06-16)


### Bug Fixes

* **react-ssr:** serve dev SSR assets and resolve module-only deps (viteFetchMiddleware) ([#648](https://github.com/canonical/pragma/issues/648)) ([662783d](https://github.com/canonical/pragma/commit/662783d6d4da18039d9a04e42bd118e1ad161815))
* **react:** accessible naming for Button and Icon ([#661](https://github.com/canonical/pragma/issues/661)) ([e856a20](https://github.com/canonical/pragma/commit/e856a20318912151ab77519dde359f67c13c59f3))
* **summon-component:** Fix Svelte component output failing type-checking ([#642](https://github.com/canonical/pragma/issues/642)) ([1331c96](https://github.com/canonical/pragma/commit/1331c963a5691f20b826bbb8b081ab283bde8584))


### Features

* add SSR deployment adapters for Cloudflare Workers, Vercel, and Deno ([#597](https://github.com/canonical/pragma/issues/597)) ([97e32fc](https://github.com/canonical/pragma/commit/97e32fc07403e04eef595d50a0343e9b22108e31)), closes [#596](https://github.com/canonical/pragma/issues/596)
* **ds-app:** ApplicationLayout, ViewLayout, ContentLayout ([#656](https://github.com/canonical/pragma/issues/656)) ([b2f854a](https://github.com/canonical/pragma/commit/b2f854a127ae1a048de664d6c555475495b9cd70)), closes [#421](https://github.com/canonical/pragma/issues/421) [#421](https://github.com/canonical/pragma/issues/421) [#421](https://github.com/canonical/pragma/issues/421)
* **ds-app:** side navigation plumbing ([#651](https://github.com/canonical/pragma/issues/651)) ([089e4e0](https://github.com/canonical/pragma/commit/089e4e00442387b18fc62d41eedc294656be5d9d)), closes [#649](https://github.com/canonical/pragma/issues/649) [#649](https://github.com/canonical/pragma/issues/649)
* **ds-app:** SideNavigation baseline alignment ([#657](https://github.com/canonical/pragma/issues/657)) ([abbe034](https://github.com/canonical/pragma/commit/abbe034f4d810ca64d349c78a8504b1a38310fba))
* **ds-app:** SideNavigation grouping, enhanced item & generic navigation hook ([#655](https://github.com/canonical/pragma/issues/655)) ([532fca3](https://github.com/canonical/pragma/commit/532fca339f8b3f960d739a5955ff57839515c3ea))
* **ds-assets:** add maximize, minimize, and clipboard icons ([#688](https://github.com/canonical/pragma/issues/688)) ([b1b8247](https://github.com/canonical/pragma/commit/b1b82476aee33897aa43845ac899c0e846ca2b53)), closes [#567](https://github.com/canonical/pragma/issues/567) [#567](https://github.com/canonical/pragma/issues/567) [#567](https://github.com/canonical/pragma/issues/567) [#567](https://github.com/canonical/pragma/issues/567) [#567](https://github.com/canonical/pragma/issues/567) [#567](https://github.com/canonical/pragma/issues/567)
* **ds-assets:** add table, chart, and theme selector icons ([#687](https://github.com/canonical/pragma/issues/687)) ([6e142ce](https://github.com/canonical/pragma/commit/6e142ced9ecc31fb12cde7d4b010d3615e7f1a85)), closes [#653](https://github.com/canonical/pragma/issues/653) [#654](https://github.com/canonical/pragma/issues/654)
* **ke-graphql:** /http subpath — fetch handler, GraphiQL, multipart incremental ([#672](https://github.com/canonical/pragma/issues/672)) ([2ebe4e2](https://github.com/canonical/pragma/commit/2ebe4e290da44356cedcd777fa21c3ce010de8ba))
* **ke-graphql:** compiler core + plugin (validate/wireRelay/compose, orchestration, tbox, schema plugin) ([#678](https://github.com/canonical/pragma/issues/678)) ([1b3db0b](https://github.com/canonical/pragma/commit/1b3db0bc87b24acb86c6dc7714a673a20a4fd099))
* **ke-graphql:** compiler emit pass (MappedIR → GraphQL type plans) ([#681](https://github.com/canonical/pragma/issues/681)) ([c17351d](https://github.com/canonical/pragma/commit/c17351d7c91786a500a34471dd990a19b2ae8015))
* **ke-graphql:** compiler extract + build passes (OWL → IR) ([#669](https://github.com/canonical/pragma/issues/669)) ([45e6453](https://github.com/canonical/pragma/commit/45e64531eecfdebbfe2e1b83d49ff1212a23bce9))
* **ke-graphql:** compiler map pass (OntologyIR → MappedIR) ([#680](https://github.com/canonical/pragma/issues/680)) ([026eeea](https://github.com/canonical/pragma/commit/026eeea18aff9284aec35999809e150b1ab4af5a))
* **ke-graphql:** demo dev server + benchmark script ([#673](https://github.com/canonical/pragma/issues/673)) ([152aaad](https://github.com/canonical/pragma/commit/152aaadcb37084d7c205bd2648ee99096d46d92a))
* **ke-graphql:** library foundation — scaffold, shared + hardening, docs ([#667](https://github.com/canonical/pragma/issues/667)) ([0b39168](https://github.com/canonical/pragma/commit/0b391688c7c10f149d4b74e274ed7cefc0de0260))
* **ke-graphql:** local + incremental execution ([#679](https://github.com/canonical/pragma/issues/679)) ([8e614d9](https://github.com/canonical/pragma/commit/8e614d9d47c96587075eb3233579f562908c91da))
* **ke-graphql:** resolution layer — dataloaders + resolver templates and connection helpers ([#668](https://github.com/canonical/pragma/issues/668)) ([f6c8acc](https://github.com/canonical/pragma/commit/f6c8acce7c370b42adb2470bc81ec31f36ee1c45))
* **ke:** term-preserving query results (A.0) ([#664](https://github.com/canonical/pragma/issues/664)) ([166c115](https://github.com/canonical/pragma/commit/166c11515538e5c93a0556e0b709092d364161ce))
* **pragma:** parallel doctor checks + S-grade empty-result recovery hints ([#641](https://github.com/canonical/pragma/issues/641)) ([060b9f5](https://github.com/canonical/pragma/commit/060b9f5291aef1ad525744b625b4164ff25c3f7b)), closes [#543](https://github.com/canonical/pragma/issues/543)
* **pragma:** trace, MCP resources, summon template loading, framework config ([#645](https://github.com/canonical/pragma/issues/645)) ([4f0a341](https://github.com/canonical/pragma/commit/4f0a341a050facbf3a87419ed7a9b3c29c0a9ade)), closes [#1](https://github.com/canonical/pragma/issues/1) [#551](https://github.com/canonical/pragma/issues/551) [#569](https://github.com/canonical/pragma/issues/569) [#641](https://github.com/canonical/pragma/issues/641) [#641](https://github.com/canonical/pragma/issues/641)
* **react-hooks:** SSR theme wiring + Lighthouse-100 boilerplate ([#652](https://github.com/canonical/pragma/issues/652)) ([dd61a4d](https://github.com/canonical/pragma/commit/dd61a4d45f9e868a53b80ae0c77c029e13fede47))
* **react-ssr:** compiled preview SSR path + 2x3 server matrix ([#650](https://github.com/canonical/pragma/issues/650)) ([b490591](https://github.com/canonical/pragma/commit/b490591e863c1d09d2b4b9b3d7eed1a2e467aaf2))
* **storybook-config:** establish full-height chain via previewHead ([#649](https://github.com/canonical/pragma/issues/649)) ([99b8b52](https://github.com/canonical/pragma/commit/99b8b520edbf304cae0b3a8f30b9068fd069d160))
* **summon-application:** add domain, route, and wrapper generators ([#626](https://github.com/canonical/pragma/issues/626)) ([6744b08](https://github.com/canonical/pragma/commit/6744b084236175b121f7aec36859976b5028a33e)), closes [#617](https://github.com/canonical/pragma/issues/617) [#643](https://github.com/canonical/pragma/issues/643)
* **svelte-ds-app-launchpad:** Add Log component ([#631](https://github.com/canonical/pragma/issues/631)) ([99e5cf4](https://github.com/canonical/pragma/commit/99e5cf486edeb4042a6b544b787a3cec9e794e64)), closes [#632](https://github.com/canonical/pragma/issues/632)
* **svelte-ds-app-launchpad:** Allow passing img-specific attributes to UserAvatar ([#638](https://github.com/canonical/pragma/issues/638)) ([84b9ae5](https://github.com/canonical/pragma/commit/84b9ae5f324769facb23cdf9882d0e0bd5755094))
* **webarchitect:** add ruleset template variables with --var/--prefix flags ([#665](https://github.com/canonical/pragma/issues/665)) ([1b59742](https://github.com/canonical/pragma/commit/1b597422e09a5ce1c917d6b319344a9d8843ce02))





## [0.27.1-experimental.0](https://github.com/canonical/pragma/compare/v0.28.0-experimental.0...v0.27.1-experimental.0) (2026-05-21)


### Bug Fixes

* **release:** unblock lerna 9 publish (access via publishConfig) ([#637](https://github.com/canonical/pragma/issues/637)) ([acc1185](https://github.com/canonical/pragma/commit/acc1185b43290c1edd88da25c000f7d9494caee6))





# [0.27.0](https://github.com/canonical/pragma/compare/v0.26.0...v0.27.0) (2026-04-29)


### Features

* **svelte-ds-app-launchpad:** Add SearchBox ([#625](https://github.com/canonical/pragma/issues/625)) ([4fe33f9](https://github.com/canonical/pragma/commit/4fe33f93f97acfe6e06fbc7c3ac939f567b8f981))
* **svelte-ds-app-launchpad:** Add Select ([#624](https://github.com/canonical/pragma/issues/624)) ([5cb5539](https://github.com/canonical/pragma/commit/5cb5539b5d2e78c71241b5714918deec1f89e9d0))
* **svelte-ds-app-launchpad:** WD-35462 Upstream Tooltip ([#620](https://github.com/canonical/pragma/issues/620)) ([6c0a42d](https://github.com/canonical/pragma/commit/6c0a42d9543d3251cf8168083f903e4f2b73f29d))





# [0.26.0](https://github.com/canonical/pragma/compare/v0.25.0...v0.26.0) (2026-04-24)


### Bug Fixes

* **ci:** disable failing SkipLink Chromatic snapshot and add "no visual change" label skip ([#613](https://github.com/canonical/pragma/issues/613)) ([031fd89](https://github.com/canonical/pragma/commit/031fd89f70f61f2eabb14bc55012db11bef67807))


* feat(router)!: prefetch rename, remove data threading, Navigation API adapter (#614) ([cb3baff](https://github.com/canonical/pragma/commit/cb3baffe299c386137bcc5130de10fc6f7815c87)), closes [#614](https://github.com/canonical/pragma/issues/614)


### Features

* **boilerplate-vite:** router integration with SSR, head management, and middleware ([#617](https://github.com/canonical/pragma/issues/617)) ([7a2693e](https://github.com/canonical/pragma/commit/7a2693e7e66268d7849cb1682a87288ffae30c28))
* **cli:** configurable package sources with git ref resolution ([#621](https://github.com/canonical/pragma/issues/621)) ([66dc0dc](https://github.com/canonical/pragma/commit/66dc0dcf6891d697d5e4b134db76fe34901520d9))
* **router:** add setSearchParams() and useBlocker() navigation blocking ([#615](https://github.com/canonical/pragma/issues/615)) ([b885b07](https://github.com/canonical/pragma/commit/b885b075b566daed741050173f892305084f2ddd))
* **router:** migration guide and TanStack removal from demo ([#622](https://github.com/canonical/pragma/issues/622)) ([e3e9856](https://github.com/canonical/pragma/commit/e3e9856aeacf269acb8ed40db3b62dbdd220cde6))
* **router:** router factories, @canonical/react-head package, SSR docs ([#616](https://github.com/canonical/pragma/issues/616)) ([621618c](https://github.com/canonical/pragma/commit/621618c019cf4ac541eabdd2e09bbb74a87aee8a))
* **svelte-ds-app-launchpad:** Add SidePanel ([#590](https://github.com/canonical/pragma/issues/590)) ([c796451](https://github.com/canonical/pragma/commit/c7964513341763d1614635ff3f0a1c3f40eb0495))
* **svelte-ds-app-launchpad:** Add Table ([#619](https://github.com/canonical/pragma/issues/619)) ([7f611c7](https://github.com/canonical/pragma/commit/7f611c78991d7c9c99c183a92937200851cb053b))
* **svelte-ds-app-launchpad:** Add Timeline ([#607](https://github.com/canonical/pragma/issues/607)) ([369b437](https://github.com/canonical/pragma/commit/369b437d0345757776f237e6f103a12471d48824))
* **svelte-ds-app-launchpad:** Add UserAvatar component ([#606](https://github.com/canonical/pragma/issues/606)) ([0979fa1](https://github.com/canonical/pragma/commit/0979fa17610db3155c49c4f4ae737991656f4343))


### BREAKING CHANGES

* Routes and wrappers use `prefetch` instead of `fetch`.
`prefetch()` is fire-and-forget — it does not return data to `content()`.
`content()` receives only `params` and `search`, no `data` prop.
Wrapper components receive only `children`, no `data` prop.
Route and wrapper `.error` properties are removed — use React error
boundaries with `StatusResponse` instead.
`routeData`, `wrapperData`, and `errorBoundary` are removed from
`RouterLoadResult` and `RouterDehydratedState`.
Wrapper data is no longer cached across sibling navigations.
`WrapperDefinition` takes one generic (`TRendered`) instead of two.

* feat(router-core): add Navigation API adapter with History API fallback

Add createNavigationAdapter using the Navigation API (Baseline Newly
Available since January 2026). Rename the existing pushState/popstate
adapter to createHistoryAdapter. The public createBrowserAdapter now
auto-detects: Navigation API when available, History API otherwise.

Both createHistoryAdapter and createNavigationAdapter are exported for
consumers who need explicit control.

* docs(router): update READMEs for prefetch rename, data ownership, and Navigation API

Update both router-core and router-react READMEs to reflect:
- fetch→prefetch rename and fire-and-forget semantics
- content() receives params and search, not data
- error handling via StatusResponse and React error boundaries (no
  router-provided error boundary component)
- data ownership: components own their data via cache libraries
- Navigation API as primary browser adapter with History fallback
- platform adapter documentation (createBrowserAdapter, createHistoryAdapter,
  createNavigationAdapter)
- SSR section updated: consumers wire their own render tree
- removed references to renderToStream convenience function

* fix(router-react): use createHistoryAdapter in createHydratedRouter

createBrowserAdapter no longer accepts a window argument (it auto-detects).
createHydratedRouter passes a custom browserWindow for testing, so it
needs createHistoryAdapter which accepts the window parameter directly.





# [0.25.0](https://github.com/canonical/pragma/compare/v0.24.0...v0.25.0) (2026-04-17)


### Bug Fixes

* **svelte-ds-app-launchpad:** Exclude tests and stories from publishing to npm ([#612](https://github.com/canonical/pragma/issues/612)) ([c120ef0](https://github.com/canonical/pragma/commit/c120ef0b3d301fdc9fc0372de052e40119ab1992))


### Features

* **List, BasicSection:** Implement List and BasicSection webcomponents ([#583](https://github.com/canonical/pragma/issues/583)) ([e760458](https://github.com/canonical/pragma/commit/e760458b4109be0fb68d11759a2f453d143c72a3))
* **lit:** implement ds-button-link, ds-cta-block and ds-cta-section web components ([#566](https://github.com/canonical/pragma/issues/566)) ([c6e67fb](https://github.com/canonical/pragma/commit/c6e67fbae5782507924c7de978c7388167fb3311))





# [0.24.0](https://github.com/canonical/pragma/compare/v0.23.0...v0.24.0) (2026-04-13)


### Bug Fixes

* **svelte-ds-app-launchpad:** Increase specificity of button styles ([#611](https://github.com/canonical/pragma/issues/611)) ([ca84fd5](https://github.com/canonical/pragma/commit/ca84fd56bcc222cab102ce7624ab345b9b2bc7d0))


### Features

* **react-hooks:** preference hooks, navigation tree hook, and ARIA helpers ([#609](https://github.com/canonical/pragma/issues/609)) ([b3190b0](https://github.com/canonical/pragma/commit/b3190b0c3b6ac6ada32d84f4eb053539742541ec))
* **react-ssr:** add shared adapter types, MIME utility, and pattern matching ([#596](https://github.com/canonical/pragma/issues/596)) ([0eb130a](https://github.com/canonical/pragma/commit/0eb130a55429596b39ca40b2496159ce23020a2b))
* **svelte-ds-app-launchpad:** Add Modal ([#588](https://github.com/canonical/pragma/issues/588)) ([e1ec629](https://github.com/canonical/pragma/commit/e1ec6293f5bbe1789b3baf6e8cd47da17bba2b2b))





# [0.23.0](https://github.com/canonical/pragma/compare/v0.22.1...v0.23.0) (2026-04-07)


### Bug Fixes

* **svelte-ds-app-launchpad:** Fix typo in internal.ts file name ([#605](https://github.com/canonical/pragma/issues/605)) ([80a24c6](https://github.com/canonical/pragma/commit/80a24c68d56876db757609c90caaf7dc97465820))


### Features

* **react-ssr:** add TextRenderer + migrate consumers to new API ([#594](https://github.com/canonical/pragma/issues/594)) ([78c9737](https://github.com/canonical/pragma/commit/78c973714ef6792bceec5a57c7426d9f24406cf6))
* **react-ssr:** decouple renderers from HTTP, add web streams + sitemap ([#593](https://github.com/canonical/pragma/issues/593)) ([9050feb](https://github.com/canonical/pragma/commit/9050feb55484fad8f9035f0b2ca4fffa7592f7e3))
* **router-core:** platform-agnostic router with typed navigation and SSR ([#601](https://github.com/canonical/pragma/issues/601)) ([ee26e29](https://github.com/canonical/pragma/commit/ee26e294fc255e8ea27767abd0f2663c11c0ee70))
* **router-react:** React bindings for @canonical/router-core ([#602](https://github.com/canonical/pragma/issues/602)) ([86a4089](https://github.com/canonical/pragma/commit/86a40895f9dd83e9b38c13a5501e2e54dc9b99da))


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





## [0.22.1](https://github.com/canonical/pragma/compare/v0.22.0...v0.22.1) (2026-04-03)


### Bug Fixes

* **svelte-ds-app-launchpad:** Fix export related issues ([#592](https://github.com/canonical/pragma/issues/592)) ([2269dd5](https://github.com/canonical/pragma/commit/2269dd567ae403337c18384609a2757e53ac871d))





# [0.22.0](https://github.com/canonical/pragma/compare/v0.22.0-experimental.0...v0.22.0) (2026-04-03)


### Bug Fixes

* **ButtonPrimitive:** Fix ButtonPrimitive props type ([#591](https://github.com/canonical/pragma/issues/591)) ([2cb1e81](https://github.com/canonical/pragma/commit/2cb1e81d46bf11146650a9b93f608fbf0388abbc))





# [0.22.0-experimental.0](https://github.com/canonical/pragma/compare/v0.21.0...v0.22.0-experimental.0) (2026-04-02)


### Bug Fixes

* exclude svelte packages from storybook hub workflow ([#589](https://github.com/canonical/pragma/issues/589)) ([7fec857](https://github.com/canonical/pragma/commit/7fec8575d9eb134a5bc15ce6c36e3a6e0aafea45))
* **pragma-cli:** embed oxigraph WASM in compiled binary ([#584](https://github.com/canonical/pragma/issues/584)) ([929dad6](https://github.com/canonical/pragma/commit/929dad6ee8f770b659b5fb1387419648bcc32fa0))


### Features

* **TieredList:** Implement TieredList webcomponent ([#553](https://github.com/canonical/pragma/issues/553)) ([c96b9df](https://github.com/canonical/pragma/commit/c96b9df9502bd5d68a4c051c6f1be30a5034fedf))





# [0.21.0](https://github.com/canonical/pragma/compare/v0.20.1...v0.21.0) (2026-04-01)


### Bug Fixes

* **deps:** update dependency domhandler to v6 ([#547](https://github.com/canonical/pragma/issues/547)) ([d823ba0](https://github.com/canonical/pragma/commit/d823ba0e4d9518357049b78e18d571400792f2a3))
* **deps:** update dependency ejs to v5 ([#452](https://github.com/canonical/pragma/issues/452)) ([d283bb4](https://github.com/canonical/pragma/commit/d283bb4d7b108597d7e87560a6c8b55622cf8604))
* **deps:** update dependency oxigraph to ^0.5.0 ([#544](https://github.com/canonical/pragma/issues/544)) ([5db9693](https://github.com/canonical/pragma/commit/5db96933375e9e08aeff229403295ac3596d1ce9))


### Features

* **cli-core:** support interactive pragma generators ([#576](https://github.com/canonical/pragma/issues/576)) ([fc53e23](https://github.com/canonical/pragma/commit/fc53e237a70436cf2d9a0843e17801926c878f31))
* **form,styles,typography:** baseline grid alignment for form fields ([#571](https://github.com/canonical/pragma/issues/571)) ([2f9c5aa](https://github.com/canonical/pragma/commit/2f9c5aafbd69815867a7449d16771d3d3c729912))
* **pragma-cli:** compile to linux-x64 binary for npm publish ([#581](https://github.com/canonical/pragma/issues/581)) ([80648dc](https://github.com/canonical/pragma/commit/80648dca3dfd48694ee64a18e267496f93647569))
* **pragma-cli:** rich TUI rendering for list and lookup commands ([#577](https://github.com/canonical/pragma/issues/577)) ([ebeb4e0](https://github.com/canonical/pragma/commit/ebeb4e023d92239614d281cb4825ded493bbaff5))
* **react-ds-global:** KeyboardKey and KeyboardKeys ([#559](https://github.com/canonical/pragma/issues/559)) ([d96928c](https://github.com/canonical/pragma/commit/d96928c255d9481bb921af51a7170d3545d63bb3))
* **styles:** spacing tokens, canonical borders, self-hosted fonts, addon-utils toolbar ([#552](https://github.com/canonical/pragma/issues/552)) ([b7f0adc](https://github.com/canonical/pragma/commit/b7f0adc3f83dabf95b7272ce60e01de3110706c4))





## [0.20.1](https://github.com/canonical/pragma/compare/v0.20.0...v0.20.1) (2026-03-26)


### Bug Fixes

* **svelte-ds-app-launchpad:** Change modifier-families imports to relative ([#562](https://github.com/canonical/pragma/issues/562)) ([e0376ee](https://github.com/canonical/pragma/commit/e0376eef10ceb3ff7c9695d8f2130aea44844169))
* **svelte-ds-app-launchpad:** downgrade vite version to ^7.3.1 ([#561](https://github.com/canonical/pragma/issues/561)) ([b9afd74](https://github.com/canonical/pragma/commit/b9afd74250862db637db9cdafe89ce5124609a7b))





# [0.20.0](https://github.com/canonical/pragma/compare/v0.19.0...v0.20.0) (2026-03-26)


### Features

* **svelte-ds-app-launchpad:** Upstream DateTime Components ([#548](https://github.com/canonical/pragma/issues/548)) ([5528d41](https://github.com/canonical/pragma/commit/5528d415d307c07459d1cd14ae257d6767c17fc3))





# [0.19.0](https://github.com/canonical/pragma/compare/v0.18.0...v0.19.0) (2026-03-26)


### Bug Fixes

* **ci:** add missing build step to push workflow, replace workspace: protocol ([#521](https://github.com/canonical/pragma/issues/521)) ([0e88312](https://github.com/canonical/pragma/commit/0e883120c96034d180de0ebdde6e9740d97609fe)), closes [#512](https://github.com/canonical/pragma/issues/512)
* **cli-core:** show contextual help at each command level ([#534](https://github.com/canonical/pragma/issues/534)) ([e4ad03b](https://github.com/canonical/pragma/commit/e4ad03bbb95f7c16caf591a0d8136dac9bd245ee))
* **ds-app-launchpad:** update styles.css path in package.json to point to dist directory ([#556](https://github.com/canonical/pragma/issues/556)) ([ed3d928](https://github.com/canonical/pragma/commit/ed3d92853df523093ecf00500985bf523a816268))
* **pragma:** critical bugs, SPARQL hardening, contract types, package rename ([#549](https://github.com/canonical/pragma/issues/549)) ([ebacb6e](https://github.com/canonical/pragma/commit/ebacb6ef54eca92d720fb5ccc05459748f854849))
* **pragma:** resolve skill sources via require.resolve ([#535](https://github.com/canonical/pragma/issues/535)) ([8b5bb77](https://github.com/canonical/pragma/commit/8b5bb77e3ca261d8cbd5ae4fa69c197933157339))
* **pragma:** resolve TTL sources via require.resolve, thread cwd through ke ([#533](https://github.com/canonical/pragma/issues/533)) ([615f9fe](https://github.com/canonical/pragma/commit/615f9fe7f61629c408f60f94ba788018acb8662e))
* **react-ds-global-form:** fix runtime bugs, add Form component and testing utils ([#481](https://github.com/canonical/pragma/issues/481)) ([8a3bcc7](https://github.com/canonical/pragma/commit/8a3bcc734ab10c39a854ef9beeea492a3eff6280))
* **summon-component:** duplication of "generated by" comment ([#495](https://github.com/canonical/pragma/issues/495)) ([c52a374](https://github.com/canonical/pragma/commit/c52a374a85a9f703d0ff04b3fc3fd6d18370c458))


### Features

* **cli-framework:** add cli-framework package, build and webarchitect checks (v0.1-P3) ([#490](https://github.com/canonical/pragma/issues/490)) ([549806d](https://github.com/canonical/pragma/commit/549806dc5626a8f0165ca6daeb1abc65bb52d32b))
* **cli-framework:** add generator-to-CLI bridge modules (v0.1-P3b) ([#494](https://github.com/canonical/pragma/issues/494)) ([8bbaf5f](https://github.com/canonical/pragma/commit/8bbaf5fa68507b5f7de8301a9f481103e9aaf211))
* **ds-global-form:** add Date,   FileUpload, Color, Phone, and Choices inputs (P3 pt3) ([#499](https://github.com/canonical/pragma/issues/499)) ([9ea831d](https://github.com/canonical/pragma/commit/9ea831dd9c581b003f3e2baabcc21ad23e862897))
* **ds-global-form:** add token layer, input chrome, and semantic class rename ([#496](https://github.com/canonical/pragma/issues/496)) ([00c6f16](https://github.com/canonical/pragma/commit/00c6f16e862ced706f93f1cfb37e59cb0ec2e8ae))
* **ds-global-form:** styles pt1 and addon-form ([#493](https://github.com/canonical/pragma/issues/493)) ([b1b2068](https://github.com/canonical/pragma/commit/b1b2068f2541df5b47e9f462b9124cefa4a28efb)), closes [storybookjs/storybook#31842](https://github.com/storybookjs/storybook/issues/31842)
* **harness:** creates the @canonical/harnesses package ([#486](https://github.com/canonical/pragma/issues/486)) ([6e11f7d](https://github.com/canonical/pragma/commit/6e11f7d0a9bd1849edd3d95ffa1124deecbdd182))
* **ke:** add @canonical/ke core runtime ([#485](https://github.com/canonical/pragma/issues/485)) ([29dc0b2](https://github.com/canonical/pragma/commit/29dc0b2d2769b5e90d4a06a0c27915877019b308))
* **ke:** enhance plugin lifecycle + add stats plugin ([#511](https://github.com/canonical/pragma/issues/511)) ([b092e8b](https://github.com/canonical/pragma/commit/b092e8bfed12f8059babd1cc73ec4c4c9603e37c))
* **ke:** named graphs, result type detection, code standards alignment (v0.1-A2) ([#487](https://github.com/canonical/pragma/issues/487)) ([c7d9004](https://github.com/canonical/pragma/commit/c7d900423efd548c2bdf760b1dd8b71d545c2620))
* **lit-poc:** button component ([#475](https://github.com/canonical/pragma/issues/475)) ([fa30cc9](https://github.com/canonical/pragma/commit/fa30cc9aee249993eaed1c89f35dc88f5d5f1061))
* **lit:** first iteration of lit poc site layout ([#474](https://github.com/canonical/pragma/issues/474)) ([cd3cba2](https://github.com/canonical/pragma/commit/cd3cba2370e4525b6bd3ff32e18e9966eb34f6fd))
* **lit:** Hero pattern ([#509](https://github.com/canonical/pragma/issues/509)) ([c5b1a47](https://github.com/canonical/pragma/commit/c5b1a4730e81568a7db318df0108b096e587721d))
* **lit:** logo section pattern ([#482](https://github.com/canonical/pragma/issues/482)) ([57128a9](https://github.com/canonical/pragma/commit/57128a9738a4da9e370a83192c8be3af900df861))
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
* **react-ds-global:** announcement component ([#554](https://github.com/canonical/pragma/issues/554)) ([e5434d0](https://github.com/canonical/pragma/commit/e5434d05421090cb77c227ccaa6025983c9a292c))
* **storybook:** unified Storybook hub for all React packages ([#529](https://github.com/canonical/pragma/issues/529)) ([3a2d56c](https://github.com/canonical/pragma/commit/3a2d56cdceb43bdd5b8c4578d40283518bfce80d)), closes [#31842](https://github.com/canonical/pragma/issues/31842)
* **summon:** add PR template to package generator ([#526](https://github.com/canonical/pragma/issues/526)) ([7aced71](https://github.com/canonical/pragma/commit/7aced71d3fe5234f34ce7787b24089d69cc3ac56))
* **svelte-ds-app-launchpad:** Upstream DescriptionList Component ([#469](https://github.com/canonical/pragma/issues/469)) ([15ce28e](https://github.com/canonical/pragma/commit/15ce28ef530cf01f6ac8ad882d8c7625fc0e6236))
* **task,summon-core:** extract @canonical/task, restructure summon as @canonical/summon-core (v0.1-P1+P2) ([#484](https://github.com/canonical/pragma/issues/484)) ([1493baf](https://github.com/canonical/pragma/commit/1493baf6b28a9d5cbd7e4e13009f105945df72a9))
* **task:** add Symlink effect, switchMap, gen(), suppressed errors, AbortSignal (v0.1-P1b) ([#489](https://github.com/canonical/pragma/issues/489)) ([b199523](https://github.com/canonical/pragma/commit/b19952348be60e815e8c33477dbb02380ff4e139))
* **task:** add undo interpreter and --undo flag across CLI ([#538](https://github.com/canonical/pragma/issues/538)) ([8c2fff5](https://github.com/canonical/pragma/commit/8c2fff58eb4e5527e4ca2aa1bd7e9f42b3cf70ee))


### Performance Improvements

* **ci:** flatten PR jobs and use nx affected for Chromatic builds ([#528](https://github.com/canonical/pragma/issues/528)) ([f572645](https://github.com/canonical/pragma/commit/f572645a04f9722c9799743a717d5bcc166ecd25))
* **ci:** parallel jobs with Nx remote cache server ([#523](https://github.com/canonical/pragma/issues/523)) ([053a2ec](https://github.com/canonical/pragma/commit/053a2ec8a7ea4dc05e4e31000c09a56fc15f77bf))
* upgrade vite 7 → 8 (Rolldown) for ~10% faster builds ([#527](https://github.com/canonical/pragma/issues/527)) ([04ebac0](https://github.com/canonical/pragma/commit/04ebac09e2f571a611533ebf98ceba3e47fbb8f9))


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





# [0.18.0](https://github.com/canonical/pragma/compare/v0.17.1...v0.18.0) (2026-03-11)


### Bug Fixes

* **biome-svelte:** Run biome against svelte packages ([#450](https://github.com/canonical/pragma/issues/450)) ([a6bb495](https://github.com/canonical/pragma/commit/a6bb4952c92754849d0be85bc49d9f448b7048a9))


### Features

* **styles:** pt2, components css tokens (placeholders) ([#457](https://github.com/canonical/pragma/issues/457)) ([2560b3f](https://github.com/canonical/pragma/commit/2560b3f4e157b7ab6daa96d162c3011d8c6bbc7b))
* **summon:** pt2, monorepo generator ([#459](https://github.com/canonical/pragma/issues/459)) ([fed0ea1](https://github.com/canonical/pragma/commit/fed0ea12f290a85dde427842b392fe30c69587cc))
* **svelte-ds-app-launchpad:** upstream Link & Breadcrumbs components ([#438](https://github.com/canonical/pragma/issues/438)) ([b339ae6](https://github.com/canonical/pragma/commit/b339ae68a0277c2e63f0ae94de41406fb4abe58c))
* **svelte-ds-app-launchpad:** Upstream Popover component ([#447](https://github.com/canonical/pragma/issues/447)) ([688c46e](https://github.com/canonical/pragma/commit/688c46eebd081b5fad955f403d62011134da3c20))
* **token-viz:** pt2, components ([#462](https://github.com/canonical/pragma/issues/462)) ([5aa7fea](https://github.com/canonical/pragma/commit/5aa7fea22abbf10de17089091477dee80b7c49d9))
* **token-viz:** pt3, documentation ([#463](https://github.com/canonical/pragma/issues/463)) ([de39b5f](https://github.com/canonical/pragma/commit/de39b5f0525170cfae84316e87ccd62d8ebf2f63))
* **tokens-viz:** pt1, scaffholding ([#461](https://github.com/canonical/pragma/issues/461)) ([e6a1c7a](https://github.com/canonical/pragma/commit/e6a1c7a4fda74ba4fe37c570d7351472c8e735c4))
* **tokens:** lsp-config ([#455](https://github.com/canonical/pragma/issues/455)) ([d311c09](https://github.com/canonical/pragma/commit/d311c091bac6dc6309748f5360c65fd28d12cd63))





## [0.17.1](https://github.com/canonical/ds25/compare/v0.17.0...v0.17.1) (2026-03-04)


### Bug Fixes

* **biome-svelte:** Remove configs/biome-svelte ([#449](https://github.com/canonical/ds25/issues/449)) ([0fdd99c](https://github.com/canonical/ds25/commit/0fdd99c11d6da75a72dab567bd46d89c863fc2fe))





# [0.17.0](https://github.com/canonical/ds25/compare/v0.16.0...v0.17.0) (2026-03-04)


### Features

* **summon:** summon component webcomponents ([#448](https://github.com/canonical/ds25/issues/448)) ([ae5d33d](https://github.com/canonical/ds25/commit/ae5d33d052f7c05be292e6a565cf371f47868274))





# [0.16.0](https://github.com/canonical/ds25/compare/v0.16.0-experimental.1...v0.16.0) (2026-03-03)

**Note:** Version bump only for package ds25





# [0.16.0-experimental.1](https://github.com/canonical/ds25/compare/v0.16.0-experimental.0...v0.16.0-experimental.1) (2026-03-03)


### Bug Fixes

* **svelte-ds-app-launchpad:** ButtonPrimitive doesn't have styles ([#443](https://github.com/canonical/ds25/issues/443)) ([31f6994](https://github.com/canonical/ds25/commit/31f69947b1de96bbd3d7e0b10c0d228bdb2b2332))


### Features

* **react/ssr:** add option to pass custom callbacks to renderer ([#427](https://github.com/canonical/ds25/issues/427)) ([b56ee62](https://github.com/canonical/ds25/commit/b56ee622c7c8b4ff4c54d9c6d90910d14aa63cfd))
* **svelte-ds-app-launchpad:** upstream Badge component ([#434](https://github.com/canonical/ds25/issues/434)) ([b49e643](https://github.com/canonical/ds25/commit/b49e64362c562fbb6a532bec6353355c343f720e)), closes [#436](https://github.com/canonical/ds25/issues/436)
* **svelte-ds-app-launchpad:** upstream Button, ButtonPrimitive, and Spinner components ([#433](https://github.com/canonical/ds25/issues/433)) ([d3e67df](https://github.com/canonical/ds25/commit/d3e67df173fd0916b84b169b63486520d0624518))
* **svelte-ds-app-launchpad:** upstream switch, radio & checkbox components ([#435](https://github.com/canonical/ds25/issues/435)) ([a43d7e2](https://github.com/canonical/ds25/commit/a43d7e242f33f285315c9575c93804508e70277b))
* **svelte-ds-app-launchpad:** upstream TextInput, NumberInput, Textarea, and InputPrimitive components ([#441](https://github.com/canonical/ds25/issues/441)) ([69b2a2e](https://github.com/canonical/ds25/commit/69b2a2e7df829847e587061af584aed5e0026f50))
* **webcomponents:** adding package for Lit web components library ([#425](https://github.com/canonical/ds25/issues/425)) ([cbbce62](https://github.com/canonical/ds25/commit/cbbce6269967900a63254f9cad887b868874ad9e))





# [0.16.0-experimental.0](https://github.com/canonical/ds25/compare/v0.15.1...v0.16.0-experimental.0) (2026-02-24)


### Features

* **svelte-ds-app-launchpad:** upstream Chip component and update styles ([#423](https://github.com/canonical/ds25/issues/423)) ([26d1047](https://github.com/canonical/ds25/commit/26d104771a0df4ece538bd268b2141c30267b60c))





## [0.15.1](https://github.com/canonical/ds25/compare/v0.15.0...v0.15.1) (2026-02-23)


### Bug Fixes

* **tty:** update documentation to state the known issue of using the snap package for bun ([#424](https://github.com/canonical/ds25/issues/424)) ([6513d68](https://github.com/canonical/ds25/commit/6513d6891906701fd82f4ec8d5036de59473ed20))





# [0.15.0](https://github.com/canonical/ds25/compare/v0.15.0-experimental.0...v0.15.0) (2026-02-20)


### Bug Fixes

* **react-ds-global:** Fixes transitional export patterns for components ([#426](https://github.com/canonical/ds25/issues/426)) ([db8a1db](https://github.com/canonical/ds25/commit/db8a1dba10419153f6be82ffee570c9db929dff7))


### Features

* **react/ssr:** add StringRenderer and some refactoring ([#411](https://github.com/canonical/ds25/issues/411)) ([fede428](https://github.com/canonical/ds25/commit/fede428fcf7a5bf5b90c9b1ff59482af04a2c287))





# [0.15.0-experimental.0](https://github.com/canonical/ds25/compare/v0.14.0...v0.15.0-experimental.0) (2026-02-17)


### Features

* **svelte-generator:** update Svelte component templates ([#422](https://github.com/canonical/ds25/issues/422)) ([f1fb13f](https://github.com/canonical/ds25/commit/f1fb13fa08463b844e611ae5cd0f94a06b13ff30))





# [0.14.0](https://github.com/canonical/ds25/compare/v0.13.0...v0.14.0) (2026-02-16)


### Features

* **storybook-theme:** improve theme styles and add storybook default logo ([#419](https://github.com/canonical/ds25/issues/419)) ([4363cf1](https://github.com/canonical/ds25/commit/4363cf1b97cffe8a42073697f3aa82fb66f352b3))





# [0.13.0](https://github.com/canonical/ds25/compare/v0.13.0-experimental.0...v0.13.0) (2026-02-10)

**Note:** Version bump only for package ds25





# [0.13.0-experimental.0](https://github.com/canonical/ds25/compare/v0.12.0...v0.13.0-experimental.0) (2026-02-10)


### Features

* **storybook:** enhance configuration for Svelte support ([#415](https://github.com/canonical/ds25/issues/415)) ([af589bd](https://github.com/canonical/ds25/commit/af589bd9e4a63a3138551b998f7f8fe8d507a023))
* **svelte-ssr-test:** Remove legacy component types ([#416](https://github.com/canonical/ds25/issues/416)) ([0c68cf9](https://github.com/canonical/ds25/commit/0c68cf9f7f11e79faeecf8233eef3b2383d9a8e4))





# [0.12.0](https://github.com/canonical/ds25/compare/v0.12.0-experimental.0...v0.12.0) (2026-02-06)


### Features

* **ds-app-launchpad:** bootstrap Svelte project ([#399](https://github.com/canonical/ds25/issues/399)) ([37583a1](https://github.com/canonical/ds25/commit/37583a16e7a6692e17ae632886630342547a5947))
* eap packages ([#409](https://github.com/canonical/ds25/issues/409)) ([f7a6c56](https://github.com/canonical/ds25/commit/f7a6c56d0429d19e521296141805eaef37ce9cb3))
* **storybook-addon-shell-theme:** add new addon for Canonical shell theme ([#412](https://github.com/canonical/ds25/issues/412)) ([ec10e59](https://github.com/canonical/ds25/commit/ec10e59afe1132bcb56c3045aa41430e7ef933c7))





# [0.12.0-experimental.0](https://github.com/canonical/ds25/compare/v0.11.0...v0.12.0-experimental.0) (2026-01-26)


### Features

* **components:** Ft components ([#393](https://github.com/canonical/ds25/issues/393)) ([abbe615](https://github.com/canonical/ds25/commit/abbe6150c52deefffb7e9e7fbfee8a3b6ffb94c6))
* **config:** add TypeScript configuration for Svelte projects ([#398](https://github.com/canonical/ds25/issues/398)) ([7a2cdfd](https://github.com/canonical/ds25/commit/7a2cdfdf3c27ee0875c5c8a9e9a050f577667a5d))
* **documentation:** Enhanced documentation ([#389](https://github.com/canonical/ds25/issues/389)) ([03ab19a](https://github.com/canonical/ds25/commit/03ab19aa2fbebf5ef7cd403652f6fa4627ca619e))
* **lib:** Enforces the lib folder convention, driveby global-form fixes ([#391](https://github.com/canonical/ds25/issues/391)) ([ce7c82a](https://github.com/canonical/ds25/commit/ce7c82a8fddd745496d976efbd0fe6929bb7a96c))
* **lib:** Enforces the lib folder convention, driveby global-form fixes ([#391](https://github.com/canonical/ds25/issues/391)) ([c908437](https://github.com/canonical/ds25/commit/c908437c558cb01f79c5a3df246cd25bc65542fb))
* **summon:** new codegen  ([#388](https://github.com/canonical/ds25/issues/388)) ([bcd1f35](https://github.com/canonical/ds25/commit/bcd1f350fd8799a580511e783a4292911fd5cc33))





# [0.11.0](https://github.com/canonical/ds25/compare/v0.10.0-experimental.8...v0.11.0) (2026-01-18)


### Features

* Dependency updates layers 1-4 ([#381](https://github.com/canonical/ds25/issues/381)) ([e84c7a9](https://github.com/canonical/ds25/commit/e84c7a9909e3c12aa33f346ccde2e9acddf65e2f))
* **monorepo:** Added `.mcp.json` with two mcp servers ([#291](https://github.com/canonical/ds25/issues/291)) ([3f9f5ff](https://github.com/canonical/ds25/commit/3f9f5ff304b7963a08622eefd60c487f45b198c0))
* **monorepo:** Webarchitect consumption ([#378](https://github.com/canonical/ds25/issues/378)) ([badd693](https://github.com/canonical/ds25/commit/badd69313bca1f1de4b02c2947c85fffe830422f))
* Storybook 10 update ([#379](https://github.com/canonical/ds25/issues/379)) ([cc65ea6](https://github.com/canonical/ds25/commit/cc65ea6693f38a72066b711f072ded03bafceb9d))





# [0.10.0](https://github.com/canonical/ds25/compare/v0.10.0-experimental.8...v0.10.0) (2026-01-18)


### Features

* Storybook 10 update ([#379](https://github.com/canonical/ds25/issues/379)) ([cc65ea6](https://github.com/canonical/ds25/commit/cc65ea6693f38a72066b711f072ded03bafceb9d))





# [0.10.0-experimental.8](https://github.com/canonical/ds25/compare/v0.10.0-experimental.7...v0.10.0-experimental.8) (2025-12-04)


### Bug Fixes

* **assets:** Update SVG icons to use currentColor for fill attribute ([#376](https://github.com/canonical/ds25/issues/376)) ([c855099](https://github.com/canonical/ds25/commit/c855099fe4367fd744ac6f865303756237f2a54f))





# [0.10.0-experimental.7](https://github.com/canonical/ds25/compare/v0.10.0-experimental.6...v0.10.0-experimental.7) (2025-12-03)


### Bug Fixes

* **assets:** Update SVG icons to use currentColor for fill attribute ([#375](https://github.com/canonical/ds25/issues/375)) ([144667c](https://github.com/canonical/ds25/commit/144667cce9741d68e00ef920bdefbe6b90ab7f93))





# [0.10.0-experimental.6](https://github.com/canonical/ds25/compare/v0.10.0-experimental.5...v0.10.0-experimental.6) (2025-11-24)


### Bug Fixes

* **assets:** Remove SVGs attributes left as text ([#371](https://github.com/canonical/ds25/issues/371)) ([60dd929](https://github.com/canonical/ds25/commit/60dd929d04913952f5ac3bb18746f33a8a569042))


### Features

* **React Core:** Build Section Component ([#322](https://github.com/canonical/ds25/issues/322)) ([108bfd7](https://github.com/canonical/ds25/commit/108bfd7e6a98d12fd843a8012b010f0932d7567a))





# [0.10.0-experimental.5](https://github.com/canonical/ds25/compare/v0.10.0-experimental.4...v0.10.0-experimental.5) (2025-10-17)


### Bug Fixes

* **React Core:** Remove/rename unneeded icons ([#354](https://github.com/canonical/ds25/issues/354)) ([3dc9c46](https://github.com/canonical/ds25/commit/3dc9c4632d41284f973795c783446e8e02e47e6b)), closes [/github.com/canonical/pragma/issues/333#issuecomment-3364617394](https://github.com//github.com/canonical/pragma/issues/333/issues/issuecomment-3364617394) [/github.com/canonical/pragma/pull/354#issuecomment-3381138505](https://github.com//github.com/canonical/pragma/pull/354/issues/issuecomment-3381138505)
* **typography:** @types/bun dependency version set to "latest" causes conflict with frozen lock on CI ([#358](https://github.com/canonical/ds25/issues/358)) ([0207274](https://github.com/canonical/ds25/commit/02072742d1c6e15ac5f819b4bbff733be3e33ebd))


### Features

* **ontology:** Base Ontology ([#351](https://github.com/canonical/ds25/issues/351)) ([b8bfc31](https://github.com/canonical/ds25/commit/b8bfc31eccad08211b6d7697375b79f22d971ef8))
* **React Core:** Build `<SkipLink>` ([#352](https://github.com/canonical/ds25/issues/352)) ([fce545b](https://github.com/canonical/ds25/commit/fce545b32892b24c6fa8446504e1d96541d8a393)), closes [/github.com/canonical/pragma/pull/352#discussion_r2413230398](https://github.com//github.com/canonical/pragma/pull/352/issues/discussion_r2413230398) [/github.com/canonical/pragma/pull/352#discussion_r2401945932](https://github.com//github.com/canonical/pragma/pull/352/issues/discussion_r2401945932)
* **React core:** Implement Card component ([#314](https://github.com/canonical/ds25/issues/314)) ([ad3dd81](https://github.com/canonical/ds25/commit/ad3dd8145e76b214532fb1e0293e97cab93cc819))
* **svelte-generator:** Add semantics-oriented test element selectors ([#355](https://github.com/canonical/ds25/issues/355)) ([b178ab1](https://github.com/canonical/ds25/commit/b178ab1f4b128d84e20e8c9fe26bf393e773d0df))





# [0.10.0-experimental.4](https://github.com/canonical/ds25/compare/v0.10.0-experimental.3...v0.10.0-experimental.4) (2025-09-25)


### Features

* **Assets:** Add Icon assets ([#323](https://github.com/canonical/ds25/issues/323)) ([199f572](https://github.com/canonical/ds25/commit/199f572840da74a3dcc12a836bc1acf0c815b52f))
* **React Core:** Build Icon component ([#325](https://github.com/canonical/ds25/issues/325)) ([5319d51](https://github.com/canonical/ds25/commit/5319d518fb75d63787fcd994a0c981e7beadb8ff))
* **React Core:** Implement Link component ([#321](https://github.com/canonical/ds25/issues/321)) ([bd30a4f](https://github.com/canonical/ds25/commit/bd30a4faa69aa361571ad423e8f106555a59d9c5))





# [0.10.0-experimental.3](https://github.com/canonical/ds25/compare/v0.10.0-experimental.2...v0.10.0-experimental.3) (2025-09-18)


### Bug Fixes

* **React Core:** fix badge with empty units showing undefined units ([#319](https://github.com/canonical/ds25/issues/319)) ([30f2815](https://github.com/canonical/ds25/commit/30f2815ab177681ddd847660bdae2d7ba1a6dcbf))


### Features

* Add Svelte SSR testing library renderer ([#305](https://github.com/canonical/ds25/issues/305)) ([da687db](https://github.com/canonical/ds25/commit/da687db2a8f6ad2d1b8cfc9806a041e5d18ea68c))
* **Badge:** pt. 1 - utilities for the Badge component ([#304](https://github.com/canonical/ds25/issues/304)) ([f556180](https://github.com/canonical/ds25/commit/f5561801c196a55b6b17f18156f0d9cd736da5ea))
* **Badge:** pt.2 - Badge component implementation / styling ([#302](https://github.com/canonical/ds25/issues/302)) ([847d75d](https://github.com/canonical/ds25/commit/847d75dc31966d2559dcd4591e557a99deece19b))
* **generator:** Include Svelte SSR Test package ([#315](https://github.com/canonical/ds25/issues/315)) ([244dbd0](https://github.com/canonical/ds25/commit/244dbd0b580101ecfdb5495300b012419d7d0769))
* **Generator:** React component generator spreads native HTML props by default ([#313](https://github.com/canonical/ds25/issues/313)) ([ee3c1e8](https://github.com/canonical/ds25/commit/ee3c1e819ad70cd744d9e6322b6a57d2b53a960e))
* **React Core:** Build Rule component ([#320](https://github.com/canonical/ds25/issues/320)) ([4edbbd3](https://github.com/canonical/ds25/commit/4edbbd3ee4fa0ebd68fdfa8f85f7c52ccd8dd92f))
* **tokens:** add primitive and semantic color tokens ([#308](https://github.com/canonical/ds25/issues/308)) ([3d53859](https://github.com/canonical/ds25/commit/3d53859a7876ca8c7032057c3a1750ef82741109))





# [0.10.0-experimental.2](https://github.com/canonical/ds25/compare/v0.10.0-experimental.1...v0.10.0-experimental.2) (2025-08-06)


### Features

* **generator-svelte:** Generate root element type based props ([#292](https://github.com/canonical/ds25/issues/292)) ([d9247e3](https://github.com/canonical/ds25/commit/d9247e30dee0b5b0752f68204cd01f5672ccc18f))
* **generator-svelte:** Move styles to .svelte ([#298](https://github.com/canonical/ds25/issues/298)) ([9745fe3](https://github.com/canonical/ds25/commit/9745fe36d5c5e6c9de1523f4c87f1f1bdb861d3f))





# [0.10.0-experimental.1](https://github.com/canonical/ds25/compare/v0.10.0-experimental.0...v0.10.0-experimental.1) (2025-07-30)


### Bug Fixes

* **Webarchitect:** Add missing dependencies for webarchitect package ([#295](https://github.com/canonical/ds25/issues/295)) ([a98308c](https://github.com/canonical/ds25/commit/a98308cf464315fb7cdefeb0d307cefdc74e9af4))





# [0.10.0-experimental.0](https://github.com/canonical/ds25/compare/v0.9.1-experimental.0...v0.10.0-experimental.0) (2025-07-30)


### Features

* **generator:** Make generator metadata comment location consistent across files ([#283](https://github.com/canonical/ds25/issues/283)) ([b4ba34e](https://github.com/canonical/ds25/commit/b4ba34ea8a826364bcf9d2725e1ae0ad00cba0ea))
* **react-ds-app:** Added DS-app for react ([#284](https://github.com/canonical/ds25/issues/284)) ([8ae5771](https://github.com/canonical/ds25/commit/8ae577182e1c69f252e8c25bee4bfc1944643113))
* **webarchitect:** Minimal implementation of the webarchitect tool ([#268](https://github.com/canonical/ds25/issues/268)) ([8bf9986](https://github.com/canonical/ds25/commit/8bf9986971a3ec2e3bb656b4087640a8b2a7ffc2))





## [0.9.1-experimental.0](https://github.com/canonical/ds25/compare/v0.9.0...v0.9.1-experimental.0) (2025-07-01)


### Bug Fixes

* **generator-svelte:** styles.css fails formatting check ([#279](https://github.com/canonical/ds25/issues/279)) ([0b7820a](https://github.com/canonical/ds25/commit/0b7820aaead7751bcffef59b6fcb12a5367d2059))
* syntax highlighting part 2 ([#281](https://github.com/canonical/ds25/issues/281)) ([af8ed0d](https://github.com/canonical/ds25/commit/af8ed0d642fb3fbfaba85bcf8e89a02f8a539986))





# [0.9.0](https://github.com/canonical/ds25/compare/v0.9.0-experimental.22...v0.9.0) (2025-06-27)


### Bug Fixes

* Fix implciit dependencies ([#276](https://github.com/canonical/ds25/issues/276)) ([a1b007c](https://github.com/canonical/ds25/commit/a1b007c0d6ab26318c745e48f250a0c0c30a0716))





# [0.9.0-experimental.22](https://github.com/canonical/ds25/compare/v0.9.0-experimental.21...v0.9.0-experimental.22) (2025-06-26)


### Features

* **generator:** Generate SSR output test file ([#267](https://github.com/canonical/ds25/issues/267)) ([42aea54](https://github.com/canonical/ds25/commit/42aea54ee8c886225c606536f3b4da0b6f1269d3))





# [0.9.0-experimental.21](https://github.com/canonical/ds25/compare/v0.9.0-experimental.20...v0.9.0-experimental.21) (2025-06-24)


### Bug Fixes

* **deps:** update storybook monorepo to v9 (major) ([#242](https://github.com/canonical/ds25/issues/242)) ([3bbdb4b](https://github.com/canonical/ds25/commit/3bbdb4b9299565f84081fe882d9a2fd85197b8ee))
* Remove Generator index append confirmation prompts ([#250](https://github.com/canonical/ds25/issues/250)) ([18c44f0](https://github.com/canonical/ds25/commit/18c44f0c1fce22153cc085e2f8d9c3929691aabd))
* **storybook:** enable addon themes ([#256](https://github.com/canonical/ds25/issues/256)) ([c522fc0](https://github.com/canonical/ds25/commit/c522fc05f48d39ab358773c458a53233a1259835))


### Features

* **Demo site:** Navbar enhancements ([#205](https://github.com/canonical/ds25/issues/205)) ([3a6ef56](https://github.com/canonical/ds25/commit/3a6ef568f362a01ccae17cd40c56c886336e186d)), closes [#199](https://github.com/canonical/ds25/issues/199)
* **documentation:** Reorganization of the base documentation and guidelines. ([#198](https://github.com/canonical/ds25/issues/198)) ([6e8fb2b](https://github.com/canonical/ds25/commit/6e8fb2bdbff891e14d35dca60e436bbc09a3a34e))
* **ds-core-form:** Middleware examples, MSW, Stories ([#225](https://github.com/canonical/ds25/issues/225)) ([301cbb8](https://github.com/canonical/ds25/commit/301cbb8256531b5ee8ff4a7d0359dd317a6d430f))
* Initialization of app tiers ([#238](https://github.com/canonical/ds25/issues/238)) ([51b88c8](https://github.com/canonical/ds25/commit/51b88c8f8639b47a25b0c2305bf61711df8854f4))
* **storybook:** Storybook addon MSW ([#255](https://github.com/canonical/ds25/issues/255)) ([08e506c](https://github.com/canonical/ds25/commit/08e506c72eb01d599ba5b2fddb66b30095305ea7))
* **svelte-generator:** Generate unit test files and stories ([#248](https://github.com/canonical/ds25/issues/248)) ([d8485cb](https://github.com/canonical/ds25/commit/d8485cb12470a911bf634140bb6f632a1c071218))





# [0.9.0-experimental.20](https://github.com/canonical/ds25/compare/v0.9.0-experimental.19...v0.9.0-experimental.20) (2025-05-05)


### Bug Fixes

* **Chromatic:** Chromatic workflows are concurrency-pruned on a per-package, instead of per-ref, basis ([#221](https://github.com/canonical/ds25/issues/221)) ([ec98e19](https://github.com/canonical/ds25/commit/ec98e19cba4dabab198a6c0c64f70ed118a2ac9d))
* **CodeDiffViewer:**  improve component rendering ([#227](https://github.com/canonical/ds25/issues/227)) ([efb2919](https://github.com/canonical/ds25/commit/efb29196c2075140f971d8d998a081385191e45b))


### Features

* **ComponentGenerator:** add Svelte component generator ([#215](https://github.com/canonical/ds25/issues/215)) ([13720cf](https://github.com/canonical/ds25/commit/13720cf06143fd684ebd863eaacafced1627f33f))
* **Demo site:** Apply font/baseline-relative settings ([#202](https://github.com/canonical/ds25/issues/202)) ([d834898](https://github.com/canonical/ds25/commit/d8348986ba1e6feea6d3380ad128b13bf9611ccc)), closes [/github.com/canonical/ds25/pull/202#discussion_r2060683715](https://github.com//github.com/canonical/ds25/pull/202/issues/discussion_r2060683715)
* **Demo site:** Build Drawer component, move example settings into it ([#200](https://github.com/canonical/ds25/issues/200)) ([6edf5b3](https://github.com/canonical/ds25/commit/6edf5b32ff6b2c96d4a861b0b309d3aa94cb21b5))
* **Demo site:** Settings in the drawer are laid out with a simple grid ([#201](https://github.com/canonical/ds25/issues/201)) ([e6ba0e7](https://github.com/canonical/ds25/commit/e6ba0e785bdbc8438f3daf03e1b1e9b9090b777c))
* **DiffChangeMarker:** add DiffChangeMarker component and include it in GitDiffViewer.FileHeader ([#223](https://github.com/canonical/ds25/issues/223)) ([a659dda](https://github.com/canonical/ds25/commit/a659ddaa7189badd76475865b7b09bd3b032609f))
* **form:** tokens ([#219](https://github.com/canonical/ds25/issues/219)) ([f355abd](https://github.com/canonical/ds25/commit/f355abd4a5c3be13d417e3e381fc74485f218917))
* **tokens:** Improved folder structure and added dimension tokens ([#217](https://github.com/canonical/ds25/issues/217)) ([f4188e6](https://github.com/canonical/ds25/commit/f4188e6fd9f3369c678b137518404d0825b2265a))





# [0.9.0-experimental.19](https://github.com/canonical/ds25/compare/v0.9.0-experimental.18...v0.9.0-experimental.19) (2025-04-28)


### Features

* **React Core:** Button uses `children` instead of `label` for contents ([#214](https://github.com/canonical/ds25/issues/214)) ([f31bbed](https://github.com/canonical/ds25/commit/f31bbed41ca6f3945ee1ac18da7e4068b1f2bd59))
* **Styles:** Extract baseline grid css styles to a "debug" styles package ([#203](https://github.com/canonical/ds25/issues/203)) ([30e69e4](https://github.com/canonical/ds25/commit/30e69e44799a1076c7c0b668ddb3b81b36b7d967))
* **tokens:** Base token build pipeline with style dictionary ([#195](https://github.com/canonical/ds25/issues/195)) ([f29254d](https://github.com/canonical/ds25/commit/f29254d142eefe269a34c13fead625e5ba95aed5))





# [0.9.0-experimental.18](https://github.com/canonical/ds25/compare/v0.9.0-experimental.17...v0.9.0-experimental.18) (2025-04-22)


### Bug Fixes

* **CodeDiffViewer:** fix line numbers ([#212](https://github.com/canonical/ds25/issues/212)) ([1cdc6fd](https://github.com/canonical/ds25/commit/1cdc6fda3658538cd4365bdd67a42d00a0284704))


### Features

* **GitDiffViewer:** refactor line numbers to add better support for diff lines ([#210](https://github.com/canonical/ds25/issues/210)) ([08c6285](https://github.com/canonical/ds25/commit/08c6285d5d7e3894a8c18d28fd52731a8d8fff17))





# [0.9.0-experimental.17](https://github.com/canonical/ds25/compare/v0.9.0-experimental.16...v0.9.0-experimental.17) (2025-04-18)


### Bug Fixes

* wrong import ([#209](https://github.com/canonical/ds25/issues/209)) ([e31f062](https://github.com/canonical/ds25/commit/e31f0625b1549bc9ddce98b3cc81bbc6a781b658))





# [0.9.0-experimental.16](https://github.com/canonical/ds25/compare/v0.9.0-experimental.15...v0.9.0-experimental.16) (2025-04-18)


### Bug Fixes

* **GitDiffViewer:** correct line highlighting logic in diff viewer ([#208](https://github.com/canonical/ds25/issues/208)) ([1f1fc58](https://github.com/canonical/ds25/commit/1f1fc585883bd5b61e126830776d3a46c021b6b3))


### Features

* **GitDiffViewer:** Improve code diff add comment interaction ([#207](https://github.com/canonical/ds25/issues/207)) ([20c042a](https://github.com/canonical/ds25/commit/20c042a6a8ce7bdb2066e828f80d848a7d812c56))
* **GitDiffViewer:** improve syntax highlighting and fix file header collapse button animation ([#206](https://github.com/canonical/ds25/issues/206)) ([d7e8a07](https://github.com/canonical/ds25/commit/d7e8a070c459a8e1e6a2c0f8d116f1021e87ee9b))





# [0.9.0-experimental.15](https://github.com/canonical/ds25/compare/v0.9.0-experimental.14...v0.9.0-experimental.15) (2025-04-15)


### Features

* **CodeDiffViewer:** fix CodeDiffViewer table structure and add option for disabling table width calculation ([#197](https://github.com/canonical/ds25/issues/197)) ([2c83496](https://github.com/canonical/ds25/commit/2c83496c03bb4d2fd67fe78477e24bc9b9f4ff69))





# [0.9.0-experimental.14](https://github.com/canonical/ds25/compare/v0.9.0-experimental.13...v0.9.0-experimental.14) (2025-04-10)


### Bug Fixes

* **CodeDiffViewer:** Resize observer detaches on view collapse ([#196](https://github.com/canonical/ds25/issues/196)) ([80361d7](https://github.com/canonical/ds25/commit/80361d73aa3be5229ee51feab66ae35c6b60c78e))


### Features

* **Demo site:** Add example reset button ([#194](https://github.com/canonical/ds25/issues/194)) ([e488999](https://github.com/canonical/ds25/commit/e48899926951924eed889256464e51cb68ea04cc))





# [0.9.0-experimental.13](https://github.com/canonical/ds25/compare/v0.9.0-experimental.12...v0.9.0-experimental.13) (2025-04-04)


### Bug Fixes

* **Demo site:** Fix initial CSS state not being correcty set to defaults ([#190](https://github.com/canonical/ds25/issues/190)) ([348dd76](https://github.com/canonical/ds25/commit/348dd76c1c4bae0bedebbfa83e107da69d9736f6))
* Update collapse rotate logic ([#192](https://github.com/canonical/ds25/issues/192)) ([d9dde41](https://github.com/canonical/ds25/commit/d9dde41dd2bf88d05c9122e72b9a94b6152a0657))


### Features

* **Demo site:** Demo Site pt. 4 - Typographic specimen styling / settings expanded ([#185](https://github.com/canonical/ds25/issues/185)) ([8024841](https://github.com/canonical/ds25/commit/8024841b53a70f2df202de8d8a5ff8cb53b8836d))





# [0.9.0-experimental.12](https://github.com/canonical/ds25/compare/v0.9.0-experimental.11...v0.9.0-experimental.12) (2025-04-03)


### Bug Fixes

* **Tooltip:** Tooltips use position: fixed ([#178](https://github.com/canonical/ds25/issues/178)) ([fe1f0b4](https://github.com/canonical/ds25/commit/fe1f0b4af1ff676b648735bce02c1f32f6d3a380))


### Features

* add checkbox preview switch to MarkdownEditor component ([#189](https://github.com/canonical/ds25/issues/189)) ([fb1be38](https://github.com/canonical/ds25/commit/fb1be38893403c439513062724b30049703be66e))
* add readonly mode to the editable block component ([#173](https://github.com/canonical/ds25/issues/173)) ([f74626b](https://github.com/canonical/ds25/commit/f74626b8f0839fa9bcc57a1b9feaf4b86473bbac))
* **boilerplate:** Add storybook ([#162](https://github.com/canonical/ds25/issues/162)) ([db1fb76](https://github.com/canonical/ds25/commit/db1fb7693a48fe076ac11c52e1068845f457216e))
* **Demo site:** Demo site pt. 3 - Form components & form state ([#184](https://github.com/canonical/ds25/issues/184)) ([b203e1b](https://github.com/canonical/ds25/commit/b203e1b23b9ccb53656f70105e27d30ab328ab87))
* **Demo Site:** DS Demo Site: Pt. 2 ([#161](https://github.com/canonical/ds25/issues/161)) ([b563c0a](https://github.com/canonical/ds25/commit/b563c0ab8a78e9853fc1c952581e05c62628794c))
* **ds-core-form:** boilerplate pt 4 ([#167](https://github.com/canonical/ds25/issues/167)) ([7efd638](https://github.com/canonical/ds25/commit/7efd638384f454d8aaeb0e8d39d9cbe47d6ec0ee))
* **ds-core-form:** part 5: styling and drive-bys ([#176](https://github.com/canonical/ds25/issues/176)) ([9471cc7](https://github.com/canonical/ds25/commit/9471cc745c089f4cb6b4ef030903fdcffa12fdf2))
* **form:** Ft form boilerplate pt6 - Core Combobox, No styling ([#180](https://github.com/canonical/ds25/issues/180)) ([48d0aaa](https://github.com/canonical/ds25/commit/48d0aaa4e7ba2793558779ffb6e3eded5ee4774f))
* **form:** Hidden input ([#182](https://github.com/canonical/ds25/issues/182)) ([a9365b9](https://github.com/canonical/ds25/commit/a9365b9bd12991e61801a039143bd72cf4c5b55d))
* **form:** Multiple Combobox. No styling ([#183](https://github.com/canonical/ds25/issues/183)) ([945244a](https://github.com/canonical/ds25/commit/945244aaafac37632051b9d48f976562edd68f33))





# [0.9.0-experimental.11](https://github.com/canonical/ds25/compare/v0.9.0-experimental.10...v0.9.0-experimental.11) (2025-03-20)


### Bug Fixes

* **ds-app-launchpad:** Adapted the forwardRef pattern to R18 for backwards compatibility ([#163](https://github.com/canonical/ds25/issues/163)) ([acd2fab](https://github.com/canonical/ds25/commit/acd2fab76153718b576560b14ca125056171b725))


### Features

* **ci:** Chromatic CI Stage 1 : Reusable Workflows and base deployments ([#155](https://github.com/canonical/ds25/issues/155)) ([22c7760](https://github.com/canonical/ds25/commit/22c7760b59be1aa37e5b3389328357be5574d487))
* **ds-core-form:** form boilerplate pt3 ([#150](https://github.com/canonical/ds25/issues/150)) ([e6193b2](https://github.com/canonical/ds25/commit/e6193b2639c0952736fab0ce82eadbf622bb3344))





# [0.9.0-experimental.10](https://github.com/canonical/ds25/compare/v0.9.0-experimental.9...v0.9.0-experimental.10) (2025-03-19)


### Bug Fixes

* **React Core:** Popups close on Escape, disabled elements will not trigger popups to open ([#151](https://github.com/canonical/ds25/issues/151)) ([6947ab4](https://github.com/canonical/ds25/commit/6947ab47f1b08c493a648ca643af9e51ebe3aae7))
* **React Core:** UseWindowDimension is SSR-safe ([#156](https://github.com/canonical/ds25/issues/156)) ([db3c446](https://github.com/canonical/ds25/commit/db3c446cbc2dac3687d44ed5f0061c4449e18115))
* remove flexbox from EditableContent content section ([#158](https://github.com/canonical/ds25/issues/158)) ([69a8849](https://github.com/canonical/ds25/commit/69a884943af628f428794c055515ed50e17d16f8))


### Features

* Markdown Editor Component ([#157](https://github.com/canonical/ds25/issues/157)) ([39f920d](https://github.com/canonical/ds25/commit/39f920dd18dcd507823a96e53284db082e2d1744)), closes [#145](https://github.com/canonical/ds25/issues/145) [#153](https://github.com/canonical/ds25/issues/153)





# [0.9.0-experimental.9](https://github.com/canonical/ds25/compare/v0.9.0-experimental.8...v0.9.0-experimental.9) (2025-03-12)


### Features

* **react-ds-core:** Build Tooltip component ([#140](https://github.com/canonical/ds25/issues/140)) ([8aa436c](https://github.com/canonical/ds25/commit/8aa436cd84a3373b5ae36bbc9ec22ddaf5d3daea))





# [0.9.0-experimental.8](https://github.com/canonical/ds25/compare/v0.9.0-experimental.7...v0.9.0-experimental.8) (2025-03-12)


### Bug Fixes

* add missing components exports ([#148](https://github.com/canonical/ds25/issues/148)) ([b7f8252](https://github.com/canonical/ds25/commit/b7f82524a5ede77b5c55b139822f89b7bb1531a2))





# [0.9.0-experimental.7](https://github.com/canonical/ds25/compare/v0.9.0-experimental.6...v0.9.0-experimental.7) (2025-03-12)


### Features

* adding an EditableBlock component ([#120](https://github.com/canonical/ds25/issues/120)) ([4bdd22a](https://github.com/canonical/ds25/commit/4bdd22ab230742355855b8cfab9ffe7ca118c0ab))





# [0.9.0-experimental.6](https://github.com/canonical/ds25/compare/v0.9.0-experimental.5...v0.9.0-experimental.6) (2025-03-10)


### Features

* add RelativeTime component ([#139](https://github.com/canonical/ds25/issues/139)) ([4e55258](https://github.com/canonical/ds25/commit/4e55258298ebe9c392efd7d011ef6d8e8f46b018))





# [0.9.0-experimental.5](https://github.com/canonical/ds25/compare/v0.9.0-experimental.4...v0.9.0-experimental.5) (2025-03-10)


### Features

* add FileTree component ([#130](https://github.com/canonical/ds25/issues/130)) ([f55266f](https://github.com/canonical/ds25/commit/f55266f12ac105be72d2fbecd0bc7c2e4080e358))
* **form:** Ft form boilerplate ([#141](https://github.com/canonical/ds25/issues/141)) ([fee7586](https://github.com/canonical/ds25/commit/fee75868b2a084fad1addd4afcc2e661701051e0))
* **form:** Ft form boilerplate pt2 ([#143](https://github.com/canonical/ds25/issues/143)) ([b3aa16e](https://github.com/canonical/ds25/commit/b3aa16e0c41acbc24027438edd3184376a26bf86))





# [0.9.0-experimental.4](https://github.com/canonical/ds25/compare/v0.9.0-experimental.3...v0.9.0-experimental.4) (2025-02-17)


### Features

* **launchpad:** Add GitDiffViewer component ([#117](https://github.com/canonical/ds25/issues/117)) ([6737965](https://github.com/canonical/ds25/commit/6737965a21fa3b9c78be30e6f1d22ebb003e1f9a))





# [0.9.0-experimental.3](https://github.com/canonical/ds25/compare/v0.9.0-experimental.2...v0.9.0-experimental.3) (2025-02-13)

**Note:** Version bump only for package ds25





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
