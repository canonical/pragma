/**
 * Shared helpers for the consumer-smoke suite: enumerate workspace packages
 * exactly the way the root `workspaces` globs (and therefore Lerna/npm) see
 * them, and classify them as publishable (`private` is not `true`) or private.
 */

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

export const repoRoot = resolve(import.meta.dirname, "..", "..");

export interface WorkspacePackage {
  /** npm package name, e.g. `@canonical/react-ds-global` */
  name: string;
  /** Absolute path to the package directory */
  dir: string;
  /** Path relative to the repo root, e.g. `packages/react/ds-global` */
  relDir: string;
  version: string;
  private: boolean;
  /** Raw parsed package.json */
  manifest: Record<string, unknown>;
}

/** All workspace packages, sorted by name. */
export function getWorkspacePackages(): WorkspacePackage[] {
  const rootManifest = JSON.parse(
    readFileSync(join(repoRoot, "package.json"), "utf8"),
  );
  const patterns: string[] = rootManifest.workspaces ?? [];
  const packages: WorkspacePackage[] = [];
  const seen = new Set<string>();

  for (const pattern of patterns) {
    const glob = new Bun.Glob(pattern);
    for (const match of glob.scanSync({ cwd: repoRoot, onlyFiles: false })) {
      if (seen.has(match)) continue;
      seen.add(match);
      let manifest: Record<string, unknown>;
      try {
        manifest = JSON.parse(
          readFileSync(join(repoRoot, match, "package.json"), "utf8"),
        );
      } catch {
        continue; // Not a package directory
      }
      if (typeof manifest.name !== "string") continue;
      packages.push({
        name: manifest.name,
        dir: join(repoRoot, match),
        relDir: match,
        version: typeof manifest.version === "string" ? manifest.version : "",
        private: manifest.private === true,
        manifest,
      });
    }
  }

  packages.sort((a, b) => a.name.localeCompare(b.name));
  return packages;
}

/** Workspace packages that Lerna would publish (`private` is not `true`). */
export function getPublishablePackages(): WorkspacePackage[] {
  return getWorkspacePackages().filter((pkg) => !pkg.private);
}
