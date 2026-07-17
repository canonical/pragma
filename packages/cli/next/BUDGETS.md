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

## Measured (this hardware)

_Populated by the day-1 perf spike (commit 6). Until then the budget tests are
skipped and the numbers below are placeholders._

| Path                       | Median | p95 | Budget | Basis |
| -------------------------- | ------ | --- | ------ | ----- |
| `pragma2 --help`           | TBD    | TBD | TBD    | TBD   |
| `pragma2 __complete`       | TBD    | TBD | TBD    | TBD   |
| project config load (warm) | TBD    | TBD | TBD    | TBD   |

When a designed target proves unrealistic on the build hardware, the spike
sets the budget to `2 × measured median` and records the substitution here
rather than weakening the assertion silently.
