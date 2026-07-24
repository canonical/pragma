/**
 * `sources update` must CHECK before it fetches — not clone/fetch blindly.
 * The cheap probe is `remoteHead` (a `git ls-remote`, no object download);
 * the resolve path compares it to the local checkout and skips the fetch when
 * the cache is already current. These tests exercise the real git plumbing
 * against a LOCAL file:// remote (no network), so they prove:
 *   - remoteHead short-circuits for a commit SHA (nothing to look up);
 *   - remoteHead reads the advertised head of a branch;
 *   - a freshly-cloned checkout already matches its remote head (the "already
 *     current, skip the fetch" precondition holds).
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cloneRef, headCommit, isSha, remoteHead } from "./gitOps.js";

/** Run git in a dir, returning trimmed stdout. */
const git = (cwd: string, args: string[]): string =>
  execFileSync("git", args, { cwd, stdio: "pipe" }).toString().trim();

let root: string;
let remote: string;
let remoteUrl: string;
let branch: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "pragma-gitops-"));
  remote = join(root, "remote");
  // A real repository with one commit on `main`, used as a file:// remote.
  execFileSync("git", ["init", "-b", "main", remote], { stdio: "pipe" });
  git(remote, ["config", "user.email", "t@t"]);
  git(remote, ["config", "user.name", "t"]);
  writeFileSync(join(remote, "README.md"), "hi\n");
  git(remote, ["add", "."]);
  git(remote, ["commit", "-m", "init"]);
  remoteUrl = `file://${remote}`;
  branch = "main";
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("remoteHead — the cheap up-to-date probe", () => {
  it("returns undefined for a commit SHA (no ref to advertise)", () => {
    const sha = git(remote, ["rev-parse", "HEAD"]);
    expect(isSha(sha)).toBe(true);
    expect(remoteHead(remoteUrl, sha)).toBeUndefined();
  });

  it("reads the advertised head SHA of a branch", () => {
    const head = git(remote, ["rev-parse", "HEAD"]);
    expect(remoteHead(remoteUrl, branch)).toBe(head);
  });

  it("returns undefined for a ref the remote does not advertise", () => {
    expect(remoteHead(remoteUrl, "no-such-branch")).toBeUndefined();
  });
});

describe("the skip precondition — a fresh clone already matches its remote head", () => {
  it("cloneRef leaves the local HEAD equal to remoteHead (so update can skip the fetch)", () => {
    const dest = join(root, "clone");
    cloneRef(remoteUrl, branch, dest);
    const local = headCommit(dest);
    const remoteAt = remoteHead(remoteUrl, branch);
    // This equality is exactly what the resolve path checks to decide the
    // cache is current and NO fetch is needed.
    expect(remoteAt).toBe(local);
  });
});
