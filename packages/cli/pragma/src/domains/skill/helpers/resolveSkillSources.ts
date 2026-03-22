/**
 * Resolve skill source directories by locating each package via require.resolve.
 * Package-manager agnostic — works with bun, npm, pnpm, yarn.
 */

import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { SKILL_PACKAGES } from "../constants.js";

const require = createRequire(import.meta.url);

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

  for (const { pkg, subpath } of SKILL_PACKAGES) {
    let pkgDir: string;
    try {
      pkgDir = dirname(require.resolve(`${pkg}/package.json`));
    } catch {
      continue;
    }

    sources.push({
      dir: join(pkgDir, subpath),
      packageName: pkg,
      relativePath: `node_modules/${pkg}/${subpath}`,
    });
  }

  return sources;
}
