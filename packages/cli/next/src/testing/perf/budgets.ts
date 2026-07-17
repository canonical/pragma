/**
 * Performance budgets for the compiled `pragma2` binary.
 *
 * Numbers are the ceilings the protected budget tests assert against. The
 * designed targets come from the surface covenant's `budgets` block; when the
 * day-1 perf spike (commit 6) finds a designed target unrealistic on the
 * build hardware, the spike replaces it with `2 × measured median` and records
 * the rationale in BUDGETS.md — never silently loosened.
 */

/** `pragma2 --help` cold-start ceiling (ms). Designed target: 50. */
export const BUDGET_HELP_MS = 50;

/** `pragma2 __complete …` cold-start ceiling (ms). Designed target: 50. */
export const BUDGET_COMPLETE_MS = 50;

/** Warm project-config (`pragma.config.ts`) load ceiling (ms). Designed: 10. */
export const BUDGET_PROJECT_CONFIG_MS = 10;
