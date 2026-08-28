# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.35.0](https://github.com/canonical/pragma/compare/v0.34.0...v0.35.0) (2026-08-28)


### Bug Fixes

* **deps:** batch package dependency updates ([#963](https://github.com/canonical/pragma/issues/963)) ([923f482](https://github.com/canonical/pragma/commit/923f4825325ecd1afc93ec9bbeca7437a4a4569f)), closes [#958](https://github.com/canonical/pragma/issues/958) [#935](https://github.com/canonical/pragma/issues/935) [#919](https://github.com/canonical/pragma/issues/919) [#918](https://github.com/canonical/pragma/issues/918) [#894](https://github.com/canonical/pragma/issues/894)





# [0.34.0](https://github.com/canonical/pragma/compare/v0.33.0...v0.34.0) (2026-08-21)


* refactor(cli)!: removals & fold — tier and block go through the story compiler, token add-config removed, cli-core folded into summon (#939) ([11d76c8](https://github.com/canonical/pragma/commit/11d76c83667c3f76e543c0d6dfc1f0c99f29bd3b)), closes [#939](https://github.com/canonical/pragma/issues/939) [#761](https://github.com/canonical/pragma/issues/761) [#939](https://github.com/canonical/pragma/issues/939) [#909](https://github.com/canonical/pragma/issues/909)


### BREAKING CHANGES

* `pragma tier lookup <name>` is removed; the verb is now
the tier story's compiled lookup `pragma tier lookup <name...>`. The
`tier_lookup` MCP tool takes `name: string[]` (was `name: string`) and
returns the uniform lookup envelope `{ results, errors }` (was a single
`{ uri, name, blocks }` object); its completion offers prefixed-IRI
candidates. The `--format llm`/plain output follows the generic lookup
renderers.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017EwUvEW5ZgjAYc9KWPjHCZ

* refactor(cli)!: block list is the block story's declared, unfiltered list

L-OPEN-9 (PRA-111): `block list` was the last hand-written data verb, and the
filtering it existed for — the configured tier's parent CHAIN, the release
CHANNEL, and the `--all-tiers` escape from the first — is something the
declared-content grammar has no term for. The owner ruling is removal, not
grammar growth: the block story in pragma.conf.ts gains the `list` half and
`capabilities/block/` is deleted wholesale, `tierChain.ts` (and its
`CHANNEL_RELEASES` table, which had no other consumer) with it. `block` leaves
the authored registry and flows in through the unclaimed-stories half like
`standard` and `modifier`; only `token` remains a composite.

SIGNED-OFF VISIBLE CONSEQUENCE, verbatim: `block list` now lists ALL blocks,
including experimental/alpha ones, for everyone, until filtering returns in
declared form.

Display parity moved INTO the SPARQL rather than being reimplemented in
TypeScript: `VALUES ?class` closes the type set, so the BINDs that derive
`name` (COALESCE of `ds:name` and the IRI's local name — the old
`row.name ?? localName(...)` fallback), `type` (LCASE of the class local name —
the old `normalizeType`) and `tier` (the tier IRI's local name) operate over
known shapes. The `standard` story is the precedent for that technique. The
tier join stays OPTIONAL, so the untiered block A2 fixed stays visible — in the
ONE view that now exists.

D10-A ruled: block-list empty semantics follow the declared family. MEASURED
FIRST at the dispatch seam the compiled binary uses (`executeVerb`, pinned in
journeys.defaultPack.test.ts): `makeListRun` returns `[]` and never throws on
emptiness, so an empty store still exits 0 with `{ ok: true, data: [] }` —
IDENTICAL to the hand-written verb, which also returned an empty array. There
is NO exit-code delta. The only change is the empty-state MESSAGE, which can no
longer name a tier, a channel, or an `--all-tiers` escape; the story's
`emptyRecovery` supplies "No blocks in the store. Build it from the configured
design-system packs. Run `pragma sources update`." Recorded in the CHANGELOG row.

Covenant change (deliberate, the L-OPEN-9 `$comment` clause extended
chronologically after C1's): `block_list` loses its `--all-tiers` flag, so the
emitted verb has no flags and the MCP tool takes no input. Tool COUNT is
unchanged (37 stays 38 until C3).

CONFIG HONESTY — the fields are KEPT, their claims are not. Removing
`config.tier`/`config.channel` would be a second, unrequested breaking change,
so they stay accepted and reported; what changes is every place that promised
they scope something:
- `emitReference.ts`'s field docs now say `tier` is accepted and SCOPES NOTHING
  (reported by `config show`/`info` only) and `channel` selects the npm dist-tag
  `upgrade`/`info` read, nothing more (`docs/reference/config.md` regenerated);
- `config show`'s "(none — all tiers visible)" placeholder becomes "(none)":
  with no tier filter, "all tiers visible" is true of every value, not just the
  unset one;
- the `capabilities` catalog's `model` convention stops telling agents data is
  tier/channel-SCOPED and says the hierarchy is DATA on each entity, reads are
  unscoped, and `graph_query` is the way to filter;
- `block_list`/`config_show` tool hints follow;
- a new PARITY_GAPS entry (`block-list-unfiltered`) records the gap and its
  owner sign-off in the append-only ledger, and the two entries that described
  the hand-written verb are corrected rather than deleted.

PROTECTED updates, each replacing a dying assert with the new contract:
- surface.test.ts re-pins the flagless emitted verb;
- staleCommands.test.ts BANS `--all-tiers` in every shipped doc, so the retired
  flag cannot come back through prose (the same treatment `--llm` got);
- toolDescriptions.test.ts widens its `block_list` leak assert from the literal
  `--all-tiers` (now vacuous) to "no CLI flag of any name" — the failure a
  re-authored story `toolDescription` could reintroduce;
- collect.ts/collect.test.ts's reserved-noun rationale drops `block` from the
  composites it names (the mechanism is unchanged: every static noun is still
  reserved, derived from `staticModules`).

Tests: `capabilities/block/{parity,blockList}.test.ts` are replaced by
`capabilities/block.parity.test.ts` (the standard-noun fixture-parity pattern
C1 established for `tier`), which keeps every `block lookup` content-parity
assert byte-for-byte and adds the list half: all-blocks membership, the
SPARQL-derived row shape against the old hand-built one, the untiered block,
config-independence, and the measured empty-list semantics. The behavioral
journeys re-pin the NEW contract instead of dropping asserts — journeys.cli
(B9) now proves the same graph under four different tier/channel configs
returns ONE answer (a strictly stronger claim than the four different answers
it used to enumerate), journeys.defaultPack asserts exact whole-pack sets where
it previously had to filter the untiered block out to stay tolerant, and the
eval seed's channel case is inverted into `content-block-list-is-channel-
independent`, asserting the beta-gated block is visible on the normal channel.

Docs regenerated (`bun run gen:reference`: commands.md, tools.md, config.md);
getting-started.md and the storybook-hub CLI page describe the unfiltered list.
Gates: check, 1090 tests, perf budgets 8/8, build.
* `pragma block list --all-tiers` is removed — the CLI rejects
the flag as unknown, and the `block_list` MCP tool no longer accepts an
`allTiers` parameter (it takes no input at all). `block list` no longer filters
by the configured tier chain or release channel: it returns every block in the
store, experimental and alpha ones included. `config.tier` consequently scopes
nothing anywhere in the CLI, and `config.channel` retains only its npm dist-tag
role for `upgrade`/`info`; both fields are still accepted and reported. Row
shape, ordering and exit codes are unchanged.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017EwUvEW5ZgjAYc9KWPjHCZ

* refactor(cli)!: token add-config is removed, not ported

L-OPEN-9 (PRA-111), the third and last removal: `token add-config` writes a
`tokens.config.mjs` starter file for the terrazzo pipeline. That is a MUTATION,
and the declared-content grammar the read surface is now built from
deliberately has no verb for one. The owner ruling is that a command the
grammar cannot express is removed rather than kept as code, so the verb is
deleted — not reimplemented, not deprecated, no window.

With it goes the LAST authored data module: `capabilities/token/` is empty and
gone, so `token` joins `block` and `tier` as a purely declarative noun and the
authored registry is now the kernel's own nouns and nothing else. That is
PRA-111's end state reached: zero hand-written data commands, a fork defines
its entire read surface in `pragma.conf.ts`. (C4 adds the machine check that
holds it there.)

Covenant change (deliberate, the L-OPEN-9 `$comment` clause extended
chronologically after C1's and C2's): the `token` noun drops its `add-config`
verb and `mcpSurface.tools` drops `token_add-config` — 38 → 37, the first
tool-count DECREASE in the covenant's history (AV-228 B3's 41→38 was the last
change of any direction).

Kept deliberately: `mutationContract` in the FIXED section is untouched. The
plan-first/confirm gate is a kernel contract, not this verb's, and
`sources_update`, `config_set`, `upgrade` and the `create_*` verbs still stand
behind it.

PROTECTED updates, each replacing a dying assert with the new contract:
- surface.test.ts pins `token`'s three read verbs, and both closing-direction
  guards (`surface.test.ts`'s emitted==covenant and
  `surfaceConformance.test.ts`'s frozen-tool count) move to 37 — the count is
  the point of those asserts, so it is edited, not loosened;
- the hints↔tools drift guard forced the `hints.ts` entry's removal, exactly as
  designed: a stale hint naming a dead tool fails CI;
- staleCommands.test.ts BANS `token add-config`/`token_add-config` in every
  shipped doc, which is what caught the two prose sites below;
- collect.test.ts's "leaves a composite noun's verbs intact" case becomes
  "leaves a DECLARED noun's shipped verbs intact": the package-claim mechanics
  it guards are unchanged and still asserted against the real registry, but the
  thing at risk is now the story's own verbs — the case that still matters,
  since after this commit every data noun is story-backed;
- collect.ts's reserved-noun rationale no longer justifies itself by a
  hand-written verb (the mechanism — every static noun reserved, derived from
  `staticModules` — is unchanged).

Eval seed: the two `token_add-config` cases are INVERTED rather than dropped,
so the removal is pinned instead of merely un-asserted —
`tool-token-noun-is-read-only` asserts the tool is absent and the token noun
exposes exactly its three reads, and `prompt-tokens-config-maps-to-nothing`
asserts that "generate a terrazzo tokens config" now maps to NO tool at all
(the point of the ruling: an agent finds nothing claiming to do it). The
plan-first MECHANIC the deleted case exercised stays covered by
`tool-config-set-is-plan-first` and `tool-upgrade-is-plan-first`.

Docs regenerated (`bun run gen:reference`: commands.md, tools.md, index.md);
architecture.md's "three DOMAIN verbs the story grammar cannot express" and
config-model.md's composite clause are corrected here because the stale-command
gate makes them red — the remaining composite framing is C4's sweep.
Gates: check, 1087 tests, perf budgets 8/8, build.
* `pragma token add-config` is removed and so is the
`token_add-config` MCP tool; the designed MCP tool count drops from 38 to 37.
Nothing in the CLI generates `tokens.config.mjs` any more — write it by hand or
drive terrazzo directly. The `token` noun keeps `list`, `lookup` and `sample`,
unchanged.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017EwUvEW5ZgjAYc9KWPjHCZ

* docs(cli): the composite framing is retired, and a guard replaces it

C1-C3 removed the last three hand-written data verbs, so every place that
explained the CLI as "stories PLUS a few hand-written verbs" now describes a
shape that no longer exists. This sweeps that framing and — the point of the
commit — replaces the prose with a machine check, because prose is exactly what
went stale.

New PROTECTED assert in `distribution.test.ts`: for every noun `pragma.conf.ts`
declares, the REGISTERED capability module (what the CLI, the MCP server and
the generated reference all project) must be its compiled story and nothing
else. Two halves, because a compiled spec carries closures a second compile
cannot reproduce by identity:

- SHAPE — recompiling the story ALONE must yield the same verbs with the same
  declared shape (path, summary, doc, params, capability, examples), so an
  extra verb or an extra flag beside the story fails;
- IDENTITY — each registered verb must BE the story's compiled verb object.
  A composite module (`[...story.verbs, handWrittenVerb]`, exactly how `block`,
  `token` and `tier` were built until this PR) constructs new objects, so it
  cannot pass even if its shapes happen to match.

That is the checkable form of PRA-111's end state — "a fork defines its entire
read surface in pragma.conf.ts" — and it fails on re-introduction, not on
review.

Framing swept, each site now saying what is true:
- `capabilities/distribution.ts` and `capabilities/index.ts` (the latter in C3):
  no data noun is authored, so a declared story IS the whole noun;
- `kernel/packs/types.ts`: `list` is optional so a pack can serve a noun that is
  addressable but not enumerable — not because a noun's list "stays
  hand-written";
- `kernel/copy.test.ts`: the `src/capabilities/**` exclusion is justified by the
  kernel nouns' runtime copy, and notes that the `ds:` residue it was written
  for is gone;
- `docs/architecture.md` and `docs/config-model.md` (both in C3, forced by the
  stale-command gate) plus config-model's read-story definition here;
- `testing/fixtures/graph/canonical.ts`: the tier-scoped and channel-gated
  blocks now serve the OPPOSITE purpose — they are what prove the declared list
  hides neither;
- `testing/behavioral/README.md`: the `journeys.cli.test.ts` row describes the
  journey it now is.

The "hardcoded five-noun list" PRA-111 carries as an addendum needed nothing
here: it was already structurally retired (`collect.ts` derives the reserved set
from `staticModules`), and C3 retired the last of its prose residue.

Left alone deliberately: "hand-authored"/"hand-written" where it is still true
and about something else — `pragma.conf.ts` as hand-authored data, the
hand-written docs `docExamples.test.ts` scans, the PARITY_GAPS entry saying
there are no hand-authored render templates, and GraphQL's `CompositeType`.
Chronological `$comment` and PARITY_GAPS records keep their historical wording;
those ledgers are append-only.

Gates: check, 1088 tests, build.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017EwUvEW5ZgjAYc9KWPjHCZ

* test(summon): the byte-equality guarantee becomes a named conformance suite

L-OPEN-10 (PRA-121) item 2. Both product binaries generate the same tree from
* the `@canonical/cli-core` package is deleted and no longer
published. Import the surviving symbols from `@canonical/summon-core` under the
same names — `runGeneratorTask`, `createGeneratorStamp`,
`createStampOnEffectStart`, `answerPromptWithDefaults`, `buildReplayCommand`,
`formatContentPreview`, `formatEffectLine`, `formatEffectWithContent`,
`formatLlmHelp`, `formatLlmJson`, `formatLlmMarkdown`, `getActionColor`,
`getActionLabel`, `getEffectPayload`, `getLanguageHint`, `getLlmActionLabel`,
`getLlmEffectPath`, `isVisibleEffect` — except `promptForAnswers`, which is
`collectAnswers`. The v1 command model (`CommandDefinition`, `registerAll`,
`formatHelp`/`formatNounHelp`/`formatVerbHelp`/`formatVerbList`,
`buildCompleters`, `resolveCompletion`, `createOutputAdapter`,
`createExitResult`, `createOutputResult`, `generatorToCommand`,
`promptToParameter`, `executeGenerator`) is removed with no successor in any
published package.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017EwUvEW5ZgjAYc9KWPjHCZ

* feat(summon): the generator definition is summon's versioned domain spec

L-OPEN-10 (PRA-121) item 3. The shape of a generator was described only by
TypeScript interfaces inside this package, so a consumer outside TypeScript had
nothing to read, and a change to the shape left no trace anyone could diff.
`spec/generator-definition.v1.schema.json` writes it down, versioned: a
backwards-incompatible change gets a v2 file beside this one, never an edit
here. The file ships (added to `files`), so it is readable from an installed
package rather than only from the repo.

What it is NOT, stated IN the artifact rather than only in a commit message:
the schema's top-level `$comment` carries the owner's ruling verbatim — the
shared contract is not the generator definition, it is the general command
types seam and the compositional logic — and says explicitly that this file
does not describe, and must not be taken to describe, the contract between a
CLI kernel and its commands. Extracting that seam is a separate program with
its own ADR, and nothing here claims it. Anyone who finds the file finds the
scope; a drift-guard case asserts both sentences are still there.

Declarative projection only. `generate`, and a prompt's `when`/`validate`, are
functions the module carries and JSON cannot. The schema DECLARES them anyway,
marked `CODE-CARRIED, not data` with `type: "null"`, rather than omitting them
— an omission would read as "a generator has no generate", which is the more
misleading of the two.

Drift guard, ajv-FREE and deliberately so (`src/types/schema.test.ts`): a
validator would prove some example document satisfies the schema, which is not
the failure worth guarding. The failure is a field added to or renamed in
`GeneratorDefinition`/`GeneratorMeta`/`PromptDefinition` while the published
schema keeps describing the old shape. So the check is on KEY SETS, pinned to
the interfaces with `satisfies Record<keyof T, unknown>`: adding an interface
field breaks compilation of the test's key literal first, and the runtime
assertion then fails until the JSON is updated too. Two mechanical steps,
neither skippable — and no new dependency in a package every generator author
installs. The schema is read from disk exactly as a consumer would read it, so
malformed JSON fails here rather than at a downstream tool.

Gates: summon-core check + 422 tests at 100% coverage.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017EwUvEW5ZgjAYc9KWPjHCZ

* docs(cli): the tool is the tool, not a next generation of one

L-OPEN-10 (PRA-121) item 4. Two places still described `pragma` as a successor
rather than as itself, and both are read by someone outside the repo:

- `packages/cli/pragma/package.json`'s description — "Next-generation CLI and
  MCP kernel for Canonical's design system (pragma v2)" — is what npm shows on
  the package page and in search results. It now says what the tool IS: "CLI and
  MCP server over Canonical's design-system knowledge graph", matching the
  README's opening sentence.
- the covenant's `bins.pragma` string — "pragma v2 CLI and MCP server host
  (stdio)" — is the frozen description of the binary.

D11-A ruled that the covenant string changes on BOTH sides, so the edit lands in
`surface/surface.v2.json` AND in `emitSurface.ts`'s FIXED_SURFACE (the two must
mirror each other verbatim; `surface.test.ts` fails if they do not), with a
`$comment` clause recording the change and its reasoning.

Kept, deliberately: every chronological `v2` record in the covenant `$comment`
and in PARITY_GAPS. Those ledgers are append-only history — rewriting them to
remove a word would be the same class of dishonesty this PR keeps closing. The
`surface.v2.json` FILENAME is likewise unchanged: it is a wire identity with a
consumer contract, and renaming it is not framing work. The internal docblocks
that contrast a v1 mechanism with its v2 replacement (the error kernel's exit
model, the pack `version: 2` enrichment fields, the grammar's disclosure-level
normalization) also stay: they are accurate statements about where a design came
from, not a claim about what the product is.

Measured before and after: "next-generation" now appears nowhere in this
package, and the only remaining `pragma v2` strings are the historical records
named above.

Gates: pragma check, 1089 tests, build, docs regenerated (no byte moved — the
reference pages never carried either string).

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017EwUvEW5ZgjAYc9KWPjHCZ

* test(cli): the real-run create gates carry explicit timeouts





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
