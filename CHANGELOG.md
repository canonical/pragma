# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.36.0](https://github.com/canonical/pragma/compare/v0.35.0...v0.36.0) (2026-08-29)


### Bug Fixes

* **ci:** guard against workspace sibling ranges the sibling has outgrown ([#1045](https://github.com/canonical/pragma/issues/1045)) ([7b404ef](https://github.com/canonical/pragma/commit/7b404ef3772983776f708027d6f78735235f1485))
* **ci:** repair the sibling ranges `lerna version` does not rewrite ([#1056](https://github.com/canonical/pragma/issues/1056)) ([3ab7f93](https://github.com/canonical/pragma/commit/3ab7f939adb3e4e3786edba5653d2326a82a3dd7))
* **pragma-cli:** detect the install source from the filesystem, and name the linked state ([#1053](https://github.com/canonical/pragma/issues/1053)) ([8897dbb](https://github.com/canonical/pragma/commit/8897dbbb996d4004d691c524fdc7fcbef9df9a87))
* **pragma-cli:** make every setup row actionable, reversible and honestly reported ([#1044](https://github.com/canonical/pragma/issues/1044)) ([4e8d5ed](https://github.com/canonical/pragma/commit/4e8d5ede0bb36b66a682d2098f3db93ac57ed015))
* **pragma-cli:** make the code standards reachable in one call ([#1047](https://github.com/canonical/pragma/issues/1047)) ([fff26ef](https://github.com/canonical/pragma/commit/fff26ef00b36bd48068c994a0f0b7e4054372596))
* **pragma-cli:** rank a shared block name by tier depth, and stop discarding the rest ([#1050](https://github.com/canonical/pragma/issues/1050)) ([58eb157](https://github.com/canonical/pragma/commit/58eb1573cc852121cf80bdf52eca3c77d8147255))
* **pragma-cli:** read ds:usage in block lookup, the vocabulary the graph has ([#1049](https://github.com/canonical/pragma/issues/1049)) ([003d8db](https://github.com/canonical/pragma/commit/003d8dbb112865888f9c86c03e1caf3c61c58731))


### Features

* **harnesses:** register the pragma MCP server with Charm's Crush ([#1055](https://github.com/canonical/pragma/issues/1055)) ([1719dbb](https://github.com/canonical/pragma/commit/1719dbbad56c7e95c50315fada3cfabba0d4207c))
* **Log:** migrate to design tokens ([#942](https://github.com/canonical/pragma/issues/942)) ([64baf67](https://github.com/canonical/pragma/commit/64baf67c08ee141967340945cbf748444387923c))
* **pragma-cli:** detect VS Code by installation, and report a harness inventory ([#1043](https://github.com/canonical/pragma/issues/1043)) ([cc08d6b](https://github.com/canonical/pragma/commit/cc08d6b60c2fa434ceb44a13808910c374224536))
* **pragma-cli:** ship the packs' skills with the release ([#1051](https://github.com/canonical/pragma/issues/1051)) ([ea272dd](https://github.com/canonical/pragma/commit/ea272dd5a9e71c23a24f654956d56237056e64c4))
* **pragma-cli:** show setup's wizard progress as the plan's rows, not the effect transcript ([#1054](https://github.com/canonical/pragma/issues/1054)) ([b601ae8](https://github.com/canonical/pragma/commit/b601ae8f377618adbd0e51d640d1dc4bb63639c2))
* **pragma-cli:** show the timings the wizard already has, and the wordmark only when read ([#1046](https://github.com/canonical/pragma/issues/1046)) ([c094f8b](https://github.com/canonical/pragma/commit/c094f8b2c242d47c9b7184985e531049c425ded6))
* **Spinner:** migrate to design tokens ([#940](https://github.com/canonical/pragma/issues/940)) ([0d76ed8](https://github.com/canonical/pragma/commit/0d76ed87b80a09fc2f0714f8296cf4beb0b4b68b))
* **Switch:** migrate to design tokens ([#948](https://github.com/canonical/pragma/issues/948)) ([672e348](https://github.com/canonical/pragma/commit/672e348370009c9dc8f7c4413ba37af04ad18c91))


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

* **boilerplate,summon-application:** declare the root surface classes ([#1001](https://github.com/canonical/pragma/issues/1001)) ([73ba2f1](https://github.com/canonical/pragma/commit/73ba2f136862e0b4609df5f4346fd55233dabee9))
* **ci:** stop an unreachable pack refresh from blocking the release ([#1042](https://github.com/canonical/pragma/issues/1042)) ([00e6fe1](https://github.com/canonical/pragma/commit/00e6fe1008206a691217ae055d59be89e04e8602)), closes [#1029](https://github.com/canonical/pragma/issues/1029)
* **deps:** batch package dependency updates ([#963](https://github.com/canonical/pragma/issues/963)) ([923f482](https://github.com/canonical/pragma/commit/923f4825325ecd1afc93ec9bbeca7437a4a4569f)), closes [#958](https://github.com/canonical/pragma/issues/958) [#935](https://github.com/canonical/pragma/issues/935) [#919](https://github.com/canonical/pragma/issues/919) [#918](https://github.com/canonical/pragma/issues/918) [#894](https://github.com/canonical/pragma/issues/894)
* **harnesses:** install OpenCode in the global band, where its config lives ([#1031](https://github.com/canonical/pragma/issues/1031)) ([4f172e9](https://github.com/canonical/pragma/commit/4f172e98b177e6a0458d5d8645bf8026517dfb57))
* **harnesses:** undo restores the prior state instead of leaving a husk ([#1032](https://github.com/canonical/pragma/issues/1032)) ([016cfe1](https://github.com/canonical/pragma/commit/016cfe1829f701d43ec2abeaf198af7a4bc46276))
* **pragma-cli:** a stale language server, a preview notice, and design-system 0.2.5 ([#1036](https://github.com/canonical/pragma/issues/1036)) ([3305d23](https://github.com/canonical/pragma/commit/3305d2338400edeeeb3ed659f1d050dc23232f93)), closes [canonical/design-tokens#110](https://github.com/canonical/design-tokens/issues/110) [#1035](https://github.com/canonical/pragma/issues/1035)
* **pragma-cli:** address lookups by the shape given, and nest a section's own headings ([#1034](https://github.com/canonical/pragma/issues/1034)) ([8abf87a](https://github.com/canonical/pragma/commit/8abf87ad5d1d86df44cf25426dcf02b71e654e59)), closes [#1027](https://github.com/canonical/pragma/issues/1027)
* **pragma-cli:** honour NO_COLOR ([#977](https://github.com/canonical/pragma/issues/977)) ([78f78cd](https://github.com/canonical/pragma/commit/78f78cdedb9416ad97ad8c8276fb22651c6f9a8b))
* **pragma-cli:** name the typed URI in resolution errors, accept encoded ones ([#1024](https://github.com/canonical/pragma/issues/1024)) ([5004baa](https://github.com/canonical/pragma/commit/5004baa061728fab2bd6f7e36c27bd521e6b6cb3))
* **pragma-cli:** prune installed skill links a package no longer provides ([#1003](https://github.com/canonical/pragma/issues/1003)) ([8ab2fa3](https://github.com/canonical/pragma/commit/8ab2fa377530f18b12455a4a6aa364df5537b5ba))
* **pragma-cli:** remove per-file test temp directories ([#1022](https://github.com/canonical/pragma/issues/1022)) ([b57a9c3](https://github.com/canonical/pragma/commit/b57a9c32ef522ad6e43d948c8b2822fd69cc21b8)), closes [#1000](https://github.com/canonical/pragma/issues/1000) [#1000](https://github.com/canonical/pragma/issues/1000)
* **pragma-cli:** render one plan, on both surfaces ([#1020](https://github.com/canonical/pragma/issues/1020)) ([f4b4f90](https://github.com/canonical/pragma/commit/f4b4f90db5766d75bcd8f3afbedcdcb647bb7f34))
* **pragma-cli:** teach the parameter the tool actually takes, and count a name once ([#1041](https://github.com/canonical/pragma/issues/1041)) ([f865f76](https://github.com/canonical/pragma/commit/f865f76a9e55766ec50c4db4e09cde4e9f768b1f))
* **pragma-cli:** three argument-parsing defects that answered wrongly in silence ([#976](https://github.com/canonical/pragma/issues/976)) ([51bfa28](https://github.com/canonical/pragma/commit/51bfa284097343eef138a478b570dedb42a38995))
* **router:** runtime hardening — navigation adapter, async prefetch control flow, SSR status ([#965](https://github.com/canonical/pragma/issues/965)) ([bb27037](https://github.com/canonical/pragma/commit/bb27037ab4402edbc0b28b9c56a1372cb653e820))
* **summon-application:** version fallback, safe route undo, input validation, workspace detection ([#982](https://github.com/canonical/pragma/issues/982)) ([098b87b](https://github.com/canonical/pragma/commit/098b87be7f6bd463cbb76fd638cb1a614aee009f))
* **summon-component:** test naming, exists guard, honest lit answers, portable template keys ([#978](https://github.com/canonical/pragma/issues/978)) ([fbdec01](https://github.com/canonical/pragma/commit/fbdec01df90947b147f64219baa7381fcecf57e5)), closes [#974](https://github.com/canonical/pragma/issues/974)
* **summon-core:** align the CLI seams — one flag name, safe replays, honest validation ([#988](https://github.com/canonical/pragma/issues/988)) ([375c4ba](https://github.com/canonical/pragma/commit/375c4ba08dc9e26b7e56ba3d7347544648367786))
* **summon-core:** build the execute seam from combinators so it survives re-interpretation ([#984](https://github.com/canonical/pragma/issues/984)) ([9d7c23e](https://github.com/canonical/pragma/commit/9d7c23e1cfae46e69dad02284cd8cb352a76076d))
* **summon-core:** drop the dead broken builtins and the phantom discovery default ([#985](https://github.com/canonical/pragma/issues/985)) ([a4e8d0c](https://github.com/canonical/pragma/commit/a4e8d0c895e44531b8efcb1549fb38947c1737f9))
* **summon-core:** one stamp table, protected prologues, idempotent stamping ([#986](https://github.com/canonical/pragma/issues/986)) ([24aace4](https://github.com/canonical/pragma/commit/24aace44b5c91e1dcab87dfec1986be18bb74d84))
* **summon-monorepo:** working publish auth, honest metadata, resolvable root deps ([#983](https://github.com/canonical/pragma/issues/983)) ([77a8173](https://github.com/canonical/pragma/commit/77a817364724c8a3faa157bcc6502bd8ee3dcbe2))
* **summon-package:** make every generated flag combination installable ([#975](https://github.com/canonical/pragma/issues/975)) ([987e68f](https://github.com/canonical/pragma/commit/987e68f551ee614c2c7adcc09178fedaff09f5f8))
* **task:** collect undos against real host state with fail-backtracking ([#971](https://github.com/canonical/pragma/issues/971)) ([5231ce5](https://github.com/canonical/pragma/commit/5231ce53a82aac704183723d2ca2ced791a338d7))
* **task:** repair the fallback glob and implement templateDir's transform option ([#987](https://github.com/canonical/pragma/issues/987)) ([90fafdb](https://github.com/canonical/pragma/commit/90fafdb64b73c62bb4bba3655e09536f98d159b7))


* feat(pragma-cli)!: CLI standards — fast paths, tables, flags, mcp serve, grammar (#1016) ([0b61599](https://github.com/canonical/pragma/commit/0b615996557efb2bce29f9d747d5238e1ac1f8d5)), closes [#1016](https://github.com/canonical/pragma/issues/1016)
* feat(pragma)!: mount summon's generators instead of mirroring them (#1005) ([299e206](https://github.com/canonical/pragma/commit/299e206a4dd76b62fc48a6d436d33d06652e6fdf)), closes [#1005](https://github.com/canonical/pragma/issues/1005)
* feat(router)!: pre-1.0 API consolidation — one constructor, adapters as the axis, block(), warm() (re-land of #973) (#981) ([416d596](https://github.com/canonical/pragma/commit/416d59636f94cafae7a9fbb0b377edabed6438bf)), closes [#973](https://github.com/canonical/pragma/issues/973) [#981](https://github.com/canonical/pragma/issues/981) [#973](https://github.com/canonical/pragma/issues/973) [#973](https://github.com/canonical/pragma/issues/973) [#973](https://github.com/canonical/pragma/issues/973)
* feat(pragma-cli)!: ship compiled JavaScript on node, not a linux-x64 binary (#972) ([f6e2720](https://github.com/canonical/pragma/commit/f6e272048552b6948b8099405d0e22855b2626f1)), closes [#972](https://github.com/canonical/pragma/issues/972)


### Features

* **boilerplate-vite:** align the reference app and overhaul the router docs (re-land of [#979](https://github.com/canonical/pragma/issues/979)) ([#990](https://github.com/canonical/pragma/issues/990)) ([8fe2792](https://github.com/canonical/pragma/commit/8fe27927613e7b5b9ff6c4c6596d6d9228063c2b))
* **boilerplate-vite:** serialize Relay data across the SSR boundary ([#993](https://github.com/canonical/pragma/issues/993)) ([d4ad306](https://github.com/canonical/pragma/commit/d4ad3063de8560a6f700aa760e345f8bcb311398)), closes [#968](https://github.com/canonical/pragma/issues/968)
* **collect:** export the implementation graph as turtle in the release ([#1010](https://github.com/canonical/pragma/issues/1010)) ([15c4878](https://github.com/canonical/pragma/commit/15c48788c8b5c696e8cfd756b5232628e232c93b))
* **ds-app-wpe:** Add `Button` component to WPE tier, pending upstreaming ([#906](https://github.com/canonical/pragma/issues/906)) ([d02e499](https://github.com/canonical/pragma/commit/d02e4997aef7d087f29de396c4b0f7ca65bdbc5d))
* **pragma-cli:** CLI standards conformance ([#1011](https://github.com/canonical/pragma/issues/1011)) ([2aaf368](https://github.com/canonical/pragma/commit/2aaf3682852951b079cd3bbeb3360b1ba01b1ac6))
* **pragma-cli:** curate the MCP resource listing from declared slices ([#1025](https://github.com/canonical/pragma/issues/1025)) ([e535e45](https://github.com/canonical/pragma/commit/e535e4597a11427d0038676144cac3a47cc98605))
* **pragma-cli:** open root --help with the distribution's wordmark ([#1023](https://github.com/canonical/pragma/issues/1023)) ([5bdd942](https://github.com/canonical/pragma/commit/5bdd9425a76a8bb119f94d80848067eb1069d0ff))
* **pragma-cli:** the implementation graph reaches the CLI, and the release ships it ([#1029](https://github.com/canonical/pragma/issues/1029)) ([6e865b9](https://github.com/canonical/pragma/commit/6e865b981b92496d50135e9ba9dcb5278d958618)), closes [#1017](https://github.com/canonical/pragma/issues/1017) [#1033](https://github.com/canonical/pragma/issues/1033) [#1010](https://github.com/canonical/pragma/issues/1010)
* **router-core:** tie the Navigation API intercept handler to the router load ([#991](https://github.com/canonical/pragma/issues/991)) ([9d9fc06](https://github.com/canonical/pragma/commit/9d9fc06fe6352496ae8af2b1dd1c53f9bf707f49)), closes [#966](https://github.com/canonical/pragma/issues/966) [#966](https://github.com/canonical/pragma/issues/966)
* **SideNavigation:** migrate to design tokens ([#949](https://github.com/canonical/pragma/issues/949)) ([b29eda9](https://github.com/canonical/pragma/commit/b29eda90af9c58c70bf87d9e934fe26bd2e946b8))
* **summon-application:** port the i18n feature to the templates behind an --intl flag ([#992](https://github.com/canonical/pragma/issues/992)) ([d0117b9](https://github.com/canonical/pragma/commit/d0117b9bc671f1d8ec7d080c0d5cf137a8d451f9))
* **summon:** preview the undo plan and confirm before reversing ([#974](https://github.com/canonical/pragma/issues/974)) ([3c8d8d6](https://github.com/canonical/pragma/commit/3c8d8d6cc6c4aafacd1fe81c60183b497d479763)), closes [#988](https://github.com/canonical/pragma/issues/988)
* **svelte-ds-global:** Upstream `SkipLink` from WPE tier to Global tier ([#859](https://github.com/canonical/pragma/issues/859)) ([b1f6b4f](https://github.com/canonical/pragma/commit/b1f6b4fdbc917e027666dcae579b0d87f330b7a2))
* **task:** mark carried writes verbatim so seam transforms skip them ([#997](https://github.com/canonical/pragma/issues/997)) ([f61f87d](https://github.com/canonical/pragma/commit/f61f87d32f7f621cfa6baf2b5c928864533a0823))


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
* navigate() and setSearchParams() throw on a router
constructed without an adapter instead of doing nothing.

* refactor(router)!: collapse router factories onto the adapter axis

createRouter(routes, { adapter, ... }) is now the one constructor. The
preset factories were one-line sugar over an adapter choice; under the
minimal-API principle the adapter is the whole axis:

- delete createBrowserRouter, createHashRouter, createMemoryRouter and
  createStaticRouter from router-core (the browser adapter already
  resolves Navigation API -> History API internally)
- delete router-react's createHydratedRouter; its __INITIAL_DATA__
  reading survives as readDehydratedState(), passed to createRouter as
  hydratedState — which also removes the incoherence where the hydrated
  path was history-only while createBrowserRouter preferred the
  Navigation API
- migrate every in-repo consumer (boilerplate entries, summon templates,
  storybook harnesses, story-utils) to createRouter + adapters; the
  static-router recipe (match + synchronous hydrate) is inlined at the
  two SSR entry points that used it
* createBrowserRouter, createHashRouter,
createMemoryRouter, createStaticRouter and createHydratedRouter are
removed. Use createRouter(routes, { adapter: createBrowserAdapter() |
createHashAdapter() | createMemoryAdapter(url) | createServerAdapter(url),
hydratedState: readDehydratedState() ?? undefined }).

* refactor(router)!: reshape blockers to router.block() and fix useBlocker reactivity

Five members (registerBlocker/unregisterBlocker/blockerState/
proceedNavigation/cancelNavigation) collapse into one:
router.block(isActive) returns a handle with { state, proceed, cancel,
subscribe, dispose }, backed by a dedicated blocker-state subject.

This also fixes a real bug: useBlocker subscribed to the store, but a
blocked navigate() never touched the store, so the documented
confirmation-dialog pattern never rendered — the old test had to poke
the store manually to observe the blocked state. The hook now subscribes
to the handle and re-renders on the block itself; the dialog pattern is
asserted end-to-end.

Disposing (or unmounting) while blocked discards the pending navigation
— previously implicit, now documented handle behavior.
* registerBlocker, unregisterBlocker, blockerState,
proceedNavigation and cancelNavigation are removed from Router; use
router.block(isActive). The RouterBlocker type is replaced by
RouterBlockerHandle. useBlocker's public shape is unchanged.

* refactor(router)!: shrink the public surface — internal store, one-arg StatusResponse

- Remove store from the public Router interface. It was reachable on
  every router yet documented nowhere, and no production code consumed
  it; the package's own tests reach the concrete object's store through
  an explicit internal accessor instead. createRouterStore and the
  RouterStore type remain exported as standalone primitives.
- StatusResponse's data argument is now optional — new StatusResponse(401)
  works, as the READMEs already wrote.
* Router no longer exposes store. Subscribe via
subscribe/subscribeToNavigation/subscribeToSearchParam, read via
getState/getTrackedLocation.

* refactor(router)!: rename prefetch to warm

'prefetch' imports the wrong mental model: in every other router a
prefetch/loader hands data to the component, and readers kept filing the
hook's fire-and-forget design as a bug. 'warm' says what the hook is
for — warming a cache ahead of navigation — and cannot be confused with
a data loader.

Renamed atomically across router-core (route/wrapper hook, router.warm(),
WarmFn, internals), router-react (Link's hover warm-up), the reference
app and summon templates, and the router docs. TanStack's prefetchQuery
in examples is unrelated third-party API and keeps its name.
* the route/wrapper 'prefetch' hook is now 'warm';
router.prefetch() is router.warm(); the PrefetchFn type is WarmFn.

* fix(router-core): make StatusResponse's optional payload type-safe
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


### Bug Fixes

* **ci:** playwright browsers install from the suites' own resolution; need detected on the warm graph ([#901](https://github.com/canonical/pragma/issues/901)) ([087db67](https://github.com/canonical/pragma/commit/087db67f11b89c111b5026e2635eac7df16b1b85)), closes [#902](https://github.com/canonical/pragma/issues/902)
* **summon-package:** library template emits a buildable, discoverable package ([#912](https://github.com/canonical/pragma/issues/912)) ([0d9bdbb](https://github.com/canonical/pragma/commit/0d9bdbbafd744db2ba2bf82bc9e95d616e0be1b7))
* **summon-package:** read the own version through a layout-proof walk, not a JSON self-import ([#921](https://github.com/canonical/pragma/issues/921)) ([07f50f4](https://github.com/canonical/pragma/commit/07f50f4db96d57564bc186b0ae0059748e63c0f1)), closes [#913](https://github.com/canonical/pragma/issues/913)
* **summon:** compile summon-monorepo and summon-package to JavaScript ([#913](https://github.com/canonical/pragma/issues/913)) ([8a46245](https://github.com/canonical/pragma/commit/8a462450fffead7f0cd0c9b7126101832779b3ec))


* refactor(cli)!: removals & fold — tier and block go through the story compiler, token add-config removed, cli-core folded into summon (#939) ([11d76c8](https://github.com/canonical/pragma/commit/11d76c83667c3f76e543c0d6dfc1f0c99f29bd3b)), closes [#939](https://github.com/canonical/pragma/issues/939) [#761](https://github.com/canonical/pragma/issues/761) [#939](https://github.com/canonical/pragma/issues/939) [#909](https://github.com/canonical/pragma/issues/909)
* fix(cli)!: correctness — an honest preview interpreter, zod off the fast path, and four diagnosed defects (#909) ([17e1fae](https://github.com/canonical/pragma/commit/17e1faeb55be0a23c267ec0bbc9f6f38e5bdc2d4)), closes [#909](https://github.com/canonical/pragma/issues/909) [#5](https://github.com/canonical/pragma/issues/5) [#1](https://github.com/canonical/pragma/issues/1) [#2](https://github.com/canonical/pragma/issues/2) [#4](https://github.com/canonical/pragma/issues/4) [#909](https://github.com/canonical/pragma/issues/909) [#909](https://github.com/canonical/pragma/issues/909)
* refactor(cli)!: config honesty — detail validates, dead fields deleted loudly, colophon and MCP identity declared (#907) ([b30b4a5](https://github.com/canonical/pragma/commit/b30b4a5eb8411ece7e9d86e1df5c2193b57df512)), closes [#907](https://github.com/canonical/pragma/issues/907)
* feat(cli)!: the first install answers reads offline from the embedded pack (#897) ([f9be83d](https://github.com/canonical/pragma/commit/f9be83df5998f2a71420cb293fdec551299a5b2d)), closes [#897](https://github.com/canonical/pragma/issues/897)
* feat(cli)!: rename config packages to packs + ship pragma.conf.ts distribution defaults (#895) ([b1632d2](https://github.com/canonical/pragma/commit/b1632d2cfc9f3b30799417a41b3302ace23968ea)), closes [#895](https://github.com/canonical/pragma/issues/895)


### Features

* **chromatic:** Optimize Chromatic Usage ([#891](https://github.com/canonical/pragma/issues/891)) ([7f6fe7c](https://github.com/canonical/pragma/commit/7f6fe7c45f75bd4e6532de57ff2732031883108d))
* **DialogContent:** migrate to design tokens ([#920](https://github.com/canonical/pragma/issues/920)) ([73c610a](https://github.com/canonical/pragma/commit/73c610a7f77cb3e97b327150b8d5697cc271f568))
* **Modal:** migrate to design tokens ([#929](https://github.com/canonical/pragma/issues/929)) ([e77556d](https://github.com/canonical/pragma/commit/e77556d6cf18adee74b39658b7fffd027cf39044))
* **Storybook Config:** Add support for SvelteKit ([#932](https://github.com/canonical/pragma/issues/932)) ([5fe3951](https://github.com/canonical/pragma/commit/5fe3951b9f64d52813427f3bd1001064fd2bc71a))
* **svelte-wpe:** add Rule component ([#931](https://github.com/canonical/pragma/issues/931)) ([376f223](https://github.com/canonical/pragma/commit/376f2239a545ed21ee12045dcd6b0ee6b21202a6))
* **svelte-wpe:** add Section component ([#889](https://github.com/canonical/pragma/issues/889)) ([fccd535](https://github.com/canonical/pragma/commit/fccd5350a95950edce5fbfdddf99918540ed513a))
* **Timeline:** migrate to design tokens ([#922](https://github.com/canonical/pragma/issues/922)) ([e3cc213](https://github.com/canonical/pragma/commit/e3cc21396adfd705a4610368b75412ddab78971e))
* **Tooltip:** migrate to design tokens ([#925](https://github.com/canonical/pragma/issues/925)) ([14cc02f](https://github.com/canonical/pragma/commit/14cc02fa6aa18ac4df50f49f68832bfda106c2a3))


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
