# Pragma CLI — User & Jobs-Perspective Evaluation

**Date:** 2026-07-16
**Version tested:** `@canonical/pragma-cli` 0.30.0 (commit `87a2b13`), compiled binary (`bun build --compile`), Linux x64
**Method:** Hands-on black-box testing of every command surface, driven by user jobs-to-be-done, followed by source-level root-cause analysis of each defect found. All findings below were reproduced from the shell against the compiled `dist/pragma` binary; exit codes were captured without pipes to avoid `PIPESTATUS` artifacts.

---

## Jobs tested

| # | Job | Surfaces exercised |
|---|-----|--------------------|
| 1 | "I just installed pragma — orient me" | `--help`, per-verb help, `capabilities`, `llm`, `doctor`, docs |
| 2 | "What components/standards/modifiers/tokens exist, and what are their details?" | `block`, `standard`, `modifier`, `token`, `tier` list/lookup/sample, filters, three output modes |
| 3 | "Let me query the knowledge graph directly" | `graph query`, `graph inspect`, `ontology list/show` |
| 4 | "Scope pragma to my project" | `config show/tier/channel`, layering, `--local/--global/--reset` |
| 5 | "Wire pragma into my editor/agent" | `setup`, `setup mcp/completions/skills/lsp`, `--dry-run/--yes/--undo`, MCP stdio server |
| 6 | "Scaffold code for me" | `create component/package/application`, `--dry-run/--show-files/--undo` |
| 7 | "Is my install healthy? Keep it current" | `doctor`, `info`, `upgrade`, `update-refs` |
| 8 | "Script against pragma / consume from an agent" | `--format json`, exit codes, stderr/stdout separation, MCP envelopes |

---

## Executive summary

Pragma CLI has an unusually strong foundation: sub-600 ms startup including an 11k-triple WASM store boot, a coherent noun-verb command grammar, three output modes on every command, a disciplined exit-code taxonomy (verified correct), structured errors with "did you mean" suggestions, a genuinely excellent `doctor`, and a first-class agent/MCP surface that most CLIs don't attempt. 1,539 unit tests pass.

It is currently let down by four things that unit tests don't catch:

1. **A catastrophic undo bug** — `pragma setup mcp --undo` and `pragma setup completions --undo` recursively delete pre-existing directories, including the user's entire project folder. This is a data-loss bug in a feature whose whole purpose is safety.
2. **Dead advertised surfaces** — the entire `token` read domain returns zero results with any available data source, while README, `getting-started.md`, and the LLM decision trees all advertise it.
3. **Data-layer defects leaking to users** — standards' do/don't examples are triplicated and sometimes empty; placeholder values (`dimension/radius/sth`, `(?)` markers) surface in output; a malformed upstream TTL prints a warning on *every* invocation once git refs are cached.
4. **Documentation drift** — the README and the getting-started guide document commands, flags, and MCP tools that don't exist or were renamed.

Overall: **3.0 / 5** — excellent architecture and performance, held back by safety, data quality, and truth-in-advertising issues, all of which are very fixable.

---

## Scorecard (13 criteria)

| # | Criterion | Score | One-line verdict |
|---|-----------|-------|------------------|
| 1 | Performance & startup | ★★★★★ 5.0 | 0.29 s `--version`, 0.55 s store-backed queries. Never felt slow. |
| 2 | Exit codes & scriptability | ★★★★½ 4.5 | Documented taxonomy (0/1/2/3/5) verified correct; clean stdout/stderr split; ANSI-free when piped. |
| 3 | Configuration model | ★★★★½ 4.5 | Layered global/project config with provenance display, write-echo, validation. Best-in-class. |
| 4 | Diagnostics & upkeep | ★★★★ 4.0 | `doctor` with per-check fixes is exemplary; `info` misdetects install method. |
| 5 | Agent/MCP surface | ★★★★ 4.0 | 31 tools, envelopes as documented, orientation + sample tools are ahead of the curve; token tools are dead, README drift. |
| 6 | Error handling & recovery | ★★★½ 3.5 | Great structure and typo suggestions; several recovery hints are wrong, raw parser dumps leak. |
| 7 | First-run experience | ★★★ 3.0 | Blocks/standards work out of the box; skills/tokens dead until an undocumented `update-refs`; warning noise afterwards. |
| 8 | Discoverability & help | ★★★ 3.0 | Per-verb help with examples is great; top-level help hides `mcp`/`update-refs`, omits global flags, `pragma mcp --help` prints nothing. |
| 9 | Surface consistency | ★★½ 2.5 | `token` vs `tokens` domains; divergent empty-state semantics, dry-run renderings, JSON shapes, sort orders. |
| 10 | Output quality & rendering | ★★½ 2.5 | TTY table collapses to `…` at unknown width and truncates needlessly when wide; `NO_COLOR` ignored; `--llm` ≈ plain. |
| 11 | Data correctness & completeness | ★★ 2.0 | Token domain empty everywhere; standards examples triplicated/empty; placeholder data in production output. |
| 12 | Documentation accuracy | ★★ 2.0 | README/getting-started reference nonexistent commands (`setup all`, `info upgrade`, `token add-config`, batch MCP tools). |
| 13 | Safety & reversibility | ★ 1.0 | `--undo` deletes user data (twice reproduced); non-TTY prompts default to *yes*; silent overwrites and silent undos. |

