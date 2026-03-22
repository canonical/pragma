/** Describes a single symlink create/skip/replace action performed during skill setup. */
export interface SymlinkAction {
  readonly skillName: string;
  readonly target: string;
  readonly linkPath: string;
  readonly action: "created" | "skipped" | "replaced";
  readonly harnessName: string;
}

/** Aggregate result of the `pragma setup skills` operation. */
export interface SetupSkillsResult {
  readonly actions: readonly SymlinkAction[];
  readonly harnessCount: number;
  readonly skillCount: number;
  readonly warnings: readonly string[];
}

export type LogLevel = "debug" | "info" | "warn" | "error";
