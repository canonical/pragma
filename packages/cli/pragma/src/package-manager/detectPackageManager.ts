import { realpathSync } from "node:fs";
import type { PackageManager } from "./types.js";

/**
 * Detect which package manager installed pragma from the binary path.
 *
 * Inspects the resolved symlink target for known directory patterns
 * (`.bun/`, `/pnpm/`, `/yarn/`). Falls back to `"npm"`.
 *
 * @param binPath - Path to the pragma binary (defaults to `process.argv[1]`).
 * @returns Detected package manager identifier.
 *
 * @note Impure — resolves real filesystem path.
 */
export default function detectPackageManager(
  binPath: string = process.argv[1] ?? "",
): PackageManager {
  let resolved: string;
  try {
    resolved = realpathSync(binPath);
  } catch {
    resolved = binPath;
  }

  if (resolved.includes("/.bun/")) return "bun";
  if (resolved.includes("/pnpm/")) return "pnpm";
  if (resolved.includes("/yarn/") || resolved.includes("/.yarn/"))
    return "yarn";
  return "npm";
}
