import { stat } from "node:fs/promises";
import {
  resolveSkillSources,
  type SkillSource as SkillSourceDef,
} from "../helpers/index.js";
import type { DiscoveredSkill, SkillSource } from "../types.js";
import discoverSkills from "./discover.js";

/** Result of listing skills, including source availability metadata. */
export interface SkillListResult {
  readonly skills: readonly DiscoveredSkill[];
  readonly sources: readonly SkillSource[];
}

/**
 * List all discovered skills along with source availability metadata.
 *
 * Wraps {@link discoverSkills} and enriches the result with per-source
 * availability flags by checking the filesystem.
 *
 * @param cwd - Working directory.
 * @param overrideSources - Optional override for skill source definitions.
 * @returns Skills and source availability information.
 * @note Impure
 */
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
        path: source.dir,
        packageName: source.packageName,
        available,
      };
    }),
  );

  return { skills, sources };
}
