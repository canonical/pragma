import { parsePackageEntry } from "../../refs/operations/parseRef.js";
import {
  createGitLoader,
  createLocalLoader,
} from "../../shared/loaders/index.js";
import { DEFAULT_PACKAGES } from "../../shared/packages.js";
import type { SemanticPackage } from "../../shared/semanticPackage.js";
import { resolveSemanticPackages } from "../../shared/semanticPackage.js";

/** A resolved skill source directory from an installed package. */
export interface SkillSource {
  /** Absolute path to the skills directory. */
  readonly dir: string;
  /** Package name this source belongs to. */
  readonly packageName: string;
}

/**
 * Resolve skill source directories from semantic packages.
 *
 * When `packages` is provided (from PragmaRuntime), extracts skill entries
 * directly. Otherwise, resolves packages using local and git loaders
 * (bundled loader is excluded since it has no filesystem skills).
 *
 * @param packages - Pre-resolved semantic packages (from boot).
 * @returns Array of resolved skill sources with absolute paths.
 * @note Impure when packages is omitted (reads filesystem).
 */
export default function resolveSkillSources(
  packages?: readonly SemanticPackage[],
): SkillSource[] {
  if (packages) {
    return extractSkillSources(packages);
  }

  // Fallback: resolve packages ourselves (skills need filesystem paths,
  // so we skip the bundled loader here)
  return resolveSkillSourcesFromRefs();
}

function extractSkillSources(
  packages: readonly SemanticPackage[],
): SkillSource[] {
  const sources: SkillSource[] = [];
  for (const pkg of packages) {
    for (const skill of pkg.skills) {
      sources.push({ dir: skill.dir, packageName: pkg.name });
    }
  }
  return sources;
}

function resolveSkillSourcesFromRefs(): SkillSource[] {
  const refs = DEFAULT_PACKAGES.map(parsePackageEntry);
  const loaders = [createLocalLoader(), createGitLoader()];

  // resolveSemanticPackages is async but skills resolution is sync.
  // Use local+git loaders which are both sync.
  const packages: SemanticPackage[] = [];
  for (const ref of refs) {
    for (const loader of loaders) {
      const resolved = loader.resolve(ref);
      if (resolved && !(resolved instanceof Promise)) {
        packages.push(resolved);
        break;
      }
    }
  }

  return extractSkillSources(packages);
}
