# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.33.0](https://github.com/canonical/pragma/compare/v0.32.0...v0.33.0) (2026-07-24)


* feat(cli)!: CLI surface consistency (verb/flag renames) + output model (--llm removal) (#875) ([50b66b9](https://github.com/canonical/pragma/commit/50b66b9d71b374e58eb5566699bb9c1d707459b7)), closes [#875](https://github.com/canonical/pragma/issues/875) [#874](https://github.com/canonical/pragma/issues/874)


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





# [0.32.0](https://github.com/canonical/pragma/compare/v0.31.0...v0.32.0) (2026-07-20)

**Note:** Version bump only for package @canonical/storybook-hub





# [0.31.0](https://github.com/canonical/pragma/compare/v0.30.0...v0.31.0) (2026-07-17)

**Note:** Version bump only for package @canonical/storybook-hub





# [0.30.0](https://github.com/canonical/pragma/compare/v0.29.1...v0.30.0) (2026-07-14)

**Note:** Version bump only for package @canonical/storybook-hub





## [0.29.1](https://github.com/canonical/pragma/compare/v0.29.0...v0.29.1) (2026-07-03)

**Note:** Version bump only for package @canonical/storybook-hub





# [0.29.0](https://github.com/canonical/pragma/compare/v0.29.0-experimental.0...v0.29.0) (2026-07-03)

**Note:** Version bump only for package @canonical/storybook-hub





# [0.29.0-experimental.0](https://github.com/canonical/pragma/compare/v0.28.0...v0.29.0-experimental.0) (2026-06-24)

**Note:** Version bump only for package @canonical/storybook-hub





# [0.28.0](https://github.com/canonical/pragma/compare/v0.27.1-experimental.0...v0.28.0) (2026-06-16)

**Note:** Version bump only for package @canonical/storybook-hub





## [0.27.1-experimental.0](https://github.com/canonical/pragma/compare/v0.28.0-experimental.0...v0.27.1-experimental.0) (2026-05-21)


### Bug Fixes

* **release:** unblock lerna 9 publish (access via publishConfig) ([#637](https://github.com/canonical/pragma/issues/637)) ([acc1185](https://github.com/canonical/pragma/commit/acc1185b43290c1edd88da25c000f7d9494caee6))





# [0.27.0](https://github.com/canonical/pragma/compare/v0.26.0...v0.27.0) (2026-04-29)

**Note:** Version bump only for package @canonical/storybook-hub





# [0.26.0](https://github.com/canonical/pragma/compare/v0.25.0...v0.26.0) (2026-04-24)

**Note:** Version bump only for package @canonical/storybook-hub





# [0.25.0](https://github.com/canonical/pragma/compare/v0.24.0...v0.25.0) (2026-04-17)

**Note:** Version bump only for package @canonical/storybook-hub





# [0.24.0](https://github.com/canonical/pragma/compare/v0.23.0...v0.24.0) (2026-04-13)

**Note:** Version bump only for package @canonical/storybook-hub





# [0.23.0](https://github.com/canonical/pragma/compare/v0.22.1...v0.23.0) (2026-04-07)

**Note:** Version bump only for package @canonical/storybook-hub





# [0.22.0](https://github.com/canonical/pragma/compare/v0.22.0-experimental.0...v0.22.0) (2026-04-03)

**Note:** Version bump only for package @canonical/storybook-hub





# [0.21.0](https://github.com/canonical/pragma/compare/v0.20.1...v0.21.0) (2026-04-01)

**Note:** Version bump only for package @canonical/storybook-hub





# [0.20.0](https://github.com/canonical/pragma/compare/v0.19.0...v0.20.0) (2026-03-26)

**Note:** Version bump only for package @canonical/storybook-hub





# [0.19.0](https://github.com/canonical/pragma/compare/v0.18.0...v0.19.0) (2026-03-26)


### Features

* **storybook:** unified Storybook hub for all React packages ([#529](https://github.com/canonical/pragma/issues/529)) ([3a2d56c](https://github.com/canonical/pragma/commit/3a2d56cdceb43bdd5b8c4578d40283518bfce80d)), closes [#31842](https://github.com/canonical/pragma/issues/31842)
