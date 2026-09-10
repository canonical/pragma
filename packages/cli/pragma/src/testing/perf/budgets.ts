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
 *
 * A CEILING IS ALSO RELATIVE TO WHAT THE SURFACE HAS GROWN INTO. Re-derived
 * again 2026-09-10, because three of the five had drifted red for two causes,
 * both of them real work rather than noise: the eagerly-imported capability
 * barrel grew 37.6 → 68.0 ms as the surface reached 22 capability modules and
 * 42 MCP tools, and the embedded pack grew 8 479 → 49 630 triples. Every
 * constant below names its cause, because a raised ceiling with no cause is
 * just a lower standard. The two in-process ceilings were re-measured and
 * DELIBERATELY LEFT ALONE — they have three orders of magnitude of headroom.
 *
 * THIS PASS IS NOT RUN BY CI — owner ruling 2026-08-30, restated 2026-09-10.
 * Nothing reaches it indirectly either: `test` does not chain it, no Nx target
 * or workflow names it, and the repo has no git hooks. See
 * `vitest.perf.config.ts`, `docs/CI.md` and BUDGETS.md.
 *
 * EVERY CEILING HERE IS LATENCY. The one SIZE budget the package enforces on a
 * verb — a list-shaped answer's payload — deliberately does not live here: it
 * is a property of the payload rather than of wall-clock time, so it needs
 * neither the serial pass nor the spawned binary, — and a budget nothing
 * runs is not a gate. It sits where the payload is built, in
 * `capabilities/listBudget.shipped.exec.test.ts`, as the MCP resource
 * listing's own ceiling does in `capabilities/resources/resources.test.ts`.
 */

/**
 * `pragma --help` ceiling (ms). Designed 50 — **not met, and recorded as such**
 * for the same reason as {@link BUDGET_COMPLETE_MS}: node's own start is most
 * of that number before pragma runs a line. The rule is 2× the measured median.
 *
 * Up from 130, re-derived 2026-09-10. 130 *was* the rule's own number, back
 * when this path's work was 35.3 ms net of process start; it is not any more.
 * The eagerly-imported capability barrel (`capabilities/index`) now costs
 * **68.0 ms** to import where the recovery A/B measured 37.6 — the surface
 * grew to 22 capability modules and 42 MCP tools, and each one puts its spec +
 * formatter modules on this path. `lazy.test.ts` is green, so this is SURFACE
 * GROWTH and not a lazy-boundary leak: summon-core's projection, its Commander
 * adapter, `commander`, zod and oxigraph are all still absent from the
 * fast-path graph. The barrel import is now essentially the whole of the cost
 * (68.0 of 69.1 ms), which is where any future cut has to come from.
 *
 * MEASURED (2026-09-10; five load-gated repetitions × 40 kept samples,
 * interleaved with an in-run `--version` control of 34.8 ms): median
 * **103.3 ms**, p95 134.0 ms, work **69.1 ms** net of the control.
 * `2 × 103.3 = 206.6`, so **210**. The reference-box projection cross-checks
 * LOOSER, not tighter — `45.5 + 69.1 = 114.6` median → 2× = 229 — so 210 is
 * the tight side of the rule, exactly as 130 was.
 *
 * What this can and cannot separate: at 210 against a 103 ms median it catches
 * a doubling of the path and no longer catches the ~30 ms the barrel just
 * gained. It is asserted on median AND raw p95 over 12 kept samples, where a
 * nearest-rank p95 is effectively the maximum — the worst of 12 protocol
 * replays here was 200.2 ms, so it holds but without much room. BUDGETS.md
 * carries the table, the environment, and that flake characterisation.
 */
export const BUDGET_HELP_MS = 210;

/**
 * `pragma __complete …` ceiling (ms). Designed 50 — **not met, and recorded as
 * such**: the shipped entry cannot reach it, because node's own start is most
 * of that number before pragma runs a line.
 *
 * Up from 150, re-derived 2026-09-10, and for the same single cause as
 * {@link BUDGET_HELP_MS} — completion pays for the same grown capability
 * barrel. It still sheds Commander (nothing on the `__complete` closure
 * imports it), and it still costs ~12 ms more than `--help` because it walks
 * the grammar and, in the name-source case, the skills directory.
 *
 * MEASURED in the same runs, on the SLOWER of the two cases
 * (`__complete skill lookup do`): median **115.7 ms**, 10%-trimmed mean
 * 118.6 ms, p95 145.0 ms, work 81.4 ms net of the control. The noun case
 * (`__complete config`) is median 116.4 / trimmed mean 118.5 ms — the two are
 * now within a millisecond of each other. `2 × 115.7 = 231.4`, so **240**;
 * 2× the trimmed mean gives 237.2, the same 240. The reference-box projection
 * again cross-checks looser (`45.5 + 81.4 = 126.9` → 2× = 254), so 240 is the
 * tight side of the rule.
 *
 * The ceiling is enforced on the trimmed mean, with p95 kept as a SOFT signal
 * at 1.5× — the statistic change made in the p95-stabilization work, which is
 * unaffected by this re-derivation. Worst trimmed mean across 8 protocol
 * replays here: 136.7 ms, so 240 is not a marginal ceiling.
 *
 * Completion is typed interactively, so this stays the budget most worth
 * defending, and it has now lost 90 ms of standard across two re-derivations
 * with nothing bought back. See BUDGETS.md.
 */
