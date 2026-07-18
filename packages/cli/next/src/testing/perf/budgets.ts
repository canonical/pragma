/**
 * Performance budgets for the compiled `pragma2` binary.
 *
 * The ceilings the protected budget tests assert against. The surface
 * covenant's designed target for `--help`/`__complete` is 50 ms; the day-1 perf
 * spike (commit 6) found that unrealistic on the build hardware (cold Bun
 * process start alone is ~45 ms here), so — per the plan — each ceiling is set
 * to roughly 2× the measured median rather than silently weakening the target.
 * Measured numbers and environment are recorded in BUDGETS.md.
 */

/** `pragma2 --help` ceiling (ms). Designed 50; measured median ~61 → 2×. */
export const BUDGET_HELP_MS = 130;

/** `pragma2 __complete …` ceiling (ms). Designed 50; measured median ~46 → 2×. */
export const BUDGET_COMPLETE_MS = 100;

/** Warm project-config (`pragma.config.ts`) load ceiling (ms). Cache hit is sub-ms. */
export const BUDGET_PROJECT_CONFIG_MS = 10;
