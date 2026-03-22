import type { SetupSkillsResult } from "../types.js";

/** Formatter input for `pragma setup skills`, pairing the result with a dry-run flag. */
export interface SetupSkillsOutput {
  readonly result: SetupSkillsResult;
  readonly dryRun: boolean;
}
