/**
 * Performance budgets for the shipped `pragma` entry.
 *
 * The ceilings the protected budget tests assert against. The surface
 * covenant's designed target for `--help`/`__complete` is 50 ms; the day-1 perf
 * spike (commit 6) found that unrealistic on the build hardware (cold process
 * start alone is ~45 ms here), so — per the plan — those ceilings are set to
 * roughly 2× the measured median rather than silently weakening the target.
 *
 * A CEILING IS RELATIVE TO THE ARTIFACT IT WAS MEASURED ON. These were derived
 * against a `bun build --compile` executable. The distribution now ships
 * JavaScript that `node` executes, which costs roughly 2× on the fast paths, so
 * a ceiling set at 2× the binary's median lands at the emit's median — where it
 * cannot separate a regression from a slow runner. `__complete` proved that
 * exactly: three CI attempts at 100.15, 100.20 and 100.37 ms against a 100 ms
 * ceiling. Re-derived below on the same rule, against the artifact that now
 * ships; the designed 50 ms target is recorded as unmet rather than quietly
 * moved. {@link BUDGET_WARM_STORE_MS} is derived differently (from a projected
 * p95, and it lands TIGHTER than 2× its median); its arithmetic is written out
 * in full in BUDGETS.md, as are the measurements and environment for all of
 * them.
 */

/**
 * `pragma --help` ceiling (ms). Designed 50; compiled median was ~61 → 2×.
 *
 * Unchanged: the shipped entry measures ~72 ms locally and passed CI at this
 * ceiling, so it still has real headroom to lose.
 */
export const BUDGET_HELP_MS = 130;

/**
 * `pragma __complete …` ceiling (ms). Designed 50 — **not met, and recorded as
 * such**: the shipped entry cannot reach it, because node's own start is most
 * of that number before pragma runs a line.
 *
 * Compiled median was ~46 (ceiling 100 = 2×). The shipped entry measures ~69 ms
 * locally and ~100 ms as a CI trimmed mean, so 100 was the median, not a
 * ceiling. 150 restores the 2× rule against the artifact that ships and still
 * fails a 50 % regression from today — a gate rather than a rubber stamp.
 *
 * Completion is typed interactively, so this is the budget most worth pulling
 * back down. It is the one number this packaging change genuinely cost.
 */
export const BUDGET_COMPLETE_MS = 150;

/** Warm project-config (`pragma.config.ts`) load ceiling (ms). Cache hit is sub-ms. */
export const BUDGET_PROJECT_CONFIG_MS = 10;

/**
 * Warm store-backed verb ceiling (ms) — a store boot from the cached n-quads
 * dump plus a query, through the shipped entry.
 *
 * Re-derived when the embed became the distribution's real 8 479-triple graph
 * instead of a 23-triple sample. Netted against a `--version` control from the
 * SAME binary in the SAME run (this box's process start swings 60–287 ms with
 * page-cache state alone), the real pack's store work is 2.83× the sample's —
 * the median of five repetitions across two protocols. Projected onto the
 * reference box, whose own toy store work is 147 − 45.5 = 101.5 ms: 45.5 +
 * 101.5 × 2.83 ≈ 333 ms median, and 333 × (176/147) ≈ 398 ms p95 using the
 * reference box's own dispersion for this command. `ceil(398 × 1.25 / 50) × 50`
 * = 500 — which is 1.6× the projected median, i.e. tighter than the
 * 2×-of-median rule the ceilings above use. Every input, every step, and the
 * raw measurements are in BUDGETS.md; the designed `<300ms` target stays in the
 * surface covenant, exactly as the 50 ms `help` target survived its 130 ms
 * ceiling.
 */
export const BUDGET_WARM_STORE_MS = 500;

/**
 * Warm in-process MCP tool-call ceiling (ms) — PR7 graduates this from seeded to
 * ENFORCED. Measured over a warm, storeless tool (`capabilities`): pure envelope
 * + dispatch, no store boot, no network, so it isolates the per-call overhead of
 * the grown 38-tool catalog. Measured p95 is ~0.4 ms here (huge headroom), so
 * 100 ms guards against a gross regression without flaking. `info` is
 * deliberately NOT used — its network update-check makes it ~55 ms (see BUDGETS.md).
 */
export const BUDGET_MCP_P95_WARM_MS = 100;
