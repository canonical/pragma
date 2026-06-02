/**
 * Cross-platform path resolution for pragma cache, config, and data.
 *
 * Respects XDG Base Directory Specification:
 * - XDG_CACHE_HOME for cache (default: ~/.cache)
 * - XDG_CONFIG_HOME for global config (default: ~/.config)
 * - XDG_DATA_HOME for persistent data (default: ~/.local/share)
 *
 * Override via PRAGMA_CACHE_DIR for CI and testing.
 * Uses os.homedir() for macOS/WSL/Linux portability.
 */

import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Root directory for pragma cache data.
 *
 * Resolution order:
 * 1. PRAGMA_CACHE_DIR environment variable (CI/testing override)
 * 2. XDG_CACHE_HOME/pragma (XDG spec)
 * 3. ~/.cache/pragma (default)
 */
export function cacheRoot(): string {
  if (process.env.PRAGMA_CACHE_DIR) {
    return process.env.PRAGMA_CACHE_DIR;
  }
  const xdg = process.env.XDG_CACHE_HOME;
  const base = xdg ?? join(homedir(), ".cache");
  return join(base, "pragma");
}

/**
 * Root directory for pragma global configuration.
 *
 * Resolution order:
 * 1. XDG_CONFIG_HOME/pragma (XDG spec)
 * 2. ~/.config/pragma (default)
 */
export function globalConfigDir(): string {
  const xdg = process.env.XDG_CONFIG_HOME;
  const base = xdg ?? join(homedir(), ".config");
  return join(base, "pragma");
}

/**
 * Root directory for pragma persistent data (extracted skills, etc.).
 *
 * Resolution order:
 * 1. XDG_DATA_HOME/pragma (XDG spec)
 * 2. ~/.local/share/pragma (default)
 */
export function dataRoot(): string {
  const xdg = process.env.XDG_DATA_HOME;
  const base = xdg ?? join(homedir(), ".local", "share");
  return join(base, "pragma");
}

/**
 * Cache directory for a specific git-ref-resolved package.
 *
 * @param pkg - Package name (e.g., "@canonical/design-system").
 * @param ref - Git ref (e.g., "main", "v0.3.0", "abc1234").
 * @returns Absolute path to the cached clone directory.
 */
export function gitCacheDir(pkg: string, ref: string): string {
  const sanitizedRef = sanitizeRef(ref);
  return join(cacheRoot(), "refs", pkg, sanitizedRef);
}

/**
 * Root directory for query trace logs.
 *
 * Resolution order:
 * 1. PRAGMA_TRACE_DIR environment variable (CI/testing override)
 * 2. XDG_DATA_HOME/pragma/traces (default)
 */
export function traceDir(): string {
  if (process.env.PRAGMA_TRACE_DIR) {
    return process.env.PRAGMA_TRACE_DIR;
  }
  return join(dataRoot(), "traces");
}

/**
 * Sanitize a git ref for use as a directory name.
 * Replaces characters that are invalid or confusing in path segments.
 */
function sanitizeRef(ref: string): string {
  return ref.replace(/[/\\:*?"<>|]/g, "_");
}
