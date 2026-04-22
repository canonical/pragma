import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cloneRef, fetchRef, isSha, pruneCache } from "./gitOps.js";

describe("isSha", () => {
  it("recognizes a 7-char hex string", () => {
    expect(isSha("abc1234")).toBe(true);
  });

  it("recognizes a 40-char hex string", () => {
    expect(isSha("abc1234def5678901234567890abcdef12345678")).toBe(true);
  });

  it("rejects non-hex characters", () => {
    expect(isSha("main")).toBe(false);
    expect(isSha("v1.0.0")).toBe(false);
    expect(isSha("feature/branch")).toBe(false);
  });

  it("rejects too-short strings", () => {
    expect(isSha("abc12")).toBe(false);
  });

  it("rejects uppercase hex", () => {
    expect(isSha("ABC1234")).toBe(false);
  });
});

describe("cloneRef + fetchRef (integration, requires git)", () => {
  let tmpDir: string;
  let bareRepo: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "pragma-gitops-"));

    // Create a bare repo to clone from (avoids network)
    bareRepo = join(tmpDir, "origin.git");
    execFileSync("git", ["init", "--bare", "-b", "main", bareRepo], {
      stdio: "pipe",
    });

    // Push an initial commit to the bare repo via a temp working copy
    const workDir = join(tmpDir, "work");
    execFileSync("git", ["clone", bareRepo, workDir], { stdio: "pipe" });
    execFileSync(
      "git",
      ["-C", workDir, "config", "user.email", "test@test.com"],
      { stdio: "pipe" },
    );
    execFileSync("git", ["-C", workDir, "config", "user.name", "Test"], {
      stdio: "pipe",
    });
    execFileSync(
      "git",
      ["-C", workDir, "commit", "--allow-empty", "-m", "initial"],
      { stdio: "pipe" },
    );
    execFileSync("git", ["-C", workDir, "push", "origin", "main"], {
      stdio: "pipe",
    });
    // Tag it
    execFileSync("git", ["-C", workDir, "tag", "v0.1.0"], { stdio: "pipe" });
    execFileSync("git", ["-C", workDir, "push", "origin", "v0.1.0"], {
      stdio: "pipe",
    });
    // Add another commit for update testing
    execFileSync(
      "git",
      ["-C", workDir, "commit", "--allow-empty", "-m", "second"],
      { stdio: "pipe" },
    );
    execFileSync("git", ["-C", workDir, "push", "origin", "main"], {
      stdio: "pipe",
    });

    rmSync(workDir, { recursive: true, force: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("clones a branch ref", () => {
    const dest = join(tmpDir, "clone-branch");
    cloneRef(bareRepo, "main", dest);
    expect(existsSync(join(dest, ".git"))).toBe(true);
  });

  it("clones a tag ref", () => {
    const dest = join(tmpDir, "clone-tag");
    cloneRef(bareRepo, "v0.1.0", dest);
    expect(existsSync(join(dest, ".git"))).toBe(true);
  });

  it("clones a SHA ref", () => {
    // Get the SHA of the initial commit
    const sha = execFileSync("git", ["-C", bareRepo, "rev-parse", "v0.1.0"], {
      stdio: "pipe",
    })
      .toString()
      .trim();

    const dest = join(tmpDir, "clone-sha");
    cloneRef(bareRepo, sha, dest);
    expect(existsSync(join(dest, ".git"))).toBe(true);
  });

  it("fetches updates on an existing clone", () => {
    // Clone at tag (first commit)
    const dest = join(tmpDir, "clone-fetch");
    cloneRef(bareRepo, "v0.1.0", dest);

    // Fetch main (which has a second commit)
    const result = fetchRef(bareRepo, "main", dest);
    expect(result.updated).toBe(true);
    expect(result.oldHead).not.toBe(result.newHead);
  });

  it("reports up-to-date when no changes", () => {
    const dest = join(tmpDir, "clone-noop");
    cloneRef(bareRepo, "main", dest);

    const result = fetchRef(bareRepo, "main", dest);
    expect(result.updated).toBe(false);
    expect(result.oldHead).toBe(result.newHead);
  });
});

describe("pruneCache", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "pragma-prune-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("removes an existing directory", () => {
    const dir = join(tmpDir, "to-remove");
    execFileSync("mkdir", ["-p", dir]);
    expect(existsSync(dir)).toBe(true);
    pruneCache(dir);
    expect(existsSync(dir)).toBe(false);
  });

  it("does nothing for a non-existent directory", () => {
    pruneCache(join(tmpDir, "does-not-exist"));
    // no throw
  });
});