---

## Critical findings (P0)

### C1. `setup mcp --undo` deletes the user's project directory

```bash
mkdir proj && cd proj && echo hi > precious.txt && mkdir src && echo code > src/app.ts
pragma setup mcp --claude-code --yes    # writes ./.mcp.json — fine
pragma setup mcp --claude-code --undo   # exit 0, prints nothing…
ls ..                                   # proj/ IS GONE — precious.txt, src/, everything
```

Reproduced twice from scratch. The undo deletes the **entire working directory**, silently, exit 0.

**Root cause:** `packages/runtime/harnesses/src/lib/config.ts:150` — when the harness config file doesn't exist, `writeMcpConfig` runs `mkdir(dirname(configPath), true)`. For Claude Code, `configPath` is `<projectRoot>/.mcp.json`, so the mkdir target is the project root itself. `makeDirEffect` (`packages/runtime/task/src/lib/effect.ts:137-145`) attaches a **default undo of `DeleteDirectory(path)`** — a recursive delete — regardless of whether the directory already existed. The mkdir is a no-op at run time (dir exists), but the undo interpreter still replays its inverse.

### C2. `setup completions --undo` deletes other programs' completion files

```bash
ls ~/.local/share/bash-completion/completions   # othertool
pragma setup completions --bash                 # adds 'pragma'
pragma setup completions --bash --undo          # exit 0, silent
ls ~/.local/share/bash-completion/completions   # directory no longer exists
```

Same root cause: `setupCompletions.ts:45` calls `mkdir(dir, true)` on the **shared** completions directory; undo recursively deletes it, taking every other tool's completions with it.

Every `mkdir` in a reversible task tree is currently a deletion bomb. Any future task built on the runtime inherits the same flaw — this is a runtime bug, not two isolated command bugs.

### C3. The entire `token` read domain is dead

- `pragma token list` / `lookup` / `sample` return zero results in the pragma monorepo, in a component package, in a fresh project — with bundled data *and* with fresh `#main` git refs.
- The store confirms it: `pragma graph query 'SELECT ?type (COUNT(?s) as ?n) …'` shows **no `Token` class instances at all** (399 Property, 77 Component, 76 CodeStandard, … 0 Token).
- `pragma llm` even prints `data: 296 blocks, 80 standards, 9 modifier families, 0 tokens` — and then advertises token commands in its decision trees anyway.
- The recovery hint is wrong: `Recovery: bun add -D @canonical/design-system` — that package is already installed and contains no token data.
- README promises `pragma token lookup <name>` "Show token with theme values"; `getting-started.md` walks users through token commands. A user following the docs hits a wall on their first session.

### C4. Standards' do/don't examples are triplicated and sometimes empty

```bash
pragma standard lookup css/selectors/naming-convention --detailed
### Do
-
-
-
### Don't
-
-
-
```

Three compounding defects, verified via `--format json`:

1. **Exact 3× duplication** — `code/api/stability` returns 9 `dos` with only 3 unique captions; `react/component/naming` returns 3 identical entries. Classic SPARQL join fanout (missing `DISTINCT`/grouping) in the lookup query.
2. **Empty `code` fields** — several standards (e.g. the CSS naming ones) have `code: ""` on every example, with the real content living in `caption`.
3. **Formatter compounds it** — plain/llm mode renders the empty `code` field as empty bullets and drops the `caption` entirely, producing the absurd output above. The marquee feature of `standard lookup` ("do/don't examples", per README) is effectively broken end-to-end.

---

## High-priority findings (P1)

### H1. Non-interactive prompts default to *yes* (writes without consent)

`pragma setup mcp --claude-code` with stdin closed (no `--yes`): exit 0 and **`.mcp.json` written anyway**. In CI or agent contexts, confirmation prompts silently auto-approve. Safe CLIs fail closed and demand `--yes` when not attached to a TTY.

