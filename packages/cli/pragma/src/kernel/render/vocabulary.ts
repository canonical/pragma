/**
 * The rendering vocabulary — the ONE place a state and the word for it meet.
 *
 * `doctor` reports states, `setup` plans and applies them, and both speak to
 * the same reader about the same machine. For as long as each surface spelled
 * the states itself — three glyph tables, two scope-label maps, two indent
 * constants — the type layer and the copy layer were free to disagree, and a
 * copy pass could rename a scope in every sentence while the model underneath
 * kept the old word. This module ends that freedom: the statuses, their
 * glyphs, the scope names, and the shared layout markers are each defined
 * once, here, and every renderer reads them.
 *
 * The SCOPES are **global** and **local project**, chosen because they are the
 * words the user already typed: `--global` and `--local`. Reading `Local
 * project` above a row whose fix is `pragma setup mcp --local` is the whole
 * point — the report names the flag that repairs it. (Earlier these surfaces
 * said MACHINE/PROJECT, and later "global band"/"project band": a third and a
 * fourth term for the same two things, and "band" is a word nobody outside
 * this repository has ever used for a config scope.)
 *
 * The GLYPHS are one small alphabet with fixed meanings, so the same mark
 * never says two things: `✓` is work done or verified, `✗` is a real fault,
 * `◇` is available-but-not-set-up, `○` is inert (nothing to act on), and `·`
 * is neutral punctuation — a sub-item bullet, or a row that never ran. Doctor
 * and setup map their own status tiers onto that alphabet below, which is what
 * keeps a failed setup row and a failed doctor row — the same finding seen
 * twice — wearing the same mark.
 *
 * This is the RENDERING vocabulary; the graph-domain vocabulary a distribution
 * declares (`kernel/vocabulary.ts`) is a different thing with the same good
 * reason for existing. Like the rest of `kernel/render/`, this module is
 * statically reachable from the `--help`/`__complete` fast paths, so it
 * imports NOTHING — it is inert data plus two pure one-line functions.
 */

// =============================================================================
// Scopes
// =============================================================================

/**
 * One of the two config scopes: the per-user/home `global` scope or the
 * per-repository `project` scope. Mirrors `@canonical/harnesses`' `ScopeBand`
 * STRUCTURALLY (pinned by `scopeTypeSync.test.ts`) but is declared here so the
 * statically-reachable type modules never pull the harnesses runtime onto the
 * fast-path module graph — and under pragma's own name for the concept, the
 * one the `--global`/`--local` flags and every rendered sentence use.
 */
export type Scope = "project" | "global";

/**
 * The resolved scope selection: which scope(s) a run touches. `global` is the
 * DEFAULT — the user/home scope a machine-level installer configures;
 * `project` is the opt-in per-repository scope; `both` is the explicit "run
 * each scope in one invocation". Structurally mirrors the harnesses
 * `ScopeSelection` (same pin).
 */
export type ScopeSelection = Scope | "both";

/** The user-facing display label for each of the two config scopes. */
export const SCOPE_LABELS: Record<Scope, string> = {
  global: "Global",
  project: "Local project",
};

/**
 * The scope phrase in running text — the lowercase form of
 * {@link SCOPE_LABELS}, plus the word for "both". Authored here rather than
 * lowercased at the call site so a reader grepping for either spelling lands
 * in one file.
 */
export const SCOPE_PHRASES: Record<ScopeSelection, string> = {
  global: "global",
  project: "local project",
  both: "global and local project",
};

// =============================================================================
// The glyph alphabet
// =============================================================================

/**
 * The five marks, by meaning. Uncolored — every glyph is tinted at render
 * time, never baked at module load. `summon-core`'s Ink wizard renders the
 * same `success`/`failure` marks for the same meanings; the two packages
 * cannot share this module (the dependency runs the other way, and the
 * fast-path covenants forbid the import), so `renderVocabularySync.test.ts`
 * pins the two alphabets to byte equality instead.
 */
export const GLYPHS = {
  /** Work done, or a state verified healthy. */
  success: "✓",
  /** A real fault — something set up that no longer works, or a failed row. */
  failure: "✗",
  /** Detected and installable, but not set up — an invitation, not a fault. */
  available: "◇",
  /** Inert: nothing to act on here, and nothing wrong either. */
  inert: "○",
  /** Neutral punctuation — a sub-item bullet, or a row that never ran. */
  neutral: "·",
} as const;

