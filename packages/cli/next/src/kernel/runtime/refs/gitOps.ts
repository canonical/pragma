/**
 * Git operations for cached package clones.
 *
 * Ported from the v1 refs domain. Every call is `execFileSync` with the default
 * `shell: false`, so refs and URLs are passed as argv, never interpolated into
 * a shell. Authentication is delegated entirely to the user's git client (SSH
 * keys, credential helpers) — zero custom auth. Shallow clones (`--depth 1`)
 * keep checkouts cheap.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

/** Whether a ref looks like a commit SHA (7-40 hex chars). */
export function isSha(ref: string): boolean {
  return /^[0-9a-f]{7,40}$/.test(ref);
}

/** Run git in a directory, throwing on non-zero exit. */
function git(cwd: string, args: readonly string[]): void {
  execFileSync("git", [...args], { cwd, stdio: "pipe" });
}

/** Run git and return trimmed stdout. */
function gitOutput(cwd: string, args: readonly string[]): string {
  return execFileSync("git", [...args], { cwd, stdio: "pipe" })
    .toString()
    .trim();
}

/**
 * Clone a repository at a ref into a destination directory (must not exist).
 *
 * @param url - Git remote URL.
 * @param ref - Branch, tag, or commit SHA.
 * @param dest - Target directory.
 * @note Impure — runs git, writes the checkout.
 */
export function cloneRef(url: string, ref: string, dest: string): void {
  mkdirSync(dirname(dest), { recursive: true });
  if (isSha(ref)) {
    // Shallow clone by SHA is unsupported — init + fetch the commit + checkout.
    mkdirSync(dest, { recursive: true });
    git(dest, ["init"]);
    git(dest, ["fetch", "--depth", "1", url, ref]);
    git(dest, ["checkout", "FETCH_HEAD"]);
  } else {
    execFileSync("git", ["clone", "--depth", "1", "--branch", ref, url, dest], {
      stdio: "pipe",
    });
  }
}

/**
 * Fetch a ref into an existing cached clone and check it out.
 *
 * @returns The newly resolved HEAD commit.
 * @note Impure — runs git, updates the checkout.
 */
export function fetchRef(url: string, ref: string, dest: string): string {
  git(dest, ["fetch", "--depth", "1", url, ref]);
  git(dest, ["checkout", "FETCH_HEAD"]);
  return gitOutput(dest, ["rev-parse", "HEAD"]);
}

/** Check out an exact commit in an existing clone (fetching it if needed). */
export function checkoutCommit(
  url: string,
  commit: string,
  dest: string,
): void {
  if (!existsSync(dest)) {
    cloneRef(url, commit, dest);
    return;
  }
  try {
    git(dest, ["checkout", commit]);
  } catch {
    git(dest, ["fetch", "--depth", "1", url, commit]);
    git(dest, ["checkout", commit]);
  }
}

/** The resolved HEAD commit of a checkout. */
export function headCommit(dest: string): string {
  return gitOutput(dest, ["rev-parse", "HEAD"]);
}
