import { existsSync } from "node:fs";
import { join } from "node:path";
import type { PackageRef } from "../../refs/operations/parseRef.js";
import { resolvePackages } from "../../shared/packages.js";

/** A resolved skill source directory from an installed package. */
export interface SkillSource {
  /** Absolute path to the skills directory. */
  readonly dir: string;
  /** Package name this source belongs to. */
  readonly packageName: string;
}

/**
 * Resolve skill source directories from resolved packages.
 *
 * Auto-detects skills by checking for a `skills/` subdirectory
 * in each resolved package root.
 *
 * @param refs - Parsed package references. Omit for defaults.
 * @returns Array of resolved skill sources with absolute paths.
 * @note Impure
 */
export default function resolveSkillSources(
  refs?: ReadonlyArray<PackageRef>,
): SkillSource[] {
  const sources: SkillSource[] = [];
  const resolved = resolvePackages(refs);

  for (const { pkg, dir } of resolved) {
    const skillsDir = join(dir, "skills");
    if (existsSync(skillsDir)) {
      sources.push({ dir: skillsDir, packageName: pkg });
    }
  }

  return sources;
}
