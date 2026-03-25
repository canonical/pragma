import { join } from "node:path";
import { PACKAGES, resolvePackages } from "../../shared/packages.js";

/** A resolved skill source directory from an installed package. */
export interface SkillSource {
  /** Absolute path to the skills directory. */
  readonly dir: string;
  /** Package name this source belongs to. */
  readonly packageName: string;
}

/**
 * Resolve skill source directories from the shared package registry.
 * Package-manager agnostic -- works with bun, npm, pnpm, yarn.
 *
 * @returns Array of resolved skill sources with absolute paths.
 * @note Impure
 */
export default function resolveSkillSources(): SkillSource[] {
  const sources: SkillSource[] = [];
  const resolved = resolvePackages();

  for (const { pkg, dir } of resolved) {
    const def = PACKAGES.find((p) => p.pkg === pkg);
    if (!def?.skills) continue;

    sources.push({
      dir: join(dir, def.skills),
      packageName: pkg,
    });
  }

  return sources;
}
