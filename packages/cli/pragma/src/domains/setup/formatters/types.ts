/**
 * Formatter input types for setup skills command.
 */

import type { SetupSkillsResult } from "../types.js";

export interface SetupSkillsOutput {
  readonly result: SetupSkillsResult;
  readonly dryRun: boolean;
}
