/**
 * A4 — the 4-code exit covenant, observed through the REAL binary.
 *
 * `mapExitCode`'s table is PR1-protected (`kernel/project/cli/exitCodes.test.ts`,
 * unit level). This is the spawn-observed pin: one representative real command
 * per code, through the actual process exit path (`bin.ts`'s catch ladder →
 * `dispatch`/`handleProgramError` → `process.exitCode`).
 *
 * DIVERGENCE NOTE (kept from the plan, verified against `exitCodes.ts`): v2
 * COLLAPSED the old shell's 6-code exit map (NOT_FOUND=1, EMPTY=2,
 * INVALID/AMBIGUOUS=3, CONFIG=4, STORE=5, INTERNAL=127) into 4 codes — success,
 * a generic runtime failure (1), a usage failure (2), and an unavailable store
 * (3). This test pins v2's table, not the old one.
 */

import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runCli } from "../helpers/runCli.js";

describe("exit-code covenant, spawn-observed (A4, e2e)", () => {
  it("0 — success", () => {
    expect(runCli(["info"]).exitCode).toBe(0);
  });

  it("1 — runtime failure (entity not found)", () => {
    const cwd = mkdtempSync(join(tmpdir(), "pragma2-exit1-"));
    const result = runCli(["skill", "lookup", "does-not-exist"], { cwd });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("not found");
  });

  it("2 — usage failure (invalid input)", () => {
    const result = runCli(["--format", "yaml", "info"]);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('Invalid format "yaml"');
  });

  it("3 — store unavailable (configured packages, never built)", () => {
    const cwd = mkdtempSync(join(tmpdir(), "pragma2-exit3-"));
    // A pragma.config.ts with custom `packages` flips `origins.packages` to
    // "project" — with no `pragma.lock.json`, resolveSources refuses to boot
    // (no network probing) rather than fall back to the embedded pack.
    writeFileSync(
      join(cwd, "pragma.config.ts"),
      'export default { packages: [{ name: "never-built", source: "file:///nonexistent" }] };\n',
    );
    const result = runCli(["block", "list"], { cwd });
    expect(result.exitCode).toBe(3);
    expect(result.stderr).toContain("sources update");
  });
});
