/**
 * Performance budgets for the compiled `pragma` binary.
 *
 * The ceilings the protected budget tests assert against. The surface
 * covenant's designed target for `--help`/`__complete` is 50 ms; the day-1 perf
 * spike (commit 6) found that unrealistic on the build hardware (cold Bun
 * process start alone is ~45 ms here), so — per the plan — each ceiling is set
 * to roughly 2× the measured median rather than silently weakening the target.
 * Measured numbers and environment are recorded in BUDGETS.md.
 */

/** `pragma --help` ceiling (ms). Designed 50; measured median ~61 → 2×. */
export const BUDGET_HELP_MS = 130;

/** `pragma __complete …` ceiling (ms). Designed 50; measured median ~46 → 2×. */
export const BUDGET_COMPLETE_MS = 100;

/** Warm project-config (`pragma.config.ts`) load ceiling (ms). Cache hit is sub-ms. */
export const BUDGET_PROJECT_CONFIG_MS = 10;

/**
 * Warm store-backed verb ceiling (ms) — a store boot from the cached n-quads
 * dump plus a query, in the compiled binary. The designed 300 ms holds: the
 * measured median (`__store-probe`) is ~150 ms here, so 300 is already ~2× the
 * measured median and needs no relaxation (see BUDGETS.md).
 */
export const BUDGET_WARM_STORE_MS = 300;

/**
 * Warm in-process MCP tool-call ceiling (ms) — PR7 graduates this from seeded to
 * ENFORCED. Measured over a warm, storeless tool (`capabilities`): pure envelope
 * + dispatch, no store boot, no network, so it isolates the per-call overhead of
 * the grown 38-tool catalog. Measured p95 is ~0.4 ms here (huge headroom), so
 * 100 ms guards against a gross regression without flaking. `info` is
 * deliberately NOT used — its network update-check makes it ~55 ms (see BUDGETS.md).
 */
export const BUDGET_MCP_P95_WARM_MS = 100;
