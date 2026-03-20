/**
 * Formatter input types for the skill list command.
 */

import type { DiscoveredSkill, SkillSource } from "../types.js";

export interface SkillListInput {
  readonly skills: readonly DiscoveredSkill[];
  readonly sources: readonly SkillSource[];
  readonly detailed: boolean;
}
