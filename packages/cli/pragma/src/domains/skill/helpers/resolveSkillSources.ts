/**
 * Resolve skill source directories from the shared package registry.
 * Package-manager agnostic — works with bun, npm, pnpm, yarn.
 */

import { join } from "node:path";
import { PACKAGES, resolvePackages } from "../../shared/packages.js";

export interface SkillSource {
  /** Absolute path to the skills directory. */
  readonly dir: string;
  /** Package name this source belongs to. */
  readonly packageName: string;
  /** Relative path for sourcePath construction. */
  readonly relativePath: string;
}

export default function resolveSkillSources(): SkillSource[] {
  const sources: SkillSource[] = [];
  const resolved = resolvePackages();

  for (const { pkg, dir } of resolved) {
    const def = PACKAGES.find((p) => p.pkg === pkg);
    if (!def?.skills) continue;

    sources.push({
      dir: join(dir, def.skills),
      packageName: pkg,
      relativePath: `node_modules/${pkg}/${def.skills}`,
    });
  }

  return sources;
}
