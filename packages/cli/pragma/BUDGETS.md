# Performance budgets — `pragma`

`pragma` must stay fast enough that agents and humans reach for it without
hesitation. These budgets are enforced by the protected perf tests
(`src/testing/perf/*`), which spawn the shipped entry the way a consumer does
(`node dist/src/bin.js`), discard warmups, and assert median/p95 against the
ceilings in `src/testing/perf/budgets.ts`. Node's own startup is INSIDE every
sample, because the user pays it.

> **They do not gate pull requests — owner ruling, 2026-08-30, restated
> 2026-09-10.** The restatement, the re-verification that nothing reaches the
> pass indirectly, and the three ceilings that moved with it are in
> "Re-derived 2026-09-10" at the end of this file. `test` no longer
> chains `test:perf`, and that chain was the only path by which
> `nx affected -t test` reached this suite. The tests and every ceiling are
> unchanged, and still enforced for anyone who runs `bun run test:perf`.
>
> **This reaches further than PR CI, and that is worth naming.** `push.yml` and
> `tag.yml` — the post-merge and release runs — invoke the same `bun run test`
> (via the root `lerna run test`), so unchaining it takes the budgets off those
> too. The ruling was about pull requests; the mechanism does not distinguish,
> because that one script chain is the only thing any workflow calls. Confining
> it to PRs alone would mean minting a second test target across every package
> and pointing `pr.yml` at it — a far larger change than the ruling asked for.
> The release path is the obvious candidate for open question (1) below.
>
> The ruling followed a re-derivation that did not converge. Two ceilings went
> red on GitHub-hosted runners while measuring green on the reference box, and
> raising one of them moved the failure from the budget to vitest's per-test
> timeout rather than clearing it — 15 spawns at ~800 ms against a 5 s limit.
> Chasing a contract that does not hold on the machine enforcing it, one
> constant at a time, is not a derivation.
>
> **Two questions are deliberately left open**, neither answered here:
>
> 1. **Where perf runs instead** — a scheduled job, a release gate, or a
>    maintainer's run before a release. Nothing runs it automatically today.
> 2. **Whether `BUDGET_WARM_STORE_MS` reverts to its reference-box value.** It
>    was raised for a runner class that no longer gates anything.
>
> Until (1) is answered, a performance regression reaches `main` unobserved.
> That is the accepted cost of the ruling, written down so it stays a decision
> rather than becoming an accident.

## Designed targets (surface covenant)

| Path                         | Designed target |
| ---------------------------- | --------------- |
| `pragma --help`             | < 50 ms         |
| `pragma __complete …`       | < 50 ms         |
| project `pragma.config.ts`   | < 10 ms warm    |
| warm store-backed verb       | < 300 ms        |
| MCP p95 (warm)               | < 100 ms        |
| `resources/list` payload     | < 60 KB         |
| condensed SDL (tool catalog) | ≤ 8000 tokens   |

The `resources/list` ceiling is a SIZE budget, not a latency one, and it is
enforced where the payload is built rather than by the perf pass:
`capabilities/resources/resources.test.ts` asserts it both off
`buildResourceList` and off what actually crosses the wire. Size is what an
agent pays for twice — once in transfer, once in the context window it can no
longer spend on the task — and a listing that enumerated all 712 indexed
entities cost ~155 KB on every connect. The MCP SDK's high-level list handler
ignores `cursor` and never returns `nextCursor`, so there is no paging to fall
back on: the listing is curated to the declared collections (~35 KB) and the
individuals are reached through the `pragma:{+uri}` template's autocomplete.

## Measured (day-1 perf spike, commit 6)

Environment: Linux x64, Bun v1.3.11, `bun build --compile --minify`
(`dist/pragma`) — the artifact shipped at the time; the distribution has since
moved to emitted JavaScript on Node, which costs roughly 2× on the fast paths
and remains inside every ceiling below. Method: `measureCommand` spawns 30×,
discards 3 warmups, reports median/p95 of wall-clock time. The budget tests
(un-skipped) re-measure a batch of spawns and assert against the ceilings below.

**The measured numbers below, and the ceilings derived from them, reference this
day-1 spike hardware (treated as the CI reference box).** A slower box shifts the
whole distribution up; the ceilings are the covenant, not the observations.

## Re-derived again, for the create surface

The de-compile doubled the fast paths. The create surface's projection then
added ~46 ms of eager import on top, and the two costs together put both fast
paths over their ceilings:

| Path | measured (load 1.8) | old ceiling | new ceiling |
|---|---|---|---|
| `pragma --help` | ~151 ms | 130 ms | **220 ms** |
| `pragma __complete` | ~163 ms | 150 ms | **220 ms** |

**Where the 46 ms goes**, since a raised ceiling with no cause is just a lower
standard. `capabilities/index` barrels every capability, and `create.verb.ts`
statically value-imports `@canonical/summon-core/projection` —
`decideInteraction`, `refusalMessage`, `toKebabCase` and friends, the logic this
CLI shares with summon so the two cannot drift. Both fast paths pay for it and
neither uses it. `lazy.test.ts` stays green because that subpath is not what it
guards: summon-core proper, React, zod and oxigraph are all still absent from
the fast-path graph.

The two ceilings sat together because the two costs were the same cost.

**Both were PROVISIONAL**, sized to hold until the eager import moved behind
the lazy boundary — which the next section records.

## Recovered: the create registration leaves the fast paths

The provisional 220 ms ceilings existed to cover eager create-surface imports
on the capabilities barrel. Three changes removed them:

1. **Registered syntax is baked, not derived.** The build already projected
   the generators into `createSurface.generated.ts`; it now also bakes each
   prompt's REGISTERED CLI spelling (`CREATE_CLI_SYNTAX`: flag token,
   takes-value, kebab name), so completion and the reference emitter read
   data instead of calling the projection's flag-shape authority at import
   time.
2. **The mount's registration machinery is deferred.** The projection hook
   split into a light half on the barrel (`cliProjection.ts` — completion +
   reference syntax over baked data) and a heavy half (`mount.ts` —
   summon-core's Commander adapter, the interaction decisions, the kernel
   dispatcher) loaded by `CliProjection.prepare()`, which only the bin awaits
   right before `buildProgram`. `create.verb.ts`'s projection helpers moved
   behind the same lazy `run` import that already guarded summon-core proper.
3. **The bare-help path no longer loads Commander.** The bin answered
   `--help`/the front door from the capability registry alone but imported
   the program builder first; that import now happens after the
   bare-invocation branch.

