import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import updateRefs from "./updateRefs.js";

describe("updateRefs", () => {
  let tmpDir: string;
  let projectDir: string;
  let bareRepo: string;
  const origEnv = { ...process.env };

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "pragma-update-refs-"));
    projectDir = join(tmpDir, "project");
    mkdirSync(projectDir, { recursive: true });

    // Point cache to temp dir
    process.env.PRAGMA_CACHE_DIR = join(tmpDir, "cache");
    // No global refs
    process.env.XDG_CONFIG_HOME = join(tmpDir, "no-global-config");

    // Create a bare git repo for testing
    bareRepo = join(tmpDir, "origin.git");
    execFileSync("git", ["init", "--bare", "-b", "main", bareRepo], {
      stdio: "pipe",
    });

    const workDir = join(tmpDir, "work");
    execFileSync("git", ["clone", bareRepo, workDir], { stdio: "pipe" });
    execFileSync("git", ["-C", workDir, "config", "user.email", "t@t.com"], {
      stdio: "pipe",
    });
    execFileSync("git", ["-C", workDir, "config", "user.name", "T"], {
      stdio: "pipe",
    });
    execFileSync(
      "git",
      ["-C", workDir, "commit", "--allow-empty", "-m", "init"],
      { stdio: "pipe" },
    );
    execFileSync("git", ["-C", workDir, "push", "origin", "main"], {
      stdio: "pipe",
    });
    rmSync(workDir, { recursive: true, force: true });
  });

  afterEach(() => {
    process.env = { ...origEnv };
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("clones a git ref on first run", async () => {
    writeFileSync(
      join(projectDir, "pragma.config.json"),
      JSON.stringify({
        packages: [
          {
            name: "@test/pkg",
            source: `git+file://${bareRepo}#main`,
          },
        ],
      }),
    );

    const results = await updateRefs({ cwd: projectDir });
    expect(results).toHaveLength(1);
    expect(results[0].kind).toBe("cloned");
    expect(results[0].pkg).toBe("@test/pkg");
  });

  it("reports up-to-date on second run without changes", async () => {
    writeFileSync(
      join(projectDir, "pragma.config.json"),
      JSON.stringify({
        packages: [
          {
            name: "@test/pkg",
            source: `git+file://${bareRepo}#main`,
          },
        ],
      }),
    );

    await updateRefs({ cwd: projectDir });
    const results = await updateRefs({ cwd: projectDir });
    expect(results).toHaveLength(1);
    expect(results[0].kind).toBe("up-to-date");
  });

  it("reports ok for file:// ref pointing to existing path", async () => {
    const localPkg = join(tmpDir, "local-pkg");
    mkdirSync(localPkg, { recursive: true });

    writeFileSync(
      join(projectDir, "pragma.config.json"),
      JSON.stringify({
        packages: [{ name: "@test/local", source: `file://${localPkg}` }],
      }),
    );

    const results = await updateRefs({ cwd: projectDir });
    expect(results).toHaveLength(1);
    expect(results[0].kind).toBe("ok");
  });

  it("reports error for file:// ref pointing to missing path", async () => {
    writeFileSync(
      join(projectDir, "pragma.config.json"),
      JSON.stringify({
        packages: [
          { name: "@test/missing", source: "file:///nonexistent/path" },
        ],
      }),
    );

    const results = await updateRefs({ cwd: projectDir });
    expect(results).toHaveLength(1);
    expect(results[0].kind).toBe("error");
  });

  it("skips npm packages", async () => {
    writeFileSync(
      join(projectDir, "pragma.config.json"),
      JSON.stringify({
        packages: ["@canonical/design-system"],
      }),
    );

    const results = await updateRefs({ cwd: projectDir });
    expect(results).toHaveLength(1);
    expect(results[0].kind).toBe("skipped");
  });

  it("filters by --package flag", async () => {
    writeFileSync(
      join(projectDir, "pragma.config.json"),
      JSON.stringify({
        packages: [
          "@canonical/design-system",
          {
            name: "@test/pkg",
            source: `git+file://${bareRepo}#main`,
          },
        ],
      }),
    );

    const results = await updateRefs({
      cwd: projectDir,
      package: "@test/pkg",
    });
    expect(results).toHaveLength(1);
    expect(results[0].pkg).toBe("@test/pkg");
  });

  it("uses defaults when no config exists", async () => {
    const results = await updateRefs({ cwd: projectDir });
    // All 4 defaults are npm, so all skipped
    expect(results.every((r) => r.kind === "skipped")).toBe(true);
    expect(results).toHaveLength(4);
  });
});
