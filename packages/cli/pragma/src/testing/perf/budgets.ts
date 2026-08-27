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
 * `pragma --help` ceiling (ms). Designed 50; the rule is 2× the measured median.
 *
 * Down from the provisional 220, which covered the create surface's eager
 * registration imports on the capabilities barrel. Those are gone — the
 * registered flag spellings are baked into `createSurface.generated.ts` at
 * build time, the mount's adapter loads behind `CliProjection.prepare()`, and
 * the bare-help path no longer loads Commander at all — and the lazy-graph
 * guard in `lazy.test.ts` pins all three so the cost cannot creep back
 * silently.
 *
 * MEASURED, paired: the pre-refactor tree and this one were each built and
 * spawned alternately, 40 kept samples per cell, so drift on a shared box hits
 * both arms. Median 74.6 → 64.7 ms; net of each arm's own `--version` control,
 * the work this path does went 49.3 → 35.3 ms (−28%). 2 × 64.7 = 129.5, so
 * 130 is the rule's own number rather than a number the rule tolerates. It is
 * also where this path sat before the regression. BUDGETS.md carries the full
 * table, the reference-box projection, and why this is the floor.
 */
export const BUDGET_HELP_MS = 130;

/**
 * `pragma __complete …` ceiling (ms). Designed 50 — **not met, and recorded as
 * such**: the shipped entry cannot reach it, because node's own start is most
 * of that number before pragma runs a line.
 *
 * Down from the provisional 220 for the same reason as {@link BUDGET_HELP_MS}:
 * the eager create-surface imports both fast paths paid for are deferred, and
 * completion additionally sheds Commander — nothing on the `__complete`
 * closure imports it any more.
 *
 * MEASURED in the same paired run: median 79.1 → 69.2 ms for the noun case and
 * 74.2 → 69.3 ms for the name-source case; net of the control, 53.7 → 39.7 ms
 * and 48.9 → 39.8 ms.
 *
 * 2× the slower median is 138.5, BELOW this 150 — and it stays 150 anyway,
 * because a ceiling is relative to the box as well as the artifact. This box's
 * cold start is 25–30 ms against the reference box's 45.5; projecting the
 * measured work onto the reference box gives a ~85 ms median, whose 2× is
 * ~170. CI has already run this path at a ~100 ms trimmed mean. Cutting to 140
 * on a local median would be deriving a ceiling on hardware the suite does not
 * run on. Completion is typed interactively, so this stays the budget most
 * worth defending — see BUDGETS.md for the arithmetic.
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
