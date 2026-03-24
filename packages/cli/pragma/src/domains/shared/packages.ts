/**
 * Design system package registry.
 *
 * Single source of truth for all external packages that provide TTL data
 * and/or agent skills. Both `bootStore` (TTL sources) and `resolveSkillSources`
 * (skill discovery) derive their paths from this registry.
 *
 * Each entry declares:
 * - `pkg`    — npm package name (resolved via `require.resolve`)
 * - `ttl`    — glob patterns for TTL data, relative to the package root
 * - `skills` — subpath to the skills directory, or `undefined` if none
 */

import { createRequire } from "node:module";
import { dirname } from "node:path";

const require = createRequire(import.meta.url);

export interface PackageDefinition {
  /** npm package name. */
  readonly pkg: string;
  /** Glob patterns for TTL data (relative to package root). */
  readonly ttl: readonly string[];
  /** Subpath to skills directory, or undefined if the package has no skills. */
  readonly skills: string | undefined;
}

export const PACKAGES: readonly PackageDefinition[] = [
  {
    pkg: "@canonical/design-system",
    ttl: ["definitions/ontology.ttl", "data/**/*.ttl"],
    skills: "skills",
  },
  {
    pkg: "@canonical/anatomy-dsl",
    ttl: ["definitions/**/*.ttl"],
    skills: undefined,
  },
  {
    pkg: "@canonical/code-standards",
    ttl: ["definitions/**/*.ttl", "data/**/*.ttl"],
    skills: "skills",
  },
  {
    pkg: "@canonical/pragma-cli",
    ttl: [],
    skills: "skills",
  },
];

export interface ResolvedPackage {
  /** npm package name. */
  readonly pkg: string;
  /** Absolute path to the package root. */
  readonly dir: string;
}

/**
 * Resolve installed packages from the registry via `require.resolve`.
 * Package-manager agnostic — works with bun, npm, pnpm, yarn.
 * Skips packages that are not installed.
 */
export function resolvePackages(): ResolvedPackage[] {
  const resolved: ResolvedPackage[] = [];
  for (const { pkg } of PACKAGES) {
    try {
      resolved.push({
        pkg,
        dir: dirname(require.resolve(`${pkg}/package.json`)),
      });
    } catch {
      // package not installed — skip
    }
  }
  return resolved;
}