/** The arrow in front of an inline instruction (`↳ fix: …`). */
export const FIX_ARROW = "↳";

/** The bullet a check's indented sub-items carry. */
export const SUB_BULLET = GLYPHS.neutral;

/**
 * The marker for a row that carries NO outcome — one the user deselected, so
 * it was neither done nor skipped-for-cause. It must not be a ✓: a green check
 * against work that never ran is the same lie the old recap told when it
 * reported "Setup complete" over a target it had dropped.
 */
export const NOT_RUN_GLYPH = GLYPHS.neutral;

// =============================================================================
// Indents
// =============================================================================

/** One indent step — every list body row starts two spaces in. */
export const INDENT = "  ";

/**
 * The indent that aligns a check's sub-lines under its name: the row's own
 * {@link INDENT}, plus one glyph column, plus the two-space gap after it.
 */
export const SUB_INDENT = "     ";

// =============================================================================
// Doctor's status tiers
// =============================================================================

/**
 * Status of a doctor check or one of its sub-items.
 *
 * `available` is the tier between fail and skip that keeps the report honest:
 * an opt-in integration (MCP registration, skills symlinks, a completion
 * script) that is detected and installable but that the user has not set up.
 * Nothing is broken — a fresh install is HEALTHY with several availables — so
 * reporting these as `fail` would teach users that the failure count is noise.
 * `fail` stays reserved for a real fault: something set up that no longer
 * works, or an environment the CLI cannot run correctly in. `skip` remains
 * "nothing to check here" (no shell detected, no harnesses present).
 */
export type CheckStatus = "pass" | "fail" | "available" | "skip";

/**
 * Each check status's mark. `available` gets its own glyph, distinct from ✗:
 * an opt-in integration that is not set up is not a fault, and rendering it as
 * one would train users to ignore the failure count. The glyph pairs with the
 * word in the tally, so the distinction survives with color stripped.
 */
export const CHECK_GLYPHS: Record<CheckStatus, string> = {
  pass: GLYPHS.success,
  fail: GLYPHS.failure,
  available: GLYPHS.available,
  skip: GLYPHS.inert,
};

/**
 * The word in front of a check row's instruction, chosen by what the row IS.
 *
 * A `fail` and an `available` are things to repair or switch on, so they read
 * `fix`. A `skip` is neither — nothing is wrong and nothing is off; the row
 * simply has nothing to act on yet — so labelling its instruction `fix` would
 * be the same "a skip is a fault" reading the `available` glyph exists to
 * prevent. It reads `next`, which is what the line actually is.
 */
export const checkRemedyWord = (status: CheckStatus): "fix" | "next" =>
  status === "skip" ? "next" : "fix";

// =============================================================================
// Setup's outcome tiers
// =============================================================================

/**
 * How one setup row ended. `skipped` is NOT a failure — see
 * `setup/plan.ts#planExitFailed`, which states the exit rule once.
 */
export type OutcomeStatus =
  | "done"
  | "noop"
  | "skipped"
  | "failed"
  | "removed"
  | "kept";

/**
 * Each outcome's mark. The three ways work can be complete — `done`, `noop`
 * (already current), `removed` — all read ✓; the two ways a row can stand
 * aside — `kept`, `skipped` — read the inert ○; only `failed` earns ✗.
 */
export const OUTCOME_GLYPHS: Record<OutcomeStatus, string> = {
  done: GLYPHS.success,
  noop: GLYPHS.success,
  removed: GLYPHS.success,
  kept: GLYPHS.inert,
  skipped: GLYPHS.inert,
  failed: GLYPHS.failure,
};

/**
 * The word in front of a row outcome's instruction — `fix` for a row that
 * failed, `next` for one that skipped. Same rule as {@link checkRemedyWord}: a
 * skip is not a fault, and labelling its instruction as a repair is what
 * teaches a reader to treat skips as failures.
 */
export const outcomeRemedyWord = (status: OutcomeStatus): "fix" | "next" =>
  status === "failed" ? "fix" : "next";
