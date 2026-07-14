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
}

/** Context passed to each doctor check, providing the working directory. */
export interface CheckContext {
  readonly cwd: string;
}

/** Aggregated results from all doctor checks. */
export interface DoctorData {
  readonly checks: readonly CheckResult[];
  readonly passed: number;
  readonly failed: number;
  readonly skipped: number;
}
