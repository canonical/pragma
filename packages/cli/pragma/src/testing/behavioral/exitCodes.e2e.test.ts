/**
 * A4 — the 4-code exit covenant, observed through the REAL binary.
 *
 * `mapExitCode`'s table is PR1-protected (`kernel/project/cli/exitCodes.test.ts`,
 * unit level). This is the spawn-observed pin: one representative real command
 * per code, through the actual process exit path (`bin.ts`'s catch ladder →
 * `dispatch`/`handleProgramError` → `process.exitCode`).
 *
 * The table is deliberately SMALL, and verified here against `exitCodes.ts`:
 * four outcomes, not one per error class. Success (0), a generic runtime
 * failure (1), a usage failure (2), and an unavailable store (3) — which is the
 * only condition a caller can act on differently, so it is the only one that
 * earns a code of its own. Everything else a script would branch on is in the
 * error envelope.
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
    const cwd = mkdtempSync(join(tmpdir(), "pragma-exit1-"));
    const result = runCli(["skill", "lookup", "does-not-exist"], { cwd });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("not found");
  });

  it("2 — usage failure (invalid input)", () => {
    const result = runCli(["--format", "yaml", "info"]);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('Invalid format "yaml"');
  });

  it("3 — store unavailable (configured packs, never built)", () => {
    const cwd = mkdtempSync(join(tmpdir(), "pragma-exit3-"));
    // A pragma.config.ts with custom `packs` flips `origins.packs` to
    // "project" — with nothing built for this project, resolveSources refuses
    // to boot (no network probing) rather than serve the embedded pack, which
    // is a DIFFERENT graph from the one this project asked for.
    writeFileSync(
      join(cwd, "pragma.config.ts"),
      'export default { packs: [{ name: "never-built", source: "file:///nonexistent" }] };\n',
    );
    const result = runCli(["block", "list"], { cwd });
    expect(result.exitCode).toBe(3);
    expect(result.stderr).toContain("sources update");
  });
});
