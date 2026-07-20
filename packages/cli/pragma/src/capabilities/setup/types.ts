/**
 * Data shapes for `pragma setup` and its sub-verbs.
 */

import type { ShellId } from "./shell.js";

/**
 * Which setup entry point is running: the run-all self-verb or one sub-verb.
 * Lives here (a leaf type module) so `setup.verb.ts` can name it WITHOUT a
 * static import of the generator ops — keeping them dynamic-only (lazy-React).
 */
export type SetupMode = "all" | "completions" | "lsp" | "mcp" | "skills";

/**
 * One of the two config bands: the per-user/home `global` band or the per-repo
 * `project` band. Mirrors `@canonical/harnesses`' `ScopeBand` structurally, but
 * is redeclared here so this statically-reachable type module never pulls the
 * harnesses runtime into the fast-path module graph (the lazy-dispatch invariant).
 */
export type ScopeBand = "project" | "global";

/**
 * The resolved `--scope` selection: which config band(s) a run touches. `both`
 * (the default) runs each detected harness's default band; `global`/`project`
 * run only that band. Structurally mirrors the harnesses `ScopeSelection`.
 */
export type ScopeSelection = "project" | "global" | "both";

/**
 * One configured MCP target in a result: the file that was written, which band
 * it belongs to, and the harness name(s) that share it.
 */
export interface ConfiguredTarget {
  readonly name: string;
  readonly band: ScopeBand;
  readonly path: string;
}

/** One symlink create/skip/replace action performed during skill setup. */
export interface SymlinkAction {
  readonly skillName: string;
  readonly target: string;
  readonly linkPath: string;
  readonly action: "created" | "skipped" | "replaced";
  readonly harnessName: string;
}

/** Aggregate result of `pragma setup skills`. */
export interface SetupSkillsResult {
  readonly actions: readonly SymlinkAction[];
  readonly harnessCount: number;
  readonly skillCount: number;
  readonly warnings: readonly string[];
}

/** The result of one setup verb, tagged by which verb produced it. */
export type SetupResult =
  | {
      readonly kind: "completions";
      readonly shell: ShellId | null;
      readonly path: string | null;
      readonly installed: boolean;
    }
  | { readonly kind: "lsp" }
  | {
      readonly kind: "mcp";
      readonly configured: readonly string[];
      readonly targets: readonly ConfiguredTarget[];
    }
  | { readonly kind: "skills"; readonly result: SetupSkillsResult }
  | { readonly kind: "all"; readonly steps: readonly string[] };
