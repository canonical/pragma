/**
 * Data shapes for `pragma doctor` (ported verbatim from the old shell).
 */

// The scope and status types are part of the rendering vocabulary — the one
// module that owns both the states and the words (and glyphs) for them.
// Re-exported here so doctor's type surface stays complete; the definitions,
// the `available` tier's rationale, and the structural pin against
// `@canonical/harnesses` live with the vocabulary.
import type { CheckStatus, Scope } from "../../kernel/render/vocabulary.js";

export type {
  CheckStatus,
  Scope,
} from "../../kernel/render/vocabulary.js";

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
   * Which config scope the check concerns, if any: `global` for the user/home
   * level (shell completions), `project` for per-repo config (skills). The MCP
   * checks derive their scope from the harnesses they found. The renderer groups
   * scoped checks into Global/Project sections; environment checks (Node,
   * versions, store) carry no scope.
   */
  readonly scope?: Scope;
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
