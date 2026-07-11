/**
 * Workspace enumeration for the consumer-smoke suite: list workspace packages
 * exactly the way the root `workspaces` globs (and therefore Lerna/npm) see
 * them, and classify them as publishable (`private` is not `true`) or private.
 *
 * Deliberately runtime-agnostic (plain `node:fs`, no `Bun.Glob`) so the same
 * code runs under bun (CLIs) and under vitest/Node (tests).
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";

/** Walk upwards from `startDir` to the monorepo root (marked by lerna.json). */
export function findRepoRoot(startDir: string): string {
  let dir = startDir;
  for (;;) {
    if (existsSync(join(dir, "lerna.json"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error(
        `could not locate the repo root (no lerna.json above ${startDir})`,
      );
    }
    dir = parent;
  }
}

export const repoRoot = findRepoRoot(import.meta.dirname);

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

/**
 * Expand a workspace pattern like `packages/react/*` into directories.
 * Only literal segments and single `*` segments are supported — exactly the
 * shapes used by this repo's root `workspaces` — and anything else throws,
 * so a new pattern style fails loudly instead of silently missing packages.
 */
function expandWorkspacePattern(root: string, pattern: string): string[] {
  let dirs = [root];
  for (const segment of pattern.split("/")) {
    const next: string[] = [];
    for (const dir of dirs) {
      if (segment === "*") {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          if (!entry.isDirectory()) continue;
          if (entry.name === "node_modules" || entry.name.startsWith("."))
            continue;
          next.push(join(dir, entry.name));
        }
      } else if (segment.includes("*")) {
        throw new Error(
          `unsupported workspace pattern "${pattern}" (only literal segments and "*" are supported)`,
        );
      } else {
        const candidate = join(dir, segment);
        if (existsSync(candidate)) next.push(candidate);
      }
    }
    dirs = next;
  }
  return dirs;
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
    for (const dir of expandWorkspacePattern(repoRoot, pattern)) {
      const relDir = relative(repoRoot, dir).split(sep).join("/");
      if (seen.has(relDir)) continue;
      seen.add(relDir);
      let manifest: Record<string, unknown>;
      try {
        manifest = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
      } catch {
        continue; // Not a package directory
      }
      if (typeof manifest.name !== "string") continue;
      packages.push({
        name: manifest.name,
        dir,
        relDir,
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
