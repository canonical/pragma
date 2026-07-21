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
 * The prior state of an MCP target file, read up front by `detectMcp`:
 * `absent` (no pragma entry yet), `configured` (a matching pragma entry already
 * present in every write — a re-run skips it), or `drifted` (a pragma entry
 * exists but differs, so a write updates it). Mirrors the skills step's
 * created/skipped/replaced idempotency at the file grain.
 */
export type McpTargetState = "absent" | "configured" | "drifted";

/**
 * One configured MCP target in a result: the file that was written, which band
 * it belongs to, the harness name(s) that share it, and its prior
 * {@link McpTargetState} (so the recap can report new vs updated vs unchanged).
 */
export interface ConfiguredTarget {
  readonly name: string;
  readonly band: ScopeBand;
  readonly path: string;
  readonly state: McpTargetState;
}

/**
 * The prior on-disk state of the shell-completion script, read up front by
 * `detectCompletions`: `absent` (no script), `installed` (a byte-identical
 * script is already present — a re-run skips it), or `stale` (a different
 * script is present, so a write updates it).
 */
export type CompletionsState = "absent" | "installed" | "stale";

/**
 * The detected state of the Terrazzo LSP VS Code extension, probed up front by
 * `detectLsp`: `installed` (already present — a re-run skips it), `absent` (not
 * present, so the installer runs), or `unknown` (the `code` CLI is not on PATH,
 * so we cannot enumerate and the installer runs regardless).
 */
export type LspState = "installed" | "absent" | "unknown";

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
      readonly state: CompletionsState;
    }
  | { readonly kind: "lsp"; readonly state: LspState }
  | {
      readonly kind: "mcp";
      readonly configured: readonly string[];
      readonly targets: readonly ConfiguredTarget[];
    }
  | { readonly kind: "skills"; readonly result: SetupSkillsResult }
  | { readonly kind: "all"; readonly steps: readonly string[] };
