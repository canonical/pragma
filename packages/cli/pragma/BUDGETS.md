# Performance budgets — `pragma`

The compiled binary must stay fast enough that agents and humans reach for it
without hesitation. These budgets are enforced by the protected perf tests
(`src/testing/perf/*`), which spawn the standalone `dist/pragma` binary,
discard warmups, and assert median/p95 against the ceilings in
`src/testing/perf/budgets.ts`.

## Designed targets (surface covenant)

| Path                         | Designed target |
| ---------------------------- | --------------- |
| `pragma --help`             | < 50 ms         |
| `pragma __complete …`       | < 50 ms         |
| project `pragma.config.ts`   | < 10 ms warm    |
| warm store-backed verb       | < 300 ms        |
| MCP p95 (warm)               | < 100 ms        |
| condensed SDL (tool catalog) | ≤ 8000 tokens   |

## Measured (day-1 perf spike, commit 6)

Environment: Linux x64, Bun v1.3.11, `bun build --compile --minify`
(`dist/pragma`). Method: `measureCommand` spawns the standalone binary 30×,
discards 3 warmups, reports median/p95 of wall-clock time. The budget tests
(un-skipped) re-measure a batch of spawns and assert against the ceilings below.

**The measured numbers below, and the ceilings derived from them, reference this
day-1 spike hardware (treated as the CI reference box).** A slower box shifts the
whole distribution up; the ceilings are the covenant, not the observations.

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
gross regression. `BUDGET_COMPLETE_MS` stays **100 ms** — the ceiling is
unchanged; only the statistic it is asserted against was made reliable.

| Path                       | Median  | p95     | Budget  | Basis                     |
| -------------------------- | ------- | ------- | ------- | ------------------------- |
| `pragma --version` (cold) | 45.5 ms | 50.1 ms | —       | reference (cold start)    |
| `pragma --help`           | 61.0 ms | 66.1 ms | 130 ms  | 2× median (50 ms target)  |
| `pragma __complete`       | 46.1 ms | 51.3 ms | 100 ms  | 2× median (50 ms target)  |
| `config show`              | 63.5 ms | 68.9 ms | —       | reference (storeless run) |
| project config load (warm) | < 1 ms  | < 1 ms  | 10 ms   | cache hit (in-process)    |
| `__store-probe` (store)    | ~147 ms | ~176 ms | 500 ms  | re-derived (see below)    |

The store-backed verb budget (`__store-probe`: oxigraph WASM load + n-quads
cache load + `compileFromExtraction` + a SPARQL count, in the compiled binary)
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

**Also measured — the per-invocation start tax.** The real embed makes the
binary ~2.0 MB bigger (104.8 → 106.8 MB), and `bun build --compile` emits one
script, so the whole embed is *parsed* at process start on every invocation even
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
| `condensedSDL` | 2767 tokens (38 tools)       | 8000 tokens  | eval/coverage        |

Confirmed by the spike:

- **help path imports no zod / no run body** — the module-graph probe
  (`src/capabilities/lazy.test.ts`) walks the static import graph from
  `buildProgram` and `capabilities/index` and asserts neither reaches a zod
  schema module nor any `collect*` run body (those are dynamic-imported).
- **`__complete` is storeless** — resolved from the grammar alone
  (`complete.test.ts`), no config or store read.
- **project config is served warm** — `evaluateProjectConfig` returns the
  content-hash cache on a hit without re-importing (`readConfig.test.ts`), and
  the compiled binary evaluates an external `pragma.config.ts` natively (D7
  verified — no subprocess fallback needed).

## Stories in packs — no budget movement (A/B, control-netted)

Moving the distribution's five read stories out of `src/capabilities/*/pack.ts`
and into `pragma.conf.ts` is a MOVE, not an addition: the same five
`compilePack` calls run at module load and the same object literal is parsed,
from one file instead of five. The package tier adds one small read
(`stories.json` off the answering pack) on the DISPATCH path only, from its own
generated module — never `pack.generated.ts`, whose ~1.9 MB of n-quads on the
dispatch path measured **+28 ms on every command** when it was tried.

Measured by round-robin over two compiled binaries built the same way (this
branch vs. its parent commit), 30 rounds, `env -i` with a fresh `HOME`/`XDG_*`
in an empty cwd, on a box at load ≈ 2.0. Absolute figures are inflated relative
to the reference box by the load and the harness; the CONTROL-NETTED delta (each
case minus that binary's own `pragma --version` median) is the comparison:

| Case                              | base median | new median | control-netted Δ |
| --------------------------------- | ----------- | ---------- | ---------------- |
| `--version` (control)             | 92.0 ms     | 92.6 ms    | —                |
| `--help`                          | 123.8 ms    | 125.0 ms   | +0.5 ms          |
| `__complete -- block lookup Butt` | 122.8 ms    | 121.2 ms   | −2.3 ms          |
| `config show` (dispatch)          | 149.1 ms    | 149.3 ms   | −0.5 ms          |

Two of the three deltas are negative, which is the signature of noise rather
than a cost. **No budget constant changes**; `bun run test:perf` is 8/8 green.
