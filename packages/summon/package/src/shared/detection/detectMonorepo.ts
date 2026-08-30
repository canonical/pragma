import * as path from "node:path";
import { exists, flatMap, pure, readFile, type Task } from "@canonical/task";
import type { MonorepoInfo } from "../types.js";
import ancestorDirs from "./ancestorDirs.js";

const notMonorepo: MonorepoInfo = { isMonorepo: false };

/** Parse JSON without throwing; a malformed file reads as no data. */
const safeParse = (content: string): Record<string, unknown> | null => {
  try {
    const parsed: unknown = JSON.parse(content);
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
};

/** The version field of a parsed manifest, when it is a string. */
const versionOf = (data: Record<string, unknown>): string | undefined =>
  typeof data.version === "string" ? data.version : undefined;

/**
 * Probe one directory for a monorepo marker: `lerna.json` (version from it),
 * `pnpm-workspace.yaml` (version from the adjacent `package.json`), or a
 * `package.json` with a `workspaces` field. Falls through to `next` when the
 * directory carries no marker (or only a malformed one).
 */
function detectAt(dir: string, next: Task<MonorepoInfo>): Task<MonorepoInfo> {
  const lernaPath = path.join(dir, "lerna.json");
  const pnpmWorkspacePath = path.join(dir, "pnpm-workspace.yaml");
  const packageJsonPath = path.join(dir, "package.json");

  const versionFromPackageJson: Task<MonorepoInfo> = flatMap(
    exists(packageJsonPath),
    (hasManifest) =>
      hasManifest
        ? flatMap(readFile(packageJsonPath), (content) => {
            const manifest = safeParse(content);
            return pure<MonorepoInfo>({
              isMonorepo: true,
              version: manifest === null ? undefined : versionOf(manifest),
            });
          })
        : pure<MonorepoInfo>({ isMonorepo: true }),
  );

  return flatMap(exists(lernaPath), (hasLerna) => {
    if (hasLerna) {
      return flatMap(readFile(lernaPath), (content) => {
        const lerna = safeParse(content);
        // Malformed lerna.json: not proof of a monorepo — keep looking upward
        // instead of crashing the whole generation.
        if (lerna === null) {
          return next;
        }
        return pure<MonorepoInfo>({
          isMonorepo: true,
          version: versionOf(lerna),
        });
      });
    }
    return flatMap(exists(pnpmWorkspacePath), (hasPnpmWorkspace) => {
      if (hasPnpmWorkspace) {
        return versionFromPackageJson;
      }
      return flatMap(exists(packageJsonPath), (hasManifest) => {
        if (!hasManifest) {
          return next;
        }
        return flatMap(readFile(packageJsonPath), (content) => {
          const manifest = safeParse(content);
          if (manifest !== null && "workspaces" in manifest) {
            return pure<MonorepoInfo>({
              isMonorepo: true,
              version: versionOf(manifest),
            });
          }
          return next;
        });
      });
    });
  });
}

/**
 * Detect if running in a monorepo and get its version. Walks from `cwd` up
 * to the filesystem root, nearest directory first, recognising lerna, pnpm,
 * and package.json-`workspaces` (npm/yarn/bun) roots.
 *
 * @note Impure — probes the filesystem for workspace markers.
 */
export default function detectMonorepo(cwd: string): Task<MonorepoInfo> {
  return ancestorDirs(cwd).reduceRight<Task<MonorepoInfo>>(
    (fallback, dir) => detectAt(dir, fallback),
    pure(notMonorepo),
  );
}
