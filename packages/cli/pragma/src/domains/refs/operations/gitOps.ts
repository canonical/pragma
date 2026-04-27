/**
 * Git operations for managing cached package clones.
 *
 * All operations use execFileSync with shell: false for security.
 * Relies entirely on the user's git client for authentication
 * (SSH keys, credential helpers). Zero custom auth logic.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname } from "node:path";

/** Check whether a ref looks like a commit SHA (7-40 hex chars). */
export function isSha(ref: string): boolean {
  return /^[0-9a-f]{7,40}$/.test(ref);
}

/**
 * Clone a repository at a specific ref into a destination directory.
 * Uses shallow clone (--depth 1) for speed.
 *
 * @param url - Git remote URL (https:// or ssh://).
 * @param ref - Branch, tag, or commit SHA.
 * @param dest - Target directory (must not exist).
 */
export function cloneRef(url: string, ref: string, dest: string): void {
  mkdirSync(dirname(dest), { recursive: true });

  if (isSha(ref)) {
    // Git doesn't support shallow clone by SHA directly.
    // Init, fetch the specific commit, checkout.
    mkdirSync(dest, { recursive: true });
    git(dest, ["init"]);
    git(dest, ["fetch", "--depth", "1", url, ref]);
    git(dest, ["checkout", "FETCH_HEAD"]);
  } else {
    // Branches and tags: --branch works with --depth 1
    execFileSync("git", ["clone", "--depth", "1", "--branch", ref, url, dest], {
      stdio: "pipe",
    });
  }
}

/**
 * Update an existing cached clone by fetching the latest for its ref.
 *
 * @param url - Git remote URL.
 * @param ref - Branch, tag, or commit SHA.
 * @param dest - Existing cache directory.
 * @returns Whether the HEAD changed after fetch.
 */
export function fetchRef(
  url: string,
  ref: string,
  dest: string,
): { updated: boolean; oldHead: string; newHead: string } {
  const oldHead = gitOutput(dest, ["rev-parse", "HEAD"]);

  if (isSha(ref)) {
    git(dest, ["fetch", "--depth", "1", url, ref]);
    git(dest, ["checkout", "FETCH_HEAD"]);
  } else {
    git(dest, ["fetch", "--depth", "1", url, ref]);
    git(dest, ["checkout", "FETCH_HEAD"]);
  }

  const newHead = gitOutput(dest, ["rev-parse", "HEAD"]);
  return { updated: oldHead !== newHead, oldHead, newHead };
}

/**
 * Remove a cached directory.
 */
export function pruneCache(dir: string): void {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Run a git command in a directory. Throws on non-zero exit. */
function git(cwd: string, args: string[]): void {
  execFileSync("git", args, { cwd, stdio: "pipe" });
}

/** Run a git command and return trimmed stdout. */
function gitOutput(cwd: string, args: string[]): string {
  return execFileSync("git", args, { cwd, stdio: "pipe" }).toString().trim();
}
