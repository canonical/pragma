/**
 * Data shapes for `pragma doctor` (ported verbatim from the old shell).
 */

/**
 * One of the two config bands a check can concern. Mirrors the harnesses
 * `ScopeBand` structurally but is redeclared here so this statically-reachable
 * type module never pulls the harnesses runtime into the fast-path module graph.
 */
export type ScopeBand = "project" | "global";

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
 * A structured sub-item under a check — e.g. one resolved package under
 * `pack refs`, or one unresolvable server under `MCP commands`. Lets the
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
  /**
   * Remedial instruction shown inline under the check: for `fail` the fix,
   * for `available` the setup command that enables the integration.
   */
  readonly remedy?: string;
  /**
   * Which config band the check concerns, if any: `global` for the user/home
   * level (shell completions), `project` for per-repo config (skills). The MCP
   * checks derive their band from the harnesses they found. The renderer groups
   * banded checks into Global/Project sections; environment checks (Node,
   * versions, store) carry no band.
   */
  readonly band?: ScopeBand;
}

/** Aggregated results from all doctor checks — one count per status tier. */
export interface DoctorData {
  readonly checks: readonly CheckResult[];
  readonly passed: number;
  readonly failed: number;
  /** Opt-in integrations detected but not set up — counted apart from failures. */
  readonly available: number;
  readonly skipped: number;
}
