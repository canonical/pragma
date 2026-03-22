/**
 * List skills with source availability metadata.
 *
 * Wraps discoverSkills with source availability info for the formatter.
 */

import { stat } from "node:fs/promises";
import {
  type SkillSource as SkillSourceDef,
  resolveSkillSources,
} from "../helpers/index.js";
import type { DiscoveredSkill, SkillSource } from "../types.js";
import discoverSkills from "./discover.js";

export interface SkillListResult {
  readonly skills: readonly DiscoveredSkill[];
  readonly sources: readonly SkillSource[];
}

export default async function listSkills(
  cwd: string,
  overrideSources?: SkillSourceDef[],
): Promise<SkillListResult> {
  const resolved = overrideSources ?? resolveSkillSources();
  const skills = await discoverSkills(cwd, resolved);

  const sources: SkillSource[] = await Promise.all(
    resolved.map(async (source) => {
      const available = await stat(source.dir)
        .then((s) => s.isDirectory())
        .catch(() => false);
      return {
        path: source.relativePath,
        packageName: source.packageName,
        available,
      };
    }),
  );

  return { skills, sources };
}