The lazy-graph guard in `lazy.test.ts` pins all three: no module on the
`capabilities/index` static graph may value-import
`@canonical/summon-core/projection`, its Commander adapter, or `commander`.

**Measured — A/B, both arms built from source and interleaved.** The earlier
pass asserted the recovery rather than demonstrating it, so this is a paired
measurement: the pre-refactor tree (`2aaf368`) and this branch's tree were each
built to their own `dist/`, and every spawn alternates arms case by case, so
machine drift on a shared box lands on both arms equally instead of on
whichever was measured second. 40 kept samples per cell (5 warmup rounds),
`node dist/src/bin.js` through `spawnSync`, fresh XDG dirs, load average ~1.5.

| Path | before (median) | after (median) | ceiling |
|---|---|---|---|
| `pragma --help` | 74.6 ms | **64.7 ms** | 130 ms |
| `pragma __complete config` | 79.1 ms | **69.2 ms** | 150 ms |
| `pragma __complete skill lookup` | 74.2 ms | **69.3 ms** | 150 ms |
| `pragma --version` (control) | 25.4 ms | 29.5 ms | — |

Process start is most of every number above, and it is not pragma's to spend,
so the arms are also compared net of each arm's OWN `--version` control — the
work the CLI actually does:

| Path | before | after | delta |
|---|---|---|---|
| `pragma --help` | 49.3 ms | 35.3 ms | **−14.0 ms (−28%)** |
| `pragma __complete config` | 53.7 ms | 39.7 ms | **−14.0 ms (−26%)** |
| `pragma __complete skill lookup` | 48.9 ms | 39.8 ms | **−9.1 ms (−19%)** |

The capabilities barrel's own import, measured the same paired way (25 spawns
per arm, 5 discarded, timing one dynamic `import()` of `capabilities/index.js`
and nothing else): **44.0 ms → 37.6 ms**. That 6.4 ms is the eager-import cost
proper; the remaining ~8 ms on `--help` is the third change — the bare
invocation answering before the program builder, and therefore before
Commander, loads at all.

**The eager cost is gone, and the size of it is now on the record rather than
asserted.** It was never the ~46 ms the provisional 220 ms ceilings were sized
for: measured end to end here it is ~14 ms of the fast paths' work. The 220 ms
ceilings were nevertheless right to be provisional, and are right to be down.

### Re-deriving the ceilings

The 2×-median rule against the after arm, on this box:

| Path | after median | 2× median | ceiling |
|---|---|---|---|
| `pragma --help` | 64.7 ms | 129.5 ms | **130 ms** |
| `pragma __complete` (slower of the two cases) | 69.3 ms | 138.5 ms | **150 ms** |

`--help` lands on 130 to within half a millisecond — the standing ceiling IS
the rule's number, not a number the rule happens to tolerate.

`__complete`'s rule number is 138.5, i.e. below the standing 150. **It is not
lowered to 140, and the reason is a correction to the method, not a
preference.** A ceiling is relative to the artifact AND the box (the header of
`budgets.ts` says so). This box's cold process start is 25–30 ms; the reference
box in the table under "p95 stabilization" is 45.5 ms. Holding the measured
work constant and projecting onto the reference box:

- `--help`: 45.5 + 35.3 = **~81 ms** median → 2× = ~162 ms
- `__complete`: 45.5 + 39.7 = **~85 ms** median → 2× = ~170 ms

Both projections sit ABOVE the standing ceilings. On the box the ceilings have
to hold on, 130 and 150 are already the tight side of the 2× rule, and CI has
run `__complete` at a ~100 ms trimmed mean before. So the honest reading of the
measurement is that these two ceilings are at their floor: the recovery earned
back the 220 ms, it does not earn a further cut, and a cut made from this box's
median alone would be a ceiling derived on hardware the suite does not run on.

The designed 50 ms target stays recorded as unmet.

## Re-derived for the shipped entry

Every figure above was measured against a `bun build --compile` executable. The
distribution now ships JavaScript that `node` executes, which costs roughly 2×
on the fast paths — so a ceiling set at 2× the *binary's* median lands on the
*emit's* median, where it can no longer separate a regression from a slow
runner.

`__complete` demonstrated this rather than merely risking it. Three CI attempts,
all against the 100 ms ceiling:

| Attempt | trimmed mean |
|---|---|
| 1 | 100.37 ms |
| 2 | 100.20 ms |
| 3 | 100.15 ms |

That is a ceiling sitting on the median, not above it.

| Budget | Compiled median | Shipped entry | Ceiling | Basis |
|---|---|---|---|---|
| `pragma --help` | ~61 ms | ~72 ms local | **130 ms** (unchanged) | still has real headroom to lose |
| `pragma __complete` | ~46 ms | ~69 ms local · ~100 ms CI trimmed mean | **150 ms** (was 100) | 2× the shipped median, the same rule as before |

**The designed 50 ms target is not met, and is recorded as unmet rather than
moved.** The shipped entry cannot reach it: node's own start consumes most of
that number before pragma runs a line. Completion is typed interactively, so
this is the budget most worth pulling back down — it is the one number the
packaging change genuinely cost.

## p95 stabilization (`__complete`)

A nearest-rank p95 over a small sample is effectively the *maximum* of that
sample (with 12 kept samples, `ceil(0.95 × 12) = 12` → the slowest spawn), so a
single GC/scheduler spike tips it over the ceiling. `__complete` — median ~62 ms
here, comfortably under the 100 ms budget — nonetheless flaked red on p95 under
whole-suite CPU contention (observed 112–149 ms) on this slower-than-reference
box. The `__complete` budget test therefore enforces the ceiling on a
**10%-trimmed mean** (`measure.trimmedMean`) — a robust central estimate the
occasional spike cannot dominate — over 30 spawns (5 warmups, `retry: 3`), and
keeps **p95 as a soft check** (asserted with 1.5× headroom) to still catch a
gross regression. At the time `BUDGET_COMPLETE_MS` stayed **100 ms** — that
change made the statistic reliable without touching the ceiling. The ceiling
itself was re-derived later, when the shipped artifact changed; see
"Re-derived for the shipped entry" below.