export const BUDGET_COMPLETE_MS = 240;

/**
 * Warm project-config (`pragma.config.ts`) load ceiling (ms). Cache hit is
 * sub-ms.
 *
 * RE-MEASURED 2026-09-10 and deliberately UNCHANGED: 40 warm
 * `evaluateProjectConfig` calls after priming the content-hash cache give a
 * median of **0.011 ms** and a p95 of 0.034 ms — roughly 900× of headroom. The
 * 2×-median rule would put this at 0.02 ms, which would assert nothing but
 * scheduler jitter. 10 ms is a gross-regression guard (a cache that stopped
 * hitting, an import that stopped being cached) and that is all it is for.
 */
export const BUDGET_PROJECT_CONFIG_MS = 10;

/**
 * Warm store-backed verb ceiling (ms) — a store boot from the cached n-quads
 * dump plus a query, through the shipped entry.
 *
 * Up from 500, re-derived 2026-09-10. The cause is the pack, not the code: the
 * embed went from the 8 479-triple graph the 500 was derived against to
 * **49 630 triples / 4 167 entities** (5.85× the triples). Boot still loads
 * the n-quads dump rather than parsing TTL and still rebuilds the schema from
 * the extraction artifact rather than running a live 7-pass compile, which is
 * why the cost grew 1.75× and not 5.85×.
 *
 * The arithmetic, on the same route that produced 500, with one new input —
 * the within-box growth multiplier. This box's netted real store work was
 * +285.4 ms against the 8 479-triple pack (five repetitions, recorded in
 * BUDGETS.md) and is +499.9 ms against this one (four load-gated repetitions
 * × 40 kept samples, 2026-09-10), so:
 *
 * ```
 * within-box growth multiplier  = 499.9 / 285.4                = 1.752
 * reference store work (old pack) = 101.5 × 2.83               = 287.2 ms
 * reference store work (new pack) = 287.2 × 1.752              = 503.2 ms
 * projected reference median      = 45.5 + 503.2               = 548.7 ms
 * reference p95/median, this command = 176 / 147               = 1.197
 * projected p95                   = 548.7 × 1.197              = 656.9 ms
 * ceiling = ceil(656.9 × 1.25 / 50) × 50                       = 850 ms
 * ```
 *
 * The local-only route agrees to within 6%: this box's own measured p95 is
 * 608.9 ms and `ceil(608.9 × 1.25 / 50) × 50` = 800. The reference-box number
 * is taken, because that is the route the standing ceiling came from.
 *
 * 850 is still **1.55×** the projected median, i.e. tighter than the
 * 2×-of-median rule the fast paths use. But it is now **2.83×** the designed
 * `<300ms` target, where 500 was 1.67× — and that gap is the honest headline:
 * the designed target was set against a 23-triple sample and then held against
 * 8 479, and a 49 630-triple pack whose store work alone is ~500 ms cannot
 * reach 300 ms at all. `warmStoreVerb: "<300ms"` stays in the surface covenant
 * as the aspiration, and it is now an aspiration that needs a different boot
 * strategy rather than a tuning pass. Every input and every step is in
 * BUDGETS.md.
 *
 * What this can and cannot separate: asserted on median AND p95 over 9 kept
 * samples, where a nearest-rank p95 IS the maximum — kept deliberately,
 * because this excess is real work rather than contention noise, and hiding
 * real cost behind a robust statistic would make the budget lie.
 */
export const BUDGET_WARM_STORE_MS = 850;

/**
 * Warm in-process MCP tool-call ceiling (ms) — PR7 graduates this from seeded to
 * ENFORCED. Measured over a warm, storeless tool (`capabilities`): pure envelope
 * + dispatch, no store boot, no network, so it isolates the per-call overhead of
 * the grown tool catalog. `info` is deliberately NOT used — its network
 * update-check makes it ~55 ms (see BUDGETS.md).
 *
 * RE-MEASURED 2026-09-10 and deliberately UNCHANGED. The catalog has grown
 * 38 → 42 tools and the warm call grew with it — p95 **0.732 ms**, trimmed
 * mean 0.530 ms over 40 calls, against ~0.4 ms p95 at 38 tools — but that is
 * still ~137× of headroom under 100 ms. This is a gross-regression guard (a
 * per-call store boot, a network read, a catalog rebuilt per call), and 100 ms
 * is what lets it be one without flaking. Enforced on the trimmed mean with
 * p95 as a second check (both ≤ 100).
 */
export const BUDGET_MCP_P95_WARM_MS = 100;
