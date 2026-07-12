/**
 * Semantic package contracts and resolution orchestrator.
 *
 * A semantic package is a resolved graph dependency containing TTL
 * definitions, instance data, and skills. Three loaders produce the
 * same `SemanticPackage` shape — local (file/npm), git cache, and
 * bundled (compiled binary). The orchestrator tries each loader in
 * precedence order: local > git > bundled.
 */

import type { PackageRef } from "../refs/operations/parseRef.js";

// ---------------------------------------------------------------------------
// Contracts
// ---------------------------------------------------------------------------

/** A single TTL file's content with provenance annotation. */
export interface GraphContent {
  /** Original file path or virtual identifier (for provenance/debugging). */
  readonly path: string;
  /** TTL content string. */
  readonly content: string;
  /** RDF serialization format. */
  readonly format: "turtle";
}

/** A discovered story-pack JSON file with its content. */
export interface StoryFileEntry {
  /**
   * Original file path, or a virtual identifier for embedded sources
   * (e.g. `(bundled)/…`) — for provenance/debugging, not guaranteed to
   * exist on disk.
   */
  readonly path: string;
  /** The file's parsed JSON — validated by the story-pack compiler. */
  readonly definition: unknown;
}

export interface SkillEntry {
  /** Absolute path to the skill directory (must exist on disk for symlinking). */
  readonly dir: string;
  /** Skill folder name (e.g. "anatomy-author"). */
  readonly folderName: string;
}

/** A resolved graph package. All loaders produce this uniform shape. */
export interface SemanticPackage {
  /** npm package name (e.g. "@canonical/design-system"). */
  readonly name: string;
  /** Version string from package.json. */
  readonly version: string;
  /** How this package was resolved. */
  readonly source: "local" | "git" | "bundled";
  /** TTL graph content to load into the ke store. */
  readonly graphs: GraphContent[];
  /** Skills available in this package. */
  readonly skills: SkillEntry[];
  /**
   * Raw story-pack files shipped by this package (`stories/*.json`).
   * Parsed JSON, validated at compile time so one bad file cannot break boot.
   */
  readonly stories: StoryFileEntry[];
}

/**
 * Resolves a package reference to a SemanticPackage.
 * Returns `undefined` if this loader cannot resolve the given ref.
 * May be async (e.g. BundledLoader reads blob content asynchronously).
 */
export interface PackageLoader {
  /** Loader identity for diagnostics. */
  readonly name: "local" | "git" | "bundled";
  /** Attempt to resolve a package reference. */
  resolve(
    ref: PackageRef,
  ): SemanticPackage | undefined | Promise<SemanticPackage | undefined>;
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

/**
 * Resolve package references to semantic packages using a loader chain.
 *
 * Tries each loader in array order for each ref. The first loader that
 * returns a result wins — subsequent loaders are skipped for that ref.
 * Refs that no loader can resolve are silently dropped.
 *
 * @param refs - Parsed package references from config merge.
 * @param loaders - Loaders in precedence order (local > git > bundled).
 * @returns Array of resolved semantic packages.
 */
export async function resolveSemanticPackages(
  refs: ReadonlyArray<PackageRef>,
  loaders: ReadonlyArray<PackageLoader>,
): Promise<SemanticPackage[]> {
  const packages: SemanticPackage[] = [];

  for (const ref of refs) {
    let resolved: SemanticPackage | undefined;
    for (const loader of loaders) {
      resolved = await loader.resolve(ref);
      if (resolved) break;
    }
    if (resolved) {
      packages.push(resolved);
    }
  }

  return packages;
}