| Path                       | Median  | p95     | Budget  | Basis                     |
| -------------------------- | ------- | ------- | ------- | ------------------------- |
| `pragma --version` (cold) | 45.5 ms | 50.1 ms | —       | reference (cold start)    |
| `pragma --help`           | 61.0 ms | 66.1 ms | 130 ms  | 2× median (50 ms target)  |
| `pragma __complete`       | 46.1 ms | 51.3 ms | 100 ms  | 2× median (50 ms target)  |
| `config show`              | 63.5 ms | 68.9 ms | —       | reference (storeless run) |
| project config load (warm) | < 1 ms  | < 1 ms  | 10 ms   | cache hit (in-process)    |
| `__store-probe` (store)    | ~147 ms | ~176 ms | 500 ms  | re-derived (see below)    |

The store-backed verb budget (`__store-probe`: oxigraph WASM load + n-quads
cache load + `compileFromExtraction` + a SPARQL count, across the process
boundary)
measured ~147 ms median here — but that timed a boot of the 23-triple
**placeholder** pack. Against the real embedded graph the store component is
~2.8× that; see "The embedded pack becomes the real graph" below, where the
ceiling is re-derived. Boot still loads the n-quads dump (no TTL parse) and
rebuilds the schema from
the extraction artifact (no live 7-pass compile), which is what keeps the growth
proportionate rather than catastrophic.

The designed 50 ms target for `--help`/`__complete` proved unrealistic here:
cold Bun process start alone (`--version`) is ~45 ms, leaving no headroom for
the ~15 ms of command-tree work. Per the plan, each ceiling is set to roughly
`2 × measured median` and the substitution recorded here rather than weakening
the assertion silently. The 50 ms target is retained as the aspiration in the
surface covenant's `budgets` block; a faster runtime or a lighter start closes
the gap.

## The embedded pack becomes the real graph — what it costs

The binary used to embed a 23-triple sample; it now embeds the distribution's
own 8 479-triple graph, so `__store-probe` boots a real store. This measures
what that costs, and — because a shared dev box's absolute numbers are
worthless in isolation — measures it **net of process start**.

**Method.** Two protocols, five repetitions, `uptime` before and after each
(load 3.5 → 5.4). The **toy** binary is compiled from this same tree with
`origin/main`'s two generated embed modules swapped in, so the ONLY difference
between the two binaries is the pack. Every probe is netted against **its own
binary's** `--version`, measured in the same repetition.

- *Interleaved* (reps 1–3): round-robin over all four cases, 18 rounds, 3
  discarded as warmups, rotating the start index each round — so both binaries
  see the same machine load and the same page-cache pressure.
- *Per-binary* (reps 4–5): the two cases of one binary round-robined together,
  the two binaries run back to back.

| Rep | protocol    | load    | toy store work | real store work | multiplier |
| --- | ----------- | ------- | -------------- | --------------- | ---------- |
| 1   | interleaved | 3.5–4.1 | +92.8 ms       | +249.8 ms       | 2.69×      |
| 2   | interleaved | 4.1–4.9 | +93.3 ms       | +341.0 ms       | 3.65×      |
| 3   | interleaved | 5.4–4.0 | +92.3 ms       | +261.6 ms       | 2.83×      |
| 4   | per-binary  | 3.7     | +117.3 ms      | +285.4 ms       | 2.43×      |
| 5   | per-binary  | 3.7     | +90.4 ms       | +295.6 ms       | 3.27×      |
|     | **median**  |         | **+92.8 ms**   | **+285.4 ms**   | **2.83×**  |

Three things this shows.

