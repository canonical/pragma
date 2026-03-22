import { realpathSync } from "node:fs";
import { PM_COMMANDS } from "./constants.js";
import detectPackageManager from "./detectPackageManager.js";

/**
 * Check whether a resolved binary path falls within a known global prefix directory.
 *
 * @param path - Resolved filesystem path.
 * @returns `true` if the path is under a global package manager directory.
 */
function isGlobalPrefix(path: string): boolean {
  return (
    path.includes("/.bun/") ||
    path.includes("/pnpm/") ||
    path.includes("/yarn/") ||
    path.includes("/.yarn/")
  );
}

/**
 * Warn if pragma is installed locally (in node_modules/.bin) instead of globally.
 *
 * @param binPath - Path to the pragma binary (defaults to `process.argv[1]`).
 * @returns Warning string if locally installed, or `undefined` if global.
 *
 * @note Impure — resolves real filesystem path.
 */
export default function detectLocalInstall(
  binPath: string = process.argv[1] ?? "",
): string | undefined {
  let resolved: string;
  try {
    resolved = realpathSync(binPath);
  } catch {
    resolved = binPath;
  }

  if (!resolved.includes("node_modules/.bin")) return undefined;
  if (isGlobalPrefix(resolved)) return undefined;

  const pm = detectPackageManager(binPath);
  return `Warning: pragma is installed locally in this project.\nGlobal installation is recommended: ${PM_COMMANDS[pm].install("@canonical/pragma")}`;
}
