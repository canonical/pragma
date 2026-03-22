import type { DiscoveredSkill, SkillSource } from "../types.js";

/** Formatter input for `pragma skill list`, pairing skills with source metadata and detail flag. */
export interface SkillListInput {
  readonly skills: readonly DiscoveredSkill[];
  readonly sources: readonly SkillSource[];
  readonly detailed: boolean;
}