### H2. Wrong recovery hint blocks the skills job

Out of the box, `pragma skill list` → `EMPTY_RESULTS`, `Recovery: Install @canonical packages first`. The packages *are* installed; the actual fix is `pragma update-refs` (skills need filesystem paths, which only the git-ref cache provides). Nothing tells the user this — `update-refs` is absent from `--help` and from both docs pages. Following the hint leads nowhere; the correct command is undiscoverable.

### H3. One malformed upstream file ⇒ permanent warning noise on every command

After `update-refs`, **every** invocation — including `pragma bloc` (a typo'd command) — prints:

```
Warning: skipping malformed graph ".../design-system/main/data/global/component/accordion.ttl" — Parser error at line 57 …
```

The graceful skip is right; the delivery is wrong: repeated on every run, no dedupe, no `--quiet`, no `doctor`-style "1 source has problems, run X for details". It also reveals a gap upstream — `design-system#main` ships TTL that pragma cannot parse, so there is no CI gate running `pragma`'s parser (or `graphql check`) against the data repo.

### H4. Output modes are not data-equivalent

`pragma block lookup Button` (plain) shows the anatomy DSL. `--format json` for the same lookup returns **no anatomy at all** and reports `nodeCount: 0, tokenCount: 0` for a block that visibly has anatomy. Scripters get less data than humans, with misleading zero counts.

### H5. TTY table rendering breaks at real terminal widths

- Width unknown (common under wrappers/CI ptys): every cell collapses — `…  compone…  global` with the **Name column reduced to a literal `…`**. Unusable.
- 80 columns (the default): header row is ~89 chars wide — the table overflows and wraps.
- 140 columns: `component` still truncates to `compone…` while the Modifiers column sits empty — width allocation ignores available slack.
- Piped output (markdown) meanwhile shows different fields than the TTY table (no IRI vs full URL). Two renderings, two data sets.

### H6. Documentation drift (README + getting-started)

Verified nonexistent or renamed, all still documented:

| Documented | Reality |
|---|---|
| `pragma setup all` | `pragma setup` (exit 1 as documented form) |
| `pragma info upgrade` | `pragma upgrade` (exit 1 as documented form) |
| `pragma token add-config` | `pragma tokens add-config` (separate plural domain) |
| MCP `*_batch_lookup` tools (×4), "30 tools" | Removed; lookups take `names[]`; server exposes 31 tools |
| "All setup commands support `--undo`" | `setup skills` has no `--undo` |
| Plain-error format with `Run 'pragma block list'` recovery line | Lookup errors print no recovery line |

The getting-started guide — the single most-read page — contains two commands that exit 1 and a token walkthrough that returns empty results.

### H7. Help-surface gaps

- `pragma mcp` and `pragma update-refs` exist but appear nowhere in `--help` — the MCP server is the README's headline feature and is invisible to `--help`.
- `pragma mcp --help` prints **nothing** and exits 0 (flag swallowed by server startup path).
- Global flags (`--llm`, `--format`, `--verbose`) appear in per-verb examples but are never listed as global flags anywhere in the help output.
- Top-level help prints raw markdown (`##`, `` ` ``) to the terminal — readable, but odd in a TTY, and 100+ lines with no usage line, no grouping by job, no "see also".

---

## Medium findings (P2)

1. **`token` vs `tokens` domains** — `pragma token list` but `pragma tokens add-config`. One noun, two domains, guaranteed mistyping.
2. **Empty-state inconsistency** — `token list` → `EMPTY_RESULTS`, exit 2; `token sample` → `Showing 0 of 0 tokens`, exit 0. Same condition, different contract.
3. **JSON shape inconsistency** — list returns a bare array; lookup returns `{results, errors}`; `graph query` returns `{type, variables, bindings, termBindings}`. Scripters must special-case each.
4. **Sort order inconsistency** — `block list` alphabetical; `standard list` unordered; modifier values reversed (`Tertiary, Secondary, Primary`).
5. **Partial-name lookups dead-end** — `standard lookup naming` finds nothing and offers no suggestions (edit-distance only), though four standards contain "naming"; no recovery line either.
6. **Raw Oxigraph errors** — a SPARQL typo dumps a full parser expectation list (a wall of Unicode ranges) with an irrelevant recovery hint (`pragma ontology list`). Write attempts (`INSERT DATA`) fail with cryptic `expected CONSTRUCT` rather than "the store is read-only; only SELECT/CONSTRUCT/ASK/DESCRIBE are supported".
7. **`NO_COLOR` ignored** — ANSI colors emitted in TTY mode regardless.
8. **`--llm` ≈ plain** — for most commands the two modes emit identical markdown; the distinct purpose ("condensed") isn't realized on the CLI (it is via MCP `condensed: true`).
9. **Dry-run renderings diverge** — `setup` renders a markdown table (with newline-broken cells and an `Exec` row whose command detail is **empty** — a dry run that won't say what it would execute); `create` renders a clean tree. One task runtime, two visual languages.
10. **Silent operations** — successful `--undo` prints nothing (no "removed X"); re-running `create component` over an existing component silently regenerates files (no "already exists", no `--force` gate) — uncommitted user edits to generated files are clobbered without warning.
11. **`info`/`doctor` misreport install method** — running the local `dist/pragma` binary reports "Installed via: npm (global)".
12. **Placeholder data in production output** — `dimension/radius/sth` ("something"?) in Button anatomy; `_other` modifier family with `Wireframe (?)`, `Focused (?)`; families named `(Color luminosity)` in display parens. The data pipeline has no "no placeholders" lint.
13. **`block lookup` multi-tier results lack disambiguation** — `Button` returns global + apps_launchpad entries with no `--tier` flag to scope a lookup.

---

## What is genuinely excellent (keep and defend)

- **Speed.** 0.29 s cold `--version`; 0.55 s for store-backed queries including WASM store boot and 362-graph load. This is faster than most Node CLIs print their banner.
- **`pragma doctor`.** Per-check status, the exact fix command for each failure, package-ref provenance (git vs bundled fallback with versions and graph/skill counts), store timing, correct exit 1 on failures. This is the model the rest of the CLI should follow.
- **Exit-code discipline.** The documented taxonomy is real: 1 (not found), 2 (empty), 3 (invalid input), 5 (store error) all verified. Errors go to stderr; data to stdout; piped output is ANSI-free.
- **Error envelope design.** `{ok:false, error:{code, message, suggestions, recovery}}` with partial-results semantics (`results` + `errors`) for multi-name lookups; "did you mean Button?" on typos; commander-level "Did you mean block?" on command typos.
- **Config layering.** Global + project layers, explicit `--local/--global`, provenance shown in `config show` (`[global]`), every write echoes the file it wrote, invalid tier exits 3, tier inheritance (`global > apps > apps/lxd`) actually filters queries.
- **Agent-first design.** `capabilities` (~100-token orientation), `llm` (decision trees with token-cost estimates), `*_sample` tools for shape discovery, MCP tool parity through shared operations, graceful bundled-data fallback when git is unavailable. This is ahead of nearly every CLI in the ecosystem.
- **`update-refs`** per-package status lines (cloned / ERROR with the exact git command) — honest and debuggable.
- **Scoped create/undo semantics** — `create component --undo` removed exactly what it created and preserved sibling files; barrel updates append idempotently rather than overwrite.

---

## Improvement path

### Phase 0 — Stop the bleeding (days; ship as 0.30.1)

1. **Fix the undo runtime** (C1, C2). `makeDirEffect` must record at execution time whether it actually created each directory, and its default undo must remove **only directories it created**, bottom-up, non-recursively (`rmdir`, not `rm -rf`), skipping non-empty ones. Add regression tests: "undo after mkdir on pre-existing dir must not delete it"; "undo must never remove files the task did not create". Audit every `mkdir` call site (`harnesses/config.ts`, `setupCompletions.ts`, summon generators) for the same pattern.
2. **Fail closed off-TTY** (H1). When a confirm prompt is required and stdin is not a TTY, abort with exit 3 and "re-run with --yes".
3. **Un-advertise or fix the token domain** (C3). Either ship token data in `@canonical/design-system`, or: mark token commands experimental in help, remove them from `llm`/`getting-started`, and correct the recovery hint to name the real data source. An advertised dead surface on first run is the single biggest trust-killer for new users.
4. **Fix standard example fanout + formatter** (C4). Add `DISTINCT`/grouping (or dedupe on a stable key) in the lookup query; render `caption` in plain/llm modes and skip empty `code` blocks. Add a data lint: no standard may ship an example with empty `code` unless `caption`-only is an explicit variant.

### Phase 1 — Trust and truth (2–4 weeks; 0.31)

5. **Recovery-hint audit** (H2). Every `EMPTY_RESULTS`/`ENTITY_NOT_FOUND` site gets a tested, situation-aware hint — `skill list` empty must point to `pragma update-refs`. Encode hints next to the operation and unit-test the mapping.
6. **Warning hygiene + upstream data gate** (H3). Dedupe the malformed-graph warning to once per source per invocation, summarize ("1 of 362 graphs skipped — run `pragma doctor` for details"), surface details in `doctor`. Add a CI job in the data repos (`design-system`, `web-code-standards`) that runs pragma's parser (e.g. `pragma graphql check` or a new `pragma data lint`) so unparseable TTL can't reach `#main`.
7. **Docs from the registry** (H6). The command registry already knows every path, flag, and description — generate the README command tables and the MCP tool list from it, and add a CI drift check (like the existing parity fixtures) so `setup all`/`info upgrade`-class rot cannot recur.
8. **Help completeness** (H7). List `mcp` and `update-refs` in top-level help (an "integration" group is fine); add a Global Flags section; make `pragma mcp --help` print usage instead of nothing; add a one-line usage header (`pragma <domain> <verb> [flags]`) at the top.
9. **Mode parity** (H4). JSON lookup must include everything plain shows (anatomy, correct nodeCount/tokenCount). Property-test: for each lookup, the JSON field set is a superset of the plain rendering's data.
10. **TTY rendering** (H5, `NO_COLOR`). Fall back to the markdown renderer when `stdout.columns` is unknown or < 60; cap table width at terminal width; allocate slack to the widest column before truncating; honor `NO_COLOR`.

### Phase 2 — Consistency polish (this quarter; 0.32)

11. Merge `tokens` into `token` (keep alias with deprecation notice).
12. One empty-state contract: all read verbs on zero rows behave identically (recommend: exit 2 + structured hint; `sample` included).
13. One JSON contract: every list returns `{results, meta}`, every lookup `{results, errors}`; document `graph query`'s shape as the deliberate exception.
14. Deterministic ordering everywhere (`ORDER BY` in every list query; modifier values in rank order).
15. Substring fallback for lookup suggestions ("naming" → the four `*naming*` standards) plus the promised recovery line in plain errors.
16. Humanize store errors: first line of the parser error only, plus "check your SPARQL syntax"; dedicated message for update queries ("read-only store").
17. Verbose undo/create: print each reversed step (`removed .mcp.json entry 'pragma'`); add an `--force` gate when `create component` targets an existing component directory.
18. Fix install-method detection in `info`/`doctor`; unify the two dry-run renderers on the `create`-style tree and always show the command an `Exec` step would run.
19. Data-quality lint in the data pipeline: reject `sth`, `(?)`, parenthesized display names, and empty summaries at publish time.

### Phase 3 — Strategic

20. **Job-level E2E harness.** The 1,539 unit tests missed every P0 in this report because all four live in integration seams (query→formatter, task→undo, data→store). Add a compiled-binary test suite that runs the eight jobs in this document against golden outputs (plain/llm/json + exit codes) in a temp project, including the `--undo` round-trips with sentinel files ("must still exist after undo").
21. **First-run onboarding.** `pragma` with no args (or `pragma quickstart`) → short status: data loaded, tier unset, MCP not configured, "run `pragma setup`" — turning the current silent-help dump into a guided first session; fold `update-refs` into first `setup` so skills work day one.
22. **Condensed `--llm` on the CLI.** Make `--llm` actually condensed (the MCP `condensed:true` path already exists) so the flag's promise matches its output, with `tokens: ~N` footers as in the MCP envelope.

---

## Appendix — evidence quick-reference

| Finding | Repro |
|---|---|
| C1 undo deletes project | `pragma setup mcp --claude-code --yes && pragma setup mcp --claude-code --undo` in a dir with no prior `.mcp.json` |
| C2 undo deletes shared dir | `pragma setup completions --bash && pragma setup completions --bash --undo` (other files in completions dir vanish) |
| C3 no tokens | `pragma graph query "SELECT ?type (COUNT(?s) as ?n) WHERE { ?s a ?type } GROUP BY ?type"` — no Token class |
| C4 triplicated examples | `pragma standard lookup code/api/stability --detailed --format json` → 9 dos, 3 unique |
| H1 consent | `pragma setup mcp --claude-code </dev/null` (no `--yes`) → `.mcp.json` written |
| H4 JSON parity | `pragma block lookup Button` vs `--format json` (anatomy missing, `nodeCount: 0`) |
| H5 table collapse | `script -qec "pragma block list" /dev/null` (width-less pty) |
| H6 docs drift | `pragma setup all; pragma info upgrade` → both exit 1 |
| H7 silent help | `pragma mcp --help` → no output, exit 0 |
| Exit codes OK | `pragma block lookup Buton` → 1; `--category nope` → 2; bad tier → 3; bad SPARQL → 5 |
