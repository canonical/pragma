/**
 * Data shapes for `pragma setup` and its sub-verbs.
 */

import type { ShellId } from "./shell.js";

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
  | { readonly kind: "mcp"; readonly configured: readonly string[] }
  | { readonly kind: "skills"; readonly result: SetupSkillsResult }
  | { readonly kind: "all"; readonly steps: readonly string[] };
