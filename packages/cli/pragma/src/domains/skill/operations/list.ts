/**
 * List skills with source availability metadata.
 *
 * Wraps discoverSkills with source availability info for the formatter.
 */

import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import { SKILL_SOURCES, SOURCE_PACKAGE_MAP } from "../constants.js";
import type { DiscoveredSkill, SkillSource } from "../types.js";
import discoverSkills from "./discover.js";

export interface SkillListResult {
  readonly skills: readonly DiscoveredSkill[];
  readonly sources: readonly SkillSource[];
}

export default async function listSkills(
  cwd: string,
): Promise<SkillListResult> {
  const skills = await discoverSkills(cwd);

  const sources: SkillSource[] = await Promise.all(
    SKILL_SOURCES.map(async (source) => {
      const dir = resolve(cwd, source);
      const available = await stat(dir)
        .then((s) => s.isDirectory())
        .catch(() => false);
      return {
        path: source,
        packageName: SOURCE_PACKAGE_MAP[source] ?? source,
        available,
      };
    }),
  );

  return { skills, sources };
}
