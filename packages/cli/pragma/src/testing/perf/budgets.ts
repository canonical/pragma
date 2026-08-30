/**
 * Performance budgets for the compiled `pragma` binary.
 *
 * The ceilings the protected budget tests assert against. The surface
 * covenant's designed target for `--help`/`__complete` is 50 ms; the day-1 perf
 * spike (commit 6) found that unrealistic on the build hardware (cold Bun
 * process start alone is ~45 ms here), so — per the plan — those ceilings are
 * set to roughly 2× the measured median rather than silently weakening the
 * target. {@link BUDGET_WARM_STORE_MS} is derived differently (from a projected
 * p95, and it lands TIGHTER than 2× its median); its arithmetic is written out
 * in full in BUDGETS.md, as are the measurements and environment for all of
 * them.
 */

/** `pragma --help` ceiling (ms). Designed 50; measured median ~61 → 2×. */
export const BUDGET_HELP_MS = 130;

/** `pragma __complete …` ceiling (ms). Designed 50; measured median ~46 → 2×. */
export const BUDGET_COMPLETE_MS = 100;

/** Warm project-config (`pragma.config.ts`) load ceiling (ms). Cache hit is sub-ms. */
export const BUDGET_PROJECT_CONFIG_MS = 10;

/**
 * Warm store-backed verb ceiling (ms) — a store boot from the cached n-quads
 * dump plus a query, in the compiled binary.
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
 *
 * RE-DERIVED 2026-08-30 FOR THE CI RUNNER CLASS (owner ruling: raise the
 * ceiling here rather than merge past a red PROTECTED gate). The 500 above is
 * a projection onto a reference workstation, and it holds there — the same
 * commit measures 8/8 green locally, median ≈ 295 ms. It does not hold on the
 * GitHub-hosted runners, which are a slower class: three attempts of this test
 * (the `retry: 2` above, so three independent measurements) reported MEDIANS
 * of 696.3, 786.9 and 795.9 ms. The failure is environmental, not a
 * regression — it predates this branch, and #911 merged with the identical
 * failure — but a ceiling that is red on the machine that enforces it is not
 * protecting anything.
 *
 * Re-derived by this file's own method, from the worst observed median rather
 * than the best: p95 ≈ 795.9 × (176/147) ≈ 953 ms, applying the reference
 * box's own dispersion for this command; ceiling = `ceil(953 × 1.25 / 50) × 50`
 * = 1200. The 1.25× margin and the 50 ms rounding are unchanged, so the ONLY
 * input that moved is the measured median — which is the honest statement of
 * what changed: the hardware, not the code.
 *
 * A round 900 was considered and rejected as arithmetic theatre: it clears the
 * observed medians but not the p95 they imply, so it would have been red again
 * on the first unlucky run and re-raised. PARKED, deliberately: a runner-class
 * -conditional ceiling (tight locally, loose in CI) is the right long-term
 * shape and is not built here — a second constant needs a way to know which
 * box it is on, and inventing that inside an unrelated PR is how protected
 * values quietly stop protecting. The designed `<300ms` target is untouched.
 */
export const BUDGET_WARM_STORE_MS = 1200;

/**
 * Warm in-process MCP tool-call ceiling (ms) — PR7 graduates this from seeded to
 * ENFORCED. Measured over a warm, storeless tool (`capabilities`): pure envelope
 * + dispatch, no store boot, no network, so it isolates the per-call overhead of
 * the grown 38-tool catalog. Measured p95 is ~0.4 ms here (huge headroom), so
 * 100 ms guards against a gross regression without flaking. `info` is
 * deliberately NOT used — its network update-check makes it ~55 ms (see BUDGETS.md).
 */
export const BUDGET_MCP_P95_WARM_MS = 100;
