/**
 * Setup domain types.
 *
 * Types for the `pragma setup skills` command.
 */

export interface SymlinkAction {
  readonly skillName: string;
  readonly target: string;
  readonly linkPath: string;
  readonly action: "created" | "skipped" | "replaced";
  readonly harnessName: string;
}

export interface SetupSkillsResult {
  readonly actions: readonly SymlinkAction[];
  readonly harnessCount: number;
  readonly skillCount: number;
  readonly warnings: readonly string[];
}
