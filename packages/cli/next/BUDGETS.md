# Performance budgets — `pragma2`

The compiled binary must stay fast enough that agents and humans reach for it
without hesitation. These budgets are enforced by the protected perf tests
(`src/testing/perf/*`), which spawn the standalone `dist/pragma2` binary,
discard warmups, and assert median/p95 against the ceilings in
`src/testing/perf/budgets.ts`.

## Designed targets (surface covenant)

| Path                         | Designed target |
| ---------------------------- | --------------- |
| `pragma2 --help`             | < 50 ms         |
| `pragma2 __complete …`       | < 50 ms         |
| project `pragma.config.ts`   | < 10 ms warm    |
| warm store-backed verb       | < 300 ms        |
| MCP p95 (warm)               | < 100 ms        |

## Measured (day-1 perf spike, commit 6)

Environment: Linux x64, Bun v1.3.11, `bun build --compile --minify`
(`dist/pragma2`). Method: `measureCommand` spawns the standalone binary 30×,
discards 3 warmups, reports median/p95 of wall-clock time. The budget tests
(un-skipped, `retry: 2`) re-measure 15 spawns (3 warmups) and assert median +
p95 against the ceilings below.

| Path                       | Median  | p95     | Budget  | Basis                     |
| -------------------------- | ------- | ------- | ------- | ------------------------- |
| `pragma2 --version` (cold) | 45.5 ms | 50.1 ms | —       | reference (cold start)    |
| `pragma2 --help`           | 61.0 ms | 66.1 ms | 130 ms  | 2× median (50 ms target)  |
| `pragma2 __complete`       | 46.1 ms | 51.3 ms | 100 ms  | 2× median (50 ms target)  |
| `config show`              | 63.5 ms | 68.9 ms | —       | reference (storeless run) |
| project config load (warm) | < 1 ms  | < 1 ms  | 10 ms   | cache hit (in-process)    |
| `__store-probe` (store)    | ~147 ms | ~176 ms | 300 ms  | designed (~2× median)     |

The store-backed verb budget (`__store-probe`: oxigraph WASM load + n-quads
cache load + `compileFromExtraction` + a SPARQL count, in the compiled binary)
measures ~147 ms median here — already ~2× under the designed 300 ms, so unlike
`--help`/`__complete` the designed target holds without relaxation. Boot loads
the n-quads dump (no TTL parse) and rebuilds the schema from the extraction
artifact (no live 7-pass compile), which is what keeps it in budget.

The designed 50 ms target for `--help`/`__complete` proved unrealistic here:
cold Bun process start alone (`--version`) is ~45 ms, leaving no headroom for
the ~15 ms of command-tree work. Per the plan, each ceiling is set to roughly
`2 × measured median` and the substitution recorded here rather than weakening
the assertion silently. The 50 ms target is retained as the aspiration in the
surface covenant's `budgets` block; a faster runtime or a lighter start closes
the gap.

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
