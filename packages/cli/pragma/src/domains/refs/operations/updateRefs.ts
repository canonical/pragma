/**
 * Update operation: fetch/clone git refs into the local cache.
 *
 * Reads project + global config, merges, and for each git ref either
 * clones (first time) or fetches (subsequent). Reports per-package status.
 */

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { readConfig } from "#config";
import { DEFAULT_PACKAGES } from "../../shared/packages.js";
import { cloneRef, fetchRef, pruneCache } from "./gitOps.js";
import type { PackageRef, RawPackageEntry } from "./parseRef.js";
import { parsePackageEntry } from "./parseRef.js";
import { cacheRoot, gitCacheDir } from "./paths.js";
import readGlobalRefs from "./readGlobalRefs.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UpdateResult {
  readonly pkg: string;
  readonly kind:
    | "cloned"
    | "updated"
    | "up-to-date"
    | "ok"
    | "skipped"
    | "error";
  readonly detail: string;
}

export interface UpdateRefsOptions {
  /** Working directory for reading project config. */
  cwd: string;
  /** Update only this package (by name). */
  package?: string;
  /** Remove orphaned cache directories. */
  prune?: boolean;
}

// ---------------------------------------------------------------------------
// Operation
// ---------------------------------------------------------------------------

/**
 * Update cached git refs.
 *
 * For each configured package:
 * - git refs: clone or fetch into cache
 * - file refs: verify the path exists
 * - npm refs: skip (nothing to update)
 */
export default async function updateRefs(
  options: UpdateRefsOptions,
): Promise<UpdateResult[]> {
  const config = readConfig(options.cwd);
  const refs = mergeEntries(config.packages);
  const results: UpdateResult[] = [];

  for (const ref of refs) {
    if (options.package && ref.pkg !== options.package) continue;

    switch (ref.kind) {
      case "git": {
        const dest = gitCacheDir(ref.pkg, ref.ref);
        try {
          if (existsSync(dest)) {
            const { updated, oldHead, newHead } = fetchRef(
              ref.url,
              ref.ref,
              dest,
            );
            results.push({
              pkg: ref.pkg,
              kind: updated ? "updated" : "up-to-date",
              detail: updated
                ? `${oldHead.slice(0, 7)} → ${newHead.slice(0, 7)}`
                : `at ${newHead.slice(0, 7)}`,
            });
          } else {
            cloneRef(ref.url, ref.ref, dest);
            results.push({
              pkg: ref.pkg,
              kind: "cloned",
              detail: `${ref.url}#${ref.ref}`,
            });
          }
        } catch (err) {
          results.push({
            pkg: ref.pkg,
            kind: "error",
            detail: err instanceof Error ? err.message : String(err),
          });
        }
        break;
      }

      case "file": {
        results.push({
          pkg: ref.pkg,
          kind: existsSync(ref.path) ? "ok" : "error",
          detail: existsSync(ref.path)
            ? `path exists: ${ref.path}`
            : `path not found: ${ref.path}`,
        });
        break;
      }

      case "npm": {
        results.push({
          pkg: ref.pkg,
          kind: "skipped",
          detail: "using npm (no ref configured)",
        });
        break;
      }
    }
  }

  if (options.prune) {
    const pruned = pruneOrphanedCaches(refs);
    for (const dir of pruned) {
      results.push({
        pkg: "(orphan)",
        kind: "ok",
        detail: `pruned: ${dir}`,
      });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Merge global + project entries, parse into PackageRef[]. */
function mergeEntries(
  projectPackages?: ReadonlyArray<RawPackageEntry>,
): PackageRef[] {
  const globalEntries = readGlobalRefs();

  if (
    (!projectPackages || projectPackages.length === 0) &&
    globalEntries.length === 0
  ) {
    return DEFAULT_PACKAGES.map((pkg) => parsePackageEntry(pkg));
  }

  const merged = new Map<string, RawPackageEntry>();

  for (const pkg of DEFAULT_PACKAGES) {
    merged.set(pkg, pkg);
  }
  for (const entry of globalEntries) {
    const name = typeof entry === "string" ? entry : entry.name;
    merged.set(name, entry);
  }
  if (projectPackages) {
    merged.clear();
    for (const entry of projectPackages) {
      const name = typeof entry === "string" ? entry : entry.name;
      merged.set(name, entry);
    }
  }

  return [...merged.values()].map(parsePackageEntry);
}

/**
 * Remove cache directories that don't match any configured git ref.
 * Returns list of removed directories.
 */
function pruneOrphanedCaches(refs: PackageRef[]): string[] {
  const validDirs = new Set(
    refs
      .filter(
        (r): r is Extract<PackageRef, { kind: "git" }> => r.kind === "git",
      )
      .map((r) => gitCacheDir(r.pkg, r.ref)),
  );

  const refsDir = join(cacheRoot(), "refs");
  if (!existsSync(refsDir)) return [];

  const pruned: string[] = [];

  // Walk two levels: @scope/package/ref/
  for (const scope of safeReaddir(refsDir)) {
    const scopeDir = join(refsDir, scope);
    for (const pkg of safeReaddir(scopeDir)) {
      const pkgDir = join(scopeDir, pkg);
      for (const ref of safeReaddir(pkgDir)) {
        const refDir = join(pkgDir, ref);
        if (!validDirs.has(refDir)) {
          pruneCache(refDir);
          pruned.push(refDir);
        }
      }
    }
  }

  return pruned;
}

function safeReaddir(dir: string): string[] {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}