1. **Only the netted figures mean anything on this box.** Absolute `--version`
   ranged 60–287 ms across these runs — not from CPU load but from whether that
   105 MB binary happened to be hot in the page cache, which alternating two of
   them (or another agent's memory pressure) decides. The reference box measured
   45.5 ms. Never attribute a cost to store work without subtracting a control
   from the same binary in the same run.
2. **The toy column is the control that makes the rest usable.** Its median,
   +92.8 ms, is within 9% of the reference box's own toy figure
   (147 − 45.5 = **101.5 ms**), and it holds across both protocols and a load
   swing. The store component of this box is therefore comparable to the
   reference box's once process start is netted out — which is what licenses
   projecting at all.
3. **The multiplier is the statistic to carry over, not the increment.** The
   real-pack workload is ~2.8× longer and so ~2.8× more exposed to contention,
   which is what spreads the real column (250 → 341) while the toy column stays
   put. The median of the five within-repetition multipliers — each measured
   under conditions identical for both binaries — is **2.83×**.

### `BUDGET_WARM_STORE_MS`: 300 → 500

The arithmetic, from named inputs, in full. Reference-box inputs are the two
rows of the table above this section: `--version` 45.5 ms median / 50.1 ms p95,
`__store-probe` (toy) 147 ms median / 176 ms p95.

```
reference toy store work      = 147 − 45.5                     = 101.5 ms
projected real store work     = 101.5 × 2.83                   = 287.2 ms
projected real __store-probe  = 45.5 + 287.2                   = 332.7 ms   (median)
reference p95/median for this command = 176 / 147              = 1.197
projected p95                 = 332.7 × 1.197                  = 398.2 ms
ceiling                       = ceil(398.2 × 1.25 / 50) × 50   = 500 ms
```

Two choices in there are deliberate and worth stating. The projection is
**multiplicative**, because the additive alternative assumes store work is
box-invariant and the table's own toy column is what would have to prove that —
it is close (92.8 vs 101.5) but not equal, and the multiplier is the quantity
that survived both protocols. (Additively: 101.5 + 192.6 = 294 ms of store work,
projecting to 340 ms median / 407 ms p95 — the same 500 ms ceiling.) And the p95
is projected from the reference box's **own** dispersion for this command
(1.197× its median) rather than from a p95 measured here — subtracting one
process's p95 from another's is not a statistic, and it would import this box's
contention into a number that is supposed to describe the reference box.

The result is still tighter than this file's default rule: 500 ms is **1.6×**
the projected median, where `--help` and `__complete` are both set at ~2×. And
it is 1.67× the designed 300 ms target, where `--help`'s enforced ceiling is
2.6× its designed 50 ms. So `warmStoreVerb: "<300ms"` remains the aspiration in
the surface covenant and `budgets.$comment` now names it as the third
designed-vs-enforced divergence.

**Also measured — the per-invocation start tax**, on the compiled binary of the
time. The real embed made it ~2.0 MB bigger (104.8 → 106.8 MB), and
`bun build --compile` emitted one script, so the whole embed was *parsed* at
process start on every invocation even
though `--version` and `--help` import neither generated module. Measured on
`--version` under the interleaved protocol, which is the only one where the two
binaries face the same page-cache pressure: **+24.1 / +24.7 / +28.4 ms**. Scaled
to the reference box's 45.5 ms start that is roughly +6 ms, which neither the
130 ms `--help` nor the 100 ms `__complete` ceiling notices — but it is a real
cost of the embed and it is not what the `entitySource` module split avoids
(that split keeps the 1.87 MB from being *evaluated*, not from being *parsed*).

**Pre-existing gap, recorded honestly:** the `warm store-backed verb` budget case
already fails on this box with the **toy** pack — 352 / 364 / 382 ms median
across three attempts against the 300 ms ceiling — so its failure here is
environmental, not a regression this change introduced. The ceiling above is
derived for the reference box, which is the covenant.

What was NOT done, deliberately: the assertion still runs against **median and
p95**, not a trimmed mean. That mechanism exists here for `__complete`, where the
p95 excess was contention noise over a median with 2× headroom. This excess is
real work. Hiding real cost behind a robust statistic would make the budget lie.

**Known coverage gap.** No budget case reads the pack index: `__complete config`
completes subcommands and `__complete skill lookup do` walks the filesystem. The
index-backed completion path (`__complete block lookup …`, which the 90×-larger
index actually touches) is therefore unmeasured, as is MCP `resources/list`,
whose budget probe (`capabilities`) is deliberately index-free. Both are
recorded here rather than closed with a new case that would flake on this box.

## PR7 — `mcpP95Warm` + `condensedSDL` activated (seeded → enforced)

PR7 completes the MCP surface (38 tools), so the two budgets PR4 seeded now go
enforced. They are split by MEASUREMENT TYPE:

- **`mcpP95Warm` (latency → serial perf pass).** Enforced in `budgets.test.ts`
  (the `(PROTECTED)` suite, run by the isolated serial `test:perf` pass so
  in-process timing isn't inflated by coverage-worker contention). It measures a
  warm, IN-PROCESS `callTool("capabilities")` — a storeless, network-free tool,
  so it isolates envelope + dispatch overhead over the full catalog. Measured
  here: **p95 ≈ 0.4 ms, median ≈ 0.3 ms** across 25 warm calls — enormous
  headroom under the **100 ms** ceiling, so it guards a gross regression without
  flaking. Enforced on the trimmed mean with p95 as a second check (both ≤ 100).
  `info` is deliberately NOT the probe: its network update-check makes a warm
  call ~55 ms, which would measure the registry, not the call path. The old
  `mcpP95Warm.seed.test.ts` is retired.

- **`condensedSDL` (deterministic → content assertion).** A pure char-count of
  the aggregate tool catalog (name + description + inputSchema), so CPU
  contention cannot affect it — it stays a deterministic assertion in the eval
  harness (`cases/stable.ts#content-condensed-sdl-token-budget`, coverage pass),
  NOT the serial perf pass. Re-measured over the full 38-tool catalog:
  **11 068 chars ≈ 2767 tokens** (~4 chars/token), comfortably under the **8000**
  ceiling. The budget now genuinely constrains description length — verbose
  `use_when`/tool descriptions are what it guards against.

| Budget         | Measured (full catalog)      | Ceiling      | Pass                 |
| -------------- | ---------------------------- | ------------ | -------------------- |
| `mcpP95Warm`   | p95 ≈ 0.4 ms (in-process)    | 100 ms       | serial perf (`test:perf`) |
| `condensedSDL` | 2767 tokens (38 tools) — STALE, see the 2026-09-10 re-measurement at the end of this file | 8000 tokens  | eval/coverage        |

Confirmed by the spike:

- **help path imports no zod / no run body** — the module-graph probe
  (`src/capabilities/lazy.test.ts`) walks the static import graph from
  `buildProgram` and `capabilities/index` and asserts neither reaches a zod
  schema module nor any `collect*` run body (those are dynamic-imported).
- **`__complete` is storeless** — resolved from the grammar alone
  (`complete.test.ts`), no config or store read.
- **project config is served warm** — `evaluateProjectConfig` returns the
  content-hash cache on a hit without re-importing (`readConfig.test.ts`), and
  the shipped entry evaluates an external `pragma.config.ts` natively — under
  Node that is type STRIPPING, so the config must be erasable TypeScript
  (`engines` pins the floor that makes it default-on).

## Stories in packs — no budget movement (A/B)

Moving the distribution's five read stories out of `src/capabilities/*/pack.ts`
and into `pragma.conf.ts` is a MOVE, not an addition: the same five
`compilePack` calls run at module load and the same object literal is parsed,
from one file instead of five. The package tier adds one small read
(`stories.json` off the answering pack) on the DISPATCH path only, from its own
generated module — never `pack.generated.ts`, whose ~1.9 MB of n-quads on the
dispatch path measured **+28 ms on every command** when it was tried.

Measured by round-robin over two compiled binaries built the same way (this
branch vs. its parent commit), 30 rounds each, `env -i` with a fresh
`HOME`/`XDG_*` in an empty cwd, on a box at load ≈ 2.0. Absolutes are inflated
relative to the reference box by the load and by the spawn harness, so only the
deltas mean anything — and at n = 30 on a loaded box, anything inside ±2 ms is
noise:

| Case                              | base median | new median | raw Δ   |
| --------------------------------- | ----------- | ---------- | ------- |
| `pragma --version`                | 92.0 ms     | 92.6 ms    | +0.6 ms |
| `--help`                          | 123.8 ms    | 125.0 ms   | +1.2 ms |
| `__complete -- block lookup Butt` | 122.8 ms    | 121.2 ms   | −1.6 ms |
| `config show` (dispatch)          | 149.1 ms    | 149.3 ms   | +0.2 ms |

Deltas that straddle zero are the signature of noise rather than a cost. **No
budget constant changes**; `bun run test:perf` is 8/8 green.

`pragma --version` is listed as a case, NOT as a control: `bin.ts` imports
`constants.ts`, which statically imports `pragma.conf.ts` — the one module this
change grew (55 → 513 lines). Netting the other rows against it would subtract
the only cost this change plausibly introduces from every row. Its own +0.6 ms
is therefore the best available direct measure of that cost, and it is inside
the noise band. Independent replications on this box (250-round `--version`-only
interleave; 120-round three-case) put it at +0.07 to +0.5 ms. If a true control
is ever wanted here, it has to be a process outside the module graph.

## Re-derived 2026-09-10 — three ceilings moved, two left, one timeout raised

Three of the five ceilings had drifted red on `origin/main` (`075bdbab7`), and
for two causes that are both real work rather than measurement noise: the
eagerly-imported capability barrel grew as the surface grew, and the embedded
pack grew from 8 479 to 49 630 triples. This section re-derives all five by the
rules the sections above establish. It does not revise any measurement above —
those are the record of the boxes and artifacts they were taken on.

**Why this pass is manual.** It is not run by CI, by owner ruling 2026-08-30,
restated 2026-09-10: a wall-clock spawn measurement cannot be made to mean
anything on a shared runner, so the budgets are enforced by whoever runs
`bun run test:perf` on a quiet machine, and a regression can reach `main`
unobserved in between. Verified again here that nothing reaches the pass
indirectly — see "Durability of the ruling" at the end of this section.

### Environment

| | |
|---|---|
| OS / CPU | Linux 6.18.44 x86_64 · Intel Core Ultra 7 165U (14 threads) · 62 GB RAM |
| Runtime | `node` v24.18.1 (the runtime the entry ships for), `bun` 1.4.0, `vitest` 4.1.2 |
| Artifact | `dist/src/bin.js` — the `tsc` emit from `bun run build`, spawned as `node dist/src/bin.js`, exactly as `budgets.test.ts` does |
| Embedded pack | 49 630 triples / 4 167 entities (`contentHash 83746a38…`, generated 2026-09-08) |
| Surface | 22 capability modules (16 authored + 6 declared stories) · 42 MCP tools |

This is the same physical box as the "paired A/B" and "embedded pack becomes
the real graph" sections above, which is what licenses the within-box
comparisons below. It is **not** the day-1 reference box: its cold process
start is *faster* (`--version` median 34.8 ms here against the reference box's
45.5 ms), so where a reference-box projection is quoted it is a projection, not
an observation.

### Method, and the load gate that makes it honest

Protocol as prescribed above: interleaved round-robin over the cells, rotating
the start index each round so drift lands on every cell equally, 45 rounds with
5 discarded as warmups → **40 kept samples per cell**, fresh `XDG_*` dirs per
cell, and a `pragma --version` **control measured in the same run** so every
figure can be quoted net of process start.

The fast-path cells and the store cell were measured in **separate runs**.
Interleaving them is not free: with `__store-probe` in the rotation the
fast-path cells came out ~15 ms slower (help work 82.8 ms against 69.1 ms),
because a 500 ms store boot between two 100 ms spawns churns the page cache.
That is a measurement artifact, not a cost the user pays, so the cells that
share a statistic share a run.

**A repetition was accepted only if its own `--version` control had a median
at or below 40 ms.** This box's quiet band is a control median of 33–39 ms
(sample minimum ~26 ms); when other work is running it goes to 60–110 ms, and
the netted *work* figures then inflate superlinearly — help work ranged 66 ms
to 233 ms across repetitions, tracking nothing but the control. Netting alone
does not rescue a contended run, because a longer piece of work is more exposed
to contention (the same point the "multiplier, not the increment" argument
makes above). So contended repetitions are **discarded, not averaged in**:

| cells | repetitions run | accepted (control ≤ 40 ms) | rejected controls |
|---|---|---|---|
| fast paths | 9 | 5 | 40.8 · 42.4 · 60.5 · 110.0 ms |
| `__store-probe` | 7 | 4 | 44.5 · 60.2 · 71.4 ms |

Every figure below is the **median across accepted repetitions** of that
repetition's own statistic.

### Measured

| Cell | n | median | p95 | 10%-trimmed mean | work (net of control) |
|---|---|---|---|---|---|
| `pragma --version` (control) | 5 × 40 | **34.8 ms** | 43.3 ms | 35.9 ms | — |
| `pragma --help` | 5 × 40 | **103.3 ms** | 134.0 ms | 107.7 ms | 69.1 ms |
| `pragma __complete config` | 5 × 40 | 116.4 ms | 141.2 ms | 118.5 ms | 81.7 ms |
| `pragma __complete skill lookup do` | 5 × 40 | **115.7 ms** | 145.0 ms | 118.6 ms | 81.4 ms |
| `pragma __store-probe` | 4 × 40 | **536.0 ms** | 608.9 ms | 536.2 ms | 499.9 ms |
| project config load (warm, in-process) | 40 | **0.011 ms** | 0.034 ms | 0.013 ms | — |
| MCP `capabilities` (warm, in-process) | 40 | 0.506 ms | **0.732 ms** | 0.530 ms | — |

The two in-process cells were measured against the same `dist/` under `node`,
priming the cache / making one warm-up call first, exactly as
`budgets.test.ts` does.

### Where the fast paths' cost went

Almost all of it is one import. Timing a single dynamic `import()` of the
built modules and nothing else — 25 spawns per module, 5 discarded, three
repetitions:

| Module | import median | recorded in the A/B above |
|---|---|---|
| `capabilities/index.js` (the barrel) | **68.0 ms** | 37.6 ms |
| `constants.js` | 5.0 ms | — |

68.0 ms of import against 69.1 ms of measured `--help` work: the barrel **is**
the fast path now. It has gained **+30.4 ms (1.81×)** since the recovery A/B,
and the surface is where it went — 22 capability modules and 42 MCP tools, each
contributing its spec and formatter modules to a barrel that is imported
eagerly. Timed individually the heaviest are `prompt` (38.1 ms) and `graph`
(36.1 ms), but no single module dominates; the cost is the count.

**This is surface growth, not a lazy-boundary leak.**
`src/capabilities/lazy.test.ts` is green (9/9): nothing on the static graph from
`buildProgram` or `capabilities/index` value-imports
`@canonical/summon-core/projection`, its Commander adapter, `commander`, a zod
schema module, or a `collect*` run body. The deferral work recorded above still
holds; there is simply more behind it. A future cut has to come from making the
barrel itself lazy — registering capabilities from baked data the way
`CREATE_CLI_SYNTAX` already does for flag spellings — and not from another
round of moving run bodies.

### Where the store verb's cost went

The pack. `BUDGET_WARM_STORE_MS = 500` was derived against an 8 479-triple
embed; the distribution now embeds **49 630 triples / 4 167 entities**, 5.85×
the triples. Measured store work on this box went **+285.4 ms → +499.9 ms**,
a factor of **1.752** — sublinear in triple count, because boot loads the
n-quads dump rather than parsing TTL and rebuilds the schema from the
extraction artifact rather than running a live 7-pass compile. That design is
what keeps a 5.85× pack to a 1.75× cost, and it is worth saying that it worked.

### The arithmetic

**`BUDGET_HELP_MS`: 130 → 210.** Rule: 2× the measured median.

```
measured median (5 accepted reps × 40)   = 103.3 ms
rule                = 2 × 103.3          = 206.6 ms
ceiling             = ceil(206.6 / 10) × 10   = 210 ms
```

Cross-checked against the reference box, holding the measured work constant:
`45.5 + 69.1 = 114.6` ms median → 2× = **229 ms**. The projection is *looser*
than the local rule, so 210 is the tight side of the rule — the same
relationship 130 had to its own projection (~162 ms) when it was set.

**`BUDGET_COMPLETE_MS`: 150 → 240.** Rule: 2× the measured median of the
slower of the two cases, which is the name-source case.

```
measured median, __complete skill lookup do  = 115.7 ms
rule                = 2 × 115.7              = 231.4 ms
ceiling             = ceil(231.4 / 10) × 10   = 240 ms
sanity: 2 × trimmed mean = 2 × 118.6 = 237.2  → the same 240
```

Cross-check on the reference box: `45.5 + 81.4 = 126.9` ms → 2× = **254 ms**,
again looser. The noun case is now within a millisecond of the name-source case
(116.4 vs 115.7 median), where it used to be the faster of the two; the
filesystem walk is no longer what distinguishes them, the shared barrel is.

**`BUDGET_WARM_STORE_MS`: 500 → 850.** Rule: `ceil(projected p95 × 1.25 / 50) × 50`,
the route that produced 500, with one new input — the within-box growth
multiplier, both of whose terms were measured on this box under the same netted
protocol.

```
within-box growth multiplier  = 499.9 / 285.4                  = 1.752
reference store work, old pack = 101.5 × 2.83                   = 287.2 ms
reference store work, new pack = 287.2 × 1.752                  = 503.2 ms
projected reference median     = 45.5 + 503.2                   = 548.7 ms
reference p95/median, this command = 176 / 147                  = 1.197
projected p95                  = 548.7 × 1.197                  = 656.9 ms
ceiling                        = ceil(656.9 × 1.25 / 50) × 50   = 850 ms
```

The local-only route agrees to within 6%: this box's own measured p95 is
608.9 ms, and `ceil(608.9 × 1.25 / 50) × 50` = **800**. The reference-box
number is taken because that is the route the standing ceiling came from, and
because a ceiling derived only on the box in front of you is a ceiling that
moves with the box.

850 remains **1.55×** the projected median, still tighter than the 2×-of-median
rule the fast paths use. It is **2.83×** the designed `<300ms` target, where
500 was 1.67×, and that ratio is the honest headline of this whole
re-derivation: the `<300ms` target was set against a 23-triple sample, held
against 8 479, and cannot be reached at all by a 49 630-triple pack whose store
work alone is ~500 ms. `warmStoreVerb: "<300ms"` stays in the surface covenant
as the aspiration — but it is now an aspiration that needs a different boot
strategy (a lazily-materialised or partitioned store), not a tuning pass.

### Deliberately not moved

**`BUDGET_PROJECT_CONFIG_MS` stays 10 ms.** Warm median 0.011 ms, p95 0.034 ms
— about 900× of headroom. The 2×-median rule would give 0.02 ms, which would
assert nothing but scheduler jitter. 10 ms is a gross-regression guard (a cache
that stopped hitting) and that is the whole of its job.

**`BUDGET_MCP_P95_WARM_MS` stays 100 ms.** The warm call did grow with the
catalog — p95 0.732 ms and trimmed mean 0.530 ms over 42 tools, against
p95 ≈ 0.4 ms at 38 — but that is still ~137× of headroom. Worth noting as a
trend (the catalog's per-call overhead is not free) and not worth a tighter
number, for the same reason: a ceiling near a sub-millisecond median would
measure the scheduler.

### Summary

| Constant | Designed | Median | p95 | Old ceiling | New ceiling | Rule applied |
|---|---|---|---|---|---|---|
| `BUDGET_HELP_MS` | 50 (unmet) | 103.3 ms | 134.0 ms | 130 | **210** | 2× median = 206.6 |
| `BUDGET_COMPLETE_MS` | 50 (unmet) | 115.7 ms | 145.0 ms | 150 | **240** | 2× median = 231.4 |
| `BUDGET_PROJECT_CONFIG_MS` | 10 warm | 0.011 ms | 0.034 ms | 10 | **10** | left — 900× headroom |
| `BUDGET_WARM_STORE_MS` | 300 (unmet) | 536.0 ms | 608.9 ms | 500 | **850** | ceil(projected p95 × 1.25 / 50) × 50 |
| `BUDGET_MCP_P95_WARM_MS` | 100 | 0.506 ms | 0.732 ms | 100 | **100** | left — 137× headroom |

The designed 50 ms fast-path target and the designed 300 ms store target both
stay recorded as **designed and unmet**. Neither was moved.

### What was red on `main` before this change

Measured against `origin/main` `075bdbab7` with the ceilings it shipped:

| Case | Statistic asserted | Observed | Ceiling then |
|---|---|---|---|
| `warm store-backed verb` | median | 550.5 · 573.6 · 568.1 ms (three retries, all red) | 500 |
| `pragma --help` | p95 | 131.0 · 132.8 · 134.0 · 134.1 · 140.2 ms (every accepted repetition) | 130 |

`--help` is red on **p95 only** — its median, 103.3 ms, was still inside the
130 ms ceiling. That is worth stating precisely, because it means the ceiling
had already stopped being 2× a median and become roughly 1.25× one.
`__complete` was not red (its trimmed mean sat at ~119 ms against 150), so its
ceiling is raised here for consistency of derivation rather than to clear a
failure — the same rule, the same measurement, the same cause.

### How marginal the new ceilings are

The 40-sample figures above characterise the box; they are not the statistic
the tests assert. Replaying each case under **its own test's protocol** (`help`
15 runs/3 warmups → 12 kept; `__complete` 30/5 → 25 kept; `__store-probe`
12/3 → 9 kept, so its p95 is the maximum), repeatedly:

| Case | trials | median of medians | median p95 | worst asserted statistic | new ceiling |
|---|---|---|---|---|---|
| `--help` | 12 | 115.0 ms | 142.1 ms | p95 200.2 ms | 210 |
| `__complete skill lookup do` | 8 | 129.7 ms | 147.0 ms | trimmed mean 136.7 ms | 240 |
| `__store-probe` | 15 | 576.2 ms | 667.7 ms | p95 807.5 ms quiet · 1556.5 ms contended | 850 |

Two honest caveats fall out of that table.

1. **`--help` has the least room of the three.** It is the only case still
   asserted on a *raw* nearest-rank p95 at the bare ceiling, over 12 kept
   samples — where p95 is effectively the maximum. 200.2 of 210 was the worst
   of 12 replays. The available fix is the one `__complete` already got
   (enforce the trimmed mean, keep p95 as a soft check with headroom); it is
   **recorded here as an option, not taken**, because changing the statistic is
   a different decision from re-deriving the number, and this pass did the
   latter.
2. **A contended box will still go red**, and should. The `__store-probe`
   trial at p95 1556.5 ms was measured while other work was running; `retry: 2`
   gives three attempts, which is enough for a quiet box and deliberately not
   enough for a busy one. Check the control before believing a red run.

### The other time limit: vitest's per-test timeout

Raising `BUDGET_WARM_STORE_MS` did not make the pass green. It made the store
case fail on **vitest's 5 s per-test timeout** instead, with the budget
assertion passing underneath — precisely the outcome the 2026-08-30 banner
above records from the last attempt ("raising one of them moved the failure
from the budget to vitest's per-test timeout rather than clearing it").

The timeout had been too small all along, and was invisible because of the
order failures are reported in. Every spawn case is a **synchronous** test body
(`spawnSync` in a loop), so vitest cannot interrupt it; the body runs to
completion and whichever failure is noticed first is the one reported. While a
ceiling was red the `AssertionError` won that race, and the timeout never
surfaced. It was there in the numbers, though: the store case's own reported
duration on `origin/main` was 20 878 ms across three retries — ~6.9 s per
attempt against a 5 000 ms limit.

A budget case must fail on its **budget**, never on the clock: a red ceiling
tells you what regressed, a red clock tells you nothing. So `testTimeout` is
derived from the ceilings rather than picked, from the case that binds:

```
__store-probe   12 runs × 850 ms  = 10 200 ms    ← binding
__complete      30 runs × 240 ms  =  7 200 ms    (two cases)
--help          15 runs × 210 ms  =  3 150 ms
testTimeout = 2 × 10 200 ≈ 20 000 ms
```

The 2× is not headroom for slowness. It means every spawn in a run could land
at twice its ceiling and the ASSERTION would still be the thing that reports.
Whole-file runtime when healthy is ~17 s of tests, so this does not lengthen a
good run; it only changes what a bad one says. Set in `vitest.perf.config.ts`,
where the derivation is repeated next to the number.

**Verified green three times running** with the new ceilings and the new
timeout: 22/22 passed, 18.7 s / 19.5 s / 19.9 s, on a box whose control sat in
the quiet band. On `origin/main` the same command failed 21/22 with all three
store retries red.

### Durability of the ruling

Re-verified 2026-09-10, mechanically, that nothing reaches this pass:

- no file under `.github/` mentions `test:perf`, `vitest.perf.config`, or
  `perf` (the single `grep` hit is an unrelated comment in
  `actions/lerna-version/version.sh`);
- the package's `test` script is `check:packs:test && test:vitest`, and
  `vitest.config.ts` excludes `src/testing/perf/**`;
- `nx.json` declares no perf target, and its `test` default only
  `dependsOn: ["^build"]`;
- the repo has no `lefthook`, `husky`, or `.git/hooks` configuration;
- no script in the root or package `package.json` chains it.

The ruling is now restated where someone about to undo it will read it:
`vitest.perf.config.ts`'s header, `docs/CI.md` ("What CI deliberately does not
run"), and `AGENTS.md`'s "CI workflows are global" section. No test asserts the
*contents* of a workflow file, and none was added — this repo does not do that
anywhere, and a test that pins CI's shape from inside one package would be the
package-scoped CI concern `AGENTS.md` forbids.

Open question (1) from the 2026-08-30 banner — where the pass should run
instead — is **still open**, and this re-derivation makes it more pressing
rather than less: two of the three ceilings moved because real cost had
accumulated unobserved between one manual run and the next.
## 2026-09-10 — the first response-size budget for a list-shaped answer

`LIST_PAYLOAD_BUDGET_BYTES = 125_000`, enforced in
`src/capabilities/listBudget.shipped.exec.test.ts`.

Until this, no list carried a size budget. The five constants above are all
latency, not one of the enforced cases runs a story's list query, and the only
size ceiling in the package covered the MCP resource listing rather than a verb
— so a story's payload could grow without limit and nothing turned red. A list
is also the payload an agent pays for twice, once in transfer and once in the
context window it can no longer spend on the task.

**Measured, on this box, over the pack the distribution ships** (embedded pack
manifest as committed; every list-shaped body the configuration declares, run
through its compiled verb and measured where the payload is built — the `json`
formatter's output, re-serialised the way both machine surfaces send it, so the
figure is what crosses the wire and not what the indented formatter string
weighs):

| Body                       | rows at the default limit | bytes | rows unpaginated | bytes  |
| -------------------------- | ------------------------- | ----- | ---------------- | ------ |
| `block list`               | 252                       | 32,956 | 252             | 32,956 |
| `token list`               | 0                         | 2      | 0               | 2      |
| `modifier list`            | 11                        | 1,392  | 11              | 1,392  |
| `tier list`                | 15                        | 1,051  | 15              | 1,051  |
| `concept list`             | 4                         | 1,340  | 4               | 1,340  |
| `standard list`            | 147                       | 78,129 | 147             | 78,129 |
| `standard categories`      | 21                        | 689    | 21              | 689    |
| `implementation list`      | 90                        | 27,850 | 90              | 27,850 |
| `implementation libraries` | 4                         | 711    | 4               | 711    |

The two columns are the same number for every body, and that is the point: the
kernel's default page is **500 rows**, above every declared story's population,
so the arrival of `--limit`/`--after` truncates nothing. The day a story
outgrows one page the columns diverge, and the suite asserts both.

**The two maxima are the ones expected, and one of them reproduces exactly.**
The most ROWS is `block list` at 252 for 32,956 bytes — the same 252 / 32,986
recorded elsewhere, the 30-byte difference being the `{"ok":true,"data":…}`
envelope those figures included. The most BYTES is `standard list` at 78,129
over 147 rows, whose rows are fat rather than many; the same body measured
through the built CLI's `--format json` in the same session read 77,966 bytes
for the same 147 rows, and an earlier record 78,159. All three agree to 0.2 per
cent, which is the honest precision of "how big is this answer" across three
harnesses, and the budget is derived from the largest of them.

### Deriving 125,000

`1.6 × 78,129 = 125,006`, rounded down to `125,000`. Same shape of derivation as
the resource listing's own ceiling, which went 60,000 → 100,000 against a
measured 65,119 (1.54×) on 2026-09-01.

**The headroom the suite ENFORCES is 28 per cent, not 60.** The ceiling sits
1.6× above the largest measured answer, but the not-slack half of the assertion
is `expect(largest).toBeLessThan(LIST_PAYLOAD_BUDGET_BYTES * 0.8)` — it turns
red at 100,000 bytes, which is 1.28× the measured 78,129. So the effective gate
is tighter than the documented ceiling, and this document used to advertise the
looser number: 60 per cent was the distance to a bar nothing checks, 28 per cent
is the distance to the bar that goes red. It is still room for ordinary upstream
growth in the code-standards pack without a red bar on a pack bump. The same
assertion's other half holds the largest measured answer **above** a quarter of
the ceiling, so a budget that has stopped bounding anything cannot sit there
quietly either.

When it is next reached, the fix is not a bigger number — a ceiling raised on
demand is a formality. It is either a narrower default page for the story that
blew it (the kernel has no per-story page size today, deliberately: no declared
story needs one, and inventing the knob before there is a second answer is how
a grammar grows a field nobody can justify) or narrower columns, which trades an
honest surface for an arithmetic one and is the worse of the two.

### The row ceiling this budget implies

`MAX_LIST_WINDOW = 40_000`, in `src/kernel/packs/paging.ts`, is derived from this
number rather than from the store. Both halves of a page's window — the
`--limit` a caller passes and the offset a cursor carries — are emitted into the
generated query's own `LIMIT`/`OFFSET`, which the engine requires to fit a
32-bit integer while `Number.isInteger` admits anything up to 2^53. Unbounded,
`--limit 9007199254740991` reached the store and came back as a raw parse error
wrapped in `INTERNAL_ERROR` and "report this issue", which is the wrong answer
to a legitimate question asked too big.

The ceiling comes from the budget because the budget is a fact about the ANSWER,
where the engine's range is a fact about the pinned store. The narrowest row a
story can serialise is `{}` and its separating comma — three bytes — so an
answer of more than `125,000 / 3 = 41,666` rows cannot be inside the budget
whatever a story's columns are, and a limit that cannot produce a legal answer is
not a legal limit. Rounded down to 40,000: still 158× the largest population the
distribution ships (252) and 80× the default page. `listBudget.shipped.exec.test.ts`
asserts `MAX_LIST_WINDOW * 3 <= LIST_PAYLOAD_BUDGET_BYTES`, so the two numbers
cannot drift apart in silence.

The cursor's offset takes the same ceiling for a reason of its own. An offset is
a count of rows already answered, and a walk past 40,000 of them is walking a
population two orders of magnitude larger than any single legal answer — the
point at which the cursor to spend is a keyset cursor, which is what the
encoding's `v` field exists to allow. Until such a story exists, an offset that
large is a hand-edited token (the fingerprint covers the query and the arguments,
not the offset), and one typed `INVALID_INPUT` is the honest answer to both.

### Why it is not in the perf pass

`src/testing/perf/**` is not run by CI (owner ruling 2026-08-30), and a budget
nothing runs is not a gate. This one is a property of the payload rather than of
wall-clock time, so it needs neither the serial pass nor the spawned binary: it
lives in the ordinary suite, where the payload is built, exactly as the resource
listing's ceiling does.

### No latency constant moves

Compiling a story's filters into its query replaces one full-population read
plus a row scan with one narrowed read, and pagination replaces the tail of that
read with nothing; the storeless fast paths (`--help`, `__complete`,
`--version`) gain two `ParamSpec` literals per list-shaped verb and no new
module — `paging.ts` carries the default and no hash, and the cursor codec that
does hash is reached only from a run body. `bun run test:perf` stays green at
its existing ceilings.

---

## 2026-09-10 — the tool catalogue at 49 tools, and the ceiling now binds

Adding the token-graph nouns took the catalogue from 43 to **49 tools**, and the
`condensedSDL` figure recorded above is badly stale. Re-measured the same way
the assertion measures it (name + description + `inputSchema` per tool, joined,
at ~4 chars/token, over the live in-process MCP catalogue):

| When              | Tools | Chars  | ≈ Tokens | % of the 8000 ceiling |
| ----------------- | ----- | ------ | -------- | --------------------- |
| PR7 record        | 38    | 11 068 | 2 767    | 35%                   |
| Before this work  | 43    | 21 733 | 5 434    | **68%**               |
| After this work   | 49    | 29 277 | 7 320    | **91%**               |

Three things to take from it.

**The catalogue was already the binding constraint before this work.** The 35%
figure invited "there is room for about fifteen more tools"; the real headroom
at 43 tools was about four. The 2 767-token record was taken when descriptions
were terse and has not been re-taken through five subsequent surfaces.

**Input schemas outweigh descriptions**, 17 029 characters against 11 316 across
the whole catalogue. A filter is therefore not free even when its description is
one short sentence: it adds a property, a type and a doc string to the schema.
`variable list`, at eight flags, is the single largest entry in the catalogue at
1 119 characters.

**Every description added by this work was cut back once against this
measurement**, twice for the fattest two, which recovered about 370 tokens. What
is left is load-bearing: that a variable is addressed without its leading
dashes, that only materialised positions appear in `token values`, that 236
variables stand for no symbol. Removing those sentences would buy single-digit
percentages and cost the misuse they prevent.

**The next few tools breach the ceiling**, and the fix is not a bigger number
without a decision behind it. The honest options are to trim the pre-existing
43 (where the `create` family and `setup` are the four fattest entries), to
raise the ceiling against a measurement of what a real client actually spends,
or to stop adding tools. That is an owner call, not a budget edit, so this
record states the position rather than moving the constant.

The measurement is a pure character count, so it stays where it is — a
deterministic assertion in the eval harness rather than the serial perf pass.
No latency constant moves: declaring stories remains measurably free, and this
work adds no module to any fast path.
