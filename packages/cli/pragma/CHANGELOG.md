# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.37.0](https://github.com/canonical/pragma/compare/v0.36.0...v0.37.0) (2026-09-02)

### Bug Fixes

* **deps:** update dependency chalk to v6 ([#1077](https://github.com/canonical/pragma/issues/1077)) ([077d7c6](https://github.com/canonical/pragma/commit/077d7c69ef30e9abc75b1b1c5663a2da4cad6b78))
* **deps:** update dependency commander to v15 ([#1078](https://github.com/canonical/pragma/issues/1078)) ([8e3355f](https://github.com/canonical/pragma/commit/8e3355ff96e4f2e8e4cb08fb247444a60ec12935))
* **pragma-cli:** check Node against the declared engines, not a hardcoded major ([#1089](https://github.com/canonical/pragma/issues/1089)) ([990f8f6](https://github.com/canonical/pragma/commit/990f8f60e9a2ca9d7238bdbbc6ab77d44a351252))
* **pragma-cli:** move `colophon` out of the AI-agent help section ([#1060](https://github.com/canonical/pragma/issues/1060)) ([e1e9831](https://github.com/canonical/pragma/commit/e1e98313a44ab2f28fb76b4fc0cb67ee11cbc6ad))
* **pragma-cli:** resolve the anatomy pack from anatomy-dsl 0.3.0 ([#1069](https://github.com/canonical/pragma/issues/1069)) ([025ea3b](https://github.com/canonical/pragma/commit/025ea3b7be75f9e9426efffb79583600c64b21ad)), closes [#main](https://github.com/canonical/pragma/issues/main)
* **task:** report per-undo outcomes and isolate undo failures, so `setup --undo` tells the truth ([#1058](https://github.com/canonical/pragma/issues/1058)) ([92977b8](https://github.com/canonical/pragma/commit/92977b838304d1bef90716c0b0d9ed981106389b))

### Features

* **pragma-cli:** package-level embedded-pack parity gate and whole-corpus round-trip guarantee ([#1059](https://github.com/canonical/pragma/issues/1059)) ([e8e273a](https://github.com/canonical/pragma/commit/e8e273a4e94a753a8b4add37a6500dcc4ecf9682)), closes [#1042](https://github.com/canonical/pragma/issues/1042) [#1047](https://github.com/canonical/pragma/issues/1047) [pre-#1047](https://github.com/pre-/issues/1047) [#1047](https://github.com/canonical/pragma/issues/1047)
* **summon-application:** make rendering a choice, and build the SPA arm it selects ([#1095](https://github.com/canonical/pragma/issues/1095)) ([1c74cc9](https://github.com/canonical/pragma/commit/1c74cc96ef730eae9d90a438be515e2167147c32))


# [0.36.0](https://github.com/canonical/pragma/compare/v0.35.0...v0.36.0) (2026-08-29)


### Bug Fixes

* **pragma-cli:** detect the install source from the filesystem, and name the linked state ([#1053](https://github.com/canonical/pragma/issues/1053)) ([8897dbb](https://github.com/canonical/pragma/commit/8897dbbb996d4004d691c524fdc7fcbef9df9a87))
* **pragma-cli:** make every setup row actionable, reversible and honestly reported ([#1044](https://github.com/canonical/pragma/issues/1044)) ([4e8d5ed](https://github.com/canonical/pragma/commit/4e8d5ede0bb36b66a682d2098f3db93ac57ed015))
* **pragma-cli:** make the code standards reachable in one call ([#1047](https://github.com/canonical/pragma/issues/1047)) ([fff26ef](https://github.com/canonical/pragma/commit/fff26ef00b36bd48068c994a0f0b7e4054372596))
* **pragma-cli:** rank a shared block name by tier depth, and stop discarding the rest ([#1050](https://github.com/canonical/pragma/issues/1050)) ([58eb157](https://github.com/canonical/pragma/commit/58eb1573cc852121cf80bdf52eca3c77d8147255))
* **pragma-cli:** read ds:usage in block lookup, the vocabulary the graph has ([#1049](https://github.com/canonical/pragma/issues/1049)) ([003d8db](https://github.com/canonical/pragma/commit/003d8dbb112865888f9c86c03e1caf3c61c58731))


### Features

* **harnesses:** register the pragma MCP server with Charm's Crush ([#1055](https://github.com/canonical/pragma/issues/1055)) ([1719dbb](https://github.com/canonical/pragma/commit/1719dbbad56c7e95c50315fada3cfabba0d4207c))
* **pragma-cli:** detect VS Code by installation, and report a harness inventory ([#1043](https://github.com/canonical/pragma/issues/1043)) ([cc08d6b](https://github.com/canonical/pragma/commit/cc08d6b60c2fa434ceb44a13808910c374224536))
* **pragma-cli:** ship the packs' skills with the release ([#1051](https://github.com/canonical/pragma/issues/1051)) ([ea272dd](https://github.com/canonical/pragma/commit/ea272dd5a9e71c23a24f654956d56237056e64c4))
* **pragma-cli:** show setup's wizard progress as the plan's rows, not the effect transcript ([#1054](https://github.com/canonical/pragma/issues/1054)) ([b601ae8](https://github.com/canonical/pragma/commit/b601ae8f377618adbd0e51d640d1dc4bb63639c2))
* **pragma-cli:** show the timings the wizard already has, and the wordmark only when read ([#1046](https://github.com/canonical/pragma/issues/1046)) ([c094f8b](https://github.com/canonical/pragma/commit/c094f8b2c242d47c9b7184985e531049c425ded6))


### BREAKING CHANGES

* **pragma-cli:** a lookup argument may answer with more than one entity, so
`results` can be longer than the arguments that produced it. Unique names are
unaffected — an array of one is the payload they always had. `LookupOutput`
loses `ambiguous`, and the ambiguity notice with it; the zero-record notice is
untouched.

Claude-Session: https://claude.ai/code/session_011B8Z3Lq1eARN1wLfKGvzqC

* fix(pragma-cli): give each pack its own row in doctor

Drive-by, unrelated to the ranking.

`pack refs` printed its whole provenance as one line — four packs and two
forty-character SHAs comma-joined — in a report where every other multi-part
check already uses sub-items:

  pack refs: embedded snapshot @ @canonical/design-system@git:d6d8a6c8268cf2bd
  103e956a2540d6e36bd08d72, @canonical/anatomy-dsl@npm:0.2.2, @canonical/code-
  standards@git:ab7ae14024f3e52dd19e378eec5861dbc4b9ba72, @canonical/ds-
  implementations@self:v0.34.0 — 657 entities · `pragma sources update` …

Now the headline counts what answered and each pack gets a row saying which
revision it is, with git hashes cut to seven:

  pack refs: embedded snapshot — 4 packs, 657 entities · `pragma sources update` …
    @canonical/design-system: git d6d8a6c
    @canonical/anatomy-dsl: npm 0.2.2

A ref that parses as no scheme passes through whole rather than being dropped —
an unreadable provenance is still provenance, and hiding it would be the one
failure this check exists to prevent. The update hint stays in the detail
because the renderer prints a remedy only under `fail` and `available`, and a
snapshot that is answering reads correctly is neither.

Claude-Session: https://claude.ai/code/session_011B8Z3Lq1eARN1wLfKGvzqC

* fix(summon-core): give each wizard question its own widget instance

`pragma setup` failed a real (non-dry) run:

  Error: Invalid --mcp-targets "global:completions".
  Valid values: /home/adrian/.claude.json, …

`global:completions` is a row id from the PREVIOUS question. Every question
widget seeds its state from `question.default` with `useState`, which runs on
MOUNT only — and `QuestionView` rendered them unkeyed, so React reused one
instance across consecutive questions of the same type. The second multiselect
inherited the first's selection instead of its own default, and submitted the
first question's values under the second question's name.

Keying on the question name forces a remount per question.

The bug is older than the run that exposed it. A `customize` confirm used to sit
between "which targets" and "configure MCP for which files"; a different widget
type forces a remount, so the carry-over could not happen. Removing that confirm
did not cause this — it stopped hiding it, which is why a change that deleted a
question broke one that never mentioned it.

The test drives two adjacent multiselects with different defaults and asserts on
the SELECTION MARKERS, not the values: the widget renders labels, so a frame
check for the first question's values passes either way. Confirmed red without
the key — `expected '› ○ ~/.claude.json' to contain '◉'` — the second question
rendering every row unselected because it holds a set matching none of its own
choices.

Claude-Session: https://claude.ai/code/session_011B8Z3Lq1eARN1wLfKGvzqC

* refactor(pragma-cli)!: say `global` and `local project`, and plan in verbs

Two vocabulary problems, one pass over every command touched today.

"Band" was the repository's private word for the two config scopes and it
had reached the front of the setup plan's headline, doctor's section
headers, six flag docs and the emitted reference. Nobody outside the
project has ever called a config scope a band. Both surfaces now say
`global` and `local project` — the words the `--global` and `--local`
flags already made the user type, so `Local project` sits above a row
whose fix is `pragma setup mcp --local`. The TYPE layer is deliberately
untouched: `ScopeBand`, `bands.ts` and the `band` field on a plan row are
a wider rename, and nothing there now leaks into a sentence.

The setup plan's middle column was a column of status codes. It reads as
verbs:

  - `none` said equally "already correct" and "nothing found". It is now
    `no change`, with the detail beside it saying which of the two.
  - `skip` never said why. It is `nothing to do`, and every reason names
    what was found — `nothing to link — no skills installed yet; they
    arrive with the packs `pragma sources update` builds`.
  - `3 files` is a count, not an action, and it was in the action column.
    The verb goes there, taken from the row's children when they agree so
    a row that will ADD three entries no longer reads `update`.
  - `installed (VSCodium)` beside `codium — VSCodium (unchanged)` said
    the editor's name twice and "nothing happens" twice. Children print
    their own action only when they disagree with each other.

Doctor computed a next step for a skip, carried it through the check,
published it in `--format json`, and then dropped it one line before it
reached the reader: `skills` reported "no skills installed" and stopped.
Every row that carries an instruction now prints it, labelled `fix:`
where something is broken or unfinished and `next:` on a skip — a skip is
not a fault, and calling its instruction a fix is the reading the
`available` glyph exists to prevent.

Jargon out of the rows themselves: "resolver OK" is now "pragma answers
`<TAB>`", "embedded snapshot" is "shipped with the CLI", "no Global band"
is "keeps no global config — it is per-project only", and the five
`setup` sub-verb summaries say what you get rather than naming the
mechanism.

Goldens moved deliberately, not blanket-updated. `doctor.render.test`
and `setup.render.test` keep every structural assertion they had — the
banding, the ordering, the ANSI gate, the neutral marker on an unrun row
— and gain one: no user-facing string may contain the word "band". The
`checkShellCompletions` gate-1 test still proves the resolver ran; it
just matches the sentence a reader gets instead of the one the build did.

Behaviour is unchanged. `PlanAction` values, `--scope` values, config
keys, JSON field names and `PARITY_GAPS` ids are all as they were; the
action words are a display mapping over the untouched token.

Claude-Session: https://claude.ai/code/session_011B8Z3Lq1eARN1wLfKGvzqC

* fix(pragma-cli): key `standard` list and lookup on the same property

`standard list` derived its row `name` from `cs:name` while `lookup.by`
had moved to `rdfs:label`. Both COALESCE over their property with the
same IRI-derived fallback, so they agreed for every entity carrying
both or neither — and diverged for exactly the 16 standards in the
shipped snapshot that carry `cs:name` and no label. Those rows
published `Turtle local-name casing`; lookup bound the derived slug and
answered ENTITY_NOT_FOUND.

That is the two-step grammar breaking in the documented way: the tool
description tells an agent to take a row's `name` VERBATIM to
`standard_lookup`, and for 16 of 148 standards that instruction could
not be followed. It is the same defect class the `nameFallback: "iri"`
docblock was written for, reintroduced from the other side.

Point the list query at `rdfs:label` so one property and one fallback
serve both halves, and say in the query why the two must move together.

The 16 rows now display their IRI-derived slug rather than a human
title until the snapshot is rebuilt from a pack generation that carries
labels (upstream v0.1.5 has 148/148 `rdfs:label`, 0 `cs:name`; the
shipped embed has 1, 16, and 131 with neither). A consistent slug beats
a title that cannot be looked up.

Also stop `journeys.packageStories` asserting over ALL `pack refs`
items. Provenance now contributes one passing row per pack, so the test
pins the FAILING items — which is what "lists each ignored story as a
failing item" actually claims.





# [0.35.0](https://github.com/canonical/pragma/compare/v0.34.0...v0.35.0) (2026-08-28)


### Bug Fixes

* **deps:** batch package dependency updates ([#963](https://github.com/canonical/pragma/issues/963)) ([923f482](https://github.com/canonical/pragma/commit/923f4825325ecd1afc93ec9bbeca7437a4a4569f)), closes [#958](https://github.com/canonical/pragma/issues/958) [#935](https://github.com/canonical/pragma/issues/935) [#919](https://github.com/canonical/pragma/issues/919) [#918](https://github.com/canonical/pragma/issues/918) [#894](https://github.com/canonical/pragma/issues/894)
* **pragma-cli:** a stale language server, a preview notice, and design-system 0.2.5 ([#1036](https://github.com/canonical/pragma/issues/1036)) ([3305d23](https://github.com/canonical/pragma/commit/3305d2338400edeeeb3ed659f1d050dc23232f93)), closes [canonical/design-tokens#110](https://github.com/canonical/design-tokens/issues/110) [#1035](https://github.com/canonical/pragma/issues/1035)
* **pragma-cli:** address lookups by the shape given, and nest a section's own headings ([#1034](https://github.com/canonical/pragma/issues/1034)) ([8abf87a](https://github.com/canonical/pragma/commit/8abf87ad5d1d86df44cf25426dcf02b71e654e59)), closes [#1027](https://github.com/canonical/pragma/issues/1027)
* **pragma-cli:** honour NO_COLOR ([#977](https://github.com/canonical/pragma/issues/977)) ([78f78cd](https://github.com/canonical/pragma/commit/78f78cdedb9416ad97ad8c8276fb22651c6f9a8b))
* **pragma-cli:** name the typed URI in resolution errors, accept encoded ones ([#1024](https://github.com/canonical/pragma/issues/1024)) ([5004baa](https://github.com/canonical/pragma/commit/5004baa061728fab2bd6f7e36c27bd521e6b6cb3))
* **pragma-cli:** prune installed skill links a package no longer provides ([#1003](https://github.com/canonical/pragma/issues/1003)) ([8ab2fa3](https://github.com/canonical/pragma/commit/8ab2fa377530f18b12455a4a6aa364df5537b5ba))
* **pragma-cli:** remove per-file test temp directories ([#1022](https://github.com/canonical/pragma/issues/1022)) ([b57a9c3](https://github.com/canonical/pragma/commit/b57a9c32ef522ad6e43d948c8b2822fd69cc21b8)), closes [#1000](https://github.com/canonical/pragma/issues/1000) [#1000](https://github.com/canonical/pragma/issues/1000)
* **pragma-cli:** render one plan, on both surfaces ([#1020](https://github.com/canonical/pragma/issues/1020)) ([f4b4f90](https://github.com/canonical/pragma/commit/f4b4f90db5766d75bcd8f3afbedcdcb647bb7f34))
* **pragma-cli:** teach the parameter the tool actually takes, and count a name once ([#1041](https://github.com/canonical/pragma/issues/1041)) ([f865f76](https://github.com/canonical/pragma/commit/f865f76a9e55766ec50c4db4e09cde4e9f768b1f))
* **pragma-cli:** three argument-parsing defects that answered wrongly in silence ([#976](https://github.com/canonical/pragma/issues/976)) ([51bfa28](https://github.com/canonical/pragma/commit/51bfa284097343eef138a478b570dedb42a38995))
* **summon-core:** align the CLI seams — one flag name, safe replays, honest validation ([#988](https://github.com/canonical/pragma/issues/988)) ([375c4ba](https://github.com/canonical/pragma/commit/375c4ba08dc9e26b7e56ba3d7347544648367786))


* feat(pragma-cli)!: CLI standards — fast paths, tables, flags, mcp serve, grammar (#1016) ([0b61599](https://github.com/canonical/pragma/commit/0b615996557efb2bce29f9d747d5238e1ac1f8d5)), closes [#1016](https://github.com/canonical/pragma/issues/1016)
* feat(pragma)!: mount summon's generators instead of mirroring them (#1005) ([299e206](https://github.com/canonical/pragma/commit/299e206a4dd76b62fc48a6d436d33d06652e6fdf)), closes [#1005](https://github.com/canonical/pragma/issues/1005)
* feat(pragma-cli)!: ship compiled JavaScript on node, not a linux-x64 binary (#972) ([f6e2720](https://github.com/canonical/pragma/commit/f6e272048552b6948b8099405d0e22855b2626f1)), closes [#972](https://github.com/canonical/pragma/issues/972)


### Features

* **collect:** export the implementation graph as turtle in the release ([#1010](https://github.com/canonical/pragma/issues/1010)) ([15c4878](https://github.com/canonical/pragma/commit/15c48788c8b5c696e8cfd756b5232628e232c93b))
* **pragma-cli:** CLI standards conformance ([#1011](https://github.com/canonical/pragma/issues/1011)) ([2aaf368](https://github.com/canonical/pragma/commit/2aaf3682852951b079cd3bbeb3360b1ba01b1ac6))
* **pragma-cli:** curate the MCP resource listing from declared slices ([#1025](https://github.com/canonical/pragma/issues/1025)) ([e535e45](https://github.com/canonical/pragma/commit/e535e4597a11427d0038676144cac3a47cc98605))
* **pragma-cli:** open root --help with the distribution's wordmark ([#1023](https://github.com/canonical/pragma/issues/1023)) ([5bdd942](https://github.com/canonical/pragma/commit/5bdd9425a76a8bb119f94d80848067eb1069d0ff))
* **pragma-cli:** the implementation graph reaches the CLI, and the release ships it ([#1029](https://github.com/canonical/pragma/issues/1029)) ([6e865b9](https://github.com/canonical/pragma/commit/6e865b981b92496d50135e9ba9dcb5278d958618)), closes [#1017](https://github.com/canonical/pragma/issues/1017) [#1033](https://github.com/canonical/pragma/issues/1033) [#1010](https://github.com/canonical/pragma/issues/1010)
* **summon-application:** port the i18n feature to the templates behind an --intl flag ([#992](https://github.com/canonical/pragma/issues/992)) ([d0117b9](https://github.com/canonical/pragma/commit/d0117b9bc671f1d8ec7d080c0d5cf137a8d451f9))


### BREAKING CHANGES

* **pragma-cli:** `graph_inspect` and `graph inspect --format json` change
shape. `groups[].predicate` and `groups[].objects[]` are now term objects
(`{termType, value, prefixed?, title?, datatype?, language?}`) rather than
strings, and the result gains `prefixed`, `inbound`, `nested` and `detail`.

Co-Authored-By: Claude Code <noreply@anthropic.com>

* fix(pragma-cli): sample a roster instead of listing it

Review caught that class-to-instance cost too much: at `detailed` a
330-instance class spent 19.5 KB restating what one `*_list` call answers
properly.

Fixed by telling two kinds of inbound edge apart:

- A RELATION fans in narrowly and every subject is part of the answer
  (`ds:implementsBlock`, `ds:inheritsFrom`), so it is LISTED.
- A ROSTER fans in without bound because it grows with the data rather than
  the model, and is already answered by `pragma/instanceCount` and by the
  noun's list verb, so it is SAMPLED — a few exemplars flagged `sampled`,
  never a page.

Told apart by FAN-IN rather than by predicate name. Keying on `rdf:type`
would have fixed classes while leaving a `detailed` read of one tier at
20.9 KB: `ds:tier` fans in 141 deep here and is the same pathology under a
different predicate. Deriving it from the shape also keeps the kernel free of
vocabulary, so a graph whose rosters hang off other predicates is bounded
just the same.

  ds:Property  (330 instances)  19.5 KB -> 2.4 KB
  ds:global    (141 members)    20.9 KB -> 2.1 KB
  button       (2 relations)    unchanged, still listed in full

`count` stays the TRUE total either way. `sampled` is distinct from
`truncated` on purpose: "sample of 5" tells a reader that paging will not
produce the rest and the list verb is where the full set lives, where
"showing 5" invites them to ask for more.

Co-Authored-By: Claude Code <noreply@anthropic.com>

* feat(pragma-cli)!: serve the entity read as Turtle, and budget its literals

Agent context is a scarce resource, and a read of one button was spending
15.8 KB of it. Two independent causes, both fixed here.

STRUCTURE. The JSON projection cost ~95 bytes of wrapper to convey a
thirteen-character IRI, paid per term — ~6.1 KB of that button was scaffolding.
The resource read now serves `text/turtle`, which is also simply what the body
IS; it claimed `application/json` for a graph. Turtle spends the prefixes once
and writes each term as itself, and the shape stops fighting the data:

- IRI versus literal is SYNTAX (`ds:Foo` against `"Foo"`) — the thing the typed
  terms needed a `termType` field to say.
- A blank node is `[ … ]` inline, which is exactly the record the reader
  assembles by hand for JSON.
- Datatypes and language tags are native.
- An inbound edge is a triple written the other way round. The whole
  `InboundGroup` structure exists only because JSON cannot point an arrow
  backwards.

Counts, samples and truncations ride as `#` comments — the one place a
serialization can say something ABOUT the data without asserting it as data.

PROSE. The larger cost was not structure at all: that button spent 8,572 of its
9,734 literal characters on two fields (`ds:guidelines` 5,814, `ds:usage`
2,758). Long-form documentation is what `detailed` is FOR, and the noun's own
lookup verb already serves those fields under its own disclosure. Below
`detailed` a literal is previewed and marked with its true length.

  ds:global.component.button   15,843 B -> 4,518 B  (-71%)
  ds:Property                  19,508 B ->   824 B  (-96%)
  ds:global                    20,941 B ->   608 B  (-97%)

The mirror contract survives the encoding change: `--format llm` emits the same
bytes the resource serves, both through one serializer over one reader, so the
test still fails the moment either grows a projection the other lacks. And the
output is validated by PARSING it with the same Oxigraph engine the store uses
— a document that merely looks right is how a reader gets a syntax error
instead of an entity.

`nested` values are terms rather than strings, deviating from the plan's reuse
of `PackChildRow`: flattening them would reintroduce the IRI-versus-literal
ambiguity the term projection exists to close, and leave the serializer unable
to tell `ds:Foo` from `"ds:Foo"`.
* **pragma-cli:** the `pragma:{+uri}` resource read now returns `text/turtle`
rather than `application/json`, and `graph inspect --format llm` returns Turtle
rather than Markdown. `--format json` keeps the structured projection, whose
literals are now previewed below `detailed` and whose `nested` values are terms.

Co-Authored-By: Claude Code <noreply@anthropic.com>

* fix(pragma-cli): never exhibit a blank node as an inbound exemplar

A read of `ds:Property` — whose 330 instances are all blank nodes — sampled
three of them and rendered:

    # rdf:type — 330 total, sample of 3
    [] rdf:type ds:Property .
    [] rdf:type ds:Property .
    [] rdf:type ds:Property .

Three identical rows carrying nothing, and wrong besides: every `[]` in Turtle
mints a FRESH blank node, so those three lines assert three unrelated
anonymous subjects rather than the three the store holds.

Blank nodes are now excluded from the exemplars a group exhibits. They cannot
be read back through `pragma:{+uri}` and their labels re-mint on every load, so
they can only ever appear as anonymous placeholders — which is not a sample of
anything. They still COUNT: the total stays exact, and a group with no
nameable member says so ("none individually addressable") instead of
advertising a sample of zero.

Fixed in the reader rather than the serializer, so the JSON projection stops
carrying useless placeholder terms too.

Co-Authored-By: Claude Code <noreply@anthropic.com>

* fix(pragma-cli): close eleven read-projection gaps found in review

Two were correctness bugs in the very promises this PR makes.

**Inbound counts were not the true total.** One `LIMIT 500` answered counting
and exhibiting at once and answered neither: the limit applies to the whole
ordered result, so the first predicate to fill it under-reported its own
`count`, and every predicate ordered after it vanished from the read entirely
— while `InboundGroup.count` documented the exact total. Counts now come from
a `GROUP BY` aggregate the store computes; only exemplars are bounded, in a
second pass that excludes blank nodes in the QUERY so the budget is spent on
subjects that can actually be shown.

**A blank node linked from two predicates lost one of them.** Records were
keyed by node label alone, so whichever `via` arrived first won and the second
edge disappeared — and Turtle filters the ordinary blank object out too, so
nothing remained to notice the loss by. Keyed by predicate AND node now.

The rest:

- RDF 1.2 literal `direction` was dropped, making `"x"@en--ltr`
  indistinguishable from `"x"@en` — the exact flattening reading the term view
  was meant to stop. Carried, and emitted as `@lang--dir`.
- `String(term)` rendered every nested field as `[object Object]`, so the whole
  plain-format record was unreadable once nested values became terms.
- The `llm` formatter rebuilt its prefix map from named nodes only, missing any
  prefix used solely by the subject, a nested record key, or a datatype — and
  then emitted compact names with no matching `@prefix`, i.e. invalid Turtle
  that also broke byte mirroring. `InspectResult` now CARRIES the map it was
  compacted against; the reconstruction is gone.
- An un-compacted datatype or nested predicate was written bare, producing
  `"x"^^http://example.com/type`. Wrapped as `<iri>` in every position.
- "none individually addressable" was claimed for every group at `summary`,
  where emptiness only means the level exhibits none. A group now records what
  it WOULD have shown, so the two cases are distinguishable.
- `graph_inspect` had no `disclosure`, so no `detail` argument was ever
  injected and the documented knob was unreachable. Declared.
- `docs/mcp-integration.md` still described the JSON `InspectResult` the
  resource no longer returns. Rewritten for the Turtle document.
- Dead `withoutBlankNodeLabels` helper removed.

Co-Authored-By: Claude Code <noreply@anthropic.com>

* feat(pragma-cli): curate the MCP resource listing from declared slices

`resources/list` returned 712 entries / ~155 KB on every client connect — the
whole pack index, individuals included. MCP defines a `cursor`/`nextCursor`
contract for it, but the SDK's high-level `McpServer` list handler ignores
`request.params.cursor` and never returns a `nextCursor` (verified on the wire
against 1.27.1), so there is no paging to fall back on: everything listed is
sent, every connect. Agent context is a precious resource, and that was ~155 KB
of it spent before the agent had asked anything.

So the listing becomes CURATED. A module declares the slices of the index it
contributes (`mcpListable`, reusing `CompletionSourceRef`'s vocabulary) and the
listing is their union — 110 entries / ~35 KB: eight collection entries (one per
addressable class, carrying `pragma/instanceCount`) plus the schema that
describes them. The 429 individuals stay fully reachable through the
`pragma:{+uri}` template and its autocomplete.

DERIVED, never authored twice. Every read story already declares the type set it
addresses (`PackLookup.type` / `types`) for its name resolve, so `compilePack`
reads its listing off that same declaration: zero new authoring for all six data
nouns. Only `ontology` declares one by hand, because "the whole TBox" is not a
type filter. `ds:Token` is declared by a story but never indexed, and contributes
nothing rather than an empty collection.

Editorial judgement becomes data. `CLASS_PRIORITY = 0.9` / `INDIVIDUAL_PRIORITY
= 0.3` were the kernel deciding what mattered in someone else's graph; they are
replaced by `PackLookup.weights` (prefixed type -> 0-1). A weight does two jobs
from one declaration: `annotations.priority` on the listed resource, and a
tiebreaker in `rankUriCompletions`. With `ds:Subcomponent: 0.6`, every component
now outranks every subcomponent for the query "button" (the answer moves from
5th to 3rd). A `weights` key naming a type the lookup does not address is
REJECTED, not ignored.

Also in the resource provider:

- Completion is honest. `COMPLETION_LIMIT = 50` pre-truncated the ranked list,
  and the SDK derives `total`/`hasMore` from the array the callback returns — so
  `ds:` reported `{ values: 50, total: 50, hasMore: false }` while 499 entities
  matched. The full list is returned and the SDK slices it.
- Human names. 570 of 712 entries showed a bare URI with no description while
  383 carried an unused `altNames[0]`. `name` is now the stable prefixed URI and
  MCP's `title` carries the human label.
- `pragma/type` joins `pragma/box` / `pragma/instanceCount` in `_meta`, so an
  agent can filter a family without spending a read. The covenant `$comment` and
  `docs/mcp-integration.md` move with it.
- `audience: ["user", "assistant"]` — `["assistant"]` hid every resource from
  human pickers, and browsing a design system in a picker is a human use case.
- `pragma:sources` is readable. It is the ONLY resource a cold server
  advertises, and reading it failed `INVALID_INPUT — Invalid uri "sources"`.
- One `ENTITY_MIME_TYPE`, read by the registration, the read body and every
  listed entry, so the listing cannot advertise a type the read does not serve.

`mcpSurface.resources` keeps its `["pragma:{+uri}"]` template list untouched:
collections are graph data, guarded by tests, on the covenant's own precedent
for prompt names. `BUDGETS.md` gains the payload ceiling the new tests enforce.

* fix(pragma-cli): close four listing gaps found in review

All four were real; each is now pinned by a test.

- `PackLookup.type`/`types` accept a prefixed name OR an absolute IRI, but the
  listing is keyed on the index's PREFIXED types. Copied verbatim, a story
  legitimately constrained to `https://…/Widget` compiled clean and then matched
  no class and no weight — valid everywhere else, silently contributing nothing
  here. Types and weight KEYS are now compacted against the same map
  `resolveUri` expands with, so the two directions agree.

- A class with no instances has no key in `instanceCountByType`, so a declared
  collection reported no count at all — making an empty collection
  indistinguishable from an entry that is not a collection. A declared
  collection whose class the index knows now always states a count, zero
  included.

- Completion weighed only `PackIndexEntity.type`, one lexically chosen primary
  among `types`, while the listing's own `matchesType` honours both. A weight
  declared for a secondary type was ignored, and ranking could shift when an
  unrelated, lexically earlier type was added. The effective weight is now the
  LOWEST across every declared membership: a weight below the default is a
  demotion, and a demotion one membership asks for should not be cancelled by
  another that never asked for anything.

- The payload-budget assertions measured `String.length` — UTF-16 code units —
  while claiming to budget bytes. Today's listing undercounts by only 4 bytes,
  but a graph with non-ASCII labels could exceed the 60 KB ceiling with the
  assertion still green. Both sites now measure UTF-8.

Co-Authored-By: Claude Code <noreply@anthropic.com>
* anyone parsing plain output sees headers appear, columns
become rectangular, and empty-state text move to stderr. --format json is
and remains the stable contract.

* test(pragma-cli): regenerate the goldens the table contract moved

Bytes only: the renderer snapshot picks up header rows and rectangular
grids, the root-help inline golden gains the --no-headers row, and the
generated reference names the flag in its global-flags line (emitter +
committed page). The cross-CLI and CLI-vs-MCP parity suites pass without
any regeneration.

* feat(pragma-cli)!: one spelling per flag

Every flag now has exactly one spelling, and every spelling is honest:

- `-v` and `-h` are gone — `--version` and `--help` are the flags
  (`-v` also read as *verbose* everywhere else while printing a version).
  The long-only help option is registered once on the root and inherited by
  every subcommand, the mounted create subtree included.
- `--format text` stops parsing; the format set is plain|llm|json and an
  unknown value fails with the valid list.
- `--detail` is validated exactly as `--format` is — an unrecognized
  level used to be dropped silently, the same defect class as a filter that
  evaporates.
- `--verbose=<x>` is rejected loudly — the flag takes no value, and
  stripping-and-ignoring one was a silent no-op.
- a repeated filter flag ACCUMULATES: `--category css --category git`
  returns the union instead of silently keeping the last value. Repetition
  is the sanctioned multi-value form; the MCP arg schemas keep their scalar
  shape and the run body accepts one value or many.
- verb help renders every flag the command parses, derived from the same
  spec facts registration reads: each default-true boolean's `--no-`
  negation and the auto-injected --dry-run/--undo/--yes on mutating verbs
  (help used to deny flags that worked). The flag/doc rows live in one
  constants module shared by registration, the mounted subtree's help, and
  the verb help renderer.
* -v, -h, --format text, and --verbose=<x> stop parsing;
repeated filter flags change meaning from last-wins to union.

* feat(pragma-cli)!: config get/unset, a version command, --quiet

The grammar had jobs with no command and commands with two spellings. This
settles both, one job at a time:

- `config get <key>` prints ONE resolved value — bare on stdout, nothing at
  all when the field is unset — so `TIER=$(pragma config get tier)` works
  without a JSON tool. Plain and llm are deliberately the same bytes here:
  command substitution pipes stdout, and a pipe auto-selects llm, so a
  decorated llm line would land inside the variable. Provenance stays in
  `--format json` and in `config show`.
- `config unset <key>` clears a field. Clearing is a command, not a magic
  value: `config set` refuses `none`, `default` and `-` for a free-string
  field and the refusal names `config unset`, so the three strings can never
  quietly mean two things.
- `ontology show` is removed. `lookup` is the by-name read across every noun,
  and an alias is a second spelling of a settled name.
- `version` prints what `--version` prints, proven byte-for-byte through the
  shipped entry. It is withheld from MCP: the version already rides `info`
  and the server handshake.
- `--quiet` mutes success and progress — the mutation report seam, the
  interpreter log sink, the onboarding lines, the calm zero-record notice —
  and touches error rendering nowhere, so no failure can hide behind it.
- `--verbose`'s help text now says what it does. Its only consumer is
  `sources update`; the old wording promised diagnostics on every command.
- `pragma status` stays an error, not a second `info`. The unknown-command
  path gains a curated table for tokens whose job exists here under another
  name, so the error offers `info` and `doctor` — edit distance never could.

The covenant records the four config verbs, the version noun, the retired
ontology alias and the two new global-flag rows; the reference docs are
regenerated from it.
* `config set <key> none|default|-` no longer clears a field —
use `config unset <key>`. `ontology show` is removed; use `ontology lookup`.

* feat(pragma-cli)!: spell the server entry `mcp serve`

`mcp` was a hidden self-verb the bin alone knew about: `pragma mcp` started a
JSON-RPC server, and because the short-circuit fired on the noun before any
flag parsing, `pragma mcp --help` served too — root help promised `--help`
works on any command and this one silently did not.

The server entry is now an ordinary noun/verb pair, declared like every other:

- the verb spec is `["mcp", "serve"]` and no longer `hidden`, so it emits into
  the surface, completes, and answers `--help` through the same machinery as
  the rest of the grammar
- the bin's short-circuit narrows to the exact serve argv and only without a
  help flag; the server's stdout still carries JSON-RPC and nothing else,
  which is the only thing that shortcut ever bought
- root help's `mcp` row and the completion model's injected `mcp` noun are
  deleted — both existed only because no spec declared the noun (the model's
  injection carried a TODO saying exactly that). The help group keeps `mcp`
  curated for PLACEMENT; a registry with no mcp verb now has no mcp row.
- the covenant entry drops its hand-written `note`: the reason a verb is
  withheld from agents lives on the verb spec, and `emitVerb` never emitted it

The e2e suite pins the half that only exists across a process boundary — that
`mcp`, `mcp --help` and `mcp serve --help` print help and start no server,
while `mcp serve` boots and exits cleanly on a closed stdin. Reference pages
regenerated from the emitter; `.mcp.json` and the docs name the new argv.
* `pragma mcp` no longer starts the server; it prints the
noun's help. Host configurations must launch `pragma mcp serve`.

* feat(pragma-cli)!: print the configured domain's colophon, not the toolchain's

A colophon answers "what am I working with". Once a domain is configured the
answer is the domain — but the collector led with a paragraph about how this
program itself is built, every time, above the thing the reader asked about.

The domain sections are now the whole output. The toolchain's own declared
story is the answer only when no pack tells one: a fresh install, or a
distribution that ships no story. With neither, the command says so — the
empty state goes to stderr with exit 0, so plain stdout stays empty for a
script, while `llm` carries the same line in its own body rather than handing
an agent zero bytes.

Nothing moves into code: the toolchain half is still the distribution config's
`colophon`, the domain half still each active pack's, and the formatters still
render whatever sections the collector hands them. Only the choice of which
sections exist changed, and it stays in the collector.

The verb summary, doc, example note, root-help row, and tool hint follow the
new answer; the reference pages are regenerated from the emitter. The fallback
is pinned where a story-less distribution exists — the fork in
`identity.test.ts` — and the empty state where it is expressible, on the
formatters.

Drive-by: bundled with the `mcp serve` unit; unrelated to it.
* `pragma colophon` no longer prints the toolchain section
ahead of the domain's. With a domain configured, the JSON payload's first
section is now `kind: "pack"`.

* docs(pragma-cli): measure the fast-path recovery instead of asserting it

The ceilings came down from the provisional 220 ms on the strength of a
description of the refactor. Nobody had produced numbers, and the table in
BUDGETS.md recorded three sequential runs whose "before" arm was a remembered
figure rather than a build.

Both arms are now built and measured together: the pre-refactor tree and this
one each to their own dist, spawns alternating case by case so drift on a
shared box lands on both arms, 40 kept samples per cell, and each arm netted
against its own `--version` control so process start — which is most of every
number and none of it pragma's — is out of the comparison.

  pragma --help              74.6 -> 64.7 ms   (work: 49.3 -> 35.3, -28%)
  pragma __complete config   79.1 -> 69.2 ms   (work: 53.7 -> 39.7, -26%)
  pragma __complete skill    74.2 -> 69.3 ms   (work: 48.9 -> 39.8, -19%)
  capabilities barrel import 44.0 -> 37.6 ms

The eager cost is really gone. It was never the ~46 ms the 220 ms ceilings
were sized for, though — end to end it is ~14 ms — and saying so is the point
of measuring.

On the ceilings: 2 x the help median is 129.5, so 130 is the rule's own
number. 2 x the slower complete median is 138.5, BELOW the standing 150 — and
150 stays. A ceiling is relative to the box as well as the artifact: this box
starts a process in 25-30 ms against the reference box's 45.5, so projecting
the measured work onto the reference box gives ~85 ms and a 2x of ~170, and CI
has run this path at a ~100 ms trimmed mean. A cut to 140 would be a ceiling
derived on hardware the suite does not run on. Both are at their floor.

No ceiling value changes; the docblocks and BUDGETS.md now cite a measurement
a reader can reproduce.

* test(pragma-cli): runCli spawns without colour so CI asserts the same bytes

nx exports FORCE_COLOR to its test tasks, so a spawned CLI coloured its help
even through a pipe — the e2e assertions passed locally and failed in CI on a
difference no assertion meant to make. FORCE_COLOR is deleted rather than
overridden: Bun warns on stderr when it sees both, and stderr is asserted.

* fix(pragma-cli)!: serve only on the exact `mcp serve` invocation

The short-circuit matched a PREFIX: `argv[0] === "mcp" && argv[1] ===
"serve"` with only `--help` excluded. Every suffixed line therefore
bypassed flag parsing and started the server — `pragma mcp serve extra`
and `pragma mcp serve --version` among them, so a global flag the
program owns went unanswered and a malformed line served instead of
being parsed.

The exit buys stdio purity for the real server start (no first-run
banner, no config read, nothing on stdout but JSON-RPC). It was never
meant to extend that budget to argv the server was not asked to answer.
Require argv to be EXACTLY the two tokens; anything else falls through
to the ordinary grammar, which is the point the surrounding docblock
already made about `pragma mcp` and the help forms.

Covered across the process boundary, because in-process dispatch never
reaches the short-circuit at all.

* fix(pragma-cli): offer a repeatable filter again after its first use

`compile.ts` marks every declared pack filter `repeatable`, so
`--category css --category git` accumulates into the union. The
completion projection still read the param KIND alone, marking only
`string[]` flags repeatable, so the shell de-offered a generated
`--category` or free-string filter the moment one occurrence was typed
— hiding repetition exactly at the TAB where it became meaningful.

Project `ParamSpec.repeatable` alongside the `string[]` kind, which is
what `buildProgram` and `dispatch` already read.

* fix(pragma-cli): the domain colophon names `ontology lookup`, the live verb

Two changes in this branch combined into a defect neither creates alone:
the schema read became `ontology lookup`, and the pack colophon became
the DEFAULT output of `pragma colophon`. The colophon still said
`ontology show` reads the schema itself, so the command's own default
output directed every reader at a verb that exits 2.

The colophons are shipped copy, not docs, so a verb renamed elsewhere in
the tree breaks a page nobody edited. Gate them on the live grammar:
every backticked `<noun> <verb>` whose noun the program declares must
name a verb that noun actually has. A bare noun and every other
backticked span (prefixes, flags, type names) are left alone.

Also corrects the same stale name in the ontology formatter docblock and
in the MCP-surface test's docblock.

* docs(pragma-cli): the config pages spell clearing as `config unset`

`config set` now refuses `none`, `default` and `-` on the free-string
`tier`, because one string cannot both remove the field and be its
value. Two pages still recommended exactly those commands: the authoring
guide showed `config set tier none` in its example block and called the
three "meaningful reset sentinels", and the generated reference said
they clear the field. Both documented commands exit with INVALID_INPUT.

The reference row is edited at its source in `emitReference.ts` and the
page regenerated — `docs/reference/config.md` is generated output.

* docs(pragma-cli): `OutputFormat` stops promising a `text` alias

The shared type's docblock still said `--format text` is normalised to
`plain`. The bin rejects it with the valid list instead, so every caller
of the type was told a removed behaviour still exists. Say what is true:
the set is closed and no alias normalises into it.

* fix(pragma-cli): completion offers `--no-headers` and `--quiet`

Both flags are parsed as globals and both are advertised in root help,
but neither stood in the completion model's `GLOBAL_FLAGS`, so no
generated bash, zsh or fish script ever offered them — invisible at the
one TAB that would have taught them.

Regenerates the emitted-script snapshots and updates the literal
candidate pins, which are the pins that make this kind of omission go
red rather than silently green.
* summon-core no longer exposes an embedded template store —
callers pass a real path to `loadTemplate`. `GeneratorCliHost`,
`registerGeneratorCommands` on the main projection subpath, the
`writeUsageError` hook and the message-only usage-error exports are gone.
`summon application react` no longer accepts `--no-ssr`/`--no-router`.

* feat(pragma)!: mount summon's generators instead of mirroring them

pragma's `create` verb hand-maintained a copy of summon's generator surface —
a flag list in `constants.ts`, an adapter that mapped it back, and a PROTECTED
test asserting the copy still matched. Every generator change had to be made
twice, and that test was the only thing between a drifted mirror and a
silently wrong CLI.

`mount.ts` replaces all of it, adapting the projection summon-core now exposes
onto pragma's kernel: synthesising VerbSpecs, wiring dispatch and completion,
enforcing the path jail, and emitting the generated reference. There is one
description of a generator's surface and both binaries read it. `--intl`
arriving on application/react needed no edit here at all; under the mirror it
would have needed two.

Kernel changes that made the mount possible: `kernel/spec` gains the types and
emitters for a synthesised verb, `dispatch` and `completion/model` handle a
verb tree resolved at runtime, and `error/types`/`renderError` carry the
generator error codes so an invalid answer exits 2 rather than surfacing as an
internal error.

`create` help now renders in pragma's house style like every other noun —
previously it emitted no colour at all and bypassed the style seam, so
`NO_COLOR` and theming never reached it. Because presentation is now
deliberately host-owned, the cross-CLI contract's help cells assert structural
parity (same groups, rows, order, defaults) with a non-empty guard, while
every other cell stays byte-for-byte.

Also here: the perf gate's `globalSetup` builds `dist` once behind a
cross-process lock instead of once per worker, `scripts/codegen.ts` generates
the create surface the covenant checks against, and the retired-flag migration
handler no longer matches commands that never carried the flag.
* `--ssr` and `--router` are gone from `pragma create
application` — the generator no longer declares them. The
`@canonical/summon-component/embedded` subpath export is removed along with
its last consumer.

* fix(pragma-cli,summon): make build-lock waiters re-acquire before re-statting freshness

The waiter arm of buildUnderLock (pragma-cli src/testing/perf/
globalSetup.ts:187, summon twin src/testing/globalSetup.ts:142) paired a
lock-free existsSync with an isFresh() stat — two unsynchronised
observations. After existsSync saw no lock, a new holder could acquire it
and begin an in-place rebuild; the waiter then read mid-flight mtimes as
fresh and consumed the torn artifact the lock exists to prevent. The
waiter now always loops back to acquire the lock and re-stats only under
it, in both TWIN copies, keeping their shared docblock in step.

The contention test's driver isFresh is now also an ownership sentinel:
it drops a violation file whenever it runs while the lockfile is absent
or carries another pid, so any freshness observation outside the
waiter's own lock goes red deterministically (verified red against the
removed fast path).

* fix(pragma-cli): stop offering mutation flags on mounted namespace completions

toMountedEntry (src/kernel/completion/model.ts:250) stamped the owning
verb's mutates onto every node of a mounted subtree, so the completion
walk offered --dry-run/--undo/--yes at a namespace position — but
registerGeneratorCommands registers the host mutation trio on runnable
leaves only, so an accepted suggestion like `create component --dry-run
react` exits 2 as an unknown option (verified live). A node with
children is now non-mutating for completion; the verb's mutability
descends to the leaves. The literal namespace-tier pin and the
emitSurface agreement assertion are updated to the registered grammar.

* fix(pragma-cli): complete registered positional-prompt flags on create leaves

leafChild (src/capabilities/create/mount.ts:466) filtered positional
prompts out of a leaf's completion flag list, but addPromptOptions
(summon-core registerGeneratorCommands.ts:94) registers EVERY prompt as
an option with no positional filter — `--component-path <value>` and
`--app-path <value>` are real registered flags (they appear in the
leaf's own --help) that completion silently withheld. Every prompt now
contributes its flag; the positional argument stays an additional
spelling. The literal leaf-tier pins gain the positional-prompt flags.

* fix(pragma-cli): stop retired-flag detection reading past the option terminator

handleProgramError's retired-grammar scan (src/bin.ts:314) matched
--framework anywhere in stripped argv, so a parse failure on `create
component react --bogus -- --framework` — where --framework is an
operand — emitted the R1 migration message instead of the real
`unknown option '--bogus'` (verified live). The scan now reuses
globalFlags' option-terminator concept via the newly exported
selectScanSpan (src/kernel/project/cli/globalFlags.ts), restricting
detection to the pre-`--` span; a subprocess regression test pins the
honest error.
* `pragma` requires Node.js >= 22.18 (declared in
`engines`). The compiled binary needed no runtime at all. The floor is
22.18 because pragma dynamic-imports the consumer's own `pragma.config.ts`
and relies on Node's type stripping, which is default-on from that
version. That also constrains the config to erasable TypeScript syntax —
`enum`, `namespace` and parameter properties now fail, and
`evaluateProjectConfig` names that specifically rather than letting it
surface as an anonymous load failure.

The embedded template manifest stays, with its reason changed: the disk
read wins (`loadTemplateSync` tries the real file first), so the manifest
is the fallback arm, kept because it pins template bytes to this package's
version rather than to whatever a consumer's resolution supplies.

`compiledCreate.subprocess.test.ts` becomes `shippedCreate.subprocess.test.ts`:
the byte-identity guard survives and now covers all three nouns instead of
`component` alone, while the describe that pinned the refusals is gone —
asserting `create package` refuses would now assert a defect.

Gates: check (biome + tsc + webarchitect) green, 1123 tests green, 8/8 perf
budgets green at load 1.43 with every ceiling unchanged. Verified from a
real `npm install` of the packed tarball: version, `block list` (oxigraph
WASM + embedded pack), `create component` and `create package` all work.

* fix(pragma-cli): sweep the packaging claims the de-compile left behind

Six review lanes over c9330765 agreed on one root cause: the change fixed the
sites it touched, not the class. A measured sweep found 46 now-false statement
sites across 28 files — roughly three-quarters of the surviving
packaging-relevant prose.

Substantive, not prose:

- `wasmEmbed.test.ts` was left compiling a `bun build --compile` binary and
  asserting against it. It is PROTECTED, it was green, and it guarded an
  artifact nobody receives — so the store-boot path (oxigraph WASM + the
  embedded pack) had NO coverage at the process boundary: `budgets.test.ts`
  spawns `__store-probe` with `stdio: "ignore"` and never checks its exit, and
  the create smoke tolerates exit 3 for `block list`. Retargeted at the shipped
  entry, where it also becomes the one test that exercises a real
  `pragma.config.ts` through Node's type stripping.

- The emit freshness gate called a FAILED build fresh. `tsc` writes its outputs
  even when it exits non-zero, so `dist/src/bin.js` got a fresh mtime from a
  build that failed, and the next run skipped the rebuild and ran every spawning
  PROTECTED suite against the wreckage. `scripts/build.ts` now writes
  `dist/.build-ok` last and only on a clean emit, and the gate reads that.
  Proved: a build with an injected type error refreshes `bin.js` and leaves the
  sentinel untouched.

- `detectInstallSource` read `process.argv[1]` for a `node_modules` substring.
  Under a self-executing binary argv[1] was the user's FIRST ARGUMENT, so the
  test read a command word and answered "global" for nearly everything; running
  `node dist/src/bin.js` moves the entry path into argv[1], where it always
  contains `node_modules` — the same bug facing the other way. It now uses
  `import.meta.url` and asks whether the entry lives under the working tree.

- `engines` was `>=22.18`, which admits 23.0-23.5 — versions that satisfy the
  range but predate the 23.x line's own default-on type stripping. Now
  `>=22.18 <23 || >=23.6`.

- The embedded template manifest's justification was wrong, and it was mine:
  c9330765 claimed it "pins template bytes to this package's version". It does
  not. `loadTemplateSync` reads the real file first and the path it reads comes
  from the RESOLVED generator package, so whatever a consumer resolves is what
  wins. The manifest pins nothing; it fires only when a generator package's
  shipped templates cannot be read. Said plainly now, with the keep-or-drop
  decision left to the create-surface work that is changing what it covers.

- The bash completion floor (bash >= 4 for `mapfile`) justified itself by the
  `os: ["linux"]` pin this change deleted. macOS ships bash 3.2. The floor is
  restated honestly at both sites instead of resting on a guarantee that is gone.

User-facing false claims removed: the repo-root README and the package README
both still documented `create package` refusing with `UNSUPPORTED`; five strings
in `emitReference.ts` put a compiled binary into the generated `config.md`; the
MCP `capabilities` catalog told agents reads come "from the snapshot embedded in
the binary"; `create`'s surviving UNSUPPORTED recovery still said "run it from a
source checkout" when the real cause is a broken install; and
getting-started/config-model/mcp-integration narrated the binary throughout.

Gates: check 3/3, 1123 tests, 8/8 perf budgets at load 2.39, ceilings unchanged.

* docs(pragma-cli): correct three claims the de-compile left inaccurate

Round 2 of the review loop came back dry — a measured sweep of the
packaging-claim term set found 24 hit lines, 20 explicitly historical, 4
still true, and none false. These three are what it did find, all below
the action floor and all inaccuracies this change itself introduced:

- `detectInstallSource`'s `@note` still named `process.argv`, which the fix
  round removed in favour of `import.meta.url`. An `@note` that names the
  wrong sources is worse than none.
- `genReference.ts` described `build.ts` as running `Bun.build`.
- `entitySource.ts` claimed the whole embedded pack "is parsed at process
  start on every invocation". That was true of one bundled script and is
  false of per-module output: `pack.generated` is now a module the fast
  path never imports, so it is not parsed there at all. The split used to
  buy only the allocation; it now buys the parse too.

Two further LOW findings are recorded rather than fixed: the freshness
gate's INPUTS list does not watch the tsconfig files, and the install-scope
label mislabels two layouts (a project-local install run from a
subdirectory, and a global install under a $HOME-nested prefix). Both are
display- or dev-only and carry wake conditions in the findings ledger.

* fix(pragma-cli): address review — clear dist, re-derive the completion budget

Four review points, all correct, plus the CI failure they sat beside.

**`tsc` never prunes `outDir`, and `files` publishes all of `dist`.** A build
run after the old compiled build left its 105 MB `dist/pragma` in place, so
the tarball would have carried the very artifact this change removes —
undoing both the size reduction and the provenance. Outputs for deleted or
renamed sources have the same shape, quietly. `dist` is now recreated per
build, so it means exactly "what this build produced". Verified by planting a
stale `dist/pragma` and confirming it is gone after `bun run build`.

**The install-scope check was not path-aware.** Comparing against a literal
cwd prefix called an ordinary local install "global" the moment it was run
from a subdirectory — in a monorepo, the usual case — and its hard-coded `/`
would fail on Windows, which this change makes a supported platform. It now
derives the install root (the parent of the `node_modules` holding the entry)
and asks whether the working directory sits inside it, via `relative()`. That
also settles the $HOME-nested global prefixes (nvm, `~/.npm-global`) noted in
the findings ledger. The two path questions are pinned by a colocated test,
including the sibling case (`/proj` does not contain `/proj-two`).

**The README promised more than `engines` delivers.** It said "22.18 or
newer"; the range deliberately excludes 23.0-23.5, which predate the 23.x
line's own default-on type stripping. Stated exactly now.

**`declaration: true` emitted a `.d.ts` surface nothing resolves.** The
`tool-ts` ruleset fixes `module` and `types` at `src/index.ts` and `files`
ships `src`, so a consumer's TypeScript reads the source barrel directly.
Emitting declarations beside it was dead weight in every tarball and a second,
silently divergent copy of the same types. Dropped, with the reason recorded —
exposing the emitted ones instead is a packaging decision that belongs with
that ruleset, not with this build.

**BUDGET_COMPLETE_MS: 100 → 150.** This is the CI failure, and it is real
rather than flaky: three attempts at 100.37, 100.20 and 100.15 ms. A ceiling
is relative to the artifact it was measured on, and 100 was 2× the compiled
binary's median — against JavaScript that node executes, that lands on the
median, where it cannot separate a regression from a slow runner. 150 restores
the same 2× rule against the artifact that actually ships and still fails a
50% regression from today. The designed 50 ms target is recorded as UNMET
rather than quietly moved: node's own start consumes most of it before pragma
runs a line. Completion is typed interactively, so this is the one number this
packaging change genuinely cost, and the one most worth pulling back down.





# [0.34.0](https://github.com/canonical/pragma/compare/v0.33.0...v0.34.0) (2026-08-21)


* refactor(cli)!: removals & fold — tier and block go through the story compiler, token add-config removed, cli-core folded into summon (#939) ([11d76c8](https://github.com/canonical/pragma/commit/11d76c83667c3f76e543c0d6dfc1f0c99f29bd3b)), closes [#939](https://github.com/canonical/pragma/issues/939) [#761](https://github.com/canonical/pragma/issues/761) [#939](https://github.com/canonical/pragma/issues/939) [#909](https://github.com/canonical/pragma/issues/909)
* fix(cli)!: correctness — an honest preview interpreter, zod off the fast path, and four diagnosed defects (#909) ([17e1fae](https://github.com/canonical/pragma/commit/17e1faeb55be0a23c267ec0bbc9f6f38e5bdc2d4)), closes [#909](https://github.com/canonical/pragma/issues/909) [#5](https://github.com/canonical/pragma/issues/5) [#1](https://github.com/canonical/pragma/issues/1) [#2](https://github.com/canonical/pragma/issues/2) [#4](https://github.com/canonical/pragma/issues/4) [#909](https://github.com/canonical/pragma/issues/909) [#909](https://github.com/canonical/pragma/issues/909)
* refactor(cli)!: config honesty — detail validates, dead fields deleted loudly, colophon and MCP identity declared (#907) ([b30b4a5](https://github.com/canonical/pragma/commit/b30b4a5eb8411ece7e9d86e1df5c2193b57df512)), closes [#907](https://github.com/canonical/pragma/issues/907)
* feat(cli)!: the first install answers reads offline from the embedded pack (#897) ([f9be83d](https://github.com/canonical/pragma/commit/f9be83df5998f2a71420cb293fdec551299a5b2d)), closes [#897](https://github.com/canonical/pragma/issues/897)
* feat(cli)!: rename config packages to packs + ship pragma.conf.ts distribution defaults (#895) ([b1632d2](https://github.com/canonical/pragma/commit/b1632d2cfc9f3b30799417a41b3302ace23968ea)), closes [#895](https://github.com/canonical/pragma/issues/895)


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
* `--dry-run` and the MCP plan-first preview can now FAIL. They
previously exited 0 unconditionally, because reads were mocked; they now perform
their reads for real, so a mutation whose run would die on a missing or
unreadable file exits nonzero (CLI) or returns an error envelope (MCP) instead
of printing a plan. Writes are still only recorded — a preview never touches the
disk. Scripts that treat `--dry-run`'s exit code as always-0 must handle a
nonzero exit, which reports a failure the real run was always going to hit.
Planned byte counts also increase by the generator stamp the real run writes and
the mock omitted.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017EwUvEW5ZgjAYc9KWPjHCZ

* feat(summon): the wizard's confirm gate previews honestly

PR7 C8, ruling R6. The Ink wizard's preview pane — the plan a user reads
immediately before consenting to a scaffold — was built with `dryRun`, the
node-free MOCK: `ReadFile` returned `"[mock content of <path>]"` and `Exists`
was unconditionally `true`. So a generator that branches on the filesystem could
show the wrong plan, and one whose run dies on a missing template showed a
confident one. This is the same defect PRA-104 indicts in `--dry-run`, on the
surface where the stakes are highest: the gate exists to be believed.

The pane now comes from `runPreview` (`@canonical/task/node`): reads are real,
through a virtual write overlay so a step sees what the step before it planned,
and writes are recorded but never executed — which is what makes it safe to run
BEFORE the user has consented to anything.

The wiring is ordinary Ink/React, not a workaround for an async engine. The gate
sets `phase: "confirming"` with an EMPTY pane and renders at once; the preview
resolves into `previewEffects` and the view repaints. `EffectsSummary` renders
an empty plan as no rows, so nothing about the rendering changed — only where
the data comes from. Two states are deliberate:

- A preview that FAILS shows an empty pane, never a fiction. The generator's
  error belongs to the run, which reports it with its own message; the decision
  at the gate stays the user's.
- A preview that resolves after the gate is gone (the user answered or cancelled
  while the reads were in flight) is dropped, so it cannot repaint a pane the
  wizard has already left.

`inkPrompt` gains an optional `cwd`, threaded to the controller: the preview
reads the tree the RUN will write into rather than whatever the process cwd
happens to be. `create` passes `rt.cwd` — the same jail-checked write root it
already gives the interpreter — so the pane and the run cannot disagree about
which directory they are talking about. `setup` passes none, matching its own
run, whose interpreter it also gives no `cwd`.

`previewSettled()` is the seam that makes this testable: the wizard never awaits
it (the pane repaints itself, which is the point of being async), but a caller
asserting on the pane must synchronise with real filesystem reads, and a
wall-clock delay would only be flaky.

Tests hold summon-core's 100% threshold. The headline pair drives one generator
that branches on `exists` against two different `cwd`s and asserts the plan
differs accordingly — impossible under a mock that answers `true` either way —
while the directories stay untouched, proving the gate reads without writing.
The failing-preview and stale-preview branches are pinned, and the two existing
preview tests now await the pane instead of reading it synchronously.

cli-core's `executeGenerator` copy keeps its mock preview: that package is
deleted in PR8, so changing it now would be work with no consumer.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017EwUvEW5ZgjAYc9KWPjHCZ

* refactor(cli): the storeless fast path reads a manifest without zod

PRA-106 (PR7 C4). One edge put zod on the graph `bin.ts` evaluates for
`__complete`: `capabilities/index.ts` → `resolveSources` → `packIsComplete` →
`readManifest` → `manifestSchema.parse`, a genuine VALUE import in
`graphpack/types.ts`. L-4's implementer saw the whole-graph guard fail here and
declared it a false positive ("the walker cannot tell a type import from a value
import"); its reviewers found that was wrong, corrected the docblock, and pinned
the edge as an exact one-module set so it could not widen. The pin's own comment
said an exact set was what would make the day it was fixed impossible to miss.
This is that day: it was blocked on L-5 being live in the pack runtime, which it
no longer is.

The three schemas move VERBATIM to a new `graphpack/schemas.ts`, each annotated
`z.ZodType<T>` against the hand-written contract it validates, so a field added
to one and not the other is a type error rather than a surprise at a read. Only
the two readers already off the fast path import it: `read.ts` (boots the store)
and `embedded.ts` (materializes the 1.9 MB embedded pack). `types.ts` becomes
what its name says — contracts, no runtime import at all — with `Manifest` a
hand-written interface instead of `z.infer`.

`readManifest` validates the ~1 KB payload structurally, in about twenty lines,
with zod's STRIP semantics preserved deliberately: the manifest is reconstructed
field by field, so an unknown key in the file is dropped rather than carried into
the returned object, exactly as `z.object` does — several callers re-serialize a
manifest and would otherwise start round-tripping junk.

The schemas remain the executable specification, and the agreement is PINNED
rather than asserted: `graphpack.test.ts` gains twenty cases run through both
`manifestSchema.safeParse` and the hand validator, requiring the same verdict in
both directions AND the same value on success (which is where strip semantics
live). Change a rule in `schemas.ts` and that test fails until the hand validator
follows.

Two PROTECTED guards are updated, both strictly stronger than what they replace:

- `lazy.test.ts`'s zod-importer set flips from `["…graphpack/types.ts"]` to `[]`.
  The old form tolerated one NAMED module, so a brand-new module value-importing
  zod would have passed it; an empty set cannot. This is the flip the guard's own
  comment designed.
- The help-path check named two modules (`config/schema.ts`, `spec/validate.ts`)
  and so could only catch those two. Generalized (ruling R4) to the property they
  stood in for: no module on `buildProgram`'s graph imports zod from anywhere.

test:perf before (this commit stashed, binary rebuilt, box quiet): 8 passed;
--help median 75.5 ms / p95 88.0 ms, __complete trimmed mean 70.7 ms / median
70.0 ms / p95 94.0 ms.
test:perf after (same box, back to back): 8 passed; --help median 67.7 ms / p95
82.0 ms, __complete trimmed mean 60.6 ms / median 60.2 ms / p95 68.1 ms.
So ~10 ms off `__complete`'s trimmed mean and ~8 ms off `--help`'s median —
ahead of the ~3–4 ms the issue projected, in the same direction. Ceilings are
NOT tightened: they stay 130 ms and 100 ms, and this box's spread across runs is
wide enough that a single pair should not be read as more precise than it is.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017EwUvEW5ZgjAYc9KWPjHCZ

* fix(cli): a structural `--<TAB>` execs nothing in fish either
* a config layer declaring a `detail` value other than
`summary`, `standard` or `detailed` now fails at load with CONFIG_ERROR
naming the file and the three levels, instead of being accepted,
reported by `config show`, and silently rendered at `standard`.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017EwUvEW5ZgjAYc9KWPjHCZ

* refactor(cli)!: the dead completion.caseSensitive is removed, loudly

`completion.caseSensitive` was validated, documented, layered — and read
by nothing: the completion matcher's case behaviour is declared per
parameter by the grammar (`AutocompleteHeuristic.caseSensitive`, which
stays), never by config. The generated reference already published the
field as dead; this removes it.

Removal is loud, mirroring the `packages`->`packs` precedent: the exact
`completion.caseSensitive` path is detected BEFORE `safeParse`, because
the schema strips unknown keys for forward compatibility and would
otherwise hide the removal in silence — a config author would keep
believing the setting is in force. The check reads only that one nested
path: a stray TOP-LEVEL `caseSensitive` key remains an ordinary unknown
key (pinned), and the `packages` detection stays shallow (already
pinned at readConfig.test.ts).

`completion.minChars` and `completion.families` are unchanged.
Reference page regenerated: the `completion` row drops the dead-field
sentence and the page gains a "Removed: completion.caseSensitive"
section beside the rename section.
* a config layer still setting `completion.caseSensitive`
now fails at load with CONFIG_ERROR naming the removed field, instead of
the value being accepted and ignored. Delete the key.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017EwUvEW5ZgjAYc9KWPjHCZ

* refactor(cli)!: the dead generators declaration is deleted, loudly

Ruled by the owner (PRA-105 / L-OPEN-1, D1-A): DELETE. The `generators`
config field was validated, layered, documented and read by nothing —
`resolveSources` never consumed it, `generators[].source` had zero
readers, and `create` resolves its generators through static imports
(`bun build --compile` links only statically analysable specifiers, so a
declared package name could never decide what a compiled binary runs).
Its only consumers were the config merge and `config show`'s name
display: the exact "live or absent" hazard the L programme indicts.

Deleted from `pragma.conf.ts`, the config schema (`GeneratorSource`,
`RawConfig.generators`, `PragmaConfig.generators`,
`ConfigOrigins.generators`), the reader, the public type barrel, and
`config show` (plain, llm, and the JSON payload, which loses the field
with its type). The bindings the create surface actually runs stay in
`capabilities/create/constants.ts`, now documented as the single
authoring point.

A config still declaring the field fails at load: the removal is
detected before the schema's unknown-key stripping could hide it (the
`packages`-rename precedent) and throws CONFIG_ERROR naming the file and
the removed field, with a delete-the-field recovery. The distribution's
own config passes the same strict validation eagerly at import, so the
field cannot quietly return there either (pinned in defaults.test.ts).

Reference page regenerated: the `generators` row leaves the field table,
`config show` reports four fields, and the page gains a "Removed:
generators" section. The declared-generators door reopens in program M
per the ruling — as a working feature, not as inert data.
* the `generators` config field is removed. A global or
project layer still declaring it fails at load with CONFIG_ERROR naming
the field; delete it. `config show` no longer prints a generators row,
its JSON payload no longer carries `config.generators` /
`origins.generators`, and the package no longer exports the
`GeneratorSource` type.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017EwUvEW5ZgjAYc9KWPjHCZ

* refactor(cli)!: the toolchain colophon is content the distribution declares

Ruled by the owner (PRA-107 / L-OPEN-5, D2-A): the colophon stays
hand-written prose, but it moves into `pragma.conf.ts` as a declaration
— `colophon: { markdown, summary }` — and the kernel renders whatever
the config declares. The measured gap this closes: the colophon was the
one surface a fork's USER still read in this distribution's voice, the
only genuine content in the tree with no content seam. A fork now tells
its own story by editing the file it already edits to stop being this
distribution.

`pragmaColophon.ts` is deleted; `collectColophon` reads the validated
distribution config (`config/defaults.js` — safe behind the verb's
dynamic import, off the fast path) and titles the section with the
projected BIN_NAME. A distribution declaring no colophon gets no
toolchain section rather than an inherited narrative. The previously
dead one-line `colophon` string ("Made by the Canonical Webteam …") is
folded into the declared markdown as its closing line, so the old
field's content survives in the now-live seam.

Wire compatibility is preserved deliberately: `ColophonSection.kind`
stays the frozen JSON discriminant `"pragma"` (like the `pragma:`
resource scheme, it does not track the distribution's name) and
`source` stays `"built-in"` — both documented at the type.

PROTECTED updates, each the point of the change rather than collateral:
- copy.test.ts: the `colophon/pragmaColophon.ts` exemption — the single
  exemption the capability command rules carried — is removed with the
  file. Its docblock said the exemption stood because the owner had not
  decided whether a fork inherits, rewrites, or declares the narrative;
  the ruling decided (declares), and the filter-free source list is the
  machine-checkable proof the seam exists.
- identity.test.ts: the conf mock's `colophon` becomes the declared
  shape, and a new fork-proof case pins the projection end to end —
  the fork's declared story, under the fork's name, no leak of this
  distribution, `kind` still the frozen literal.
- defaults.test.ts: pins the declaration's shape (bodies, no leading
  H1) and its two stable fragments in place of the dead string.

The colophon verb's published doc stops enumerating this distribution's
chapters (a fork's declaration will have different ones) and describes
the seam instead; reference pages regenerated. RawConfig.colophon
narrows from `string` to the declaration object; layers may still
declare it to zero effect, as before (readConfig.test.ts updated).
* the `colophon` config field changes shape from a string
to `{ markdown, summary? }` — a layer declaring the old string form now
fails validation; move the text into `markdown`. The `colophon` verb now
renders the distribution config's declaration: a distribution that
declares none prints only its packs' domain colophons.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017EwUvEW5ZgjAYc9KWPjHCZ

* refactor(cli)!: the MCP wire identity is a stated projection, not a habit

Ruled by the owner (PRA-107 / L-OPEN-5, D2-A+A): the MCP serverInfo
projects from the bundled config — a fork's server introduces itself
under its own name — and the rule is RECORDED where machine peers can
hold it, instead of living as an accident of constants wiring.

The covenant (surface/surface.v2.json) gains `mcpSurface.serverInfo`,
stated as placeholders (`<the declared distribution name>` / `<the
package version>`, the covenant's existing envelope idiom) so the rule
is frozen while release version bumps never churn the covenant. The
$comment ledger gains the L-PR6 clause in the existing chronological
style, recording both halves of the ruling: serverInfo projects; the
`pragma:{+uri}` template, its minted URIs, and the `pragma/box` /
`pragma/instanceCount` `_meta` keys stay FROZEN protocol identity (the
measured half-derivation broke all 653 of a fork's resources). $comment
is not in FIXED_SECTIONS, and the added mcpSurface key is outside
assertConforms's checks, so conformance passes with the edit committed —
the new key is pinned by tests instead:

PROTECTED updates, both extensions (no existing pin weakened):
- surface.test.ts ("surface COMPLETE") gains the serverInfo case: the
  covenant states exactly the placeholder rule, and a real initialize
  handshake (in-memory transport) serves { MCP_SERVER_NAME, VERSION }.
- identity.test.ts gains the fork half over the same wire: under the
  mocked distribution config the server introduces itself as "recipes"
  at the package version — asserted on the handshake, not the constant,
  so a hardcoded serverInfo in buildServer fails even while the
  constant projects.

buildServer's docblock stops claiming a "stable `pragma` identity" (the
code already projected; the claim was the leak). The test harness gains
a serverInfo() accessor. docs/mcp-integration.md gains "The server's
identity" — the do-not-assume-`pragma` rule and the frozen-scheme rule
with its measurement. The generated tools.md now states the projection
in its header and the frozen-template rule on the resources bullet
(phrased so the fork-rename probe's template masking stays sound);
reference regenerated.
* the MCP server's serverInfo is contractually the
distribution's declared name and the package version. A client or
harness that assumed the server always introduces itself as `pragma`
must read serverInfo instead; against a fork's binary that assumption
never held. The resource scheme and `_meta` taxonomy keys remain frozen
and identical across distributions.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017EwUvEW5ZgjAYc9KWPjHCZ
* `--frozen` is removed — it existed only to reproduce a lock.
Pin a revision by putting a commit SHA in the pack's source ref
(`git+https://…#<sha>`), which `cloneRef` already resolves exactly. The
`sources_status` payload changes shape: `store` / `sourceRef` replace
`lockPresent`, `cached`, and the per-source `resolved`/`staleness` fields, none
of which survive without a lock to record them. `sources update` removes an
orphan `pragma.lock.json` on its next run, reversibly.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01L4ybb1LXGtws4i23z7Ju7D

* feat(cli): pin the ds: namespace in the distribution config

The design system declares `ds:` with two IRIs — `https://ds.canonical.com/` in
`definitions/` and `https://ds.canonical.com/data/` in `data/`. Prefix
harvesting is last-wins over a filename sort, so today the right one binds only
because `definitions/` sorts after `data/`. An added or renamed upstream file
flips it, and the index then compacts every `ds:` entity to the wrong prefix —
`block list` stops resolving.

Declaring the prefix in the distribution config puts it in the layer that wins
every harvest, so the binding no longer depends on filenames. It fixes the same
latent bug for every user's `sources update`, not just for the compiled embed.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01L4ybb1LXGtws4i23z7Ju7D

* feat(cli)!: compile the embedded pack from pragma.conf.ts

A cold install now answers real reads. `scripts/bundle.ts` resolves the three
packs `pragma.conf.ts` declares through the product's own pipeline — the same
`parsePackDeclaration` → `resolvePackage` → `buildPack`, with `sources update`'s
own prefix precedence, now shared as `buildPackPrefixes` so the two pipelines
cannot silently disagree — and inlines the result. On a machine with no cache,
no pointer, no network and an empty cwd, the compiled binary answers `block list`
(251), `standard list` (144), `tier list` (15), `modifier list` (11), and reports
`token list` / `prompt list` as genuinely empty rather than papering over it.

The three-line toy `sample.ttl` and `genEmbedded.ts` are gone with it.

The artifacts are not byte-reproducible — blank-node labels and SHACL value
order are store artifacts — so the bundler does not try to be. It writes NOTHING
when the pack's content hash matches the committed manifest, which gives a ZERO
diff on an unchanged rebuild: strictly stronger than byte-reproducibility, and
it needs no canonicalizer. It refuses a `file:` ref outright, so a machine-local
path can never reach the committed artifact.

`@canonical/anatomy-dsl` is unreachable from this build environment, so the
bundler resolves it from the published npm tarball (identical `definitions/*.ttl`)
via a four-line, delete-me override. `pragma.conf.ts` keeps its git source, which
is the correct ref for users; the substitution is visible in every artifact
because the manifest's `sourceRef` records `npm:0.2.2` beside the two git SHAs.
* the embedded pack is now the distribution's real graph rather
than a three-entity sample, so `graph inspect`, the MCP resource surface, and
entity completion answer over `ds:`/`cs:` entities instead of the `ex:` sample.
`embeddedContentHash()` is replaced by `embeddedManifest()`, which carries the
provenance `sources status` and `doctor` report.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01L4ybb1LXGtws4i23z7Ju7D

* docs(cli): first install answers offline; the lock is gone

The docs still told users to run `sources update` before reading anything and
described a `pragma.lock.json` that no longer exists. Reads now answer from the
compiled snapshot the moment the binary is installed; `sources update` rebuilds
from the live packs; `sources status` says which of the two is answering and
what it was built from; and a revision is pinned by putting a SHA in the pack's
source ref rather than by a removed flag.

BUDGETS.md gains the interleaved toy/real/`--version` measurement behind the
claim that the real graph costs ~+181 ms of store work, together with the
evidence that this box already fails the warm-store budget on the OLD embed —
so the ceiling is argued from the reference box, not from here.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01L4ybb1LXGtws4i23z7Ju7D

* test(cli): re-derive the warm-store ceiling from the real embedded pack

The 300 ms ceiling was derived as ~2x the median of a store boot over the
23-triple placeholder. The embed is now the distribution's 8 479-triple graph,
and booting it costs ~+181 ms of store work — measured net of a `--version`
control, since this box's process start alone swings several-fold under load.
Projected onto the reference box that is ~290 ms median / ~317 ms p95: the
median sits at the old ceiling and the p95 is over it.

`ceil(317 x 1.25 / 50) x 50` = 400. The designed `<300ms` target stays in the
surface covenant — the same treatment `--help` and `__complete` already get —
and `budgets.$comment` now names `warmStoreVerb` as the third case where the
enforced ceiling and the designed aspiration differ.

The assertion still runs against median AND p95. Swapping it for a trimmed mean
would have made this pass without moving the number, but that mechanism exists
for `__complete`, where the p95 excess was contention noise over a median with
2x headroom. Here the excess is real work, and hiding it would make the budget
lie.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01L4ybb1LXGtws4i23z7Ju7D

* fix(cli)!: read the pack index through the boot decision, not around it

`readPackIndex` re-derived its own two-way answer (pointer, else the embedded
snapshot) while `resolveSources` has three. The row it collapsed is the one
this PR's negative case exists to protect: a project that declares its own
packs and has never built them. On the compiled binary that project's
`block list` exited 3 with STORE_UNAVAILABLE while `pragma info` reported the
distribution's 550 entities and MCP `resources/list` advertised 653 resources
that every `resources/read` then refused — contradicting the guarantee written
into `resolveSources.ts`, `embedded.ts` and `docs/architecture.md`.

`readPackIndex` now takes the `SourcesDecision` instead of a cwd, so `info`,
`doctor`, the MCP resource browser and native `prompts/list` switch on the one
predicate rather than composing a second one. The `unavailable` arm returns
`undefined`, which those surfaces already degrade on (`buildResourceList` emits
the `pragma:sources` recovery entry; `info` omits the total).

The `__complete` fast path keeps a config-free reader — it is denied the config
evaluator, so it cannot see `origins.packs` — but it no longer prefers the
snapshot over a pointer whose pack the cache lost, which is the decision
table's second row. Its docblock now states what it does and does not
implement, and `embedded.ts`/`resolveSources.ts` scope their claims to match.

Tests cover all three arms of `readPackIndex`, including the `unavailable` row
the old parity test could not reach, plus the evicted-pointer row on the fast
path.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01L4ybb1LXGtws4i23z7Ju7D

* refactor(cli): drop the legacy pragma.lock.json migration

The migration claimed to be reversible and dry-run-visible, and was permitted
on exactly those grounds. Neither held: `buildUpdatePlan` returns before the
legacy probe, so `--dry-run` listed only the pointer write; and `--undo`
rebuilds the Task from post-update state, where the file is already gone, so
the delete effect — and therefore its undo — was never in the Task. Verified
against the compiled binary: the lock disappeared with nothing said on any
surface, and `sources update --undo` reported "Undid 1 step(s)" without
restoring it. The test that certified the claim hand-staged a state the
product cannot reach.

Both halves are structural, not oversights: the plan path is offline by
contract and undo has no journal. So the delete goes rather than growing a
journal to justify it — a user who never runs `sources update` was never
migrated anyway. The CHANGELOG migration table now says the lock is retired
and can be deleted, alongside the `--frozen` removal it also omitted.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01L4ybb1LXGtws4i23z7Ju7D

* fix(cli): record the resolved revisions in a built pack's sourceRef

The bundler writes `@canonical/design-system@git:41c31b34…` into the embed's
manifest; `sources update` wrote the config's pack NAMES. So `manifest.sourceRef`
— which `sources status`, `status.render` and `doctor` all present as "the
answering pack's provenance" — meant two different things depending on who
built the pack, and with the lock gone no read surface could answer "which
revision is my store built from?" for a locally-built pack.

`runUpdate` already holds `ref.kind` and `pkg.resolved` (it puts both in
`data.packs[]`), so emitting the bundler's exact `<name>@<kind>:<resolved>`
label costs carrying `kind` through the resolve loop. Losing per-source
revisions was presented as forced by removing the lock; it was not.

Drops `entryName` from this module with its last caller — leaving two copies
in the tree, under the extraction threshold.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01L4ybb1LXGtws4i23z7Ju7D

* fix(cli): key the bundler's skip on the whole manifest, and type-check scripts/

Shipping no canonicalizer rests entirely on "write nothing when the pack is
unchanged", and the skip compared `contentHash` — a SHA-256 over the resolved
TTL inputs only. `prefixes`, `version` and `sourceRef` are supplied by the
bundler and never reach that hash, so two builds of identical TTL under
different config produce equal hashes and different manifests. The first thing
that breaks is the commit directly before this one in the branch: editing
`pragma.conf.ts`'s `ds:` prefix pin and re-running `bun run bundle` would print
`unchanged … wrote nothing` and ship an embed compiled with the old map. A
release bump or an upstream revision that touches no `.ttl` would likewise
leave stale provenance in the committed manifest, which `sources status` and
`doctor` then report to users.

The skip now compares everything the manifest asserts except `createdAt` — the
only field that is not a function of the inputs.

`tsconfig.json`'s `include` gains `scripts/**/*.ts`, so the producer of the
1.87 MB committed artifact, and `buildPackPrefixes`'s only external consumer,
are covered by `check:ts`. One array entry; zero errors to fix.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01L4ybb1LXGtws4i23z7Ju7D

* refactor(cli): delete the orphaned kernel/config cacheDir

Making `kernel/runtime/paths.ts` leaf-clean moved the cache root's XDG
resolution into it and left `kernel/config/paths.ts#cacheDir` with zero
callers — two definitions and one caller where there had been one of each.
The store layer owns the cache root now, so the config leaf drops it and the
two docblocks that described the duplication say what is true instead.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01L4ybb1LXGtws4i23z7Ju7D

* docs(cli): retire the lock-era prose the pointer rename left behind

The rename established "pointer" and rewrote it in the files the plan named,
leaving 19 sites in modules the plan did not list — including the `sources`
capability barrel documenting "the resolve/build/lock Task", a `@param` example
quoting a reason string this branch renamed, three `it(...)` titles describing
an assertion the test no longer makes, and a fixture whose entire stated reason
for existing was a contrast with the `sample.ttl` this branch deletes.

Also states that a git SHA pin must be the full 40 characters: `isSha` accepts
7–40 hex, but `git fetch` cannot resolve an abbreviated one and the update
fails naming it.

No behaviour changes; the two renamed test titles assert exactly what they
asserted before.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01L4ybb1LXGtws4i23z7Ju7D

* test(cli): re-derive the warm-store ceiling from a control-netted measurement

The 400 ms ceiling was not derived. BUDGETS.md computed "+181 ms of store work"
and then composed 45.5 + 245 = 290 for the median — discarding that increment
and assuming store work is box-invariant, which the toy row two lines above
disproves. The p95 it derived the ceiling from, 317 ms, follows from no number
in the document; it is the discarded attempt's this-box measurement of a
different implementation, re-presented as a reference-box projection.

Re-measured here across five repetitions and two protocols (interleaved
round-robin over both binaries; and each binary alone, back to back), with
every probe netted against ITS OWN binary's `--version` from the same run —
which the old derivation did not do. That netting is not optional: absolute
`--version` ranged 60–287 ms across these runs on page-cache state alone. The
toy control holds at a median +92.8 ms, within 9% of the reference box's own
101.5 ms, which is what licenses projecting at all. The real pack's store work
is 2.83× the sample's (median of the five within-run multipliers; the spread,
2.43–3.65, is contention on a workload 2.8× longer).

Projected: 45.5 + 101.5 × 2.83 ≈ 333 ms median; × the reference box's own
p95/median for this command (176/147) ≈ 398 ms p95; ceil(398 × 1.25 / 50) × 50
= 500. BUDGETS.md now writes every step out from named inputs, and the additive
model is shown to land on the same ceiling. The result is 1.6× the projected
median — tighter than the 2×-of-median rule the other ceilings use — and the
assertion still runs against median AND p95, not a trimmed mean.

Also recorded: the +24 to +28 ms this box pays at process start on EVERY
invocation, including `--version`, because `bun build --compile` emits one
script and parses the 1.87 MB embed regardless of what imports it — which is
not what the `entitySource` module split avoids, and the docblock said it was.
And the coverage gap that no budget case reads the pack index.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01L4ybb1LXGtws4i23z7Ju7D

* fix(cli): keep machine paths out of the sourceRef provenance label

A `file:` pack's "resolved revision" is its absolute local path, so the
previous commit's uniform `<name>@<kind>:<resolved>` put a build machine's
directory into `manifest.sourceRef` — which `sources status` and `doctor`
render as provenance. A path is not a revision; a `file:` pack now contributes
its name alone, exactly as before, and `sources status` already lists its ref
on the per-source line.

Pins the git case: the resolved SHA must reach the manifest, since that field
is now the only place `status` and `doctor` can read a revision from.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01L4ybb1LXGtws4i23z7Ju7D

* test(cli): drop a storeless test name's claim it does not assert

"reports a cold store" describes neither the assertion (exit 0 and
`store.booted === false`) nor the behaviour: at a fresh cwd `sources status`
reports the embedded snapshot, not a cold store. The subject is the storeless
guarantee; the name now says only that.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01L4ybb1LXGtws4i23z7Ju7D
* the `packages` field of `pragma.config.ts` and the global
config JSON is renamed to `packs`. Unknown keys are stripped by the config
schema, so a legacy `packages` key is detected before validation and rejected
with a loud CONFIG_ERROR naming the rename rather than silently ignored.

The config-facing types rename with it (`PackageEntry` → `PackDeclaration`,
`PackageDeclaration` → `PackSource`); the resolution machinery
(`parsePackageEntry`, `PackageRef`, `ResolvedPackage`, `resolvePackage`)
keeps its package vocabulary — only its config-facing param type changes.
User-facing messages that name the config concept move to "packs"; the
doctor check name "package refs" and `checkPackageRefs.ts` stay.

* feat(cli): add identity and generators config fields

The config schema gains the distribution-identity fields `name`, `help`,
`colophon`, `issuesUrl` and a `generators` list (`{ name, source }` refs,
both required). They merge with the same per-field provenance as every
other layer field, so `config show` renders them — in the order name,
help, issuesUrl, colophon, tier, channel, detail, packs, generators —
with `[global]`/`[project]` origin markers and `(none)` when unset. In
this PR they are schema + provenance/display only; nothing consumes them
yet. `GeneratorRef` joins the public types barrel.

* feat(cli): ship distribution config as pragma.conf.ts defaults layer

The built-in defaults stop being a hand-maintained `satisfies PragmaConfig`
literal and become the distribution's own config file: `pragma.conf.ts`
at the package root (a non-magic name — `findProjectConfig` only discovers
`pragma.config.{ts,js}`, so it is never mistaken for a project config).
`defaults.ts` statically imports it, so `bun build --compile` inlines it
with no fs read, and validates it at module load through the same
`parseRawConfig` as every other layer — an invalid edit now fails loudly
in tests and behind the dynamic config boundary, never on the
`--help`/`__complete` fast path (the lazy.test.ts module-graph probe now
pins both `kernel/config/defaults.ts` and `pragma.conf.ts` off the static
graph). tsconfig and biome both gain the root file so it is type-checked
and linted like any source module.

* docs(cli): packs rename + new fields in config model docs

The config model doc documents the `packages` → `packs` rename (including
the loud CONFIG_ERROR a legacy `packages:` key now raises), gains rows for
the identity fields (`name`, `help`, `colophon`, `issuesUrl`) and
`generators`, and notes the defaults ship as the binary's bundled
`pragma.conf.ts`. README and getting-started move to "packs named in your
pragma.config.ts". The generated reference is unchanged (no verb spec
strings moved).

* refactor(cli): fold PR-1 review findings

Ship `pragma.conf.ts` in the tarball and anchor it with `satisfies RawConfig`;
stop re-exporting the now-zod-reaching `defaults` from the config barrel;
rename `GeneratorRef` → `GeneratorSource` and `parsePackageEntry` →
`parsePackDeclaration`; sweep remaining user-facing "configured packages"
strings, docblock references, and the doctor check display name ("pack refs")
to packs vocabulary (regenerating the two reference pages); tighten the
legacy-rename error contract (recovery carries the path); mirror declaration
order in `config show`; and pin the shallow-only legacy-key detection plus
the llm formatter rows with new tests.





# [0.33.0](https://github.com/canonical/pragma/compare/v0.32.0...v0.33.0) (2026-07-24)


### Features

* **cli:** pragma setup detects already-present config (idempotent, state-aware) ([#883](https://github.com/canonical/pragma/issues/883)) ([55f0afb](https://github.com/canonical/pragma/commit/55f0afb1bc08e96590584a1b5e03e2e3279ca110))





# [0.32.0](https://github.com/canonical/pragma/compare/v0.31.0...v0.32.0) (2026-07-20)

**Note:** Version bump only for package @canonical/pragma-cli





# Unreleased


### BREAKING CHANGES

The v2 CLI reshapes the command surface. Migrate as follows:

| v1 | v2 | Notes |
| --- | --- | --- |
| `packages:` in a config | `packs:` | The config field was renamed. A global or project config that still declares `packages:` throws `CONFIG_ERROR` at startup — every command, `doctor` and `sources update` included — with a message naming the rename. Rename the key; the entry shape is unchanged. |
| `detail:` as any string | `detail: summary \| standard \| detailed` | The `detail` config field is validated as the closed enum it documents, exactly like `channel`. A layer declaring any other value (a typo, the v1 `digest`) throws `CONFIG_ERROR` at load naming the file and the three levels — it no longer passes validation, gets reported by `config show` as in force, and silently renders at `standard`. |
| `completion.caseSensitive` | — | The field is removed: it was accepted by the validator and read by nothing — completion matching is declared per parameter by the capability grammar, never configured. A layer still setting it throws `CONFIG_ERROR` at load naming the removed field (detected before the schema's unknown-key stripping could hide it); delete the key. `completion.minChars` and `completion.families` are unchanged. |
| `generators:` in a config | — | The field is removed from the config schema, from `pragma.conf.ts`, from `config show`, and from the public type barrel (`GeneratorSource`). It was validated, layered, documented and read by nothing: `sources update` never consumed it and the `create` verbs resolve their generators statically — a compiled binary can only run generators it was linked with — so declaring it changed only what `config show` printed. A layer still declaring it throws `CONFIG_ERROR` at load naming the removed field; delete it. Declared generators may return as a working feature in a later program. |
| `pragma data …` | `pragma sources …` | The `data` noun is renamed `sources`. Build the store with `pragma sources update`; inspect it with `pragma sources status`. |
| `pragma update-refs` | `pragma sources update` | The standalone refs-update command is removed. `sources update` resolves every configured package and builds the store in one step. |
| `pragma.lock.json` | — | The project lock is removed. Which pack answers a project's reads is recorded by a one-line pointer in the cache (`$XDG_CACHE_HOME/pragma/projects/`), because the pack it names is machine-local and was never committable. Run `pragma sources update` once, then delete the orphan `pragma.lock.json` from your repo — nothing reads it. |
| `pragma sources update --frozen` | a SHA in the source ref | `--frozen` reproduced a lock; with no lock there is nothing to reproduce. Pin by putting the full 40-character commit SHA in the ref (`git+https://…#<sha>`), which every update then resolves to exactly. |
| the `llm` tool | `pragma capabilities` + MCP handshake instructions | The `llm` orientation tool is retired. Agents are oriented by the MCP handshake `instructions` sent on `initialize` and by the `capabilities` tool/verb, both derived from the live grammar. |
| `pragma tokens …` / `tokens_*` tools | `pragma token …` / `token_*` tools | The token noun and its tools are singular now: `token list`, `token lookup`, `token sample`, `token add-config`. |
| `--format text` | `--format plain` | The default text format is renamed `plain`. Output modes are `--format plain`, `--format llm` (condensed Markdown), and `--format json`; with no `--format` and a piped stdout the llm form is auto-selected (`PRAGMA_NO_AUTO_LLM` disables that). The standalone `--llm` flag is gone — passing it is an unknown-option error; use `--format llm`. Usage errors (an unknown option, a missing option argument, an excess positional, an unknown segment, an unknown command) render through the error envelope under an EXPLICITLY requested `--format json` or `--format llm`, kernel-wide; with no explicit `--format` they stay raw prose even when llm output is auto-selected. The envelope's `suggestions` field carries bare candidate tokens at the FUZZY tiers only (`react` for an unknown segment, `block` for an unknown command) — a name to substitute for the token the message names. An excess positional carries no `suggestions` (its matched operand is not a substitute — it may be the very token the message calls unexpected) and instead ships the runnable corrected command as `recovery.cli` — WHEN an operand of the invocation names a sibling or child segment that resolves to a runnable leaf (the prose `Did you mean` condition, narrowed to runnable: a matched NAMESPACE — `create package component` — keeps the prose hint but ships no recovery, a bare namespace being a help page at exit 1, not a command that can scaffold); with no runnable match the envelope carries neither optional field. The default prose `Did you mean` line is unchanged in both classes. |
| a four-file pack | a five-file pack | A built pack now also carries `stories.json` — the read stories its packages ship. A pack built by an earlier build lacks it and is treated as incomplete, so reads report `STORE_UNAVAILABLE` ("the built pack is incomplete — an older or torn build") until you run `pragma sources update` once. That update re-resolves every configured pack, so it needs the network and your git credentials, not just the local cache. |
| `config show`'s story bodies | `pragma capabilities` | `config show --format json` no longer carries declared story bodies (`config.packs[].stories`, `config.stories`) — they are SPARQL, and MCP returns that payload verbatim. Pack names, sources and per-field provenance are unchanged; use `pragma capabilities` to see the verbs a story produces. |
| a story's `emptyRecovery.cli` | the same command WITHOUT the binary name | A read story (in your config, or in a package's `stories/*.json`) declares `cli: "sources update"`, not `cli: "pragma sources update"` — the CONSUMING distribution's binary name is prepended when the hint is rendered, so one story is portable across distributions. The old prefixed form is now rejected rather than rendered as `pragma pragma sources update`: in your config that is a fatal `CONFIG_ERROR` naming the change, and a package's `stories/*.json` carrying it is dropped and named under `doctor`'s `pack refs`, like any other invalid package story. A hint carrying some other distribution's name cannot be detected, and renders doubled. |
| `config show`'s identity rows | `pragma --help` / `pragma colophon` | `name`, `help` and `issuesUrl` are read from the distribution config at module load, and `colophon` from the same file at `colophon` render time — none of the four is merged through the layers — so `config show` no longer prints them, and `config show --format json` drops them from `data.config` and `data.origins`. A global or project layer declaring one is still accepted by the validator and, as before, has no effect; it is now silent instead of being reported with a `[project]` marker nothing honours. |
| `colophon:` as a string | `colophon: { markdown, summary? }` | The toolchain colophon is declared content now, not code: the `colophon` verb renders whatever the distribution config declares (full narrative + optional condensed `--format llm` form), titled with the distribution's name, and the hand-written narrative module is deleted. The old one-line string form fails validation — move the text into `markdown`. The section's JSON `kind: "pragma"` discriminant is frozen for wire compatibility and does not track the name. |
| an MCP client assuming the server is named `pragma` | read `serverInfo` | The MCP server's wire identity is a projection, recorded in the covenant (`mcpSurface.serverInfo`): `serverInfo.name` is the distribution's declared name and `serverInfo.version` the package version, so a fork's server introduces itself under its own name. Peers must read `serverInfo` rather than assume `pragma`. The `pragma:{+uri}` resource template, the `pragma:<uri>` URIs it mints, and the `pragma/box`/`pragma/instanceCount` `_meta` keys stay frozen protocol identity every distribution serves unchanged — clients persist resource URIs, so the scheme never follows a fork's name. |
| `surface.v2.json`'s `configFiles.lock` | `configFiles.configCache` | The key named the project-lock file that v2 removed; it always described the evaluated-project-config cache. The value is unchanged. `surface/surface.v2.json` has no consumer outside the CLI package. |
| `--dry-run` / MCP plan-first always exiting 0 | an honest preview that can FAIL | A preview was a mock: reads returned placeholder strings and `Exists` was unconditionally true, so a mutation whose real run dies on its first read still printed a full plan and exited 0. Previews now perform their reads for real (writes are still only recorded — the disk is untouched), so a `--dry-run` that would fail exits **nonzero**, and the MCP plan-first twin returns the error instead of a plan. If you script `--dry-run` as a check, a new nonzero exit means the command was always going to fail; a preview's exit code is now a prediction of the run's. Planned byte counts also grew: they now include the generator stamp the real run writes, which the mock omitted. Two limits are deliberate: `Exec` is never spawned in a preview, and prompts auto-answer with their defaults. |
| an unbound story prefix always exiting **3** | a config- or package-declared story exits **1** | A read story naming a prefix the graph does not bind was reported as `STORE_UNAVAILABLE` (exit 3), recovering with `sources update` — a lever that cannot help, because no amount of building conjures a term the story's author invented. The failure now consults the story's provenance. A story declared in your config, or shipped in a package's `stories/*.json`, fails as `CONFIG_ERROR` (exit **1**) naming the file to fix and pointing at its `prefixes`, and deliberately carries no recovery command. The distribution's own stories keep `STORE_UNAVAILABLE` and the `sources update` recovery, where an unbound prefix genuinely does mean nothing is built. If you branch on the exit code, a config or package story's unbound prefix moves from **3** to **1**. |
| `pragma tier lookup <name>` | `pragma tier lookup <name...>` | The hand-written tier lookup is replaced by the tier story's compiled one, so it takes the variadic every declared lookup takes: batches, globs and prefixed-IRI addressing (`ds:apps`) now work. The `tier_lookup` MCP tool's `name` is a `string[]` (was a `string`) and it returns the uniform lookup envelope `{ results, errors }` (was one `{ uri, name, blocks }` object). `--format llm`/plain follow the generic lookup renderers: the backtick-wrapped IRI/blocks lines are gone and a tier with no members omits the blocks section instead of printing a placeholder. Shell completion offers entity names (prefixed IRIs) rather than `altNames`. |
| `pragma block list [--all-tiers]` | `pragma block list` | `block list` was the one hand-written read, and its filtering — the configured tier's parent CHAIN, the release channel, and the `--all-tiers` escape from the first — is removed, not reimplemented. It is now the block story's compiled list, and it lists **every** block in the store: experimental and alpha ones included, for everyone, until filtering returns in declared form. `config.tier` therefore scopes nothing at all (it is still accepted and still reported by `config show`/`info`), and `config.channel` keeps only its npm dist-tag role for `upgrade`/`info`. The `--all-tiers` flag and the `block_list` tool's `allTiers` parameter are gone: the CLI rejects the flag as unknown, and the tool takes no input. Row shape, ordering and exit codes are unchanged — an empty result is still a calm exit 0 with an empty `data: []`; only the empty-state MESSAGE changed, because there is no longer a tier or channel to name in it. |
| `pragma token add-config` / the `token_add-config` tool | — | Removed, not replaced. It wrote a `tokens.config.mjs` starter for the terrazzo pipeline — a MUTATION, and the declared-content grammar the read surface is now built from deliberately has no mutation verb. Nothing in the CLI writes that file any more; author it by hand, or drive terrazzo directly. The `token` noun keeps its three reads (`token list`, `token lookup`, `token sample`), and the MCP tool count drops from 38 to 37. |
| `pragma create component <path> --framework react` | `pragma create component react <path>` | The framework is a tree segment (create mirrors summon — `pragma create <path…>` ≡ `summon <path…>`; the contract is executed, not written down: `crossCli.subprocess.test.ts` runs both CLIs over the same argv and compares what they emit). `--framework` errors loudly naming the new form; there is no shim. |
| `--with-styles` / `--with-stories` / `--with-ssr-tests` positive forms | on by default; disable with `--no-with-styles` etc. | Flags derive from the generators' prompts, and a default-true confirm registers ONLY its `--no-` form (summon's convention). `lit` has no SSR-tests flag; `svelte` gains `--use-ts-stories`. Passing the positive form is an unknown-option error. |
| `create application --with-ssr/--with-router/--with-forms/--with-relay` | `create application react` with `--no-forms`/`--relay` — SSR and the router are always on | The B8 `--with-X` aliases die: the generator's own prompts ARE the params — a default-true confirm registers ONLY its `--no-` form (summon's convention, the row above) — and `react` is the tree segment. The ssr/router pair is gone WITH its prompts: the scaffold has no SPA arm, so the two questions only ever accepted their default — `--no-ssr`/`--no-router` are unknown options, and the wizard no longer asks them. |
| `create package`/`create application` refused in the compiled binary | they generate — byte-identical to a source run | The PRA-14 gate is superseded: each generator package ships and loads its own templates from its published `dist`, so every declared binding runs from an installed `pragma`, and the trees are proven byte-equal to source runs (`shippedCreate.subprocess.test.ts`). |
| bare `pragma create component` in a pipe wrote a full scaffold | REFUSES with recovery (exit 2) unless `--yes`, `--dry-run`, or complete flags | A non-TTY mutation without complete explicit input refuses in BOTH CLIs (the summon bin adopts the same decision). The refusal's stderr is the bare shared message, byte-identical to the summon bin's — implicit auto-LLM detection never reframes it; only an explicitly requested `--format json` / `--format llm` renders it through pragma's error envelope (`INVALID_INPUT`), exit 2 either way. The MCP plan-first flow is unchanged. |
| `create package`/`application --yes` skipped install | installs by default | The generators' `runInstall` default (true) now governs; pass `--no-run-install` to skip. |
| MCP `create_*` schemas mirrored by hand | derived from the generators' prompts | `create_component.framework` is now REQUIRED (enum over the tree segments, no default) and the union gains `useTsStories`; `create_application` args are the bare `forms`/`relay` (SSR and the router are always on — no longer args). Covenant amended in ledger style (L-CIS). |

See [docs/getting-started.md](./docs/getting-started.md) for the v2 workflow and [docs/reference/index.md](./docs/reference/index.md) for the full command and tool surface.


### Features

* **cli:** add `pragma colophon` — a self-describing, pack-extensible toolchain colophon (storeless self-verb + MCP tool + a pack-grammar `colophon` markdown field), rendered plain/llm/json
* **cli:** the toolchain colophon is content the distribution declares — `pragma.conf.ts` carries `colophon: { markdown, summary }` and the kernel renders whatever is declared, so a fork tells its own story by editing its config. The last hand-written narrative (`pragmaColophon.ts`) is deleted along with the copy-guard exemption that covered it: every capability source is now scanned.
* **cli:** the distribution declares its five read nouns (`block`, `token`, `modifier`, `standard`, `tier`) as data in `pragma.conf.ts` instead of code in `src/`, compiled at module load through the same compiler a third-party story goes through. `packs[].stories` is a working config field with the distribution as its first consumer.
* **cli:** a package can ship `stories/*.json`; `sources update` carries them into the pack and they become working commands in any project that declares that package. A package story may only ADD a noun the CLI does not have: one that is malformed, schema-invalid, or names a noun the CLI already ships is ignored — named on stderr and under `doctor`'s `pack refs` — never fatal.

### Bug Fixes

* **cli:** accept `sample.fixedCount` in the pack grammar validator — a documented field used by three bundled stories that `sampleSchema` (`.strict()`) omitted, so any config- or package-declared story using it died with a fatal `CONFIG_ERROR` at startup.
* **cli:** the pack grammar rejects a definition the compiler cannot build — an extra `verbs[].verb` repeating `list`/`lookup`/`sample`, or a `filters[].param` declared twice. Both were schema-valid and both threw before the command tree existed, so a package shipping one made EVERY command fail, `pragma doctor` and `pragma sources update` included.
* **cli:** `pragma capabilities` reports the effective modules, so it lists config- and package-declared nouns. The MCP server already registered its tools from that set, so the catalog and `tools/list` could disagree.

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
