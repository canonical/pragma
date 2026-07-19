/**
 * Data shapes for `pragma doctor` (ported verbatim from the old shell).
 */

/**
 * One of the two config bands a check can concern. Mirrors the harnesses
 * `ScopeBand` structurally but is redeclared here so this statically-reachable
 * type module never pulls the harnesses runtime into the fast-path module graph.
 */
export type ScopeBand = "project" | "global";

/** Status of a doctor check or one of its sub-items. */
export type CheckStatus = "pass" | "fail" | "skip";

/**
 * A structured sub-item under a check — e.g. one resolved package under
 * `package refs`, or one unresolvable server under `MCP commands`. Lets the
 * formatter render an indented, aligned breakdown instead of cramming
 * everything into a single `detail` string.
 */
export interface CheckItem {
  /** Left-column label (e.g. the package or server name). */
  readonly label: string;
  /** Right-column detail (e.g. `git v0.1.2 · 362 graphs`). */
  readonly detail?: string;
  /** Optional per-item status, rendered as its own icon. */
  readonly status?: CheckStatus;
}

/** Result of a single doctor check. */
export interface CheckResult {
  readonly name: string;
  readonly status: CheckStatus;
  /** One-line headline shown next to the check name. */
  readonly detail: string;
  /** Optional structured breakdown, rendered as indented sub-items. */
  readonly items?: readonly CheckItem[];
  /** Remedial instruction shown inline under a failing check. */
  readonly remedy?: string;
  /**
   * Which config band the check concerns, if any: `global` for the user/machine
   * level (shell completions), `project` for per-repo config (MCP, skills). The
   * renderer groups banded checks into MACHINE/PROJECT sections; environment
   * checks (Node, versions, store) carry no band.
   */
  readonly band?: ScopeBand;
}

/** Aggregated results from all doctor checks. */
export interface DoctorData {
  readonly checks: readonly CheckResult[];
  readonly passed: number;
  readonly failed: number;
  readonly skipped: number;
}
